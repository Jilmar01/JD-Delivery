import { Prisma } from "@prisma/client";
import { prisma } from "../config/database.js";
import axios from "axios";
import { HttpError } from "../utils/HttpError.js";
import { createTcpClient } from "../server/tcp.client.js";
import { env } from "../config/env.js";

const transiciones = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["IN_TRANSIT", "CANCELLED"],
  IN_TRANSIT: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

const estadosValidos = Object.keys(transiciones);

const validarId = (id) => {
  const numero = Number(id);

  if (!Number.isSafeInteger(numero) || numero <= 0) {
    throw new HttpError(
      "El ID del pedido debe ser un entero positivo",
      400
    );
  }

  return numero;
};

const validarItems = (items) => {
  if (items !== undefined && !Array.isArray(items)) {
    throw new HttpError(
      "Los productos deben enviarse en un arreglo",
      400
    );
  }

  const orderItems = items ?? [];

  for (const item of orderItems) {
    if (
      !item ||
      !Number.isSafeInteger(item.productId) ||
      item.productId <= 0 ||
      typeof item.productName !== "string" ||
      !item.productName.trim() ||
      !Number.isSafeInteger(item.quantity) ||
      item.quantity <= 0 ||
      item.unitPrice === undefined ||
      item.unitPrice === null ||
      item.unitPrice === ""
    ) {
      throw new HttpError(
        "Uno o más productos tienen datos inválidos",
        400
      );
    }

    const unitPrice = Number(item.unitPrice);

    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      throw new HttpError(
        "El precio unitario debe ser mayor que cero",
        400
      );
    }
  }

  return orderItems;
};

export const createOrder = async (orderData) => {
  const {
    customerId,
    deliveryAddress,
    deliveryLat,
    deliveryLng,
    notes,
    total,
    items,
  } = orderData;

  if (
    typeof customerId !== "string" ||
    !customerId.trim() ||
    typeof deliveryAddress !== "string" ||
    !deliveryAddress.trim() ||
    deliveryLat === undefined ||
    deliveryLng === undefined ||
    total === undefined ||
    total === null ||
    total === ""
  ) {
    throw new HttpError(
      "customerId, deliveryAddress, deliveryLat, deliveryLng y total son obligatorios",
      400
    );
  }

  const lat = Number(deliveryLat);
  const lng = Number(deliveryLng);
  const totalNumber = Number(total);

  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw new HttpError("La latitud debe estar entre -90 y 90", 400);
  }

  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    throw new HttpError("La longitud debe estar entre -180 y 180", 400);
  }

  if (!Number.isFinite(totalNumber) || totalNumber <= 0) {
    throw new HttpError("El total debe ser mayor que cero", 400);
  }

  if (notes !== undefined && notes !== null && typeof notes !== "string") {
    throw new HttpError("Las notas deben ser un texto", 400);
  }

  const orderItems = validarItems(items);

  const calculatedTotal = orderItems.reduce((sum, item) => {
    return sum + Math.round(Number(item.unitPrice) * 100) * item.quantity;
  }, 0);

  const receivedTotal = Math.round(totalNumber * 100);

  if (
    orderItems.length > 0 &&
    Math.abs(calculatedTotal - receivedTotal) > 1
  ) {
    throw new HttpError(
      "El total no coincide con la suma de los productos",
      400
    );
  }

  // 1. Crear el pedido
  let order;

  try {
    order = await prisma.order.create({
      data: {
        customerId: customerId.trim(),
        deliveryAddress: deliveryAddress.trim(),
        deliveryLat: lat,
        deliveryLng: lng,
        notes: notes?.trim() || null,
        total: new Prisma.Decimal(totalNumber.toFixed(2)),
        items: {
          create: orderItems.map((item) => {
            const unitPrice = Number(item.unitPrice);

            return {
              productId: item.productId,
              productName: item.productName.trim(),
              quantity: item.quantity,
              unitPrice: new Prisma.Decimal(unitPrice.toFixed(2)),
              subtotal: new Prisma.Decimal(
                (
                  Math.round(unitPrice * 100) *
                  item.quantity /
                  100
                ).toFixed(2)
              ),
            };
          }),
        },
      },
      include: {
        items: true,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2003") {
        throw new HttpError(
          "El cliente o alguno de los productos no existe",
          400
        );
      }
    }

    throw error;
  }

  // 2. Solicitar la creación de la entrega
  // Notificar al socket-service para que busque repartidores para el pedido.
  try {
    const tcpClient = createTcpClient({
      serviceUrl: env.socketServiceUrl,
    });

    await tcpClient.sendMessage("NEW_ORDER", {
      orderId: order.id,
      deliveryAddress: order.deliveryAddress,
      deliveryLat: Number(order.deliveryLat),
      deliveryLng: Number(order.deliveryLng),
    });
  } catch (error) {
    console.error("Pedido creado, pero no se notificó al servidor TCP:", error.message);
  }
 
  return order;
};

export const getAllOrders = async (filters = {}) => {
  const where = {};

  if (filters.status !== undefined) {
    if (typeof filters.status !== "string") {
      throw new HttpError("El estado proporcionado no es valido", 400);
    }

    const status = filters.status.toUpperCase();
    if (!estadosValidos.includes(status)) {
      throw new HttpError("El estado proporcionado no es valido", 400);
    }

    where.status = status;
  }

  return prisma.order.findMany({
    where,
    include: {
      items: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

export const getOrderById = async (idParam) => {
  const id = validarId(idParam);

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
    },
  });

  if (!order) {
    throw new HttpError("Pedido no encontrado", 404);
  }

  return order;
};


export const updateOrderStatus = async (idParam, status) => {
  const id = validarId(idParam);
  const nextStatus = typeof status === "string"
    ? status.toUpperCase()
    : status;

  if (
    typeof nextStatus !== "string" ||
    !Object.prototype.hasOwnProperty.call(transiciones, nextStatus)
  ) {
    throw new HttpError("El estado proporcionado no es válido", 400);
  }

  const updatedOrder = await prisma.$transaction(async (tx) => {
    const pedido = await tx.order.findUnique({
      where: { id },
    });

    if (!pedido) {
      throw new HttpError("Pedido no encontrado", 404);
    }

    if (!transiciones[pedido.status]) {
      throw new HttpError("El pedido tiene un estado no reconocido", 500);
    }

    if (!transiciones[pedido.status].includes(nextStatus)) {
      throw new HttpError(
        `No se permite cambiar de ${pedido.status} a ${nextStatus}`,
        409
      );
    }

    return tx.order.update({
      where: { id },
      data: { status: nextStatus },
      include: {
        items: true,
      },
    });
  });

  // Notificar al TCP Server cuando se cancela el pedido
  if (nextStatus === "CANCELLED") {
    try {
      const tcpClient = createTcpClient({
        serviceUrl: env.socketServiceUrl,
      });

      await tcpClient.sendMessage("CANCEL_ORDER", {
        orderId: updatedOrder.id,
      });
    } catch (error) {
      console.error(
        "Pedido cancelado en BD, pero no se notificó al TCP Server:",
        error.message
      );
    }
  }

  return updatedOrder;
};


export const getOrdersByStatus = async (status) => {
  if (!status || typeof status !== "string") {
    throw new HttpError(
      "El parametro status es obligatorio",
      400
    );
  }

  const normalizedStatus = status.toUpperCase();

  if (!estadosValidos.includes(normalizedStatus)) {
    throw new HttpError(
      "El estado proporcionado no es valido",
      400
    );
  }

  return prisma.order.findMany({
    where: {
      status: normalizedStatus,
    },
    include: {
      items: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};
