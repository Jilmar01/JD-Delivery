import * as productService from "../services/product.service.js"
import { successResponse, errorResponse } from "../utils/response.js";

const handleError = (res, error, operation) => {
  console.error(`${operation}:`, error);

  const statusCode = error.status || 500;

  const msgError =
    statusCode >= 500
      ? "Error interno del servidor"
      : error.message;

  return errorResponse(res, operation, msgError, statusCode);
};

// POST /api/products
export const createProduct = async (req, res) => {
  try {
    const product = await productService.createProduct(req.body);

    return successResponse(
      res,
      "Producto creado correctamente",
      product,
      201
    );
  } catch (error) {
    return handleError(res, error, "Error al crear producto");
  }
};

// GET /api/products
export const getAllProducts = async (req, res) => {
  try {
    const products = await productService.getAllProducts(req.query);

    return successResponse(
      res,
      "Productos consultados correctamente",
      products,
      200,
      { total: products.length }
    );
  } catch (error) {
    return handleError(
      res,
      error,
      "Error al consultar productos"
    );
  }
};

// GET /api/products/:id
export const getProductById = async (req, res) => {
  try {
    const product = await productService.getProductById(req.params.id);

    return successResponse(
      res,
      "Producto consultado correctamente",
      product
    );
  } catch (error) {
    return handleError(
      res,
      error,
      "Error al consultar producto"
    );
  }
};

// PUT /api/products/:id
export const updateProduct = async (req, res) => {
  try {
    const product = await productService.updateProduct(
      req.params.id,
      req.body
    );

    return successResponse(
      res,
      "Producto actualizado correctamente",
      product
    );
  } catch (error) {
    return handleError(
      res,
      error,
      "Error al actualizar producto"
    );
  }
};

// PATCH /api/products/:id/stock
export const updateProductStock = async (req, res) => {
  try {
    const product = await productService.updateProductStock(
      req.params.id,
      req.body.stock
    );

    return successResponse(
      res,
      "Stock actualizado correctamente",
      product
    );
  } catch (error) {
    return handleError(
      res,
      error,
      "Error al actualizar stock"
    );
  }
};

// DELETE /api/products/:id
export const deleteProduct = async (req, res) => {
  try {
    const product = await deleteProduct(req.params.id);

    return successResponse(
      res,
      "Producto eliminado correctamente",
      product
    );
  } catch (error) {
    return handleError(
      res,
      error,
      "Error al eliminar producto"
    );
  }
};