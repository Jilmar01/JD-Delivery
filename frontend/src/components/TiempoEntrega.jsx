import { formatoDuracion, formatoHora } from '../utils/tiempo'

/**
 * Tiempo desde que un repartidor recibe el pedido hasta que lo entrega.
 * `ahora` (ms) mueve el contador mientras la entrega está en curso.
 */
function TiempoEntrega({ pedido, ahora }) {
  if (pedido.estado === 'CANCELLED') return null

  if (!pedido.asignadoEn) {
    return (
      <p className="mt-3 text-sm text-slate-600">
        Tiempo de entrega: empieza a contar cuando un repartidor recibe tu
        pedido.
      </p>
    )
  }

  const entregado = pedido.estado === 'DELIVERED' && pedido.entregadoEn
  const duracion = (entregado ? pedido.entregadoEn : ahora) - pedido.asignadoEn

  return (
    <div
      className={`mt-3 rounded-xl border px-4 py-3 ${
        entregado
          ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
          : 'border-blue-100 bg-blue-50 text-blue-900'
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide">
        {entregado ? 'Tiempo total de entrega' : 'Tiempo desde que lo recibió el repartidor'}
      </p>
      <p className="mt-1 text-xl font-bold tabular-nums">
        {formatoDuracion(duracion)}
      </p>
      <p className="mt-1 text-xs">
        Recibido por el repartidor: {formatoHora(pedido.asignadoEn)}
        {pedido.iniciadoEn && ` · Salió: ${formatoHora(pedido.iniciadoEn)}`}
        {entregado && ` · Entregado: ${formatoHora(pedido.entregadoEn)}`}
      </p>
    </div>
  )
}

export default TiempoEntrega
