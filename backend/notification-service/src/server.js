import express from "express";
import cors from "cors";
import defaultRoutes, { notFoundHandler } from "./routes/default.routes.js";
import { env } from "./config/env.js";

const app = express();

// Middlewares globales
app.use(express.json());
app.use(cors({ origin: true, credentials: true }));
app.use(defaultRoutes);

// Ruta principal
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    service: env.serviceName,
    message: "Microservicio de notificacion funcionando",
  });
});

app.use(notFoundHandler);

// Iniciar el servidor en el puerto configurado.
app.listen(env.port, () => {
  console.log("-----------------------------------");
  console.log(`Servicio: ${env.serviceName}`);
  console.log(`Puerto: ${env.port}`);
  console.log(`URL: http://localhost:${env.port}`);
  console.log(`Health: http://localhost:${env.port}/api/notifications/health`);
  console.log("-----------------------------------");
});
