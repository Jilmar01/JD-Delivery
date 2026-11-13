import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_WEBSOCKET_URL || 'http://localhost:4321';

const EVENTOS = {
  DRIVER_AVAILABLE: 'DRIVER_AVAILABLE',
  DRIVER_UNAVAILABLE: 'DRIVER_UNAVAILABLE',
  DRIVER_LOCATION_UPDATED: 'DRIVER_LOCATION_UPDATED',
  OFFER_ORDER: 'OFFER_ORDER',
  CANCEL_OFFER: 'CANCEL_OFFER',
  OFFER_EXPIRED: 'OFFER_EXPIRED',
  ACCEPT_OFFER: 'ACCEPT_OFFER',
  REJECT_OFFER: 'REJECT_OFFER',
  ASSIGNMENT_CONFIRMED: 'ASSIGNMENT_CONFIRMED',
  ASSIGNMENT_FAILED: 'ASSIGNMENT_FAILED',
  DELIVERY_STATUS_UPDATED: 'DELIVERY_STATUS_UPDATED'
};

export function useRepartidorSocket(token, manejadores = {}) {
  const socketRef = useRef(null);
  const manejadoresRef = useRef(manejadores);
  const estadoRef = useRef({
    posicion: null,
    disponible: false
  });

  const [conectado, setConectado] = useState(false);

  manejadoresRef.current = manejadores;

  const enviarUbicacion = useCallback((posicion, disponible) => {
    estadoRef.current = { posicion, disponible };

    const socket = socketRef.current;

    if (!socket?.connected || !posicion) return;

    const location = {
      latitude: posicion.lat,
      longitude: posicion.lng
    };

    if (disponible) {
      socket.emit(EVENTOS.DRIVER_AVAILABLE, { location });
    } else {
      socket.emit(EVENTOS.DRIVER_LOCATION_UPDATED, { location });
      socket.emit(EVENTOS.DRIVER_UNAVAILABLE);
    }
  }, []);

  const responderOferta = useCallback((oferta, aceptar) => {
    const socket = socketRef.current;

    if (!socket?.connected) return false;

    const orderId = oferta?.orderId ?? oferta?.pedidoId;
    if (!oferta?.offerId || !oferta?.dispatchId || orderId === undefined || orderId === null) {
      manejadoresRef.current.alError?.('La oferta no contiene los identificadores necesarios.');
      return false;
    }

    socket.emit(aceptar ? EVENTOS.ACCEPT_OFFER : EVENTOS.REJECT_OFFER, {
      offerId: oferta.offerId,
      dispatchId: oferta.dispatchId,
      orderId: String(orderId),
      ...(aceptar ? {} : { reason: 'NOT_INTERESTED' })
    });

    return true;
  }, []);

  const actualizarEstadoEntrega = useCallback((deliveryId, status, notes) => {
    const socket = socketRef.current;

    if (!socket?.connected) {
      return Promise.reject(new Error('No hay conexión con el WebSocket Server.'));
    }

    return new Promise((resolve, reject) => {
      socket.timeout(15000).emit(
        'UPDATE_DELIVERY_STATUS',
        { deliveryId, status, notes },
        (timeoutError, response) => {
          if (timeoutError) {
            reject(new Error('El WebSocket Server no confirmó la actualización a tiempo.'));
            return;
          }

          if (!response?.success) {
            reject(new Error(response?.message || 'No se pudo actualizar el estado de la entrega.'));
            return;
          }

          resolve(response.data);
        }
      );
    });
  }, []);

  const conectarse = useCallback((posicion) => {
    enviarUbicacion(posicion, true);
  }, [enviarUbicacion]);

  const cerrar = useCallback(() => {
    socketRef.current?.disconnect();
  }, []);

  useEffect(() => {
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      transports: ['polling']
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConectado(true);
      manejadoresRef.current.alConectar?.(socket.id);

      const { posicion, disponible } = estadoRef.current;

      if (posicion) {
        enviarUbicacion(posicion, disponible);
      }
    });

    socket.on('disconnect', (reason) => {
      setConectado(false);
      manejadoresRef.current.alDesconectar?.(reason);
    });

    socket.on('connect_error', (error) => {
      setConectado(false);
      manejadoresRef.current.alError?.(error.message);
    });

    socket.on('ERROR', (error) => {
      manejadoresRef.current.alError?.(error?.message || 'No se pudo responder a la oferta.');
    });

    [
      EVENTOS.OFFER_ORDER,
      EVENTOS.CANCEL_OFFER,
      EVENTOS.OFFER_EXPIRED,
      EVENTOS.ASSIGNMENT_CONFIRMED,
      EVENTOS.ASSIGNMENT_FAILED,
      EVENTOS.DELIVERY_STATUS_UPDATED
    ].forEach((evento) => {
      socket.on(evento, (datos) => {
        manejadoresRef.current.alEvento?.(evento, datos);
      });
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      setConectado(false);
    };
  }, [token, enviarUbicacion]);

  return {
    conectado,
    conectarse,
    enviarUbicacion,
    responderOferta,
    actualizarEstadoEntrega,
    cerrar
  };
}
