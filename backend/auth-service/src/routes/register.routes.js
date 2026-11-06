import { Router } from "express";
import { register } from "../controllers/auth.controller.js";

const router = Router();

// Endpoint /api/auth/register 3003

// Registrar un usuario
router.post("/register", register);

export default router;
