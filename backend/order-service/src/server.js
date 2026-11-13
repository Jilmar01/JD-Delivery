import express from "express";
import cors from "cors";

import { env } from "./config/env.js";
import { prisma } from "./config/database.js";

// Rutas de Endpoints
import orderRoutes from "./routes/order.routes.js";
import productRoutes from "./routes/product.routes.js"
import defaultRoutes, { notFoundHandler } from "./routes/default.routes.js";

const app = express();

// Middlewares globales
app.use(express.json());
const allowedOrigins = new Set(env.frontendOrigins);

// Middlewares globales
app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (!origin) {
    return next();
  }

  if (!allowedOrigins.has(origin)) {
    return res.status(403).json({
      success: false,
      message: "Origen no permitido",
    });
  }

  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  return next();
});
app.use(defaultRoutes);

// Ruta principal
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    service: env.serviceName,
    message: "Microservicio de pedidos funcionando",
  });
});

// Ruta pedidos
app.use("/api/orders", orderRoutes);

// Ruta productos
app.use("/api/products", productRoutes);

app.use(notFoundHandler);

// Conexion con la base de datos
prisma.$connect()
  .then(() => console.log("Conexión con PostgreSQL exitosa"))
  .catch((error) => console.error("Error de conexión:", error.message));

// Iniciar el servidor en el puerto configurado.
app.listen(env.port, () => {
  console.log("-----------------------------------");
  console.log(`Servicio: ${env.serviceName}`);
  console.log(`Puerto: ${env.port}`);
  console.log(`URL: http://localhost:${env.port}`);
  console.log(`Health: http://localhost:${env.port}/api/orders/health`);
  console.log("-----------------------------------");
});
