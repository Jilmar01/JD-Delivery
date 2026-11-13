
import { createTcpServer } from './server/tcp.server.js';
import { env } from './config/env.js';

import { createDriverHandler } from './handlers/driver.handler.js';
import { createOrderHandler } from './handlers/order.handler.js';
import { createOfferHandler } from './handlers/offer.handler.js';

import { createAvailabilityService } from './services/availability.service.js';
import { createAssignmentService } from './services/assignment.service.js';
import { createDispatchService } from './services/dispatch.service.js';

import { logger } from './utils/logger.js';

const PORT = env.port;
const SERVICE_NAME = env.serviceName;
const OFFER_EXPIRATION = env.offerExpiration;

const OFFER_BATCH_SIZE = 3;

let shuttingDown = false;

let websocketTcpSocket = null;

const sendToWebSocket = async (message) => {
  if (!websocketTcpSocket || websocketTcpSocket.destroyed) {
    throw new Error('WebSocket Server is not connected.');
  }

  return new Promise((resolve, reject) => {
    websocketTcpSocket.write(`${JSON.stringify(message)}\n`, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(true);
    });
  });
};

const availabilityService = createAvailabilityService();

const dispatchService = createDispatchService({
  availabilityService,
  sendToWebSocket,
  expiresIn: OFFER_EXPIRATION,
  batchSize: OFFER_BATCH_SIZE
});

const assignmentService = createAssignmentService({
  sendToWebSocket,

  onAssignmentFailed: async (offer) => {
    await dispatchService.retryDispatch(offer.dispatchId);
  }
});

const driverHandler = createDriverHandler({
  onAvailable: async () => dispatchService.retryPendingDispatches()
});

const offerHandler = createOfferHandler({
  onAccepted: async (offer, dispatch) => {
    await assignmentService.confirmAssignment(
      offer,
      dispatch
    );
  },

  onRejected: async (offer) => {
    await dispatchService.handleOfferFailure(
      offer.dispatchId,
      'ALL_DRIVERS_REJECTED'
    );
  },

  onExpired: async (offer) => {
    await dispatchService.handleOfferFailure(
      offer.dispatchId,
      'ALL_OFFERS_EXPIRED'
    );
  }
});

const orderHandler = createOrderHandler({
  onNewOrder: async (order) => {
    await dispatchService.startDispatch({
      dispatchId: order.dispatchId,
      order
    });
  },

  onCancelOrder: async (dispatch) => {
    await dispatchService.cancelDispatchOffers(
      dispatch.dispatchId,
      dispatch.orderId
    );
  },

  onRetryOrder: async (order) => {
    await dispatchService.retrySearch({
      dispatchId: order.dispatchId,
      order
    });
  }
});

const tcpServer = createTcpServer({
  port: PORT,

  onConnection: (connection, socket) => {
    if (!websocketTcpSocket || websocketTcpSocket.destroyed) {
      websocketTcpSocket = socket;
    }
    logger.info('Nueva conexión TCP', connection);
  },

  onDisconnection: (connection, socket) => {
    if (websocketTcpSocket === socket) {
      websocketTcpSocket = null;
    }

    logger.info('Conexión TCP cerrada', connection);
  },

  onError: (error) => {
    logger.error('Error en servidor TCP', error);
  },

  onMessage: async (message, socket) => {
    try {
      switch (message.type) {
        case 'DRIVER_ONLINE':
        case 'DRIVER_OFFLINE':
        case 'DRIVER_AVAILABLE':
        case 'DRIVER_UNAVAILABLE':
        case 'DRIVER_LOCATION_UPDATED':
        case 'DRIVER_DELIVERY_COMPLETED':
          websocketTcpSocket = socket;
          await driverHandler.handle(message);
          break;

        case 'NEW_ORDER':
        case 'CANCEL_ORDER':
        case 'RETRY_ORDER':
          await orderHandler.handle(message);
          break;

        case 'ACCEPT_OFFER':
          websocketTcpSocket = socket;
          await offerHandler.handle(message);
          break;

        case 'ASSIGNMENT_CONFIRMED':
          await assignmentService.completeAssignment(message.payload);
          break;

        case 'ASSIGNMENT_FAILED':
          await assignmentService.failAssignment(message.payload);
          break;

        case 'REJECT_OFFER':
          websocketTcpSocket = socket;
          await offerHandler.handle(message);
          break;

        case 'PING':
          socket.write(
            `${JSON.stringify({
              version: 1,
              type: 'PONG',
              messageId: crypto.randomUUID(),
              correlationId: message.messageId,
              timestamp: new Date().toISOString(),
              payload: message.payload
            })}\n`
          );
          break;

        default:
          logger.warn('Mensaje TCP sin handler', {
            type: message.type
          });
      }
    } catch (error) {
      logger.error('Error procesando mensaje TCP', {
        type: message.type,
        message: error.message
      });
    }
  }
});


const startApplication = async () => {
  try {
    const address = await tcpServer.start();

    console.log('-----------------------------------');
    console.log(`Servicio: ${SERVICE_NAME}`);
    console.log(`Puerto TCP: ${address.port}`);
    console.log('Protocolo: TCP');
    console.log('-----------------------------------');

  } catch (error) {
    logger.error('No se pudo iniciar el servidor TCP', {
      message: error.message
    });

    process.exitCode = 1;
  }
};


const shutdown = async () => {
  if (shuttingDown) return;

  shuttingDown = true;

  logger.info('Cerrando servidor TCP...');

  dispatchService.clearTimers();

  try {
    await tcpServer.stop();

    logger.info('Servidor TCP detenido');
  } catch (error) {
    logger.error('Error cerrando servidor TCP', {
      message: error.message
    });
  }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

startApplication();
