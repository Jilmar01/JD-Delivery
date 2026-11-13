import { Prisma } from "@prisma/client";
import { prisma } from "../config/database.js";
import { HttpError } from "../utils/HttpError.js";

const validateId = (idParam) => {
  const id = Number(idParam);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new HttpError(
      "El ID del producto debe ser un entero positivo",
      400
    );
  }

  return id;
};

const validateName = (name) => {
  if (typeof name !== "string" || !name.trim()) {
    throw new HttpError(
      "El nombre del producto es obligatorio",
      400
    );
  }

  return name.trim();
};

const validateDescription = (description) => {
  if (
    description !== undefined &&
    description !== null &&
    typeof description !== "string"
  ) {
    throw new HttpError(
      "La descripción debe ser un texto",
      400
    );
  }

  return description?.trim() || null;
};

const validatePrice = (price) => {
  if (
    price === undefined ||
    price === null ||
    price === ""
  ) {
    throw new HttpError(
      "El precio del producto es obligatorio",
      400
    );
  }

  const numericPrice = Number(price);

  if (
    !Number.isFinite(numericPrice) ||
    numericPrice <= 0 ||
    !Number.isSafeInteger(Math.round(numericPrice * 100))
  ) {
    throw new HttpError(
      "El precio debe ser un número positivo con máximo dos decimales",
      400
    );
  }

  return new Prisma.Decimal(numericPrice.toFixed(2));
};

const validateStock = (stock) => {
  if (
    stock === undefined ||
    stock === null ||
    stock === ""
  ) {
    throw new HttpError(
      "El stock del producto es obligatorio",
      400
    );
  }

  const numericStock = Number(stock);

  if (
    !Number.isSafeInteger(numericStock) ||
    numericStock < 0
  ) {
    throw new HttpError(
      "El stock debe ser un entero mayor o igual a cero",
      400
    );
  }

  return numericStock;
};

const validateActive = (active) => {
  if (typeof active !== "boolean") {
    throw new HttpError(
      "El estado activo debe ser verdadero o falso",
      400
    );
  }

  return active;
};

// Crear producto
export const createProduct = async (productData) => {
  const { name, description, price, stock, active } = productData;

  const data = {
    name: validateName(name),
    description: validateDescription(description),
    price: validatePrice(price),
  };

  if (stock !== undefined) {
    data.stock = validateStock(stock);
  }

  if (active !== undefined) {
    data.active = validateActive(active);
  }

  return prisma.product.create({ data });
};

// Listar productos
export const getAllProducts = async (filters = {}) => {
  const where = {};

  if (filters.active !== undefined) {
    if (filters.active !== "true" && filters.active !== "false") {
      throw new HttpError(
        "El filtro active debe ser true o false",
        400
      );
    }

    where.active = filters.active === "true";
  }

  return prisma.product.findMany({
    where,
    orderBy: {
      createdAt: "desc",
    },
  });
};

// Obtener producto por ID
export const getProductById = async (idParam) => {
  const id = validateId(idParam);

  const product = await prisma.product.findUnique({
    where: { id },
  });

  if (!product) {
    throw new HttpError("Producto no encontrado", 404);
  }

  return product;
};

// Actualizar producto
export const updateProduct = async (idParam, productData) => {
  const id = validateId(idParam);

  const existingProduct = await prisma.product.findUnique({
    where: { id },
  });

  if (!existingProduct) {
    throw new HttpError("Producto no encontrado", 404);
  }

  const { name, description, price, stock, active } = productData;
  const data = {};

  if (name !== undefined) {
    data.name = validateName(name);
  }

  if (description !== undefined) {
    data.description = validateDescription(description);
  }

  if (price !== undefined) {
    data.price = validatePrice(price);
  }

  if (stock !== undefined) {
    data.stock = validateStock(stock);
  }

  if (active !== undefined) {
    data.active = validateActive(active);
  }

  if (Object.keys(data).length === 0) {
    throw new HttpError(
      "Debes proporcionar al menos un campo para actualizar",
      400
    );
  }

  return prisma.product.update({
    where: { id },
    data,
  });
};

// Actualizar stock
export const updateProductStock = async (idParam, stockValue) => {
  const id = validateId(idParam);
  const stock = validateStock(stockValue);

  const existingProduct = await prisma.product.findUnique({
    where: { id },
  });

  if (!existingProduct) {
    throw new HttpError("Producto no encontrado", 404);
  }

  return prisma.product.update({
    where: { id },
    data: { stock },
  });
};

// Eliminar producto
export const deleteProduct = async (idParam) => {
  const id = validateId(idParam);

  const existingProduct = await prisma.product.findUnique({
    where: { id },
  });

  if (!existingProduct) {
    throw new HttpError("Producto no encontrado", 404);
  }

  try {
    return await prisma.product.delete({
      where: { id },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      throw new HttpError(
        "No se puede eliminar el producto porque está asociado a otros registros",
        409
      );
    }

    throw error;
  }
};

