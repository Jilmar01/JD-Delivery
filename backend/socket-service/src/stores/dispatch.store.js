// Administra el proceso de asignación de cada pedido. 
// También evita que dos repartidores ganen simultáneamente el mismo proceso.

const dispatches = new Map();
const orderDispatches = new Map();

export const DISPATCH_STATUS = Object.freeze({
  SEARCHING: 'SEARCHING',
  ASSIGNING: 'ASSIGNING',
  ASSIGNED: 'ASSIGNED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED'
});

const cloneDispatch = (dispatch) => ({
  ...dispatch,
  excludedDrivers: [...dispatch.excludedDrivers],
  offeredDriverIds: [...dispatch.offeredDriverIds],
  currentOfferIds: [...dispatch.currentOfferIds]
});

export const createDispatch = ({ dispatchId, orderId }) => {
  if (!dispatchId || !orderId) {
    throw new Error('Faltan datos para crear el despacho.');
  }

  if (dispatches.has(dispatchId)) {
    throw new Error('El despacho ya existe.');
  }

  if (orderDispatches.has(orderId)) {
    throw new Error('El pedido ya tiene un despacho.');
  }

  const dispatch = {
    dispatchId,
    orderId,
    status: DISPATCH_STATUS.SEARCHING,
    round: 0,
    excludedDrivers: new Set(),
    offeredDriverIds: new Set(),
    currentOfferIds: [],
    acceptedDriverId: null,
    deliveryId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  dispatches.set(dispatchId, dispatch);
  orderDispatches.set(orderId, dispatchId);

  return cloneDispatch(dispatch);
};

export const getDispatch = (dispatchId) => {
  const dispatch = dispatches.get(dispatchId);

  return dispatch ? cloneDispatch(dispatch) : null;
};

export const getDispatchByOrder = (orderId) => {
  const dispatchId = orderDispatches.get(orderId);

  return dispatchId ? getDispatch(dispatchId) : null;
};

export const getActiveDispatches = () => {
  return [...dispatches.values()]
    .filter(dispatch =>
      dispatch.status === DISPATCH_STATUS.SEARCHING ||
      dispatch.status === DISPATCH_STATUS.ASSIGNING
    )
    .map(cloneDispatch);
};

export const startNewRound = (dispatchId) => {
  const dispatch = dispatches.get(dispatchId);

  if (!dispatch || dispatch.status !== DISPATCH_STATUS.SEARCHING) {
    return null;
  }

  dispatch.round += 1;
  dispatch.currentOfferIds = [];
  dispatch.updatedAt = new Date().toISOString();

  return cloneDispatch(dispatch);
};

export const addDispatchOffers = (dispatchId, offers) => {
  const dispatch = dispatches.get(dispatchId);

  if (!dispatch || dispatch.status !== DISPATCH_STATUS.SEARCHING) {
    return null;
  }

  for (const offer of offers) {
    dispatch.currentOfferIds.push(offer.offerId);
    dispatch.offeredDriverIds.add(offer.driverId);
  }

  dispatch.updatedAt = new Date().toISOString();

  return cloneDispatch(dispatch);
};

export const excludeDriver = (dispatchId, driverId) => {
  const dispatch = dispatches.get(dispatchId);

  if (!dispatch) return false;

  dispatch.excludedDrivers.add(driverId);
  dispatch.updatedAt = new Date().toISOString();

  return true;
};

export const getExcludedDrivers = (dispatchId) => {
  const dispatch = dispatches.get(dispatchId);

  return dispatch ? [...dispatch.excludedDrivers] : [];
};

export const claimDispatch = ({
  dispatchId,
  offerId,
  driverId
}) => {
  const dispatch = dispatches.get(dispatchId);

  if (!dispatch || dispatch.status !== DISPATCH_STATUS.SEARCHING) {
    return null;
  }

  if (!dispatch.currentOfferIds.includes(offerId)) {
    return null;
  }

  if (dispatch.excludedDrivers.has(driverId)) {
    return null;
  }

  dispatch.status = DISPATCH_STATUS.ASSIGNING;
  dispatch.acceptedDriverId = driverId;
  dispatch.updatedAt = new Date().toISOString();

  return cloneDispatch(dispatch);
};

export const confirmDispatch = (dispatchId, deliveryId) => {
  const dispatch = dispatches.get(dispatchId);

  if (!dispatch || dispatch.status !== DISPATCH_STATUS.ASSIGNING) {
    return null;
  }

  dispatch.status = DISPATCH_STATUS.ASSIGNED;
  dispatch.deliveryId = deliveryId;
  dispatch.updatedAt = new Date().toISOString();

  return cloneDispatch(dispatch);
};

export const releaseDispatch = (dispatchId) => {
  const dispatch = dispatches.get(dispatchId);

  if (!dispatch || dispatch.status !== DISPATCH_STATUS.ASSIGNING) {
    return null;
  }

  if (dispatch.acceptedDriverId) {
    dispatch.excludedDrivers.add(dispatch.acceptedDriverId);
  }

  dispatch.status = DISPATCH_STATUS.SEARCHING;
  dispatch.acceptedDriverId = null;
  dispatch.updatedAt = new Date().toISOString();

  return cloneDispatch(dispatch);
};

export const cancelDispatch = (dispatchId) => {
  const dispatch = dispatches.get(dispatchId);

  if (!dispatch || dispatch.status === DISPATCH_STATUS.CANCELLED) {
    return null;
  }

  dispatch.status = DISPATCH_STATUS.CANCELLED;
  dispatch.updatedAt = new Date().toISOString();

  return cloneDispatch(dispatch);
};

export const failDispatch = (dispatchId) => {
  const dispatch = dispatches.get(dispatchId);

  if (!dispatch || dispatch.status === DISPATCH_STATUS.ASSIGNED) {
    return null;
  }

  dispatch.status = DISPATCH_STATUS.FAILED;
  dispatch.updatedAt = new Date().toISOString();

  return cloneDispatch(dispatch);
};

export const restartDispatch = (dispatchId) => {
  const dispatch = dispatches.get(dispatchId);

  if (!dispatch || dispatch.status !== DISPATCH_STATUS.FAILED) {
    return null;
  }

  dispatch.status = DISPATCH_STATUS.SEARCHING;
  dispatch.excludedDrivers.clear();
  dispatch.offeredDriverIds.clear();
  dispatch.currentOfferIds = [];
  dispatch.acceptedDriverId = null;
  dispatch.deliveryId = null;
  dispatch.updatedAt = new Date().toISOString();

  return cloneDispatch(dispatch);
};

export const removeDispatch = (dispatchId) => {
  const dispatch = dispatches.get(dispatchId);

  if (!dispatch) return false;

  dispatches.delete(dispatchId);
  orderDispatches.delete(dispatch.orderId);

  return true;
};

export const clearDispatches = () => {
  dispatches.clear();
  orderDispatches.clear();
};
