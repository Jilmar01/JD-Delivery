import { HttpError } from '../utils/HttpError.js';

const ESTADOS_PEDIDO = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'IN_TRANSIT',
  'DELIVERED'
];

const serviceHeaders = (internalToken) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${internalToken}`
});

const readResponse = async (response, message) => {
  const result = await response.json().catch(() => null);

  if (!response.ok || result?.success === false) {
    throw new HttpError(
      result?.message || message,
      response.ok ? 502 : response.status
    );
  }

  return result?.data ?? result;
};

export const createOrderStatusService = (env) => {
  const avanzarEstadoPedido = async (orderId, targetStatus) => {
    const targetIndex = ESTADOS_PEDIDO.indexOf(targetStatus);
    if (targetIndex < 0) {
      throw new HttpError(`Estado de pedido no válido: ${targetStatus}`, 400);
    }

    const headers = serviceHeaders(env.internalServiceToken);
    const response = await fetch(
      `${env.orderServiceUrl}/api/orders/${orderId}`,
      { headers }
    );
    let order = await readResponse(response, 'No se pudo consultar el pedido.');
    let currentIndex = ESTADOS_PEDIDO.indexOf(order?.status);

    if (order?.status === 'CANCELLED') {
      throw new HttpError('El pedido está cancelado y no puede avanzar de estado.', 409);
    }
    if (currentIndex < 0) {
      throw new HttpError(`Estado actual del pedido no reconocido: ${order?.status}`, 500);
    }

    while (currentIndex < targetIndex) {
      const nextStatus = ESTADOS_PEDIDO[currentIndex + 1];
      const updateResponse = await fetch(
        `${env.orderServiceUrl}/api/orders/${orderId}/status`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ status: nextStatus })
        }
      );
      order = await readResponse(
        updateResponse,
        `No se pudo actualizar el pedido a ${nextStatus}.`
      );
      currentIndex += 1;
    }

    return order;
  };

  return { avanzarEstadoPedido };
};
