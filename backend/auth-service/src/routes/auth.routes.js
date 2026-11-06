import { Router } from "express";
import { login } from "../controllers/auth.controller.js";

const router = Router();

// Endpoints /api/auth 3003

// Iniciar sesión con usuario o correo y contraseña
router.post("/login", login);

export default router;
