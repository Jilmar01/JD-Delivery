import express from 'express';
import http from 'node:http';

import { env } from './config/env.js';

import { createWebSocketServer } from './server/websocket.server.js';
import { createTcpClient } from './server/tcp.client.js';

import * as socketStore from './stores/socket.store.js';

import { createLocationService } from './services/location.service.js';

import { createOrderHandler } from './handlers/order.handler.js';
import defaultRoutes, { notFoundHandler } from './routes/default.routes.js';
import jwt from 'jsonwebtoken';
import {
  getPendingOrderSearch,
  removePendingOrderSearch
} from './stores/pending-order-search.store.js';

const app = express();

app.use(express.json());

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin === env.frontendUrl) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  }

  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.get('/api/customer/orders/:orderId/search-status', (req, res) => {
  try {
    const orderId = Number(req.params.orderId);
    if (!Number.isSafeInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ success: false, message: 'ID de pedido no válido.' });
    }

    const authorization = req.headers.authorization || '';
    const token = authorization.startsWith('Bearer ')
      ? authorization.slice(7)
      : null;
    if (!token) {
      return res.status(401).json({ success: false, message: 'Token requerido.' });
    }

    const decoded = jwt.verify(token, env.jwtSecret);
    const customerId = String(decoded.id || decoded.sub || '');
    if (!customerId || decoded.role !== 'CUSTOMER') {
      return res.status(403).json({ success: false, message: 'Acceso no permitido.' });
    }

    const update = getPendingOrderSearch(customerId, orderId);
    if (update) removePendingOrderSearch(customerId, orderId);

    return res.status(200).json({ success: true, data: update });
  } catch {
    return res.status(401).json({ success: false, message: 'Token no válido.' });
  }
});

const tcpClient = createTcpClient({
  serviceUrl: env.socketServiceUrl,

  onConnect: () => {
    console.info('INFO: Conexión TCP establecida.');
  },

  onDisconnect: () => {
    console.info('INFO: Conexión TCP cerrada.');
  },

  onError: (error) => {
    console.error('ERROR: Error TCP:', error.message);
  }
});

app.set('tcpClient', tcpClient);
app.use(defaultRoutes);
app.use(notFoundHandler);

const httpServer = http.createServer(app);

const locationService = createLocationService();

const { io, notificationService } = createWebSocketServer({
  httpServer,
  tcpClient,
  locationService,
  socketStore
});

const orderHandler = createOrderHandler({
  notificationService,
  tcpClient,
  env
});

tcpClient.setMessageHandler((message) => {
  orderHandler.handleMessage(message);
});

const startServer = async () => {
  try {
    await tcpClient.connect();

    httpServer.listen(env.port, () => {
      console.log('-----------------------------------');
      console.log(`Servicio: ${env.serviceName}`);
      console.log(`Puerto: ${env.port}`);
      console.log(`URL: http://localhost:${env.port}`);
      console.log(`Health: http://localhost:${env.port}/api/websocket/health`);
      console.log('-----------------------------------');
    });
  } catch (error) {
    console.error('ERROR: No se pudo iniciar el servidor:', error.message);
    process.exit(1);
  }
};

const shutdown = () => {
  console.info('INFO: Cerrando WebSocket Server...');

  tcpClient.disconnect();
  io.close();

  httpServer.close(() => {
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

startServer();
