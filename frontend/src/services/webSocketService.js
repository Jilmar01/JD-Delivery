import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_WEBSOCKET_URL || 'http://localhost:4321';

const EVENTOS = {
    SOLICITAR_UBICACION: 'SOLICITAR_UBICACION',
    OFERTA_PEDIDO: 'OFERTA_PEDIDO',
    PEDIDO_TOMADO: 'PEDIDO_TOMADO',
    OFERTA_EXPIRADA: 'OFERTA_EXPIRADA',
    ASIGNACION_OK: 'ASIGNACION_OK',
    ASIGNACION_RECHAZADA: 'ASIGNACION_RECHAZADA',
    PEDIDO_CANCELADO: 'PEDIDO_CANCELADO'
};

export class RepartidorSocket {

    constructor(token, manejadores = {}) {
        this.manejadores = manejadores;

        this.socket = io(SOCKET_URL, {
            auth: { token },
            reconnection: true
        });

        this.registrarEventos();
    }

    registrarEventos() {
        const socket = this.socket;

        socket.on('connect', () => {
            this.manejadores.alConectar?.(socket.id);
        });

        socket.on('disconnect', (reason) => {
            this.manejadores.alDesconectar?.(reason);
        });

        socket.on('connect_error', (error) => {
            this.manejadores.alError?.(error.message);
        });

        socket.on(EVENTOS.SOLICITAR_UBICACION, () => {
            this.manejadores.alSolicitarUbicacion?.();
        });

        Object.values(EVENTOS)
            .filter(evento => evento !== EVENTOS.SOLICITAR_UBICACION)
            .forEach(evento => {
                socket.on(evento, (datos) => {
                    this.manejadores.alEvento?.(evento, datos);
                });
            });
    }

    conectarse(posicion) {
        this.socket.emit('DELIVERY_ONLINE', posicion);
    }

    enviarUbicacion(posicion, disponible) {
        this.socket.emit('DELIVERY_LOCATION_UPDATE', {
            ...posicion,
            disponible
        });
    }

    aceptarPedido(pedidoId) {
        this.socket.emit('ACCEPT_ORDER', { pedidoId });
    }

    rechazarPedido(pedidoId) {
        this.socket.emit('REJECT_ORDER', { pedidoId });
    }

    cerrar() {
        this.socket.disconnect();
    }
}
