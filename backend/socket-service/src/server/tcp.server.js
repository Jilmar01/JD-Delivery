// Este módulo será el punto de entrada de las conexiones TCP.

import net from 'node:net';

import { createMessageParser } from '../protocols/message.parser.js';

// Crea un servidor TCP y registra las funciones para sus eventos.
export const createTcpServer = ({
  port,
  onMessage = () => {},
  onError = () => {},
  onConnection = () => {},
  onDisconnection = () => {}
}) => {
  // Guarda los sockets activos para consultarlos y cerrarlos al detener el servidor.
  const connections = new Set();

  // Prepara cada conexión entrante y procesa sus mensajes.
  const server = net.createServer((socket) => {
    socket.setEncoding('utf8');
    connections.add(socket);

    const connectionInfo = {
      address: socket.remoteAddress,
      port: socket.remotePort
    };

    const parser = createMessageParser(
      (message) => onMessage(message, socket),
      (error) => onError(error, socket)
    );

    onConnection(connectionInfo, socket);

    socket.on('data', (chunk) => {
      parser.addChunk(chunk);
    });

    socket.on('error', (error) => {
      onError({
        type: 'SOCKET_ERROR',
        message: error.message
      }, socket);
    });

    socket.on('close', () => {
      parser.reset();
      connections.delete(socket);
      onDisconnection(connectionInfo, socket);
    });
  });

  // Inicia el servidor y devuelve la dirección donde quedó escuchando.
  const start = () => {
    return new Promise((resolve, reject) => {
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        reject(new Error('El puerto TCP no es válido.'));
        return;
      }

      if (server.listening) {
        resolve(server.address());
        return;
      }

      const handleError = (error) => {
        reject(error);
      };

      server.once('error', handleError);

      server.listen(port, () => {
        server.removeListener('error', handleError);
        resolve(server.address());
      });
    });
  };

  // Cierra las conexiones activas y detiene el servidor.
  const stop = () => {
    return new Promise((resolve, reject) => {
      if (!server.listening) {
        resolve();
        return;
      }

      for (const socket of connections) {
        socket.destroy();
      }

      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  };

  // Devuelve la cantidad de conexiones activas.
  const getConnections = () => connections.size;

  return {
    start,
    stop,
    getConnections
  };
};
