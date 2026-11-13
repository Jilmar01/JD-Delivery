const pendingByCustomer = new Map();

export const savePendingOrderSearch = (customerId, update) => {
  const key = String(customerId);
  const pending = pendingByCustomer.get(key) ?? new Map();
  const current = pending.get(Number(update.orderId));

  // Un aviso terminal de búsqueda agotada debe prevalecer sobre un vencimiento
  // individual que llegue tarde desde otra operación TCP.
  if (
    current?.searchStatus === 'NO_DRIVERS_AVAILABLE' &&
    update.searchStatus === 'OFFER_EXPIRED'
  ) {
    return;
  }

  pending.set(Number(update.orderId), update);
  pendingByCustomer.set(key, pending);
};

export const getPendingOrderSearches = (customerId) => {
  const key = String(customerId);
  const pending = pendingByCustomer.get(key);

  if (!pending) return [];

  return [...pending.values()];
};

export const getPendingOrderSearch = (customerId, orderId) => {
  return pendingByCustomer
    .get(String(customerId))
    ?.get(Number(orderId)) ?? null;
};

export const removePendingOrderSearch = (customerId, orderId) => {
  const key = String(customerId);
  const pending = pendingByCustomer.get(key);
  if (!pending) return false;

  const removed = pending.delete(Number(orderId));
  if (pending.size === 0) pendingByCustomer.delete(key);
  return removed;
};
