import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const authMiddleware = (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error('TOKEN_REQUIRED'));
    }

    const decoded = jwt.verify(token, env.jwtSecret);

    const userId = decoded.id || decoded.sub;
    const role = decoded.role;

    if (!userId || !role) {
      return next(new Error('INVALID_TOKEN_PAYLOAD'));
    }

    if (!['CUSTOMER', 'DELIVERY_PERSON', 'ADMIN'].includes(role)) {
      return next(new Error('INVALID_USER_ROLE'));
    }

    socket.user = {
      userId: String(userId),
      role
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new Error('TOKEN_EXPIRED'));
    }

    return next(new Error('INVALID_TOKEN'));
  }
};