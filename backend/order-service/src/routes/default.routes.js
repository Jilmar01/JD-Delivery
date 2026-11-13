import express from "express";
import { errorResponse, successResponse } from "../utils/response.js";
import { env } from "../config/env.js";

const router = express.Router();
const service = env.serviceName;

const health = (req, res) => successResponse(
  res,
  "Servicio de pedidos disponible",
  { service, status: "UP", timestamp: new Date().toISOString() }
);

router.get("/api/orders/health", health);

export const notFoundHandler = (req, res) => errorResponse(
  res,
  "Ruta no encontrada",
  `No existe la ruta ${req.originalUrl}`,
  404
);

export default router;
