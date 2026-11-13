// Utilizaremos la fórmula de Haversine para calcular distancias geográficas en kilómetros.

const EARTH_RADIUS_KM = 6371;

export const calculateDistance = (origin, destination) => {
  const toRadians = (degrees) => degrees * (Math.PI / 180);

  const lat1 = toRadians(origin.lat);
  const lat2 = toRadians(destination.lat);

  const deltaLat = toRadians(destination.lat - origin.lat);
  const deltaLng = toRadians(destination.lng - origin.lng);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) *
    Math.cos(lat2) *
    Math.sin(deltaLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
};

export const sortDriversByDistance = (drivers, destination) => {
  return drivers
    .filter(driver => driver.location)
    .map(driver => ({
      ...driver,
      distance: calculateDistance(
        driver.location,
        destination
      )
    }))
    .sort((a, b) => a.distance - b.distance);
};

export const getClosestDrivers = (
  drivers,
  destination,
  limit = 3
) => {
  return sortDriversByDistance(drivers, destination)
    .slice(0, limit);
};
