// Tipos de mensajes del protocolo TCP
export const MESSAGE_VERSION = 1;

// Eventos recibidos desde WebSocket server
export const DRIVER_EVENTS = {
  ONLINE: 'DRIVER_ONLINE',
  OFFLINE: 'DRIVER_OFFLINE',
  AVAILABLE: 'DRIVER_AVAILABLE',
  UNAVAILABLE: 'DRIVER_UNAVAILABLE',
  LOCATION_UPDATED: 'DRIVER_LOCATION_UPDATED',
  DRIVER_DELIVERY_COMPLETED: 'DRIVER_DELIVERY_COMPLETED'
};

// Eventos recibidos desde Order Service
export const ORDER_EVENTS = {
  NEW: 'NEW_ORDER',
  CANCEL: 'CANCEL_ORDER',
  RETRY: 'RETRY_ORDER'
};

// Respuestas de los repartidores (a través de WebSocket)
export const OFFER_RESPONSE_EVENTS = {
  ACCEPT: 'ACCEPT_OFFER',
  REJECT: 'REJECT_OFFER'
};

// Eventos enviados hacia WebSocket server
export const WEBSOCKET_EVENTS = {
  OFFER: 'OFFER_ORDER',
  OFFER_ACCEPTED: 'OFFER_ACCEPTED',
  CANCEL_OFFER: 'CANCEL_OFFER',
  OFFER_EXPIRED: 'OFFER_EXPIRED',
  ASSIGNMENT_CONFIRMED: 'ASSIGNMENT_CONFIRMED',
  ASSIGNMENT_FAILED: 'ASSIGNMENT_FAILED',
  NO_DRIVERS_AVAILABLE: 'NO_DRIVERS_AVAILABLE'
};

// Eventos de control del protocolo
export const SYSTEM_EVENTS = {
  ACK: 'ACK',
  PING: 'PING',
  PONG: 'PONG',
  ERROR: 'ERROR'
};

// Listado general de eventos
export const MESSAGE_TYPES = Object.freeze({
  ...DRIVER_EVENTS,
  ...ORDER_EVENTS,
  ...OFFER_RESPONSE_EVENTS,
  ...WEBSOCKET_EVENTS,
  ...SYSTEM_EVENTS
});
