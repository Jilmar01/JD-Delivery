import 'dotenv/config';

const portValue = Number(process.env.PORT);
if (!Number.isInteger(portValue) || portValue <= 0 || portValue > 65535) {
  throw new Error('La variable PORT debe ser un puerto válido.');
}

const offerExpiration = Number(process.env.OFFER_EXPIRATION || 30000);
if (!Number.isFinite(offerExpiration) || offerExpiration <= 0) {
  throw new Error('La variable OFFER_EXPIRATION debe ser un número positivo.');
}

export const env = {
  serviceName: process.env.SERVICE_NAME || 'socket-service',
  port: portValue,
  offerExpiration
};
