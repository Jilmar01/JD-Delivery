import net from 'node:net';
import { randomUUID } from 'node:crypto';
import { createMessageParser } from '../protocols/message.parser.js';

export const createTcpClient = ({
  serviceUrl,
  onError = () => {},
  onConnect = () => {},
  onDisconnect = () => {}
}) => {
  let targetUrl;

  try {
    targetUrl = new URL(serviceUrl);
  } catch {
    throw new Error('SOCKET_SERVICE_URL debe ser una URL TCP válida.');
  }

  const host = targetUrl.hostname;
  const port = Number(targetUrl.port);

  if (targetUrl.protocol !== 'tcp:' || !host || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('SOCKET_SERVICE_URL debe usar tcp://host:puerto.');
  }

  let socket = null;
  let connected = false;
  let connecting = false;
  let messageHandler = () => {};
  let parser = null;

  const connect = () => {
    if (connected) return Promise.resolve();

    if (connecting) {
      return Promise.reject(
        new Error('Ya existe una conexión TCP en proceso.')
      );
    }

    if (!host || !Number.isInteger(port) || port < 1 || port > 65535) {
      return Promise.reject(
        new Error('La configuración TCP no es válida.')
      );
    }

    connecting = true;

    return new Promise((resolve, reject) => {
      const client = net.createConnection({ host, port });

      socket = client;
      client.setEncoding('utf8');

      parser = createMessageParser(
        (message) => messageHandler(message),
        onError
      );

      client.on('connect', () => {
        connected = true;
        connecting = false;
        onConnect();
        resolve();
      });

      client.on('data', (chunk) => {
        parser?.addChunk(chunk);
      });

      client.on('error', (error) => {
        onError({
          type: 'CLIENT_ERROR',
          message: error.message
        });

        if (connecting) {
          connecting = false;
          reject(error);
        }
      });

      client.on('close', () => {
        const wasConnected = connected;

        connected = false;
        connecting = false;

        parser?.reset();
        parser = null;

        if (socket === client) {
          socket = null;
        }

        if (wasConnected) {
          onDisconnect();
        }
      });
    });
  };

  const sendMessage = (type, payload, correlationId) => {

    if (!connected || !socket || socket.destroyed) {
      throw new Error('No existe una conexión TCP activa.');
    }

    const message = {
      version: 1,
      type,
      messageId: randomUUID(),
      timestamp: new Date().toISOString(),
      payload
    };

    
    if (correlationId) {
      message.correlationId = correlationId;
    }
    
    return socket.write(`${JSON.stringify(message)}\n`);
  };

  const setMessageHandler = (handler) => {
    if (typeof handler !== 'function') {
      throw new Error('El manejador debe ser una función.');
    }

    messageHandler = handler;
  };

  const disconnect = () => {
    if (socket && !socket.destroyed) {
      socket.end();
    }
  };

  const isConnected = () => connected;

  return {
    connect,
    sendMessage,
    setMessageHandler,
    disconnect,
    isConnected
  };
};
