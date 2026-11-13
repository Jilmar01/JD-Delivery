import 'dotenv/config';

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`La variable crítica ${name} no está configurada.`);
  return value;
};

export const env = {
  serviceName: process.env.SERVICE_NAME || 'auth-service',
  port: Number(process.env.PORT) || 3003,
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET')
};
