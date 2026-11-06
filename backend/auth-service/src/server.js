import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { prisma } from "./config/database.js";

// Rutas de Endpoints
import authRoutes from "./routes/auth.routes.js";
import registerRoutes from "./routes/register.routes.js";

dotenv.config();

const app = express();

const PORT = Number(process.env.PORT) || 3003;
const SERVICE_NAME = process.env.SERVICE_NAME || "auth-service";

// Middlewares globales
app.use(express.json());
app.use(cors({ origin: true, credentials: true }));

// Ruta principal
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    service: SERVICE_NAME,
    message: "Microservicio de autenticacion funcionando",
  });
});

// Ruta autenticación
app.use("/api/auth", authRoutes);
app.use("/api/auth", registerRoutes);

// Endpoint de salud
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    service: SERVICE_NAME,
    status: "UP",
    timestamp: new Date().toISOString(),
  });
});

// Ruta no encontrada
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Ruta no encontrada",
    path: req.originalUrl,
  });
});

// Conexion con la base de datos
prisma.$connect()
  .then(() => console.log("Conexión con PostgreSQL exitosa"))
  .catch((error) => console.error("Error de conexión:", error.message));


// Manejo básico de errores
app.use((err, req, res, next) => {
  console.error("Error en el servidor:", err);

  res.status(500).json({
    success: false,
    message: "Error interno del servidor",
  });
});



// Escuchar en todas las interfaces de red
app.listen(PORT, "0.0.0.0", () => {
  console.log("-----------------------------------");
  console.log(`Servicio: ${SERVICE_NAME}`);
  console.log(`Puerto: ${PORT}`);
  console.log(`URL: http://localhost:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
  console.log("-----------------------------------");
});