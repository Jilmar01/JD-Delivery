import { z } from 'zod';

import { MESSAGE_VERSION, MESSAGE_TYPES } from './message.types.js';

// Validación de mensajes
const identificador = z.string().min(1);

const coordenadas = z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
}).strict();

const ubicacionEntrega = z.object({
    deliveryAddress: z.string().min(1),
    deliveryLat: z.number().min(-90).max(90),
    deliveryLng: z.number().min(-180).max(180)
}).strict();

// Estructura base de los mensajes
const crearEsquemaMensaje = (type, payload) =>
    z.object({
        version: z.literal(MESSAGE_VERSION),
        type: z.literal(type),
        messageId: identificador,
        correlationId: identificador.optional(),
        timestamp: z.string().datetime({ offset: true }),
        payload
    }).strict();

// Eventos de repartidores
const driverOnline = crearEsquemaMensaje(
    MESSAGE_TYPES.ONLINE,
    z.object({
        driverId: identificador,
        location: coordenadas.optional()
    }).strict()
);
const driverOffline = crearEsquemaMensaje(
    MESSAGE_TYPES.OFFLINE,
    z.object({
        driverId: identificador
    }).strict()
);

const driverAvailable = crearEsquemaMensaje(
    MESSAGE_TYPES.AVAILABLE,
    z.object({
        driverId: identificador,
        location: coordenadas
    }).strict()
);

const driverUnavailable = crearEsquemaMensaje(
    MESSAGE_TYPES.UNAVAILABLE,
    z.object({
        driverId: identificador,
        reason: z.string().optional()
    }).strict()
);

const driverLocationUpdated = crearEsquemaMensaje(
    MESSAGE_TYPES.LOCATION_UPDATED,
    z.object({
        driverId: identificador,
        location: coordenadas
    }).strict()
);

const driverDeliveryCompleted = crearEsquemaMensaje(
    MESSAGE_TYPES.DRIVER_DELIVERY_COMPLETED,
    z.object({
        driverId: identificador,
        orderId: z.number().int().positive()
    }).strict()
);

// Eventos de pedidos
const newOrder = crearEsquemaMensaje(
    MESSAGE_TYPES.NEW,
    z.object({
        orderId: z.number().int().positive(),
        ...ubicacionEntrega.shape
    }).strict()
);

const cancelOrder = crearEsquemaMensaje(
    MESSAGE_TYPES.CANCEL,
    z.object({
        orderId: z.number().int().positive(),
        reason: z.string().optional()
    }).strict()
);

const retryOrder = crearEsquemaMensaje(
    MESSAGE_TYPES.RETRY,
    z.object({
        orderId: z.number().int().positive(),
        ...ubicacionEntrega.shape
    }).strict()
);

// Respuestas a ofertas
const acceptOffer = crearEsquemaMensaje(
    MESSAGE_TYPES.ACCEPT,
    z.object({
        offerId: identificador,
        dispatchId: identificador,
        orderId: z.number().int().positive(),
        driverId: identificador
    }).strict()
);

const offerAccepted = crearEsquemaMensaje(
    MESSAGE_TYPES.OFFER_ACCEPTED,
    z.object({
        offerId: identificador,
        dispatchId: identificador,
        orderId: z.number().int().positive(),
        driverId: identificador
    }).strict()
);

const rejectOffer = crearEsquemaMensaje(
    MESSAGE_TYPES.REJECT,
    z.object({
        offerId: identificador,
        dispatchId: identificador,
        orderId: z.number().int().positive(),
        driverId: identificador,
        reason: z.enum([
            'NOT_INTERESTED',
            'TOO_FAR',
            'UNAVAILABLE',
            'OTHER'
        ])
    }).strict()
);

// Eventos enviados al WebSocket server
const offerOrder = crearEsquemaMensaje(
    MESSAGE_TYPES.OFFER,
    z.object({
        offerId: identificador,
        dispatchId: identificador,
        orderId: z.number().int().positive(),
        driverId: identificador,
        expiresIn: z.number().int().positive(),
        ...ubicacionEntrega.shape
    }).strict()
);

const cancelOffer = crearEsquemaMensaje(
    MESSAGE_TYPES.CANCEL_OFFER,
    z.object({
        offerId: identificador,
        orderId: z.number().int().positive(),
        driverId: identificador,
        reason: z.string().optional()
    }).strict()
);

const offerExpired = crearEsquemaMensaje(
    MESSAGE_TYPES.OFFER_EXPIRED,
    z.object({
        offerId: identificador,
        orderId: z.number().int().positive(),
        driverId: identificador
    }).strict()
);

const assignmentConfirmed = crearEsquemaMensaje(
    MESSAGE_TYPES.ASSIGNMENT_CONFIRMED,
    z.object({
        dispatchId: identificador,
        orderId: z.number().int().positive(),
        driverId: identificador,
        deliveryId: z.number().int().positive(),
        assignedAt: z.string().datetime({ offset: true })
    }).strict()
);

const assignmentFailed = crearEsquemaMensaje(
    MESSAGE_TYPES.ASSIGNMENT_FAILED,
    z.object({
        dispatchId: identificador,
        orderId: z.number().int().positive(),
        driverId: identificador,
        reason: z.string().min(1)
    }).strict()
);

const noDriversAvailable = crearEsquemaMensaje(
    MESSAGE_TYPES.NO_DRIVERS_AVAILABLE,
    z.object({
        dispatchId: identificador,
        orderId: z.number().int().positive(),
        reason: z.enum([
            'NO_DRIVERS_FOUND',
            'ALL_OFFERS_EXPIRED',
            'ALL_DRIVERS_REJECTED'
        ])
    }).strict()
);

// Eventos de control
const ack = crearEsquemaMensaje(
    MESSAGE_TYPES.ACK,
    z.object({
        acknowledgedMessageId: identificador
    }).strict()
);

const ping = crearEsquemaMensaje(
    MESSAGE_TYPES.PING,
    z.object({
        nonce: identificador.optional()
    }).strict()
);

const pong = crearEsquemaMensaje(
    MESSAGE_TYPES.PONG,
    z.object({
        nonce: identificador.optional()
    }).strict()
);

const errorMessage = crearEsquemaMensaje(
    MESSAGE_TYPES.ERROR,
    z.object({
        code: identificador,
        message: z.string().min(1),
        retryable: z.boolean()
    }).strict()
);

// Esquema general del protocolo
export const messageSchema = z.discriminatedUnion('type', [
    driverOnline,
    driverOffline,
    driverAvailable,
    driverUnavailable,
    driverLocationUpdated,
    driverDeliveryCompleted,

    newOrder,
    cancelOrder,
    retryOrder,

    acceptOffer,
    offerAccepted,
    rejectOffer,

    offerOrder,
    cancelOffer,
    offerExpired,
    assignmentConfirmed,
    assignmentFailed,
    noDriversAvailable,

    ack,
    ping,
    pong,
    errorMessage
]);

// Validación de mensajes
export const validateMessage = (message) => {
    const result = messageSchema.safeParse(message);

    if (!result.success) {
        return {
            success: false,
            errors: result.error.issues.map(issue => ({
                field: issue.path.join('.'),
                message: issue.message
            }))
        };
    }

    return {
        success: true,
        data: result.data
    };
};
