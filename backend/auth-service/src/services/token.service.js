import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

const TOKEN_EXPIRATION = "2h";

/**
 * Firma el token de acceso del usuario autenticado.
 * Mantiene el formato esperado por los servicios que validan JWT_SECRET.
 */
export const signAccessToken = ({ id, role }) =>
  jwt.sign({ id, role }, env.jwtSecret, { expiresIn: TOKEN_EXPIRATION });
