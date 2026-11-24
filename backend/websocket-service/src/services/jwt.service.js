import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const SERVICE_ID = 'websocket-service';

export const createInternalToken = ({
  id = SERVICE_ID,
  role = 'ADMIN'
} = {}) => jwt.sign(
  { id, role },
  env.jwtSecret,
  { expiresIn: '2m' }
);

export const createInternalHeaders = (identity) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${createInternalToken(identity)}`
});
