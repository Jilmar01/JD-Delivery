// En desarrollo se usa el proxy de vite.config.js (/api y /ws); en producción, la URL configurada
const API_URL = import.meta.env.DEV
  ? ''
  : (
      import.meta.env.URL_PEDIDOS ||
      import.meta.env.VITE_ORDERS_API_URL ||
      import.meta.env.VITE_API_URL ||
      'http://localhost:3001'
    ).replace(/\/+$/, '')

const WS_URL =
  import.meta.env.VITE_WS_URL ||
  (import.meta.env.DEV ? '/ws' : `${API_URL.replace(/^http/, 'ws')}/ws`)

const PEDIDOS_API_URL = `${API_URL}/api/orders`

function crearError(mensaje, status, causa) {
  const error = new Error(mensaje, causa ? { cause: causa } : undefined)
  if (status !== undefined) error.status = status
  return error
}

async function solicitar(url, { token, cuerpo, ...opciones } = {}) {
  let respuesta

  try {
    respuesta = await fetch(url, {
      ...opciones,
      headers: {
        ...(cuerpo !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(cuerpo !== undefined ? { body: JSON.stringify(cuerpo) } : {}),
    })
  } catch (error) {
    throw crearError(
      'No se pudo conectar con el servicio de pedidos. Verifica que el backend esté activo y que la URL sea correcta.',
      undefined,
      error
    )
  }

  let datos = {}
  try {
    datos = await respuesta.json()
  } catch {
    // Sin cuerpo JSON: se usa el mensaje por defecto
  }

  if (!respuesta.ok || datos.success === false) {
    throw crearError(
      respuesta.status === 401
        ? 'La sesión expiró o el token no es válido. Inicia sesión nuevamente.'
        : datos.message ||
            `La solicitud al servicio de pedidos falló (HTTP ${respuesta.status}).`,
      respuesta.status
    )
  }

  return datos
}

function normalizarPedido(pedido) {
  if (!pedido || typeof pedido !== 'object' || Array.isArray(pedido)) {
    throw new Error('El servicio devolvió un pedido con formato inválido.')
  }

  return {
    ...pedido,
    cliente: pedido.customerId ?? '',
    direccion: pedido.deliveryAddress ?? '',
    descripcion: pedido.notes ?? '',
    estado: pedido.status,
    fecha: pedido.createdAt
      ? new Date(pedido.createdAt).toLocaleDateString('es-EC')
      : '',
    total: Number(pedido.total),
    lat:
      pedido.deliveryLat === null || pedido.deliveryLat === undefined
        ? null
        : Number(pedido.deliveryLat),
    lng:
      pedido.deliveryLng === null || pedido.deliveryLng === undefined
        ? null
        : Number(pedido.deliveryLng),
  }
}

export async function obtenerPedidos(token) {
  const { data } = await solicitar(PEDIDOS_API_URL, { token })
  return data.map(normalizarPedido)
}

export async function obtenerPedidosCliente(customerId, token) {
  const { data } = await solicitar(
    `${PEDIDOS_API_URL}?customerId=${encodeURIComponent(customerId)}`,
    { token }
  )
  return data.map(normalizarPedido)
}

export async function obtenerPedido(id, token) {
  const { data } = await solicitar(`${PEDIDOS_API_URL}/${id}`, { token })
  return normalizarPedido(data)
}

/**
 * datosPedido: { customerId, direccion, lat, lng, total, notas }
 * lat/lng son el punto de entrega elegido en el mapa. Al crearlo, order-service
 * lo ofrece por TCP a los repartidores más cercanos.
 */
export async function crearPedido(datosPedido, token) {
  const { data, oferta } = await solicitar(PEDIDOS_API_URL, {
    method: 'POST',
    token,
    cuerpo: {
      customerId: datosPedido.customerId,
      deliveryAddress: datosPedido.direccion,
      notes: datosPedido.notas || '',
      total: datosPedido.total,
      deliveryLat: datosPedido.lat,
      deliveryLng: datosPedido.lng,
    },
  })

  return { pedido: normalizarPedido(data), oferta }
}

/** Ciclo de la oferta: [{ evento, repartidores?, repartidorId?, fecha }] */
export async function obtenerOfertasPedido(id, token) {
  const { data } = await solicitar(`${PEDIDOS_API_URL}/${id}/ofertas`, { token })
  return data
}

/** Vuelve a ofrecer un pedido pendiente a todos los repartidores (botón "buscar de nuevo"). */
export async function buscarRepartidorDeNuevo(id, token) {
  return solicitar(`${PEDIDOS_API_URL}/${id}/buscar-repartidor`, { method: 'POST', token })
}

/** El cliente cancela un pedido pendiente: el TCP lo retira de los repartidores. */
export async function cancelarPedido(id, token) {
  return actualizarEstadoPedido(id, 'CANCELLED', token)
}

/** Avanza el estado de un pedido ya asignado (IN_TRANSIT, DELIVERED...). */
export async function actualizarEstadoPedido(id, status, token) {
  const { data } = await solicitar(`${PEDIDOS_API_URL}/${id}/status`, {
    method: 'PATCH',
    token,
    cuerpo: { status },
  })
  return normalizarPedido(data)
}

// --- Panel administrativo ---

function normalizarPedidoAdministrativo(pedido) {
  const id = Number(pedido?.id)
  const estados = {
    PENDING: 'PENDIENTE',
    CONFIRMED: 'CONFIRMADO',
    PREPARING: 'EN_PREPARACION',
    IN_DELIVERY: 'EN_CAMINO',
    IN_TRANSIT: 'EN_CAMINO',
    DELIVERED: 'ENTREGADO',
    CANCELLED: 'CANCELADO',
  }
  const estadoOriginal = pedido?.estado || pedido?.status

  if (!pedido || typeof pedido !== 'object' || !Number.isSafeInteger(id)) {
    throw new Error('El servidor devolvió un pedido con formato no válido.')
  }

  return {
    ...pedido,
    id,
    estado:
      estados[String(estadoOriginal).toUpperCase()] ||
      String(estadoOriginal || 'PENDIENTE').toUpperCase(),
    cliente:
      pedido.clienteId ||
      pedido.customerId ||
      pedido.cliente ||
      `Cliente ${pedido.id}`,
    repartidor: pedido.repartidorId
      ? `Repartidor ${pedido.repartidorId}`
      : 'Sin asignar',
    fecha: pedido.createdAt || pedido.fecha
      ? new Date(pedido.createdAt || pedido.fecha).toLocaleString('es-EC')
      : '—',
  }
}

async function solicitarPedidos(ruta, token, opciones = {}) {
  if (!token) {
    throw new Error('La sesión administrativa expiró. Inicia sesión nuevamente.')
  }

  const respuesta = await fetch(`${API_URL}${ruta}`, {
    ...opciones,
    headers: {
      ...opciones.headers,
      Authorization: `Bearer ${token}`,
    },
  })
  const datos = await respuesta.json().catch(() => null)

  if (!respuesta.ok) {
    throw new Error(
      datos?.message || `La API de pedidos respondió con ${respuesta.status}.`
    )
  }

  return datos
}

async function obtenerPaginaPedidos(ruta, token, offset, limite) {
  const separador = ruta.includes('?') ? '&' : '?'
  const respuesta = await fetch(
    `${API_URL}${ruta}${separador}limit=${limite}&offset=${offset}`,
    token
      ? {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      : undefined
  )
  const datos = await respuesta.json().catch(() => null)

  if (!respuesta.ok) {
    throw new Error(
      datos?.message || `La API de pedidos respondió con ${respuesta.status}.`
    )
  }

  if (!Array.isArray(datos?.data)) {
    throw new Error('La API no devolvió una lista válida de pedidos.')
  }

  const total = Number.isSafeInteger(Number(datos.total))
    ? Number(datos.total)
    : null
  const respuestaYaPaginada =
    datos.offset !== undefined &&
    datos.limit !== undefined &&
    Number(datos.offset) === offset &&
    Number(datos.limit) === limite
  const respuestaCompleta =
    total !== null && total === datos.data.length
  const respuestaPaginada =
    respuestaYaPaginada
      ? datos.data
      : respuestaCompleta || datos.data.length > limite
        ? datos.data.slice(offset, offset + limite)
        : datos.data

  return {
    data: respuestaPaginada.map(normalizarPedidoAdministrativo),
    total,
  }
}

export async function obtenerPaginaPedidosAdministrativos(
  token,
  offset,
  limite
) {
  if (!token) {
    throw new Error('La sesión administrativa expiró. Inicia sesión nuevamente.')
  }

  const pagina = await obtenerPaginaPedidos(
    '/api/orders',
    token,
    offset,
    limite
  )

  return pagina
}

export async function obtenerPaginaPedidosParaVistaPrevia(offset, limite) {
  return obtenerPaginaPedidos('/api/orders', undefined, offset, limite)
}

export async function cambiarEstadoAdministrativo(id, estado, token) {
  const respuesta = await solicitarPedidos(
    `/api/orders/${id}/estado`,
    token,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ estado }),
    },
  )

  if (!respuesta?.data) {
    throw new Error('La API no devolvió el pedido actualizado.')
  }

  return normalizarPedidoAdministrativo(respuesta.data)
}

export function normalizarEventoPedido(pedido) {
  return normalizarPedidoAdministrativo(pedido)
}

export { API_URL, WS_URL }
