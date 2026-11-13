import express from "express";
import { env } from "../config/env.js";
import { errorResponse, successResponse } from "../utils/response.js";

const router = express.Router();

const health = (req, res) => successResponse(
  res,
  "WebSocket Server disponible",
  {
    service: env.serviceName,
    status: "UP",
    timestamp: new Date().toISOString(),
    tcp: req.app.get("tcpClient")?.isConnected() ? "CONNECTED" : "DISCONNECTED",
  }
);

router.get("/api/websocket/health", health);

export const notFoundHandler = (req, res) => errorResponse(
  res,
  "Ruta no encontrada",
  `No existe la ruta ${req.originalUrl}`,
  404
);

export default router;
