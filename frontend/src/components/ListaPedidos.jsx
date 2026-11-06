import { useEffect, useState } from 'react'
import TiempoEntrega from './TiempoEntrega'
import ProductosPedido from './ProductosPedido'
import {
  etiquetaEstado,
  ESTADOS_PROGRESO_PEDIDO,
} from '../utils/estados'

const ESTILOS_ESTADO = {
  PENDING: 'border-amber-200 bg-amber-50 text-amber-800',
  CONFIRMED: 'border-blue-200 bg-blue-50 text-blue-800',
  PREPARING: 'border-indigo-200 bg-indigo-50 text-indigo-800',
  IN_TRANSIT: 'border-violet-200 bg-violet-50 text-violet-800',
  DELIVERED: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  CANCELLED: 'border-red-200 bg-red-50 text-red-800',
}

function ListaPedidos({
  pedidos,
  titulo = 'Pedidos registrados',
  subtitulo = 'Consulta tus pedidos y revisa su estado actual.',
  mensajeVacio = 'Todavía no tienes pedidos registrados.',
  detalleVacio = 'Utiliza el formulario para crear tu primer pedido.',
}) {
  const [ahora, setAhora] = useState(() => Date.now())
  const hayEnCurso = pedidos.some((p) => p.asignadoEn && p.estado !== 'DELIVERED')

  // El contador avanza cada segundo mientras haya una entrega en curso
  useEffect(() => {
    if (!hayEnCurso) return undefined
    const reloj = setInterval(() => setAhora(Date.now()), 1000)
    return () => clearInterval(reloj)
  }, [hayEnCurso])

  return (
    <section className="rounded-xl bg-transparent">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-800">
            {titulo}
          </h3>
          <p className="mt-1.5 text-sm text-slate-500">
            {subtitulo}
          </p>
        </div>

        <span className="rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800">
          Total: {pedidos.length}
        </span>
      </div>

      {pedidos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              className="h-7 w-7 text-blue-700"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 7h18v14H3zM7 7V4h10v3M8 12h8M8 16h5"
              />
            </svg>
          </div>

          <p className="mt-4 font-semibold text-slate-800">
            {mensajeVacio}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {detalleVacio}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {pedidos.map((pedido) => (
            <article
              key={pedido.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/50 transition hover:border-blue-200 hover:shadow-md hover:shadow-slate-200/70 sm:p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Identificador del pedido
                  </p>
                  <h3 className="mt-1.5 text-lg font-bold tracking-tight text-slate-950">
                    {pedido.id ?? 'ID no disponible'}
                  </h3>
                </div>

                <span
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                    ESTILOS_ESTADO[pedido.estado] ||
                    'border-slate-200 bg-slate-100 text-slate-700'
                  }`}
                >
                  {etiquetaEstado(pedido.estado)}
                </span>
              </div>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Cliente
                  </p>
                  <p className="mt-1.5 break-words text-sm font-medium text-slate-800">
                    {pedido.cliente || 'No disponible'}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Fecha de creación
                  </p>
                  <p className="mt-1.5 text-sm font-medium text-slate-800">
                    {pedido.fecha}
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Dirección de entrega
                  </p>
                  <p className="mt-1.5 break-words text-sm leading-6 text-slate-800">
                    {pedido.direccion}
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Productos
                  </p>
                  <div className="mt-2">
                    <ProductosPedido notas={pedido.descripcion} />
                  </div>
                </div>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-5">
                <h4 className="text-sm font-semibold text-slate-800">
                  Progreso del pedido
                </h4>
                <ol
                  aria-label={`Progreso del pedido: ${etiquetaEstado(pedido.estado)}`}
                  className="mt-4 grid grid-cols-5 gap-2"
                >
                  {ESTADOS_PROGRESO_PEDIDO.map((estado, indice) => {
                    const indiceActual =
                      ESTADOS_PROGRESO_PEDIDO.indexOf(pedido.estado)
                    const completado =
                      indiceActual >= 0 && indice <= indiceActual

                    return (
                      <li
                        key={estado}
                        aria-current={
                          indice === indiceActual ? 'step' : undefined
                        }
                        className="min-w-0 text-center"
                      >
                        <span
                          className={`mx-auto block h-2 rounded-full ${
                            completado ? 'bg-blue-600' : 'bg-slate-200'
                          }`}
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
                {pedido.estado === 'CANCELLED' ? (
                  <p className="mt-3 text-sm leading-6 text-red-700">
                    Este pedido está cancelado; no avanzará por las etapas de
                    entrega.
                  </p>
                ) : ESTADOS_PROGRESO_PEDIDO.includes(pedido.estado) ? (
                  <>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      Tu pedido está{' '}
                      <span className="font-semibold text-slate-800">
                        {etiquetaEstado(pedido.estado)}
                      </span>.
                    </p>
                    {pedido.estado === 'IN_TRANSIT' && (
                      <p className="mt-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900">
                        El repartidor inició la entrega.
                      </p>
                    )}
                  </>
                ) : (
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Estado actual: {etiquetaEstado(pedido.estado)}. El progreso
                    visual no está disponible para este estado.
                  </p>
                )}
                <TiempoEntrega pedido={pedido} ahora={ahora} />
                <p className="mt-3 text-xs leading-5 text-slate-500">
                  Estado informativo; no hay seguimiento GPS en tiempo real.
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export default ListaPedidos
