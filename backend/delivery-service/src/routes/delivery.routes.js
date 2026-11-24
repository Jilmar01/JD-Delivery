import { Router } from "express";
import { authorize, requireAuth } from "../middleware/auth.middleware.js";
import { ROLES } from "../constants/roles.js";

import {
  createDelivery,
  getAllDeliveries,
  getDeliveryById,
  assignCourier,
  updateDeliveryStatus,
  getDeliveryByOrder,
  getDeliveryHistory,
} from "../controllers/delivery.controller.js";

const router = Router();

router.use(requireAuth);

// Endpint /api/deliveries

// Crear una entrega
router.post("/", authorize(ROLES.ADMIN), createDelivery);

// ADMIN consulta todas; DELIVERY_PERSON consulta las asignadas a su cuenta.
router.get(
  "/",
  authorize(ROLES.ADMIN, ROLES.DELIVERY_PERSON),
  getAllDeliveries
);

// Consultar entrega de un pedido
router.get(
  "/order/:orderId",
  authorize(ROLES.ADMIN, ROLES.CUSTOMER),
  getDeliveryByOrder
);

// 	Consultar el historial de una entrega
router.get(
  "/:id/history",
  authorize(ROLES.ADMIN, ROLES.DELIVERY_PERSON),
  getDeliveryHistory
);

// Asignar un repartidor
router.patch("/:id/assign", authorize(ROLES.ADMIN), assignCourier);

// Cambiar el estado de una entrega
router.patch(
  "/:id/status",
  authorize(ROLES.ADMIN, ROLES.DELIVERY_PERSON),
  updateDeliveryStatus
);

// Consultar una entrega y su historial
router.get(
  "/:id",
  authorize(ROLES.ADMIN, ROLES.DELIVERY_PERSON),
  getDeliveryById
);

export default router;
