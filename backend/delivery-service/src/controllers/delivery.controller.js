import * as deliveryService from "../services/delivery.service.js";
import { errorResponse, successResponse } from "../utils/response.js";

const handleError = (res, error, operation) => {
  console.error(`${operation}:`, error);

  const statusCode = error.status || error.statusCode || 500;

  const msgError = error.status || error.statusCode
    ? error.message
    : "Error interno del servidor";

  return errorResponse(res, operation, msgError, statusCode);
};

// POST /api/deliveries
export async function createDelivery(req, res) {
  try {
    const delivery = await deliveryService.createDelivery(req.body);

    return successResponse(
      res,
      "Entrega creada correctamente",
      delivery,
      201
    );
  } catch (error) {
    return handleError(res, error, "Error al crear una entrega");
  }
}

// GET /api/deliveries
export async function getAllDeliveries(req, res) {
  try {
    const deliveries = await deliveryService.getAllDeliveries();

    return successResponse(
      res,
      "Entregas consultadas correctamente",
      deliveries,
      200,
      { total: deliveries.length }
    )

  } catch (error) {
    return handleError(res, error, "Error al consultar entregas");
  }
}

// GET /api/deliveries/:id
export async function getDeliveryById(req, res) {
  try {
    const delivery = await deliveryService.getDeliveryById(req.params.id);

    return successResponse(
      res,
      "Entrega consultado correctamente",
      delivery
    )
  } catch (error) {
    return handleError(res, error, "Error al consultar entrega");
  }
}

// PATCH /api/deliveries/:id/assign
export async function assignCourier(req, res) {
  try {
    const delivery = await deliveryService.assignCourier(
      req.params.id,
      req.body.courierId
    );

    return successResponse(
      res,
      "Repartidor asignado correctamente",
      delivery
    );
  } catch (error) {
    return handleError(res, error, "Error al asignar repartidor");
  }
}

// PATCH /api/deliveries/:id/status
export async function updateDeliveryStatus(req, res) {
  try {
    const delivery = await deliveryService.updateDeliveryStatus(
      req.params.id,
      req.body.status,
      req.body.notes
    );

    return successResponse(
      res, 
      "Estado de la entrega actualizado correctamente",
      delivery
    );
  } catch (error) {
    return handleError(res, error, "Error al actualizar el estado de la entrega");
  }
}

// GET /api/deliveries/courier/:courierId
export async function getDeliveriesByCourier(req, res) {
  try {
    const deliveries = await deliveryService.getDeliveriesByCourier(
      req.params.courierId
    );

    return res.status(200).json({
      success: true,
      total: deliveries.length,
      data: deliveries,
    });
  } catch (error) {
    return handleError(res, error, "Error al consultar entregas del repartidor");
  }
}

// GET /api/deliveries/order/:orderId
export async function getDeliveryByOrder(req, res) {
  try {
    const delivery = await deliveryService.getDeliveryByOrder(
      req.params.orderId
    );
    
    return res.status(200).json({
      success: true,
      data: delivery,
    });
  } catch (error) {
    const statusCode = error.status || error.statusCode;

    // Antes de asignar al repartidor es normal que la entrega aún no exista.
    if (statusCode === 404) {
      return successResponse(
        res,
        "Todavía no existe una entrega para este pedido",
        null,
        200
      );
    }

    return handleError(res, error, "Error al consultar entrega por pedido");
  }
}

// GET /api/deliveries/:id/history
export async function getDeliveryHistory(req, res) {
  try {
    const history = await deliveryService.getDeliveryHistory(req.params.id);

    return res.status(200).json({
      success: true,
      total: history.length,
      data: history,
    });
  } catch (error) {
    return handleError(res, error, "Error al consultar historial de entrega");
  }
}
