import { randomUUID } from 'node:crypto';

import {
  getOffersByDispatch,
  cancelOffer,
  OFFER_STATUS
} from '../stores/offer.store.js';

import {
  confirmDispatch,
  getDispatch,
  releaseDispatch
} from '../stores/dispatch.store.js';

import {
  setDriverBusy,
  removePendingOffer
} from '../stores/driver.store.js';

import { logger } from '../utils/logger.js';
import { HttpError } from '../utils/HttpError.js';

const createMessage = (type, payload, correlationId) => ({
  version: 1,
  type,
  messageId: randomUUID(),
  correlationId,
  timestamp: new Date().toISOString(),
  payload
});

export const createAssignmentService = ({
  sendToWebSocket,
  onAssignmentFailed = () => {}
}) => {
  if (typeof sendToWebSocket !== 'function') {
    throw new HttpError('Falta la dependencia para notificar al WebSocket Server.', 500);
  }

  const cancelOtherOffers = async (dispatchId) => {
    const offers = getOffersByDispatch(dispatchId);

    for (const offer of offers) {
      if (offer.status !== OFFER_STATUS.PENDING) continue;

      const cancelled = cancelOffer(
        offer.offerId,
        'ANOTHER_DRIVER_WAS_ASSIGNED'
      );

      if (!cancelled) continue;

      removePendingOffer(offer.driverId, offer.offerId);

      await sendToWebSocket(createMessage('CANCEL_OFFER', {
        offerId: offer.offerId,
        orderId: offer.orderId,
        driverId: offer.driverId,
        reason: 'ANOTHER_DRIVER_WAS_ASSIGNED'
      }, dispatchId));
    }
  };

  const confirmAssignment = async (offer, dispatch) => {
    try {
      await sendToWebSocket(createMessage('OFFER_ACCEPTED', {
        offerId: offer.offerId,
        dispatchId: dispatch.dispatchId,
        orderId: offer.orderId,
        driverId: offer.driverId
      }, dispatch.dispatchId));

      logger.info('Aceptación enviada al WebSocket Server', {
        dispatchId: dispatch.dispatchId,
        orderId: offer.orderId,
        driverId: offer.driverId
      });
    } catch (error) {
      releaseDispatch(dispatch.dispatchId);
      await onAssignmentFailed({ dispatchId: dispatch.dispatchId }, error);

      logger.error('No se pudo notificar la aceptación al WebSocket Server', {
        dispatchId: dispatch.dispatchId,
        message: error.message
      });
    }
  };

  const completeAssignment = async (payload) => {
    const dispatch = getDispatch(payload.dispatchId);

    if (
      !dispatch ||
      dispatch.status !== 'ASSIGNING' ||
      dispatch.orderId !== payload.orderId ||
      dispatch.acceptedDriverId !== payload.driverId
    ) {
      logger.warn('Confirmación de asignación sin despacho coincidente', {
        dispatchId: payload.dispatchId,
        orderId: payload.orderId,
        driverId: payload.driverId
      });
      return false;
    }

    const confirmed = confirmDispatch(
      payload.dispatchId,
      payload.deliveryId
    );

    if (!confirmed) return false;

    setDriverBusy(payload.driverId, true);
    await cancelOtherOffers(payload.dispatchId);

    logger.info('Asignación confirmada por WebSocket Server', {
      dispatchId: payload.dispatchId,
      orderId: payload.orderId,
      driverId: payload.driverId,
      deliveryId: payload.deliveryId
    });

    return true;
  };

  const failAssignment = async (payload) => {
    const dispatch = getDispatch(payload.dispatchId);

    if (
      !dispatch ||
      dispatch.status !== 'ASSIGNING' ||
      dispatch.orderId !== payload.orderId ||
      dispatch.acceptedDriverId !== payload.driverId
    ) {
      logger.warn('Fallo de asignación sin despacho coincidente', {
        dispatchId: payload.dispatchId,
        orderId: payload.orderId,
        driverId: payload.driverId
      });
      return false;
    }

    releaseDispatch(payload.dispatchId);
    await cancelOtherOffers(payload.dispatchId);
    await onAssignmentFailed({ dispatchId: payload.dispatchId }, payload.reason);

    logger.warn('WebSocket Server rechazó la asignación', {
      dispatchId: payload.dispatchId,
      orderId: payload.orderId,
      driverId: payload.driverId,
      reason: payload.reason
    });

    return true;
  };

  return {
    confirmAssignment,
    completeAssignment,
    failAssignment
  };
};
