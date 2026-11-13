import * as orderService from "../services/order.service.js";
import { successResponse, errorResponse } from "../utils/response.js";

const handleError = (res, error, operation) => {
  console.error(`${operation}:`, error);

  const statusCode = error.status || 500;

  const msgError = error.status
    ? error.message
    : "Error interno del servidor";

  return errorResponse(res, operation, msgError, statusCode);
};

// POST /api/orders
export const createOrder = async (req, res) => {
  try {
    const order = await orderService.createOrder(req.body);

    return successResponse(
      res,
      "Pedido creado correctamente",
      order,
      201
    );
  } catch (error) {
    return handleError(res, error, "Error al crear pedido");
  }
};

// GET /api/orders
export const getAllOrders = async (req, res) => {
  
  const { customerId, status } = req.query;

  let filters = {};

  if(customerId) {
    filters.customerId = customerId;
  }

  if(status){
    filters.status = status;
  }
  
  try {
    const orders = await orderService.getAllOrders(filters);

    return successResponse(
      res,
      "Pedidos consultados correctamente",
      orders,
      200,
      { total: orders.length }
    );
  } catch (error) {
    return handleError(
      res,
      error,
      "Error al consultar pedidos"
    );
  }
};

// GET /api/orders/:id
export const getOrderById = async (req, res) => {
  try {
    const order = await orderService.getOrderById(req.params.id);

    return successResponse(
      res,
      "Pedido consultado correctamente",
      order
    );
  } catch (error) {
    return handleError(res, error, "Error al consultar pedido");
  }
};

// PATCH /api/orders/:id/status
export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const order = await orderService.updateOrderStatus(
      req.params.id,
      status
    );

    return successResponse(
      res,
      "Estado del pedido actualizado correctamente",
      order
    );
  } catch (error) {
    return handleError(
      res,
      error,
      "Error al actualizar estado del pedido"
    );
  }
};

// GET /api/orders/:id/offers
export const getOffers = async (req, res) => {
  try {
    const orderId = Number(req.params.id);
    const offers = await orderService.getOffers(orderId);

    return successResponse(
      res,
      "Offertas consultadas correctamente",
      offers,
      200,
      { total: offers.length }
    );
  } catch (error) {
    return handleError(
      res,
      error,
      "Error al consultar offertas de pedidos"
    );
  }
}

// GET /api/orders/:id/search-delivery
export const searchDelivery = async (req, res) => {
  const orderId = Number(req.params.id);

  try {
    const delivery = await orderService.searchDelivery(orderId);

    return successResponse(
      res,
      "Repartidor encontrado",
      delivery,
      200,
      { total: orders.delivery }
    );
  } catch (error) {
    return handleError(
      res,
      error,
      "Error al encontrar repartidor"
    );
  }
}
