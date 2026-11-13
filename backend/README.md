# Backend — J&D Delivery

## Tecnologías

- Node.js
- Express 5
- Prisma ORM 6
- PostgreSQL
- dotenv

## Microservicios

| Servicio | Puerto | Endpoint de salud | Base de datos |
|---|---:|---|---|
| order-service | 3001 | `/api/orders/health` | `delivery_order_db` |
| delivery-service | 3002 | `/api/deliveries/health` | `delivery_delivery_db` |
| auth-service | 3003 | `/api/auth/health` | `delivery_auth_db` |
| notification-service | 3004 | `/api/notifications/health` | `delivery_notification_db` |
| websocket-service | 4321 | `/api/websocket/health` | — |
| socket-service | 1234 (TCP) | TCP `PING`/`PONG` | — |

## Requisitos

- Node.js y npm instalados.
- PostgreSQL instalado y ejecutándose.
- Repositorio clonado.

## Configuración

Cada microservicio debe tener su propio archivo `.env` con la variable `DATABASE_URL`.

Ejemplo para `order-service`:

```env
DATABASE_URL="postgresql://postgres:tu_clave@localhost:5432/delivery_order_db?schema=public"
```

Reemplaza `tu_clave` por tu contraseña de PostgreSQL.

**Importante:** los archivos `.env` no deben subirse a Git.

## Instalación y ejecución

Ejemplo para `order-service`:

```bash
cd backend/order-service
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

Para ejecutar los otros servicios, sustituye `order-service` por el nombre del directorio correspondiente.

## Verificación

Con `order-service` en ejecución, visita:

`http://localhost:3001/api/orders/health`

Cada microservicio dispone de su propio servidor Express, configuración de entorno y conexión a PostgreSQL mediante Prisma ORM.

## Docker

La configuración de Docker Compose se incorporará posteriormente para ejecutar los microservicios y sus bases de datos de forma coordinada.
