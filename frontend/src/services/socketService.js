import { io } from 'socket.io-client'

const SOCKET_URL =
  import.meta.env.VITE_WEBSOCKET_URL || 'http://localhost:4321'

// Eventos que el servicio de sockets reenvía desde el servidor TCP al repartidor
const EVENTOS_TCP = [
  'OFERTA_PEDIDO',
  'PEDIDO_TOMADO',
  'OFERTA_EXPIRADA',
  'ASIGNACION_OK',
  'ASIGNACION_RECHAZADA',
  'PEDIDO_CANCELADO',
]

/**
 * Conecta al repartidor con el servicio de sockets (socket.io, autenticado con su JWT).
 * manejadores: { alConectar, alDesconectar, alError, alEvento(tipo, datos) }
 * Devuelve acciones para enviar su posición y responder ofertas.
 */
export function conectarRepartidor(token, manejadores) {
  const socket = io(SOCKET_URL, {
    auth: { token },
    reconnection: true,
  })

  socket.on('connect', () => manejadores.alConectar?.())
  socket.on('disconnect', () => manejadores.alDesconectar?.())
  // El servicio de sockets lo pide cuando se (re)inicia el puente hacia el TCP
  socket.on('SOLICITAR_UBICACION', () => manejadores.alSolicitarUbicacion?.())
  socket.on('connect_error', (error) =>
    manejadores.alError?.(error.message || 'No se pudo conectar con los sockets.')
  )
  for (const tipo of EVENTOS_TCP) {
    socket.on(tipo, (datos) => manejadores.alEvento?.(tipo, datos))
  }

  return {
    // Se registra en el servidor TCP con su posición
    conectarse: (posicion) => socket.emit('DELIVERY_ONLINE', posicion),
    // Mantiene su posición vigente (el servidor descarta posiciones de más de 60 s)
    enviarUbicacion: (posicion, disponible) =>
      socket.emit('DELIVERY_LOCATION_UPDATE', { ...posicion, disponible }),
    aceptar: (pedidoId) => socket.emit('ACCEPT_ORDER', { pedidoId }),
    rechazar: (pedidoId) => socket.emit('REJECT_ORDER', { pedidoId }),
    cerrar: () => socket.disconnect(),
  }
}
