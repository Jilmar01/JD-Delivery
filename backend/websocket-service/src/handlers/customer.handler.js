import {
  getPendingOrderSearches,
  removePendingOrderSearch
} from '../stores/pending-order-search.store.js';

export const createCustomerHandler = ({ socketStore, tcpClient, env }) => {
  const handleConnection = (socket) => {
    const { userId } = socket.user;

    socketStore.addSocket(userId, socket.id, 'CUSTOMER');

    socket.join(`customer:${userId}`);

    for (const update of getPendingOrderSearches(userId)) {
      socket.timeout(5000).emit('ORDER_STATUS_UPDATED', update, (error) => {
        if (error) return;

        removePendingOrderSearch(userId, update.orderId);
        console.info(`INFO: Aviso pendiente del pedido ${update.orderId} confirmado por el cliente ${userId}.`);
      });
    }

    socket.on('RETRY_ORDER_SEARCH', async (payload = {}, acknowledge) => {
      const respond = (result) => {
        if (typeof acknowledge === 'function') acknowledge(result);
      };

      try {
        const orderId = Number(payload.orderId);
        if (!Number.isSafeInteger(orderId) || orderId <= 0) {
          throw new Error('El identificador del pedido no es válido.');
        }

        const response = await fetch(
          `${env.orderServiceUrl}/api/orders/${orderId}`,
          {
            headers: {
              Authorization: `Bearer ${env.internalServiceToken}`
            }
          }
        );
        const result = await response.json().catch(() => null);
        const order = result?.data ?? result;

        if (!response.ok || result?.success === false || !order) {
          throw new Error(result?.message || 'No se pudo consultar el pedido.');
        }
        if (String(order.customerId) !== String(userId)) {
          throw new Error('No tienes permiso para reiniciar este pedido.');
        }
        if (order.status !== 'PENDING') {
          throw new Error('Solo se puede buscar repartidor para un pedido pendiente.');
        }

        const deliveryLat = Number(order.deliveryLat);
        const deliveryLng = Number(order.deliveryLng);
        if (!Number.isFinite(deliveryLat) || !Number.isFinite(deliveryLng)) {
          throw new Error('El pedido no tiene una ubicación de entrega válida.');
        }

        tcpClient.sendMessage('RETRY_ORDER', {
          orderId,
          deliveryAddress: order.deliveryAddress,
          deliveryLat,
          deliveryLng
        });

        respond({ success: true });
      } catch (error) {
        respond({ success: false, message: error.message });
      }
    });

    console.info(`INFO: Cliente conectado: ${userId}`);

    socket.on('disconnect', (reason) => {
      socketStore.removeSocket(userId, socket.id);

      console.info(`INFO: Cliente desconectado: ${userId} (motivo: ${reason})`);
    });
  };

  return { handleConnection };
};
