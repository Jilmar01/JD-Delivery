const API_URL = import.meta.env.DEV
  ? '/deliveries-api'
  : (import.meta.env.VITE_DELIVERY_API_URL || 'http://localhost:3002').replace(/\/$/, '')

export async function obtenerEntregasPorPedidos(pedidos, token) {
  return Promise.all(
    pedidos.map(async (pedido) => {
      const orderId = Number(pedido.id)

      if (!Number.isSafeInteger(orderId) || orderId < 1) {
        return { orderId: pedido.id, status: 'error' }
      }

      if (!API_URL) {
        return { orderId, status: 'error' }
      }

      try {
        const headers = token
          ? { Authorization: `Bearer ${token}` }
          : undefined
        const respuesta = await fetch(
          `${API_URL}/api/deliveries/order/${orderId}`,
          { headers }
        )

        const resultado = await respuesta.json().catch(() => null)

        if (!respuesta.ok || !resultado?.success) {
          return { orderId, status: 'error' }
        }

        if (resultado.data === null) {
          return { orderId, status: 'missing' }
        }

        if (!resultado.data) return { orderId, status: 'error' }

        if (Number(resultado.data.orderId) !== orderId) {
          return { orderId, status: 'error' }
        }

        return {
          orderId,
          status: 'loaded',
          data: resultado.data,
        }
      } catch {
        return { orderId, status: 'error' }
      }
    })
  )
}

const aMilisegundos = (fecha) => (fecha ? new Date(fecha).getTime() : null)

/**
 * Sincroniza el estado persistido en Delivery Service y agrega sus marcas de tiempo
 * al pedido para mostrar el progreso y la duración de la entrega.
 */
export async function agregarTiemposDeEntrega(pedidos, token) {
  const consultables = pedidos.filter((p) => p.estado !== 'CANCELLED')
  if (consultables.length === 0) return pedidos

  const entregas = await obtenerEntregasPorPedidos(consultables, token)
  const porPedido = new Map(
    entregas.filter((e) => e.status === 'loaded').map((e) => [e.orderId, e.data])
  )
  const estadoPorEntrega = {
    ASSIGNED: 'CONFIRMED',
    IN_TRANSIT: 'IN_TRANSIT',
    DELIVERED: 'DELIVERED',
    CANCELLED: 'CANCELLED',
  }

  return pedidos.map((pedido) => {
    const entrega = porPedido.get(Number(pedido.id))
    return entrega
      ? {
          ...pedido,
          estado: estadoPorEntrega[entrega.status] || pedido.estado,
          repartidorId: entrega.courierId ?? pedido.repartidorId,
          asignadoEn: aMilisegundos(entrega.assignedAt),
          iniciadoEn: aMilisegundos(entrega.startedAt),
          entregadoEn: aMilisegundos(entrega.deliveredAt),
        }
      : pedido
  })
}
