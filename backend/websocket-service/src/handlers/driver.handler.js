import {
  DRIVER_EVENTS,
  OFFER_EVENTS,
  TCP_EVENTS
} from '../protocols/message.types.js';

import { env } from '../config/env.js';
import { createOrderStatusService } from '../services/order-status.service.js';

export const createDriverHandler = ({
  tcpClient,
  locationService,
  socketStore,
  notificationService
}) => {
  const { avanzarEstadoPedido } = createOrderStatusService(env);

  const sendToTcp = (type, payload) => {
    return tcpClient.sendMessage(type, payload);
  };

  const handleDeliveryStatus = async (socket, userId, data, acknowledge) => {
    const respond = (result) => {
      if (typeof acknowledge === 'function') acknowledge(result);
    };

    try {
      const deliveryId = Number(data?.deliveryId);

      if (
        !data ||
        !Number.isSafeInteger(deliveryId) ||
        deliveryId <= 0 ||
        !['IN_TRANSIT', 'DELIVERED'].includes(data.status)
      ) {
        throw new Error('Los datos de actualización no son válidos');
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.internalServiceToken}`
      };

      // Consultar la entrega
      const response = await fetch(
        `${env.deliveryServiceUrl}/api/deliveries/${deliveryId}`,
        { headers }
      );

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success || !result.data) {
        throw new Error(result?.error || result?.message || 'No se pudo consultar la entrega');
      }

      const delivery = result.data;

      // Verificar que la entrega pertenece al repartidor
      if (String(delivery.courierId) !== String(userId)) {
        throw new Error('No tienes autorización para modificar esta entrega');
      }

      // Obtener el cliente antes de persistir para no dejar el cambio sin notificar.
      const orderResponse = await fetch(
        `${env.orderServiceUrl}/api/orders/${delivery.orderId}`,
        { headers }
      );
      const orderResult = await orderResponse.json().catch(() => null);

      if (!orderResponse.ok || !orderResult?.success || !orderResult.data?.customerId) {
        throw new Error(orderResult?.message || 'No se pudo consultar el cliente del pedido');
      }

      // Solicitar actualización al Delivery Service
      const updateResponse = await fetch(
        `${env.deliveryServiceUrl}/api/deliveries/${deliveryId}/status`,
        {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            status: data.status,
            notes: data.notes
          })
        }
      );

      const updatedResult = await updateResponse.json().catch(() => null);

      if (!updateResponse.ok || !updatedResult?.success || !updatedResult.data) {
        throw new Error(
          updatedResult?.error || updatedResult?.message || 'No se pudo actualizar la entrega'
        );
      }

      const updatedDelivery = updatedResult.data;

      try {
        await avanzarEstadoPedido(delivery.orderId, updatedDelivery.status);
      } catch (error) {
        console.error(
          'ERROR:',
          `La entrega ${deliveryId} cambió a ${updatedDelivery.status}, pero Order Service no se sincronizó:`,
          error.message
        );
      }

      const statusEvent = {
        deliveryId,
        orderId: delivery.orderId,
        status: updatedDelivery.status,
        assignedAt: updatedDelivery.assignedAt,
        startedAt: updatedDelivery.startedAt,
        deliveredAt: updatedDelivery.deliveredAt
      };

      if (updatedDelivery.status === 'DELIVERED') {
        try {
          sendToTcp(TCP_EVENTS.DRIVER_DELIVERY_COMPLETED, {
            driverId: userId,
            orderId: delivery.orderId
          });
        } catch (error) {
          console.error('ERROR: No se pudo liberar al repartidor en socket-service:', error.message);
        }
      }

      notificationService.notifyDeliveryStatus(
        String(orderResult.data.customerId),
        String(userId),
        statusEvent
      );

      respond({ success: true, data: updatedDelivery });

    } catch (error) {
      respond({ success: false, message: error.message });

      if (typeof acknowledge !== 'function') {
        socket.emit('ERROR', { message: error.message });
      }
    }
  };

  const handleConnection = (socket) => {
    const { userId } = socket.user;

    const existingConnections = socketStore.getUserSockets(userId);

    socketStore.addSocket(userId, socket.id, 'DRIVER');

    if (existingConnections.length === 0) {
      try {
        sendToTcp(TCP_EVENTS.DRIVER_ONLINE, {
          driverId: userId
        });
      } catch (error) {
        console.error('ERROR: Error al registrar repartidor:', error.message);
      }
    }

    socket.on(DRIVER_EVENTS.AVAILABLE, (data) => {
      try {
        const previous = locationService.getDriverLocation(userId);
        const location = locationService.updateDriverLocation(
          userId,
          data.location
        );

        if (
          !previous ||
          previous.latitude !== location.latitude ||
          previous.longitude !== location.longitude
        ) {
          console.info(
            `INFO: Ubicación seleccionada del repartidor ${userId}: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
          );
        }

        sendToTcp(TCP_EVENTS.DRIVER_AVAILABLE, {
          driverId: userId,
          location: {
            lat: location.latitude,
            lng: location.longitude
          }
        });
      } catch (error) {
        socket.emit('ERROR', { message: error.message });
      }
    });

    socket.on(DRIVER_EVENTS.UNAVAILABLE, () => {
      try {
        sendToTcp(TCP_EVENTS.DRIVER_UNAVAILABLE, {
          driverId: userId
        });
      } catch (error) {
        socket.emit('ERROR', { message: error.message });
      }
    });

    socket.on(DRIVER_EVENTS.LOCATION_UPDATED, (data) => {
      try {
        const location = locationService.updateDriverLocation(
          userId,
          data.location
        );

        sendToTcp(TCP_EVENTS.DRIVER_LOCATION_UPDATED, {
          driverId: userId,
          location: {
            lat: location.latitude,
            lng: location.longitude
          }
        });
      } catch (error) {
        socket.emit('ERROR', { message: error.message });
      }
    });

    socket.on(OFFER_EVENTS.ACCEPT, (data) => {
      sendOfferResponse(socket, OFFER_EVENTS.ACCEPT, data);
    });

    socket.on(OFFER_EVENTS.REJECT, (data) => {
      sendOfferResponse(socket, OFFER_EVENTS.REJECT, data);
    });

    socket.on('UPDATE_DELIVERY_STATUS', (data, acknowledge) => {
      handleDeliveryStatus(socket, userId, data, acknowledge);
    });

    socket.on('disconnect', () => {
      socketStore.removeSocket(userId, socket.id);

      const remainingConnections = socketStore.getUserSockets(userId);

      if (remainingConnections.length === 0) {
        try {
          sendToTcp(TCP_EVENTS.DRIVER_OFFLINE, {
            driverId: userId
          });
        } catch (error) {
          console.error('ERROR: Error al desconectar repartidor:', error.message);
        }

        locationService.removeDriverLocation(userId);
      }
    });
  };

  const sendOfferResponse = (socket, type, data) => {
    try {
      const orderId = Number(data?.orderId);

      if (
        !data ||
        typeof data.offerId !== 'string' ||
        typeof data.dispatchId !== 'string' ||
        !Number.isSafeInteger(orderId) ||
        orderId <= 0
      ) {
        throw new Error('Los datos de la oferta no son válidos.');
      }

      sendToTcp(type, {
        offerId: data.offerId,
        dispatchId: data.dispatchId,
        orderId,
        driverId: socket.user.userId
      });

    } catch (error) {
      socket.emit('ERROR', { message: error.message });
    }
  };

  return { handleConnection };
};
