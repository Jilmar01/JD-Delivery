import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { errorResponse } from "../utils/response.js";

export const requireAuth = (req, res, next) => {
  const authorization = req.get("Authorization");
  const [scheme, token, ...extra] = authorization?.trim().split(/\s+/) ?? [];

  if (scheme !== "Bearer" || !token || extra.length > 0) {
    return errorResponse(
      res,
      "Autenticación requerida",
      "Debes iniciar sesión para acceder a este recurso",
      401
    );
  }

  try {
    req.user = jwt.verify(token, env.jwtSecret);
    return next();
  } catch {
    return errorResponse(
      res,
      "Token inválido",
      "La sesión expiró o el token no es válido",
      401
    );
  }
};

export const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return errorResponse(
      res,
      "Autenticación requerida",
      "Debes iniciar sesión para acceder a este recurso",
      401
    );
  }

  const userRole = typeof req.user.role === "string"
    ? req.user.role.toUpperCase()
    : "";
  const normalizedAllowedRoles = allowedRoles.map((role) =>
    typeof role === "string" ? role.toUpperCase() : ""
  );

  if (!normalizedAllowedRoles.includes(userRole)) {
    return errorResponse(
      res,
      "Permiso denegado",
      "No tienes permisos para realizar esta acción",
      403
    );
  }

  return next();
};
