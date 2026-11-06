import { useEffect, useState } from 'react'
import ProductosPedido from './ProductosPedido'
import TiempoEntrega from './TiempoEntrega'
import { formatoMoneda } from '../utils/catalogo'
import { ESTADOS_PROGRESO_PEDIDO, etiquetaEstado } from '../utils/estados'

const MENSAJES = {
  PENDING: 'Estamos buscando al repartidor más cercano para tu pedido.',
  CONFIRMED: 'Un repartidor aceptó tu pedido y va a recogerlo.',
  PREPARING: 'Tu pedido se está preparando.',
  IN_TRANSIT: 'El repartidor ya salió con tu pedido.',
}

const ESTADOS_CANCELABLES = ['PENDING', 'CONFIRMED', 'PREPARING', 'IN_TRANSIT']

/** El pedido que el cliente tiene en progreso, con sus productos, etapas y tiempo. */
function PedidoEnCurso({ pedido, alVerBusqueda, alCancelar }) {
  const [ahora, setAhora] = useState(() => Date.now())
  const [confirmando, setConfirmando] = useState(false)
  const [cancelando, setCancelando] = useState(false)

  const enCurso = Boolean(pedido.asignadoEn) && pedido.estado !== 'DELIVERED'
  const indiceActual = ESTADOS_PROGRESO_PEDIDO.indexOf(pedido.estado)
  const pendiente = pedido.estado === 'PENDING'
  // El cliente puede cancelar mientras el pedido siga en progreso: si el repartidor ya lo aceptó
  // y no llega, es la salida para no quedar esperando indefinidamente
  const cancelable = ESTADOS_CANCELABLES.includes(pedido.estado)

  useEffect(() => {
    if (!enCurso) return undefined
    const reloj = setInterval(() => setAhora(Date.now()), 1000)
    return () => clearInterval(reloj)
  }, [enCurso])

  async function cancelar() {
    setCancelando(true)
    try {
      await alCancelar(pedido)
    } finally {
      setCancelando(false)
      setConfirmando(false)
    }
  }

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-200/70">
      <div className="bg-gradient-to-r from-[#0B2A50] to-[#0B1D38] px-5 py-4 text-white sm:px-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-300">
              Pedido #{pedido.id}
            </p>
            <p className="mt-1 text-sm text-blue-50/80">{MENSAJES[pedido.estado]}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold ring-1 ring-white/20">
              {etiquetaEstado(pedido.estado)}
            </span>
            <span className="text-lg font-bold">{formatoMoneda.format(pedido.total)}</span>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-5 sm:p-7">
        <ProductosPedido notas={pedido.descripcion} grande />

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Se entrega en
          </p>
          <p className="mt-1 break-words text-sm leading-6 text-slate-800">{pedido.direccion}</p>
        </div>

        <div>
          <ol
            aria-label={`Progreso del pedido: ${etiquetaEstado(pedido.estado)}`}
            className="grid grid-cols-5 gap-2"
          >
            {ESTADOS_PROGRESO_PEDIDO.map((estado, indice) => {
              const completado = indiceActual >= 0 && indice <= indiceActual
              return (
                <li key={estado} className="min-w-0 text-center">
                  <span
                    className={`mx-auto block h-2 rounded-full ${completado ? 'bg-blue-600' : 'bg-slate-200'}`}
                  />
                  <span
                    className={`mt-2 block break-words text-[10px] font-semibold leading-4 sm:text-xs ${
                      indice === indiceActual
                        ? 'text-blue-800'
                        : completado
                          ? 'text-slate-700'
                          : 'text-slate-400'
                    }`}
                  >
                    {etiquetaEstado(estado)}
                  </span>
                </li>
              )
            })}
          </ol>
          <TiempoEntrega pedido={pedido} ahora={ahora} />
        </div>

        {cancelable && (
          <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            {pendiente ? (
              <button
                type="button"
                onClick={() => alVerBusqueda(pedido)}
                className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-600/20"
              >
                Ver búsqueda de repartidor
              </button>
            ) : (
              <p className="text-sm text-slate-600">¿No te ha llegado tu pedido? Puedes cancelarlo.</p>
            )}

            {confirmando ? (
              <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Confirmar cancelación">
                <span className="text-sm font-medium text-slate-700">
                  {pendiente ? '¿Cancelar este pedido?' : '¿Cancelar este pedido? El repartidor dejará de tenerlo asignado.'}
                </span>
                <button
                  type="button"
                  onClick={cancelar}
                  disabled={cancelando}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-wait disabled:opacity-60"
                >
                  {cancelando ? 'Cancelando…' : 'Sí, cancelar'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmando(false)}
                  disabled={cancelando}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmando(true)}
                className="rounded-xl border border-red-200 px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 focus:outline-none focus:ring-4 focus:ring-red-500/15"
              >
                Cancelar pedido
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  )
}

export default PedidoEnCurso
