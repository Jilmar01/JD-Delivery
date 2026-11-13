// Administra los repartidores que están conectados al sistema.

const drivers = new Map();

const createDriverState = (driverId, location = null) => ({
  driverId,
  connected: true,
  available: false,
  busy: false,
  location,
  pendingOffers: new Set(),
  connectedAt: new Date().toISOString(),
  lastLocationUpdate: null
});

const cloneDriver = (driver) => ({
  ...driver,
  location: driver.location ? { ...driver.location } : null,
  pendingOffers: [...driver.pendingOffers]
});

export const addDriver = (driverId, location = null) => {
  if (!driverId) {
    throw new Error('El identificador del repartidor es obligatorio.');
  }

  const driver = createDriverState(driverId, location);

  drivers.set(driverId, driver);

  return cloneDriver(driver);
};

export const removeDriver = (driverId) => {
  const driver = drivers.get(driverId);

  if (!driver) return false;

  driver.connected = false;
  driver.available = false;

  drivers.delete(driverId);

  return true;
};

export const getDriver = (driverId) => {
  const driver = drivers.get(driverId);

  return driver ? cloneDriver(driver) : null;
};

export const getAllDrivers = () => {
  return [...drivers.values()].map(cloneDriver);
};

export const updateDriverLocation = (driverId, location) => {
  const driver = drivers.get(driverId);

  if (!driver) return null;

  driver.location = { ...location };
  driver.lastLocationUpdate = new Date().toISOString();

  return cloneDriver(driver);
};

export const setDriverAvailable = (driverId, available) => {
  const driver = drivers.get(driverId);

  if (!driver) return null;

  driver.available = Boolean(available);

  return cloneDriver(driver);
};

export const setDriverBusy = (driverId, busy) => {
  const driver = drivers.get(driverId);

  if (!driver) return null;

  driver.busy = Boolean(busy);

  if (driver.busy) {
    driver.available = false;
  }

  return cloneDriver(driver);
};

export const addPendingOffer = (driverId, offerId) => {
  const driver = drivers.get(driverId);

  if (!driver) return false;

  driver.pendingOffers.add(offerId);

  return true;
};

export const removePendingOffer = (driverId, offerId) => {
  const driver = drivers.get(driverId);

  if (!driver) return false;

  return driver.pendingOffers.delete(offerId);
};

export const getAvailableDrivers = () => {
  return [...drivers.values()]
    .filter(driver =>
      driver.connected &&
      driver.available &&
      !driver.busy &&
      driver.location &&
      driver.pendingOffers.size === 0
    )
    .map(cloneDriver);
};

export const clearDrivers = () => {
  drivers.clear();
};
