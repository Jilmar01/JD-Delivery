import { Router } from "express";

import {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  getOffers
} from "../controllers/order.controller.js";

const router = Router();

// Endpoint /api/orders 3001

// Crear un pedido
router.post("/", createOrder);

// Consultar todos los pedidos
router.get("/", getAllOrders);

// Consultar un pedido por ID
router.get("/:id", getOrderById);

// Actualizar el estado de un pedido
router.patch("/:id/status", updateOrderStatus);

// Obtener ofertas de pedidos
router.get("/:id/ofertas", getOffers);

export default router;
