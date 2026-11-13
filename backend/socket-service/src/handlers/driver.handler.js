// Procesará los eventos que recibe el servidor TCP desde el WebSocket Server.
import {
  addDriver,
  removeDriver,
  getDriver,
  updateDriverLocation,
  setDriverAvailable,
  setDriverBusy
} from '../stores/driver.store.js';

import { logger } from '../utils/logger.js';

export const createDriverHandler = ({ onAvailable = async () => {} } = {}) => {
  const handleOnline = (payload) => {

    const driver = addDriver(
      payload.driverId,
      payload.location ?? null
    );

    logger.info('Repartidor conectado', {
      driverId: payload.driverId
    });

    return driver;  
  };

  const handleOffline = (payload) => {
    const removed = removeDriver(payload.driverId);

    logger.info('Repartidor desconectado', {
      driverId: payload.driverId
    });

    return removed;
  };

  const handleAvailable = async (payload) => {

    const driver = getDriver(payload.driverId);

    if (!driver) return null;

    const nextLocation = payload.location;
    const positionChanged =
      !driver.location ||
      driver.location.lat !== nextLocation.lat ||
      driver.location.lng !== nextLocation.lng;

    updateDriverLocation(
      payload.driverId,
      nextLocation
    );

    if (positionChanged) {
      logger.info('Ubicación recibida del repartidor', {
        driverId: payload.driverId,
        message: `${nextLocation.lat.toFixed(6)}, ${nextLocation.lng.toFixed(6)}`
      });
    }

    const availableDriver = setDriverAvailable(payload.driverId, true);

    if (availableDriver) {
      await onAvailable(availableDriver);
    }

    return availableDriver;
  };

  const handleUnavailable = (payload) => {
    return setDriverAvailable(payload.driverId, false);
  };

  const handleLocationUpdated = (payload) => {
    return updateDriverLocation(
      payload.driverId,
      payload.location
    );
  };

  const handleAssignmentConfirmed = (payload) => {
    return setDriverBusy(payload.driverId, true);
  };

  const handleDeliveryCompleted = async (payload) => {
    const driver = getDriver(payload.driverId);

    if (!driver) return null;

    setDriverBusy(payload.driverId, false);
    const availableDriver = setDriverAvailable(payload.driverId, true);

    logger.info('Repartidor disponible tras completar la entrega', {
      driverId: payload.driverId,
      orderId: payload.orderId
    });

    if (availableDriver) {
      await onAvailable(availableDriver);
    }

    return availableDriver;
  };

  const handlers = {
    DRIVER_ONLINE: handleOnline,
    DRIVER_OFFLINE: handleOffline,
    DRIVER_AVAILABLE: handleAvailable,
    DRIVER_UNAVAILABLE: handleUnavailable,
    DRIVER_LOCATION_UPDATED: handleLocationUpdated,
    ASSIGNMENT_CONFIRMED: handleAssignmentConfirmed,
    DRIVER_DELIVERY_COMPLETED: handleDeliveryCompleted
  };

  const handle = (message) => {

    const handler = handlers[message.type];
    
    if (!handler) {
      logger.warn('Evento de repartidor no reconocido', {
        type: message.type
      });
      
      return null;
    }

    return handler(message.payload);
  };

  return { handle };
};
