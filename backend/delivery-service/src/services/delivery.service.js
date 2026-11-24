import { prisma } from "../config/database.js";
import { HttpError } from "../utils/HttpError.js";
import { ROLES } from "../constants/roles.js";

const VALID_STATUSES = [
  "PENDING",
  "ASSIGNED",
  "IN_TRANSIT",
  "DELIVERED",
  "CANCELLED",
];

const STATUS_TRANSITIONS = {
  PENDING: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["IN_TRANSIT", "CANCELLED"],
  IN_TRANSIT: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

function requireRole(user, ...allowedRoles) {
  if (!user || !allowedRoles.includes(user.role)) {
    throw new HttpError("No tienes permisos para realizar esta acción", 403);
  }
}

function requireCourierOwnership(delivery, user) {
  if (
    user?.role === ROLES.DELIVERY_PERSON &&
    String(delivery.courierId) !== String(user.id)
  ) {
    throw new HttpError("No tienes permiso para acceder a esta entrega", 403);
  }
}

function validatePositiveInteger(value, fieldName) {
  const number = Number(value);

  if (!Number.isInteger(number) || number <= 0) {
    throw new HttpError(`${fieldName} debe ser un entero positivo`, 400);
  }

  return number;
}

// Crear entrega
export async function createDelivery(data, user) {
  requireRole(user, ROLES.ADMIN);
  const orderId = validatePositiveInteger(data.orderId, "orderId");

  if (
    typeof data.deliveryAddress !== "string" ||
    !data.deliveryAddress.trim()
  ) {
    throw new HttpError("La dirección de entrega es obligatoria", 400);
  }

  const deliveryLat = Number(data.deliveryLat);
  const deliveryLng = Number(data.deliveryLng);

  if (
    !Number.isFinite(deliveryLat) ||
    deliveryLat < -90 ||
    deliveryLat > 90
  ) {
    throw new HttpError("La latitud debe estar entre -90 y 90", 400);
  }

  if (
    !Number.isFinite(deliveryLng) ||
    deliveryLng < -180 ||
    deliveryLng > 180
  ) {
    throw new HttpError("La longitud debe estar entre -180 y 180", 400);
  }

  return prisma.$transaction(async (tx) => {
    const existingDelivery = await tx.delivery.findFirst({
      where: { orderId },
    });

    if (existingDelivery) {
      throw new HttpError("Este pedido ya tiene una entrega registrada", 409);
    }

    return tx.delivery.create({
      data: {
        orderId,
        courierId: null,
        deliveryAddress: data.deliveryAddress.trim(),
        deliveryLat,
        deliveryLng,
        status: "PENDING",
        history: {
          create: {
            newStatus: "PENDING",
            notes: "Entrega creada",
          },
        },
      },
      include: {
        history: true,
      },
    });
  });
}

// Consultar todas las entregas
export async function getAllDeliveries(user) {
  requireRole(user, ROLES.ADMIN);
  return prisma.delivery.findMany({
    include: {
      history: {
        orderBy: { date: "asc" },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

// Consultar una entrega por ID
export async function getDeliveryById(id, user) {
  requireRole(user, ROLES.ADMIN, ROLES.DELIVERY_PERSON);
  const deliveryId = validatePositiveInteger(id, "id");

  const delivery = await prisma.delivery.findUnique({
    where: { id: deliveryId },
    include: {
      history: {
        orderBy: { date: "asc" },
      },
    },
  });

  if (!delivery) {
    throw new HttpError("Entrega no encontrada", 404);
  }

  requireCourierOwnership(delivery, user);

  return delivery;
}

// Asignar o reasignar repartidor
export async function assignCourier(id, courierId, user) {
  requireRole(user, ROLES.ADMIN);
  const deliveryId = validatePositiveInteger(id, "id");
  const newCourierId = validatePositiveInteger(courierId, "courierId");

  return prisma.$transaction(async (tx) => {
    const delivery = await tx.delivery.findUnique({
      where: { id: deliveryId },
    });

    if (!delivery) {
      throw new HttpError("Entrega no encontrada", 404);
    }

    if (["DELIVERED", "CANCELLED", "IN_TRANSIT"].includes(delivery.status)) {
      throw new HttpError(
        "No se puede cambiar el repartidor en el estado actual",
        409
      );
    }

    const updatedDelivery = await tx.delivery.update({
      where: { id: deliveryId },
      data: {
        courierId: newCourierId,
        status: "ASSIGNED",
        assignedAt: new Date(),
        history: {
          create: {
            previousStatus: delivery.status,
            newStatus: "ASSIGNED",
            notes: `Entrega asignada al repartidor ${newCourierId}`,
          },
        },
      },
      include: { history: true },
    });

    return updatedDelivery;
  });
}

// Cambiar estado de entrega
export async function updateDeliveryStatus(id, newStatus, notes, user) {
  requireRole(user, ROLES.ADMIN, ROLES.DELIVERY_PERSON);
  const deliveryId = validatePositiveInteger(id, "id");

  if (typeof newStatus !== "string" || !VALID_STATUSES.includes(newStatus)) {
    throw new HttpError("El estado de entrega no es válido", 400);
  }

  if (
    user.role === ROLES.DELIVERY_PERSON &&
    !["IN_TRANSIT", "DELIVERED"].includes(newStatus)
  ) {
    throw new HttpError("El repartidor no puede establecer ese estado", 403);
  }

  if (notes !== undefined && notes !== null && typeof notes !== "string") {
    throw new HttpError("Las notas deben ser un texto", 400);
  }

  return prisma.$transaction(async (tx) => {
    const delivery = await tx.delivery.findUnique({
      where: { id: deliveryId },
    });

    if (!delivery) {
      throw new HttpError("Entrega no encontrada", 404);
    }

    requireCourierOwnership(delivery, user);

    if (delivery.status === newStatus) {
      throw new HttpError("La entrega ya tiene ese estado", 409);
    }

    if (!STATUS_TRANSITIONS[delivery.status].includes(newStatus)) {
      throw new HttpError(
        `No se permite cambiar de ${delivery.status} a ${newStatus}`,
        409
      );
    }

    const now = new Date();

    const timestamps = {};

    if (newStatus === "IN_TRANSIT") {
      timestamps.startedAt = now;
    }

    if (newStatus === "DELIVERED") {
      timestamps.deliveredAt = now;
    }

    return tx.delivery.update({
      where: { id: deliveryId },
      data: {
        status: newStatus,
        ...timestamps,
        history: {
          create: {
            previousStatus: delivery.status,
            newStatus,
            notes: notes?.trim() || null,
          },
        },
      },
      include: { history: true },
    });
  });
}

// Consultar entregas por repartidor
export async function getDeliveriesByCourier(courierId, user) {
  requireRole(user, ROLES.ADMIN, ROLES.DELIVERY_PERSON);
  const requestedCourierId = user.role === ROLES.DELIVERY_PERSON
    ? user.id
    : courierId;
  const id = validatePositiveInteger(requestedCourierId, "courierId");

  return prisma.delivery.findMany({
    where: { courierId: id },
    include: { history: true },
    orderBy: { createdAt: "desc" },
  });
}

// Consultar entrega por pedido
export async function getDeliveryByOrder(orderId, user) {
  requireRole(user, ROLES.ADMIN, ROLES.CUSTOMER);
  const id = validatePositiveInteger(orderId, "orderId");

  const delivery = await prisma.delivery.findFirst({
    where: { orderId: id },
    include: {
      history: {
        orderBy: { date: "asc" },
      },
    },
  });

  if (!delivery) {
    throw new HttpError("No existe una entrega para este pedido", 404);
  }

  return delivery;
}

// Consultar historial
export async function getDeliveryHistory(id, user) {
  requireRole(user, ROLES.ADMIN, ROLES.DELIVERY_PERSON);
  const deliveryId = validatePositiveInteger(id, "id");

  const delivery = await prisma.delivery.findUnique({
    where: { id: deliveryId },
    select: { id: true, courierId: true },
  });

  if (!delivery) {
    throw new HttpError("Entrega no encontrada", 404);
  }

  requireCourierOwnership(delivery, user);

  return prisma.deliveryHistory.findMany({
    where: { deliveryId },
    orderBy: { date: "asc" },
  });
}
