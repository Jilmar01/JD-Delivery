import { Server } from 'socket.io';

import { env } from '../config/env.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

import { createConnectionHandler } from '../handlers/connection.handler.js';
import { createDriverHandler } from '../handlers/driver.handler.js';
import { createCustomerHandler } from '../handlers/customer.handler.js';
import { createAdminHandler } from '../handlers/admin.handler.js';
import { createConnectionService } from '../services/connection.service.js';
import { createNotificationService } from '../services/notification.service.js';

// Crea y configura el servidor que permite la comunicación en tiempo real.
export const createWebSocketServer = ({
  httpServer,
  tcpClient,
  locationService,
  socketStore
}) => {
  // Prepara Socket.IO usando el servidor HTTP y la dirección permitida del frontend.
  const io = new Server(httpServer, {

    cors: {
      origin: env.frontendUrl,
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  io.engine.on('connection_error', (error) => {
    console.error('ERROR: Error de conexión Socket.IO:', {
      code: error.code,
      message: error.message,
      transport: error.context?.transport?.name
    });
  });

  const connectionService = createConnectionService(io);
  const notificationService = createNotificationService(connectionService);

  // Crea los manejadores que atienden las acciones de conductores y clientes.
  const driverHandler = createDriverHandler({
    tcpClient,
    locationService,
    socketStore,
    notificationService
  });

  const customerHandler = createCustomerHandler({
    socketStore,
    tcpClient,
    env
  });

  const adminHandler = createAdminHandler();

  // Junta los manejadores que se usarán cuando alguien se conecte.
  const connectionHandler = createConnectionHandler({
    driverHandler,
    customerHandler,
    adminHandler
  });

  // Comprueba la identidad de cada conexión antes de aceptarla.
  io.use(authMiddleware);

  // Cuando un usuario se conecta, ejecuta la función que atiende esa conexión.
  io.on('connection', connectionHandler.handleConnection);

  // Devuelve el servidor listo para usarse.
  return { io, notificationService };
};
