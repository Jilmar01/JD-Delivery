import * as authService from "../services/auth.service.js";
import { errorResponse, successResponse } from "../utils/response.js";

const handleError = (res, error, operation) => {
  console.error(`${operation}:`, error);

  const statusCode = error.status || 500;

  const msgError = error.status
    ? error.message
    : "Error interno del servidor";

  return errorResponse(res, operation, msgError, statusCode);
};

// POST /api/auth/login
export const login = async (req, res) => {
  try {
    const result = await authService.login(req.body);
    return successResponse(res, "Inicio de sesión exitoso", result);
  } catch (error) {
    return handleError(res, error, "Error al iniciar sesión");
  }
};

// POST /api/auth/register
export const register = async (req, res) => {
  try {
    const user = await authService.register(req.body);
    return successResponse(res, "Usuario registrado correctamente", user, 201);
  } catch (error) {
    return handleError(res, error, "Error al registrar usuario");
  }
};
