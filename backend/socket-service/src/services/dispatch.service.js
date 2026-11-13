
import { randomUUID } from 'node:crypto';

import {
  createOffer,
  getPendingOffersByDispatch,
  expireOffer,
  cancelOffer
} from '../stores/offer.store.js';

import {
  getDispatch,
  getActiveDispatches,
  startNewRound,
  addDispatchOffers,
  excludeDriver,
  cancelDispatch,
  failDispatch
} from '../stores/dispatch.store.js';

import {
  addPendingOffer,
  removePendingOffer,
  setDriverAvailable,
  setDriverBusy
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

export const createDispatchService = ({
  availabilityService,
  sendToWebSocket,
  expiresIn = 30000,
  batchSize = 3
}) => {
  if (
    !availabilityService ||
    typeof sendToWebSocket !== 'function'
  ) {
    throw new HttpError('Faltan dependencias del servicio de despacho.', 500);
  }

  const orderData = new Map();
  const offerTimers = new Map();
  const startingDispatches = new Set();

  const notifyNoDriversAvailable = async (dispatch, reason = 'NO_DRIVERS_FOUND') => {
    if (getPendingOffersByDispatch(dispatch.dispatchId).length > 0) {
      return null;
    }

    const failed = failDispatch(dispatch.dispatchId);
    if (!failed) return null;

    try {
      await sendToWebSocket(createMessage('NO_DRIVERS_AVAILABLE', {
        dispatchId: dispatch.dispatchId,
        orderId: dispatch.orderId,
        reason
      }, dispatch.dispatchId));
      logger.info('Aviso de búsqueda agotada enviado al WebSocket Server', {
        orderId: dispatch.orderId,
        dispatchId: dispatch.dispatchId,
        reason
      });
    } catch (error) {
      logger.error('No se pudo notificar que no hay repartidores disponibles', {
        dispatchId: dispatch.dispatchId,
        message: error.message
      });
    }

    return failed;
  };

  const startDispatch = async ({ dispatchId, order }) => {
    if (startingDispatches.has(dispatchId)) {
      return null;
    }

    const dispatch = getDispatch(dispatchId);

    if (!dispatch || dispatch.status !== 'SEARCHING') {
      return null;
    }

    // DRIVER_AVAILABLE también llega en cada latido de ubicación. No se debe
    // abrir otra ronda mientras una de las tres ofertas actuales siga pendiente.
    if (getPendingOffersByDispatch(dispatchId).length > 0) {
      return null;
    }

    startingDispatches.add(dispatchId);
    orderData.set(dispatchId, order);

    try {
      const destination = {
        lat: order.deliveryLat,
        lng: order.deliveryLng
      };

      const candidates =
        availabilityService.findAvailableDrivers(
          dispatchId,
          destination,
          batchSize
        );

      if (candidates.length === 0) {
        logger.warn('No hay repartidores disponibles', {
          dispatchId,
          orderId: dispatch.orderId
        });

        // Si aún no se ofreció el pedido, mantenemos la búsqueda activa para
        // que un repartidor que se conecte después pueda recibirlo.
        if (
          dispatch.round > 0 &&
          getPendingOffersByDispatch(dispatchId).length === 0
        ) {
          await notifyNoDriversAvailable(dispatch, 'NO_DRIVERS_FOUND');
        }

        return [];
      }

      logger.info('Repartidores más cercanos seleccionados para la ronda', {
        message: candidates.map((driver) =>
          `${driver.driverId} (${driver.location.lat.toFixed(6)},${driver.location.lng.toFixed(6)}; ${driver.distance.toFixed(2)} km)`
        ).join(' | ')
      });

      const round = startNewRound(dispatchId);

      if (!round) return null;

      const createdOffers = [];

      for (const driver of candidates) {
        const offer = createOffer({
          offerId: randomUUID(),
          dispatchId,
          orderId: dispatch.orderId,
          driverId: driver.driverId,
          expiresIn
        });

        addPendingOffer(driver.driverId, offer.offerId);

        createdOffers.push(offer);
      }

      addDispatchOffers(
        dispatchId,
        createdOffers
      );

      for (const offer of createdOffers) {
        const message = createMessage(
          'OFFER_ORDER',
          {
            offerId: offer.offerId,
            dispatchId,
            orderId: offer.orderId,
            driverId: offer.driverId,
            expiresIn,
            deliveryAddress: order.deliveryAddress,
            deliveryLat: order.deliveryLat,
            deliveryLng: order.deliveryLng
          },
          dispatchId
        );

        try {
          await sendToWebSocket(message);

          const timer = setTimeout(() => {
            handleOfferExpiration(offer.offerId);
          }, expiresIn);

          offerTimers.set(offer.offerId, timer);
        } catch (error) {
          cancelOffer(
            offer.offerId,
            'DELIVERY_NOTIFICATION_FAILED'
          );

          removePendingOffer(
            offer.driverId,
            offer.offerId
          );

          excludeDriver(dispatchId, offer.driverId);

          logger.error('No se pudo enviar la oferta', {
            offerId: offer.offerId,
            message: error.message
          });
        }
      }

      logger.info('Ronda de ofertas iniciada', {
        dispatchId,
        round: round.round,
        offers: createdOffers.length
      });

      await handleOfferFailure(dispatchId);

      return createdOffers;
    } finally {
      startingDispatches.delete(dispatchId);
    }
  };

  const handleOfferExpiration = async (offerId) => {
    const timer = offerTimers.get(offerId);

    if (timer) {
      clearTimeout(timer);
      offerTimers.delete(offerId);
    }

    const expired = expireOffer(offerId);

    if (!expired) return null;

    removePendingOffer(
      expired.driverId,
      expired.offerId
    );

    excludeDriver(
      expired.dispatchId,
      expired.driverId
    );

    const message = createMessage(
      'OFFER_EXPIRED',
      {
        offerId: expired.offerId,
        orderId: expired.orderId,
        driverId: expired.driverId
      },
      expired.dispatchId
    );

    await sendToWebSocket(message);

    logger.info('Oferta vencida', {
      offerId,
      dispatchId: expired.dispatchId
    });

    await handleOfferFailure(expired.dispatchId);

    return expired;
  };

  const handleOfferFailure = async (dispatchId, reason = 'NO_DRIVERS_FOUND') => {
    const dispatch = getDispatch(dispatchId);

    if (!dispatch || dispatch.status !== 'SEARCHING') {
      return null;
    }

    const pendingOffers = getPendingOffersByDispatch(dispatchId);

    if (pendingOffers.length > 0) {
      return null;
    }

    const order = orderData.get(dispatchId);

    if (!order) return null;

    if (dispatch.round > 0) {
      return notifyNoDriversAvailable(dispatch, reason);
    }

    return startDispatch({
      dispatchId,
      order
    });
  };

  const cancelDispatchOffers = async (dispatchId, orderIdFallback) => {
    const dispatch = dispatchId ? getDispatch(dispatchId) : null;
    const cancelled = dispatch
      ? cancelDispatch(dispatchId) || dispatch
      : null;

    const pendingOffers = dispatchId
      ? getPendingOffersByDispatch(dispatchId)
      : [];

    for (const offer of pendingOffers) {
      cancelOffer(
        offer.offerId,
        'ORDER_CANCELLED'
      );

      removePendingOffer(
        offer.driverId,
        offer.offerId
      );

      const timer = offerTimers.get(offer.offerId);

      if (timer) {
        clearTimeout(timer);
        offerTimers.delete(offer.offerId);
      }

      const message = createMessage(
        'CANCEL_OFFER',
        {
          offerId: offer.offerId,
          orderId: offer.orderId,
          driverId: offer.driverId,
          reason: 'ORDER_CANCELLED'
        },
        dispatchId || undefined
      );

      await sendToWebSocket(message);
    }

    if (dispatchId) orderData.delete(dispatchId);

    const orderId = cancelled?.orderId ?? orderIdFallback;
    const driverId = cancelled?.acceptedDriverId ?? null;

    if (driverId != null) {
      setDriverBusy(driverId, false);
      setDriverAvailable(driverId, true);
    }

    if (orderId != null) {
      await sendToWebSocket(createMessage('ORDER_CANCELLED', {
        orderId,
        dispatchId: cancelled?.dispatchId ?? dispatchId ?? null,
        deliveryId: cancelled?.deliveryId ?? null,
        driverId,
        status: 'CANCELLED'
      }));
    }

    if (driverId != null) await retryPendingDispatches();

    return cancelled ?? { orderId };
  };

  const retryDispatch = async (dispatchId) => {
    const order = orderData.get(dispatchId);

    if (!order) {
      throw new HttpError('No existe información del pedido.', 404);
    }

    return startDispatch({
      dispatchId,
      order
    });
  };

  const retrySearch = async ({ dispatchId, order }) => {
    orderData.set(dispatchId, order);
    return startDispatch({ dispatchId, order });
  };

  const retryPendingDispatches = async () => {
    const pendingDispatches = getActiveDispatches()
      .filter(dispatch => dispatch.status === 'SEARCHING');

    return Promise.all(
      pendingDispatches.map(dispatch => {
        const order = orderData.get(dispatch.dispatchId);

        if (!order) return null;

        return startDispatch({
          dispatchId: dispatch.dispatchId,
          order
        });
      })
    );
  };

  const clearTimers = () => {
    for (const timer of offerTimers.values()) {
      clearTimeout(timer);
    }

    offerTimers.clear();
  };

  return {
    startDispatch,
    retryDispatch,
    retrySearch,
    retryPendingDispatches,
    handleOfferExpiration,
    handleOfferFailure,
    cancelDispatchOffers,
    clearTimers
  };
};
