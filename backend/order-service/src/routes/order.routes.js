import { Router } from "express";
import {
  authorize,
  requireAuth,
} from "../middleware/auth.middleware.js";
import { ROLES } from "../constants/roles.js";

import {
  createOrder,
  getAllOrders,
  getOrderById,
  deleteOrder,
  updateOrderStatus,
  getOffers
} from "../controllers/order.controller.js";

const router = Router();

// Rutas de pedidos requieren un JWT válido.
router.use(requireAuth);

// Endpoint /api/orders 3001

// Crear un pedido
router.post("/", authorize(ROLES.ADMIN, ROLES.CUSTOMER), createOrder);

// Consultar todos los pedidos
router.get("/", authorize(ROLES.ADMIN, ROLES.CUSTOMER), getAllOrders);

// Consultar un pedido por ID
router.get("/:id", authorize(ROLES.ADMIN, ROLES.CUSTOMER), getOrderById);

// Eliminar pedido (solo administración).
router.delete("/:id", authorize(ROLES.ADMIN), deleteOrder);

// Actualizar el estado de un pedido
router.patch(
  "/:id/status",
  authorize(ROLES.ADMIN, ROLES.CUSTOMER),
  updateOrderStatus
);

// Obtener ofertas de pedidos
router.get(
  "/:id/ofertas",
  authorize(ROLES.ADMIN, ROLES.CUSTOMER),
  getOffers
);

export default router;
