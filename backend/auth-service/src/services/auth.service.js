import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../config/database.js";
import { HttpError } from "../utils/HttpError.js";

const ROLES = ["CUSTOMER", "DELIVERY_PERSON"];

// Autenticación de usuario
export const login = async ({ username, email, password } = {}) => {
  const identifier = typeof username === "string" && username.trim()
    ? username
    : email;

  if (
    typeof identifier !== "string" ||
    typeof password !== "string" ||
    !identifier.trim() ||
    !password
  ) {
    throw new HttpError("Usuario y contraseña son obligatorios", 400);
  }

  const cleanIdentifier = identifier.trim();
  const user =
    (await prisma.user.findFirst({
      where: { username: { equals: cleanIdentifier, mode: "insensitive" } },
    })) ||
    (await prisma.user.findUnique({
      where: { email: cleanIdentifier.toLowerCase() },
    }));

  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new HttpError("Credenciales incorrectas", 401);
  }

  if (!user.active) {
    throw new HttpError("La cuenta está desactivada", 403);
  }

  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET no está configurado");
  }

  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "2h" }
  );

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
  };
};

// Registro de usuario
export const register = async ({ username, email, password, role } = {}) => {
  if (
    typeof username !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string" ||
    !username.trim() ||
    !email.trim() ||
    !password
  ) {
    throw new HttpError("Usuario, correo y contraseña son obligatorios", 400);
  }

  const userRole = role ?? "CUSTOMER";
  if (!ROLES.includes(userRole)) {
    throw new HttpError("El rol debe ser CUSTOMER o DELIVERY_PERSON", 400);
  }

  const usernameClean = username.trim();
  const emailClean = email.trim().toLowerCase();

  if (usernameClean.length < 3 || usernameClean.length > 50) {
    throw new HttpError("El usuario debe tener entre 3 y 50 caracteres", 400);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailClean)) {
    throw new HttpError("El correo electrónico no es válido", 400);
  }

  if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
    throw new HttpError(
      "La contraseña debe tener al menos 8 caracteres y no superar 72 bytes",
      400
    );
  }

  if (await prisma.user.findUnique({ where: { email: emailClean } })) {
    throw new HttpError("El correo ya está registrado", 409);
  }

  if (await prisma.user.findUnique({ where: { username: usernameClean } })) {
    throw new HttpError("El nombre de usuario ya está registrado", 409);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    return await prisma.user.create({
      data: {
        username: usernameClean,
        email: emailClean,
        password: passwordHash,
        role: userRole,
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });
  } catch (error) {
    if (error.code === "P2002") {
      throw new HttpError(
        "El correo o nombre de usuario ya está registrado",
        409
      );
    }
    throw error;
  }
};
