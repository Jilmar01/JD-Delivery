import 'dotenv/config';

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`La variable crítica ${name} no está configurada.`);
  return value;
};

export const env = {
  serviceName: process.env.SERVICE_NAME || 'delivery-service',
  port: Number(process.env.PORT) || 3002,
  databaseUrl: required('DATABASE_URL')
};
