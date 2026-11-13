import { HttpError } from '../utils/HttpError.js';

export const createLocationService = () => {
  const locations = new Map();

  const updateDriverLocation = (driverId, location) => {
    const latitude = Number(location?.latitude);
    const longitude = Number(location?.longitude);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      throw new HttpError('Las coordenadas no son válidas.', 400);
    }

    const updatedLocation = {
      latitude,
      longitude,
      updatedAt: new Date().toISOString()
    };

    locations.set(String(driverId), updatedLocation);

    return updatedLocation;
  };

  const getDriverLocation = (driverId) => {
    return locations.get(String(driverId)) || null;
  };

  const removeDriverLocation = (driverId) => {
    return locations.delete(String(driverId));
  };

  return {
    updateDriverLocation,
    getDriverLocation,
    removeDriverLocation
  };
};
