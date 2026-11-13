// Procesará las respuestas de los repartidores a las ofertas.


import {
  acceptOffer,
  rejectOffer,
  expireOffer,
  getOffer,
  OFFER_STATUS
} from '../stores/offer.store.js';

import {
  getDispatch,
  claimDispatch,
  excludeDriver
} from '../stores/dispatch.store.js';

import {
  removePendingOffer
} from '../stores/driver.store.js';

import { logger } from '../utils/logger.js';

export const createOfferHandler = ({
  onAccepted,
  onRejected,
  onExpired
}) => {
  const handleAccept = async (payload) => {
    const offer = getOffer(payload.offerId);

    if (!offer || offer.status !== OFFER_STATUS.PENDING) {
      return null;
    }

    if (
      offer.dispatchId !== payload.dispatchId ||
      offer.orderId !== payload.orderId ||
      offer.driverId !== payload.driverId
    ) {
      return null;
    }

    const dispatch = getDispatch(offer.dispatchId);

    if (!dispatch) return null;

    const claimed = claimDispatch({
      dispatchId: offer.dispatchId,
      offerId: offer.offerId,
      driverId: offer.driverId
    });

    if (!claimed) return null;

    const accepted = acceptOffer(offer.offerId);

    if (!accepted) return null;

    removePendingOffer(offer.driverId, offer.offerId);

    logger.info('Oferta aceptada', {
      offerId: offer.offerId,
      driverId: offer.driverId,
      orderId: offer.orderId
    });

    try {
      await onAccepted(accepted, claimed);
      return accepted;
    } catch (error) {
      logger.error('Error procesando aceptación', {
        offerId: offer.offerId,
        message: error.message
      });

      throw error;
    }
  };

  const handleReject = async (payload) => {
    const offer = getOffer(payload.offerId);

    if (!offer || offer.status !== OFFER_STATUS.PENDING) {
      return null;
    }

    if (
      offer.dispatchId !== payload.dispatchId ||
      offer.orderId !== payload.orderId ||
      offer.driverId !== payload.driverId
    ) {
      return null;
    }

    const rejected = rejectOffer(
      offer.offerId,
      payload.reason
    );

    if (!rejected) return null;

    removePendingOffer(offer.driverId, offer.offerId);
    excludeDriver(offer.dispatchId, offer.driverId);

    logger.info('Oferta rechazada', {
      offerId: offer.offerId,
      driverId: offer.driverId
    });

    await onRejected(rejected);

    return rejected;
  };

  const handleExpire = async (offerId) => {
    const offer = getOffer(offerId);

    if (!offer || offer.status !== OFFER_STATUS.PENDING) {
      return null;
    }

    const expired = expireOffer(offerId);

    if (!expired) return null;

    removePendingOffer(offer.driverId, offer.offerId);
    excludeDriver(offer.dispatchId, offer.driverId);

    logger.info('Oferta vencida', {
      offerId,
      driverId: offer.driverId
    });

    await onExpired(expired);

    return expired;
  };

  const handle = async (message) => {
    switch (message.type) {
      case 'ACCEPT_OFFER':
        return handleAccept(message.payload);

      case 'REJECT_OFFER':
        return handleReject(message.payload);

      default:
        logger.warn('Evento de oferta no reconocido', {
          type: message.type
        });

        return null;
    }
  };

  return {
    handle,
    handleExpire
  };
};
