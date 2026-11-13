// Administra las ofertas enviadas a los repartidores y sus estados.

const offers = new Map();

export const OFFER_STATUS = Object.freeze({
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED'
});

const cloneOffer = (offer) => ({ ...offer });

export const createOffer = ({
  offerId,
  dispatchId,
  orderId,
  driverId,
  expiresIn
}) => {
  if (!offerId || !dispatchId || !driverId) {
    throw new Error('Faltan identificadores para crear la oferta.');
  }

  if (offers.has(offerId)) {
    throw new Error('El identificador de la oferta ya existe.');
  }

  const createdAt = new Date();
  const expiresAt = new Date(
    createdAt.getTime() + expiresIn
  );

  const offer = {
    offerId,
    dispatchId,
    orderId,
    driverId,
    status: OFFER_STATUS.PENDING,
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    respondedAt: null,
    reason: null
  };

  offers.set(offerId, offer);

  return cloneOffer(offer);
};

export const getOffer = (offerId) => {
  const offer = offers.get(offerId);

  return offer ? cloneOffer(offer) : null;
};

export const getOffersByDispatch = (dispatchId) => {
  return [...offers.values()]
    .filter(offer => offer.dispatchId === dispatchId)
    .map(cloneOffer);
};

export const getPendingOffersByDispatch = (dispatchId) => {
  return [...offers.values()]
    .filter(offer =>
      offer.dispatchId === dispatchId &&
      offer.status === OFFER_STATUS.PENDING
    )
    .map(cloneOffer);
};

const updateOfferStatus = (offerId, status, reason = null) => {
  const offer = offers.get(offerId);

  if (!offer || offer.status !== OFFER_STATUS.PENDING) {
    return null;
  }

  offer.status = status;
  offer.reason = reason;
  offer.respondedAt = new Date().toISOString();

  return cloneOffer(offer);
};

export const acceptOffer = (offerId) => {
  return updateOfferStatus(offerId, OFFER_STATUS.ACCEPTED);
};

export const rejectOffer = (offerId, reason) => {
  return updateOfferStatus(
    offerId,
    OFFER_STATUS.REJECTED,
    reason
  );
};

export const expireOffer = (offerId) => {
  return updateOfferStatus(offerId, OFFER_STATUS.EXPIRED);
};

export const cancelOffer = (offerId, reason = null) => {
  return updateOfferStatus(
    offerId,
    OFFER_STATUS.CANCELLED,
    reason
  );
};

export const getExpiredPendingOffers = () => {
  const now = Date.now();

  return [...offers.values()]
    .filter(offer =>
      offer.status === OFFER_STATUS.PENDING &&
      new Date(offer.expiresAt).getTime() <= now
    )
    .map(cloneOffer);
};

export const clearOffers = () => {
  offers.clear();
};
