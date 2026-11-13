// Procesará los nuevos pedidos y las cancelaciones recibidas desde Order Service.


import {
  createDispatch,
  getDispatchByOrder,
  cancelDispatch,
  restartDispatch
} from '../stores/dispatch.store.js';

import { logger } from '../utils/logger.js';

export const createOrderHandler = ({
  onNewOrder,
  onCancelOrder,
  onRetryOrder
}) => {
  const handleNewOrder = async (payload) => {
  
    const existingDispatch = getDispatchByOrder(
      payload.orderId
    );

    if (existingDispatch) {
      logger.warn('El pedido ya tiene un despacho', {
        orderId: payload.orderId
      });

      return existingDispatch;
    }

    const dispatchId = crypto.randomUUID();

    const dispatch = createDispatch({
      dispatchId,
      orderId: payload.orderId
    });

    logger.info('Nuevo pedido recibido', {
      orderId: payload.orderId,
      dispatchId
    });

    await onNewOrder({
      ...payload,
      dispatchId
    });

    return dispatch;
  };

  const handleCancelOrder = async (payload) => {
    const dispatch = getDispatchByOrder(payload.orderId);
    const cancelled = dispatch
      ? cancelDispatch(dispatch.dispatchId) || dispatch
      : { orderId: payload.orderId };

    logger.info('Pedido cancelado', {
      orderId: payload.orderId,
      dispatchId: dispatch?.dispatchId
    });

    await onCancelOrder(cancelled);

    return cancelled;
  };

  const handleRetryOrder = async (payload) => {
    const existing = getDispatchByOrder(payload.orderId);
    const dispatch = existing
      ? restartDispatch(existing.dispatchId)
      : createDispatch({
          dispatchId: crypto.randomUUID(),
          orderId: payload.orderId
        });

    if (!dispatch) {
      throw new Error('El despacho ya no permite reiniciar la búsqueda.');
    }

    logger.info('Búsqueda de repartidor reiniciada', {
      orderId: payload.orderId,
      dispatchId: dispatch.dispatchId
    });

    await onRetryOrder({ ...payload, dispatchId: dispatch.dispatchId });
    return dispatch;
  };

  const handlers = {
    NEW_ORDER: handleNewOrder,
    CANCEL_ORDER: handleCancelOrder,
    RETRY_ORDER: handleRetryOrder
  };

  const handle = async (message) => {
    const handler = handlers[message.type];

    if (!handler) {
      logger.warn('Evento de pedido no reconocido', {
        type: message.type
      });

      return null;
    }

    return handler(message.payload);
  };

  return { handle };
};
