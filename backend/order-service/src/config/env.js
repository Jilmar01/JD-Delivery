import 'dotenv/config';

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`La variable crítica ${name} no está configurada.`);
  return value;
};

export const env = {
  serviceName: process.env.SERVICE_NAME || 'order-service',
  port: Number(process.env.PORT) || 3001,
  databaseUrl: required('DATABASE_URL'),
  frontendOrigins: (process.env.FRONTEND_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  socketServiceUrl: required('SOCKET_SERVICE_URL')
};
