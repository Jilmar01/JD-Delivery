import { createOrderStatusService } from '../services/order-status.service.js';
import { savePendingOrderSearch } from '../stores/pending-order-search.store.js';

const serviceHeaders = (internalToken) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${internalToken}`
});

const readServiceResponse = async (response, defaultMessage) => {
  const result = await response.json().catch(() => null);

  if (!response.ok || result?.success === false) {
    throw new Error(result?.message || defaultMessage);
  }

  return result?.data ?? result;
};

export const createOrderHandler = ({
  notificationService,
  tcpClient,
  env
}) => {
  const { avanzarEstadoPedido } = createOrderStatusService(env);

  const handleOrderCancelled = async (payload) => {
    const orderId = Number(payload?.orderId);
    if (!Number.isSafeInteger(orderId) || orderId <= 0) return;

    const headers = serviceHeaders(env.internalServiceToken);
    let order = null;
    let delivery = null;

    try {
      const orderResponse = await fetch(
        `${env.orderServiceUrl}/api/orders/${orderId}`,
        { headers }
      );
      order = await readServiceResponse(
        orderResponse,
        'No se pudo consultar el pedido cancelado.'
      );
    } catch (error) {
      console.error(`ERROR: No se pudo obtener el cliente del pedido ${orderId}:`, error.message);
    }

    try {
      const deliveryResponse = await fetch(
        `${env.deliveryServiceUrl}/api/deliveries/order/${orderId}`,
        { headers }
      );
      const result = await deliveryResponse.json().catch(() => null);

      if (deliveryResponse.ok && result?.success) {
        delivery = result.data;
      } else {
        console.error(`ERROR: No se pudo consultar la entrega del pedido ${orderId}:`, result?.message);
      }

      if (delivery && delivery.status !== 'CANCELLED' && delivery.status !== 'DELIVERED') {
        const updateResponse = await fetch(
          `${env.deliveryServiceUrl}/api/deliveries/${delivery.id}/status`,
          {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
              status: 'CANCELLED',
              notes: 'Pedido cancelado por el cliente'
            })
          }
        );
        const updateResult = await updateResponse.json().catch(() => null);

        if (!updateResponse.ok || !updateResult?.success || !updateResult.data) {
          console.error(`ERROR: No se pudo cancelar la entrega ${delivery.id}:`, updateResult?.message);
        } else {
          delivery = updateResult.data;
        }
      }
    } catch (error) {
      console.error(`ERROR: Error actualizando Delivery Service para el pedido ${orderId}:`, error.message);
    }

    const driverId = delivery?.courierId ?? payload.driverId ?? null;
    const event = {
      orderId,
      deliveryId: delivery?.id ?? payload.deliveryId ?? null,
      driverId,
      status: 'CANCELLED'
    };

    if (order?.customerId != null) {
      notificationService.notifyOrderStatus(String(order.customerId), event);
    }
    if (driverId != null) {
      notificationService.notifyDriverDeliveryStatus(String(driverId), event);
    }
  };

  const handleNoDriversAvailable = async (payload) => {
    const orderId = Number(payload?.orderId);
    if (!Number.isSafeInteger(orderId) || orderId <= 0) return;

    try {
      const response = await fetch(
        `${env.orderServiceUrl}/api/orders/${orderId}`,
        { headers: serviceHeaders(env.internalServiceToken) }
      );
      const order = await readServiceResponse(
        response,
        'No se pudo consultar el pedido sin repartidor.'
      );

      if (order?.customerId == null || order.status !== 'PENDING') return;

      const update = {
        orderId,
        status: order.status,
        searchStatus: 'NO_DRIVERS_AVAILABLE',
        reason: payload.reason
      };
      savePendingOrderSearch(order.customerId, update);
      const notified = notificationService.notifyOrderStatus(String(order.customerId), update);
      console.info(
        `INFO: Pedido ${orderId}: aviso terminal guardado; entrega Socket.IO ${notified ? 'intentada' : 'pendiente de reconexión'}.`
      );
    } catch (error) {
      console.error(`ERROR: No se pudo notificar la falta de repartidores para ${orderId}:`, error.message);
    }
  };

  const handleOfferExpired = async (payload) => {
    notificationService.notifyOfferExpired(payload.driverId, payload);

    const orderId = Number(payload?.orderId);
    if (!Number.isSafeInteger(orderId) || orderId <= 0) return;

    try {
      const response = await fetch(
        `${env.orderServiceUrl}/api/orders/${orderId}`,
        { headers: serviceHeaders(env.internalServiceToken) }
      );
      const order = await readServiceResponse(
        response,
        'No se pudo consultar el pedido con oferta vencida.'
      );

      if (order?.customerId == null || order.status !== 'PENDING') return;

      const update = {
        orderId,
        status: order.status,
        searchStatus: 'OFFER_EXPIRED',
        message: 'Una oferta venció. Seguimos buscando otro repartidor.'
      };
      savePendingOrderSearch(order.customerId, update);
      notificationService.notifyOrderStatus(String(order.customerId), update);
    } catch (error) {
      console.error(`ERROR: No se pudo notificar la oferta vencida del pedido ${orderId}:`, error.message);
    }
  };

  const handleOfferAccepted = async (payload) => {
    const orderId = Number(payload.orderId);
    const driverId = String(payload.driverId);
    const headers = serviceHeaders(env.internalServiceToken);

    try {
      const orderResponse = await fetch(
        `${env.orderServiceUrl}/api/orders/${orderId}`,
        { headers }
      );
      const order = await readServiceResponse(
        orderResponse,
        'No se pudo consultar el pedido en Order Service.'
      );

      if (!order?.customerId) {
        throw new Error('Order Service no devolvió el cliente del pedido.');
      }

      const deliveryLookup = await fetch(
        `${env.deliveryServiceUrl}/api/deliveries/order/${orderId}`,
        { headers }
      );
      const deliveryLookupResult = await deliveryLookup.json().catch(() => null);

      let delivery;

      const deliveryMissing =
        deliveryLookup.status === 404 ||
        (deliveryLookup.ok &&
          deliveryLookupResult?.success &&
          deliveryLookupResult.data === null);

      if (deliveryMissing) {
        const createResponse = await fetch(
          `${env.deliveryServiceUrl}/api/deliveries`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              orderId,
              deliveryAddress: order.deliveryAddress,
              deliveryLat: Number(order.deliveryLat),
              deliveryLng: Number(order.deliveryLng)
            })
          }
        );
        delivery = await readServiceResponse(
          createResponse,
          'No se pudo crear la entrega en Delivery Service.'
        );
      } else {
        if (!deliveryLookup.ok || !deliveryLookupResult?.success) {
          throw new Error(
            deliveryLookupResult?.message ||
              'No se pudo consultar la entrega en Delivery Service.'
          );
        }

        delivery = deliveryLookupResult.data;
      }

      if (!Number.isSafeInteger(Number(delivery?.id))) {
        throw new Error('Delivery Service no devolvió un ID de entrega válido.');
      }

      if (delivery.courierId != null && String(delivery.courierId) !== driverId) {
        throw new Error('La entrega ya está asignada a otro repartidor.');
      }

      if (String(delivery.courierId) !== driverId) {
        const assignResponse = await fetch(
          `${env.deliveryServiceUrl}/api/deliveries/${delivery.id}/assign`,
          {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ courierId: Number(driverId) })
          }
        );
        delivery = await readServiceResponse(
          assignResponse,
          'No se pudo asignar el repartidor en Delivery Service.'
        );
      }

      let updatedOrder = null;
      try {
        updatedOrder = await avanzarEstadoPedido(orderId, 'PREPARING');
      } catch (error) {
        console.error(`ERROR: No se pudo actualizar el pedido ${orderId} a PREPARING:`, error.message);
      }

      const assignment = {
        dispatchId: payload.dispatchId,
        orderId,
        driverId,
        deliveryId: Number(delivery.id),
        assignedAt: delivery.assignedAt || new Date().toISOString()
      };

      // La confirmación vuelve por TCP para que socket-service cierre el despacho.
      tcpClient.sendMessage('ASSIGNMENT_CONFIRMED', assignment);

      // WebSocket Server distribuye la asignación a los dos usuarios.
      notificationService.notifyAssignmentConfirmed(driverId, assignment);
      notificationService.notifyCustomerAssignment(order.customerId, {
        ...assignment,
        customerId: order.customerId
      });
      if (updatedOrder?.status) {
        notificationService.notifyOrderStatus(String(order.customerId), {
          orderId,
          status: updatedOrder.status
        });
      }
    } catch (error) {
      const failure = {
        dispatchId: payload.dispatchId,
        orderId,
        driverId,
        reason: error.message || 'No se pudo completar la asignación.'
      };

      notificationService.notifyAssignmentFailed(driverId, failure);

      try {
        tcpClient.sendMessage('ASSIGNMENT_FAILED', failure);
      } catch (tcpError) {
        console.error('ERROR: No se pudo devolver el fallo a socket-service:', tcpError.message);
      }
    }
  };

  const handleMessage = async (message) => {
    const { type, payload } = message;

    if (type === 'OFFER_ACCEPTED') {
      await handleOfferAccepted(payload);
      return true;
    }

    if (type === 'ORDER_CANCELLED') {
      await handleOrderCancelled(payload);
      return true;
    }

    if (type === 'NO_DRIVERS_AVAILABLE') {
      await handleNoDriversAvailable(payload);
      return true;
    }

    switch (type) {
      case 'OFFER_ORDER':
        notificationService.notifyDriverOffer(payload.driverId, payload);
        break;

      case 'CANCEL_OFFER':
        notificationService.notifyOfferCancelled(payload.driverId, payload);
        break;

      case 'OFFER_EXPIRED':
        await handleOfferExpired(payload);
        break;

      default:
        return false;
    }

    return true;
  };

  return { handleMessage };
};
