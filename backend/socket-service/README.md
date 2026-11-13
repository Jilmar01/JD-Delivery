# Servidor TCP / Socket - Servicio de Asignación de Pedidos

Documentación técnica y especificaciones de diseño para el servidor TCP nativo en Node.js encargada del flujo de ofertas y asignación en tiempo real a repartidores.

---

## 1. Decisiones de Diseño y Arquitectura

* **Protocolo Base:** TCP Nativo utilizando el módulo `net` de Node.js.
* **Formato de Mensajes:** JSON delimitado por salto de línea (`\n`) — *JSON Lines (ndjson)*.
* **Tiempo de Respuesta / Expiración de Ofertas:**
  * **Entorno de Desarrollo:** 30 segundos.
  * **Entorno de Producción:** 60 segundos.
* **Estrategia de Asignación:**
  * Las ofertas se transmiten simultáneamente a los **3 repartidores** más cercanos/disponibles.
  * **Concurrencia (First-Come, First-Served):** El primer repartidor que confirme la aceptación del pedido obtiene la asignación.
  * **Concurrencia y Atomicidad:** Aunque el servidor TCP coordina la recepción de respuestas, el `Delivery Service` ejecuta la confirmación mediante una **operación atómica** en base de datos para prevenir asignaciones duplicadas (race conditions).
* **Manejo de Reintentos:**
  * Si ningún repartidor acepta la oferta dentro del tiempo límite, el sistema notifica el evento `OFFER_EXPIRED` y habilita al cliente para solicitar una nueva búsqueda.

---

## 2. Gestión de Estados del Repartidor

Para evitar colisiones entre el estado físico de la red y la lógica de negocio, se separan los siguientes flag y estados:

| Propiedad | Tipo | Descripción |
| :--- | :--- | :--- |
| `connected` | `Boolean` | Indica si el repartidor mantiene un socket TCP/WebSocket activo con el servidor. |
| `available` | `Boolean` | Indica si el repartidor ha activado su disponibilidad para recibir nuevas ofertas. |
| `busy` | `Boolean` | Indica si el repartidor se encuentra atendiendo una entrega asignada en curso. |

> **Nota sobre Coordenadas:** Es indispensable diferenciar la ubicación geográfica actual del repartidor (`driver_location`: `lat`, `lng`) de las coordenadas de destino del pedido (`delivery_destination`: `lat`, `lng`).

---

## 3. Catálogo de Eventos TCP

### Matriz de Eventos

| Evento | Dirección | Descripción / Función |
| :--- | :--- | :--- |
| `NEW_ORDER` | `Order` → `TCP` | Notifica la creación de un nuevo pedido para iniciar el proceso de búsqueda. |
| `DRIVER_AVAILABLE` | `WebSocket` → `TCP` | Registra a un repartidor en estado disponible para recibir pedidos. |
| `DRIVER_UNAVAILABLE` | `WebSocket` → `TCP` | Retira la disponibilidad del repartidor. |
| `OFFER_ORDER` | `TCP` → `WebSocket` | Transmite la oferta del pedido a los repartidores seleccionados. |
| `ACCEPT_OFFER` | `WebSocket` → `TCP` | El repartidor acepta la oferta entrante. |
| `REJECT_OFFER` | `WebSocket` → `TCP` | El repartidor rechaza la oferta de manera explícita. |
| `OFFER_EXPIRED` | `TCP` → `WebSocket` | Notifica que el tiempo de la oferta ha finalizado sin aceptación. |
| `ORDER_ASSIGNED` | `TCP` → `WebSocket` | Confirma la asignación exitosa del pedido a un repartidor específico. |

---

## 4. Ejemplos de Payload (JSON Lines)

Todos los mensajes transmitidos a través del socket TCP deben finalizar con `\n`.

### 4.1. Registro de Disponibilidad (`DRIVER_AVAILABLE`)
```json
{"event":"DRIVER_AVAILABLE","payload":{"driverId":"drv_12345","location":{"lat":-0.180653,"lng":-78.467838}},"timestamp":1700000000}\n
```

### 4.2. Notificación de Nuevo Pedido (`NEW_ORDER`)
```json
{"event":"NEW_ORDER","payload":{"orderId":"ord_98765","origin":{"lat":-0.175000,"lng":-78.470000},"destination":{"lat":-0.190000,"lng":-78.480000},"price":4.50},"timestamp":1700000005}\n
```

### 4.3. Oferta Enviada al Repartidor (`OFFER_ORDER`)
```json
{"event":"OFFER_ORDER","payload":{"orderId":"ord_98765","expiresInSeconds":30,"destination":{"lat":-0.190000,"lng":-78.480000}},"timestamp":1700000010}\n
```

### 4.4. Aceptación de Oferta (`ACCEPT_OFFER`)
```json
{"event":"ACCEPT_OFFER","payload":{"orderId":"ord_98765","driverId":"drv_12345"},"timestamp":1700000015}\n
```

### 4.5. Confirmación de Asignación (`ORDER_ASSIGNED`)
```json
{"event":"ORDER_ASSIGNED","payload":{"orderId":"ord_98765","driverId":"drv_12345","status":"CONFIRMED"},"timestamp":1700000016}\n
```

---

## 5. Diagrama de Flujo de Asignación

```text
[ Order Service ] --( NEW_ORDER )--> [ TCP Server ]
                                          |
                                ( Busca 3 repartidores )
                                          |
                                          v
[ Driver WS 1 ] <--( OFFER_ORDER )-- [ TCP Server ] --( OFFER_ORDER )--> [ Driver WS 2 ]
                                          |
                                          | ( Driver 1 responde primero )
                                          v
[ Driver WS 1 ] --( ACCEPT_OFFER )-> [ TCP Server ]
                                          |
                                ( Operación Atómica en DB )
                                          |
                                          v
[ Driver WS 1 ] <-( ORDER_ASSIGNED )- [ TCP Server ]
```