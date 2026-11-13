import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { prisma } from "./config/database.js";

// Rutas de Endpoints
import authRoutes from "./routes/auth.routes.js";
import registerRoutes from "./routes/register.routes.js";
import defaultRoutes, { notFoundHandler } from "./routes/default.routes.js";

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
    message: "Microservicio de autenticacion funcionando",
  });
});

// Ruta autenticación
app.use("/api/auth", authRoutes);
app.use("/api/auth", registerRoutes);

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
  console.log(`Health: http://localhost:${env.port}/api/auth/health`);
  console.log("-----------------------------------");
});
