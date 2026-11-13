// Este módulo permitirá que nuestro servidor TCP se conecte con otros 
// microservicios, como el WebSocket Server y el Order Service.

import net from 'node:net';

import { createMessageParser } from '../protocols/message.parser.js';

// Crea un cliente TCP y registra las funciones para sus eventos.
export const createTcpClient = ({
  host,
  port,
  onMessage = () => {},
  onError = () => {},
  onConnect = () => {},
  onDisconnect = () => {}
}) => {
  // Conserva el estado actual de la conexión.
  let socket = null;
  let connected = false;
  let connecting = false;

  // Abre una conexión y espera a que el servidor la acepte.
  const connect = () => {
    if (connected) {
      return Promise.resolve();
    }

    if (connecting) {
      return Promise.reject(
        new Error('Ya existe una conexión en proceso.')
      );
    }

    if (!host || !Number.isInteger(port)) {
      return Promise.reject(
        new Error('La configuración de conexión TCP no es válida.')
      );
    }

    connecting = true;

    return new Promise((resolve, reject) => {
      const client = net.createConnection({ host, port });

      socket = client;
      client.setEncoding('utf8');

      // Procesa los mensajes recibidos aunque lleguen en varios fragmentos.
      const parser = createMessageParser(
        (message) => onMessage(message),
        (error) => onError(error)
      );

      // Actualiza el estado y notifica los cambios de conexión.
      client.on('connect', () => {
        connected = true;
        connecting = false;

        onConnect();
        resolve();
      });

      client.on('data', (chunk) => {
        parser.addChunk(chunk);
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
        parser.reset();

        if (socket === client) {
          socket = null;
        }

        if (wasConnected) {
          onDisconnect();
        }
      });
    });
  };

  // Envía cada mensaje como JSON terminado en una nueva línea.
  const sendMessage = (message) => {
    if (!connected || !socket || socket.destroyed) {
      throw new Error('No existe una conexión TCP activa.');
    }

    const data = `${JSON.stringify(message)}\n`;

    return socket.write(data);
  };

  // Cierra la conexión activa de forma ordenada.
  const disconnect = () => {
    if (!socket || socket.destroyed) {
      return;
    }

    socket.end();
  };

  // Indica si el socket está conectado.
  const isConnected = () => connected;

  return {
    connect,
    sendMessage,
    disconnect,
    isConnected
  };
};
