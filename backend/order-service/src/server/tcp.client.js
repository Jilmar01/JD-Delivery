import net from "node:net";
import { randomUUID } from "node:crypto";

// Envía un mensaje JSON Lines al servidor TCP y cierra la conexión al terminar.
export const createTcpClient = ({ serviceUrl, timeoutMs = 5000 }) => {
  let targetUrl;

  try {
    targetUrl = new URL(serviceUrl);
  } catch {
    throw new Error("SOCKET_SERVICE_URL debe ser una URL TCP válida");
  }

  const host = targetUrl.hostname;
  const port = Number(targetUrl.port);

  if (targetUrl.protocol !== "tcp:") {
    throw new Error("SOCKET_SERVICE_URL debe usar tcp://host:puerto");
  }

    
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("La configuración TCP del socket-service no es válida");
  }

  const sendMessage = (type, payload) => new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    let settled = false;

    const finish = (error) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      if (error) reject(error);
      else resolve(true);
    };

    socket.setTimeout(timeoutMs, () => {
      finish(new Error(`Tiempo de espera agotado conectando a ${host}:${port}`));
    });

    socket.once("error", finish);
    socket.once("connect", () => {
      const message = {
        version: 1,
        type,
        messageId: randomUUID(),
        timestamp: new Date().toISOString(),
        payload,
      };

      socket.write(`${JSON.stringify(message)}\n`, (error) => {
        if (error) return finish(error);
        finish();
      });
    });
  });

  return { sendMessage };
};
