import {
  OFFER_EVENTS,
  ASSIGNMENT_EVENTS,
  CUSTOMER_EVENTS,
  DRIVER_EVENTS
} from '../protocols/message.types.js';

export const createNotificationService = (connectionService) => {
  const notifyDriverOffer = (driverId, offer) => {
    return connectionService.sendToUser(
      driverId,
      OFFER_EVENTS.ORDER,
      offer
    );
  };

  const notifyOfferCancelled = (driverId, data) => {
    return connectionService.sendToUser(
      driverId,
      OFFER_EVENTS.CANCELLED,
      data
    );
  };

  const notifyOfferExpired = (driverId, data) => {
    return connectionService.sendToUser(
      driverId,
      OFFER_EVENTS.EXPIRED,
      data
    );
  };

  const notifyAssignmentConfirmed = (driverId, data) => {
    return connectionService.sendToUser(
      driverId,
      ASSIGNMENT_EVENTS.CONFIRMED,
      data
    );
  };

  const notifyAssignmentFailed = (driverId, data) => {
    return connectionService.sendToUser(
      driverId,
      ASSIGNMENT_EVENTS.FAILED,
      data
    );
  };

  const notifyCustomerAssignment = (customerId, data) => {
    return connectionService.sendToUser(
      customerId,
      CUSTOMER_EVENTS.DRIVER_ASSIGNED,
      data
    );
  };

  const notifyOrderStatus = (customerId, data) => {
    return connectionService.sendToUser(
      customerId,
      CUSTOMER_EVENTS.ORDER_STATUS_UPDATED,
      data
    );
  };

  const notifyCustomerLocation = (customerId, data) => {
    return connectionService.sendToUser(
      customerId,
      CUSTOMER_EVENTS.DRIVER_LOCATION_UPDATED,
      data
    );
  };

  const notifyDriverDeliveryStatus = (driverId, data) => {
    return connectionService.sendToUser(
      driverId,
      DRIVER_EVENTS.DELIVERY_STATUS_UPDATED,
      data
    );
  };

  const notifyDeliveryStatus = (customerId, driverId, data) => {
    return {
      customerNotified: notifyOrderStatus(customerId, data),
      driverNotified: notifyDriverDeliveryStatus(driverId, data)
    };
  };

  return {
    notifyDriverOffer,
    notifyOfferCancelled,
    notifyOfferExpired,
    notifyAssignmentConfirmed,
    notifyAssignmentFailed,
    notifyCustomerAssignment,
    notifyOrderStatus,
    notifyCustomerLocation,
    notifyDriverDeliveryStatus,
    notifyDeliveryStatus
  };
};
