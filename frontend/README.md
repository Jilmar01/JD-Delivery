# J&D Delivery frontend

## Selección de ubicación con OpenStreetMap

El formulario usa Leaflet y OpenStreetMap para mostrar el mapa y permite buscar
direcciones con el servicio público de Nominatim. No necesita una clave de
Google ni variables de entorno. La ubicación elegida se conserva en el estado
de la interfaz. El modelo y la ruta de creación revisados del backend no
incluyen campos para coordenadas, por lo que no se envían al crear pedidos.

Las búsquedas y consultas de dirección se ejecutan al enviar la búsqueda o
seleccionar/mover un punto, no como autocompletado por cada pulsación. Las
consultas se espacian para respetar el límite de uso del servicio público. El
servicio puede limitarse o no estar disponible; en ese caso, la dirección
manual del formulario sigue funcionando. OpenStreetMap requiere atribución,
que se muestra junto al mapa.

## Integración con autenticación y pedidos

El frontend envía el token de sesión en las peticiones protegidas mediante
`Authorization: Bearer <token>`. Configura las URLs en `.env` usando las
variables `VITE_ORDER_API_URL`, `VITE_AUTH_API_URL`, `VITE_WEBSOCKET_URL` y
`VITE_DELIVERY_API_URL`. El archivo `.env.example` contiene valores locales de
referencia; puedes reemplazarlos por las URLs de tu entorno. En desarrollo,
Vite mantiene los proxies para pedidos y entregas; en producción, el frontend
usa las URLs configuradas.

El carrito y el formulario actual son de demostración. Preparar un borrador no
envía datos y la creación real no se activa mientras no haya un catálogo con
IDs y precios reales, ni se confirme el `customerId` de la sesión. La función
de servicio de creación valida esos datos y los campos documentados
(`customerId`, `deliveryAddress`, `notes`, `total` e `items`), pero no se invoca
con productos ficticios.

En el código backend revisado hay diferencias que impiden confirmar la
integración de punta a punta: el servidor del servicio de pedidos monta
`/api/pedidos`, mientras que el frontend está configurado para `/api/orders`;
además, el archivo de servidor importa una ruta que no aparece en el
directorio revisado. El esquema define los estados `PENDING`, `CONFIRMED`,
`PREPARING`, `IN_TRANSIT`, `DELIVERED` y `CANCELLED`, pero la ruta de cambio de
estado revisada usa otros nombres. Por eso el panel no envía cambios de estado
ni afirma que exista asignación de repartidores.

El envío del token desde el frontend no sustituye la validación del token en
el backend. El servicio de pedidos revisado no muestra middleware de
autenticación ni una consulta filtrada por cliente.

## Herramientas de React + Vite

Este proyecto usa Vite para ejecutar React y ESLint para validar el código.

- `npm run dev`: inicia el servidor de desarrollo.
- `npm run lint`: ejecuta ESLint.
- `npm run build`: genera el build de producción.
