import 'dotenv/config';

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`La variable cr?tica ${name} no est? configurada.`);
  return value;
};

const withDefault = (name, defaultValue) => {
  const value = process.env[name] ?? defaultValue;
  if (value === '') throw new Error(`La variable ${name} no está configurada.`);
  return value;
};

export const env = {
  serviceName: process.env.SERVICE_NAME || 'websocket-service',
  port: Number(process.env.PORT || 4321),
  frontendUrl: withDefault('FRONTEND_URL', 'http://localhost:5173'),
  jwtSecret: required('JWT_SECRET'),
  internalServiceToken: required('INTERNAL_SERVICE_TOKEN'),
  deliveryServiceUrl: required('DELIVERY_SERVICE_URL'),
  orderServiceUrl: withDefault('ORDER_SERVICE_URL', 'http://localhost:3001'),
  socketServiceUrl: required('SOCKET_SERVICE_URL')
};
