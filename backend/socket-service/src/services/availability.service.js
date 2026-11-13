
import { getAvailableDrivers } from '../stores/driver.store.js';
import { getDispatch } from '../stores/dispatch.store.js';
import { HttpError } from '../utils/HttpError.js';

import { getClosestDrivers } from '../utils/distance.js';

export const createAvailabilityService = () => {
  const findAvailableDrivers = (
    dispatchId,
    destination,
    limit = 3
  ) => {
    const dispatch = getDispatch(dispatchId);

    if (!dispatch) {
      throw new HttpError('El despacho no existe.', 404);
    }

    const excludedDrivers = new Set([
      ...dispatch.excludedDrivers,
      ...dispatch.offeredDriverIds
    ]);

    const availableDrivers = getAvailableDrivers()
      .filter(driver => !excludedDrivers.has(driver.driverId));

    return getClosestDrivers(
      availableDrivers,
      destination,
      limit
    );
  };

  return {
    findAvailableDrivers
  };
};
