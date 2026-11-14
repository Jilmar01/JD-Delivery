import { useCallback, useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import {
  normalizarEventoPedido,
  obtenerPaginaPedidosAdministrativos,
  obtenerPaginaPedidosParaVistaPrevia,
  WS_URL,
} from '../services/pedidosService'
import { obtenerEntregasPorPedidos } from '../services/entregasService'
import { formatoDuracion } from '../utils/tiempo'
import { etiquetaEstado } from '../utils/estados'

const ESTADOS = [
  'PENDIENTE',
  'CONFIRMADO',
  'EN_PREPARACION',
  'EN_CAMINO',
  'ENTREGADO',
  'CANCELADO',
]

const FILTROS = ['TODOS', ...ESTADOS]
const TAMANO_PAGINA = 5

function colorEstadoAdmin(estado) {
  const colores = {
    PENDIENTE: 'bg-amber-100 text-amber-900 ring-amber-200',
    PENDING: 'bg-amber-100 text-amber-900 ring-amber-200',
    CONFIRMADO: 'bg-blue-100 text-blue-900 ring-blue-200',
    CONFIRMED: 'bg-blue-100 text-blue-900 ring-blue-200',
    EN_PREPARACION: 'bg-indigo-100 text-indigo-900 ring-indigo-200',
    PREPARING: 'bg-indigo-100 text-indigo-900 ring-indigo-200',
    EN_CAMINO: 'bg-sky-100 text-sky-900 ring-sky-200',
    IN_TRANSIT: 'bg-sky-100 text-sky-900 ring-sky-200',
    ENTREGADO: 'bg-emerald-600 text-white ring-emerald-700',
    DELIVERED: 'bg-emerald-600 text-white ring-emerald-700',
    CANCELADO: 'bg-red-600 text-white ring-red-700',
    CANCELLED: 'bg-red-600 text-white ring-red-700',
  }

  return colores[estado] || 'bg-slate-100 text-slate-700 ring-slate-200'
}

function mostrarTotal(total) {
  const valor = Number(total)

  if (!Number.isFinite(valor)) {
    return '—'
  }

  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
  }).format(valor)
}

// Desde que el repartidor recibe el pedido hasta que lo entrega (o hasta ahora, si sigue en curso)
function tiempoDeEntrega(entrega, ahora) {
  if (entrega?.status !== 'loaded' || !entrega.data.assignedAt) return '—'

  const inicio = new Date(entrega.data.assignedAt).getTime()
  if (entrega.data.deliveredAt) {
    return formatoDuracion(new Date(entrega.data.deliveredAt).getTime() - inicio)
  }

  return entrega.data.status === 'CANCELLED'
    ? 'Cancelada'
    : `En curso · ${formatoDuracion(ahora - inicio)}`
}

function PanelAdministrativo({ usuario }) {
  const [pedidos, setPedidos] = useState([])
  const [entregas, setEntregas] = useState({})
  const [filtro, setFiltro] = useState('TODOS')
  const [paginaActual, setPaginaActual] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [cargandoMas, setCargandoMas] = useState(false)
  const [totalPedidos, setTotalPedidos] = useState(null)
  const [offsetSiguiente, setOffsetSiguiente] = useState(0)
  const [hayMasPedidos, setHayMasPedidos] = useState(false)
  const [error, setError] = useState('')
  const [estadoSocket, setEstadoSocket] = useState(
    usuario.demo ? 'demo' : 'conectando'
  )
  const [ahora, setAhora] = useState(() => Date.now())

  // El tiempo de las entregas en curso avanza cada segundo
  const hayEnCurso = Object.values(entregas).some(
    (e) => e.status === 'loaded' && e.data.assignedAt && !e.data.deliveredAt && e.data.status !== 'CANCELLED'
  )
  useEffect(() => {
    if (!hayEnCurso) return undefined
    const reloj = setInterval(() => setAhora(Date.now()), 1000)
    return () => clearInterval(reloj)
  }, [hayEnCurso])

  const cargarEntregas = useCallback(async (listaPedidos) => {
    const token = usuario.demo ? undefined : usuario.token
    const resultados = await obtenerEntregasPorPedidos(listaPedidos, token)

    setEntregas((anteriores) => {
      const siguientes = { ...anteriores }

      for (const resultado of resultados) {
        siguientes[resultado.orderId] = resultado
      }

      return siguientes
    })

    // Current APIs do not expose user names or historical courier locations.
  }, [usuario.demo, usuario.token])

  useEffect(() => {
    let desmontado = false
    let socket
    let inicioSocket
    let versionEventos = 0
    let pedidosCreadosDuranteCarga = 0
    let cargaInicialCompleta = false
    const token = usuario.demo ? undefined : usuario.token

    async function cargarPedidos() {
      const versionInicial = versionEventos

      try {
        const pagina = usuario.demo
          ? await obtenerPaginaPedidosParaVistaPrevia(0, TAMANO_PAGINA)
          : await obtenerPaginaPedidosAdministrativos(
              token,
              0,
              TAMANO_PAGINA
            )

        cargaInicialCompleta = true
        if (!desmontado) {
          setPedidos((anteriores) => {
            if (versionInicial === versionEventos) return pagina.data

            const idsActuales = new Set(anteriores.map((pedido) => pedido.id))
            return [
              ...anteriores,
              ...pagina.data.filter((pedido) => !idsActuales.has(pedido.id)),
            ]
          })
          setTotalPedidos(
            pagina.total === null
              ? null
              : pagina.total + pedidosCreadosDuranteCarga
          )
          setOffsetSiguiente(pagina.data.length)
          setHayMasPedidos(
            pagina.total === null
              ? pagina.data.length === TAMANO_PAGINA
              : pagina.data.length < pagina.total
          )
          setError('')
          void cargarEntregas(pagina.data)
        }
      } catch (err) {
        if (!desmontado) {
          setError(err.message || 'No se pudieron cargar los pedidos.')
        }
      } finally {
        if (!desmontado) {
          setCargando(false)
        }
      }
    }

    cargarPedidos()

    if (usuario.demo) {
      return () => {
        desmontado = true
      }
    }

    function aplicarEventoPedido(tipo, datos) {
      if (!['ORDER_CREATED', 'ORDER_UPDATED'].includes(tipo) || !datos) return

      try {
        const pedidoActualizado = normalizarEventoPedido(datos.datos || datos)
        versionEventos += 1
        if (tipo === 'ORDER_CREATED') pedidosCreadosDuranteCarga += 1
        setPedidos((anteriores) => {
          const yaExiste = anteriores.some((pedido) => pedido.id === pedidoActualizado.id)
          return yaExiste
            ? anteriores.map((pedido) => pedido.id === pedidoActualizado.id ? pedidoActualizado : pedido)
            : [pedidoActualizado, ...anteriores]
        })
        if (tipo === 'ORDER_CREATED' && cargaInicialCompleta) {
          setTotalPedidos((total) => total === null ? null : total + 1)
        }
        void cargarEntregas([pedidoActualizado])
        setError('')
      } catch (err) {
        setError(err.message || 'No se pudo procesar una actualizacion en tiempo real.')
      }
    }

    socket = io(WS_URL, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'],
      autoConnect: false,
    })
    socket.on('connect', () => {
      if (!desmontado) setEstadoSocket('conectado')
    })
    socket.on('disconnect', () => {
      if (!desmontado) setEstadoSocket('desconectado')
    })
    socket.on('connect_error', (err) => {
      if (!desmontado) setEstadoSocket('desconectado')
      if (err.message === 'INVALID_USER_ROLE') socket.disconnect()
    })
    socket.on('ORDER_CREATED', (datos) => aplicarEventoPedido('ORDER_CREATED', datos))
    socket.on('ORDER_UPDATED', (datos) => aplicarEventoPedido('ORDER_UPDATED', datos))
    inicioSocket = window.setTimeout(() => socket.connect(), 0)

    return () => {
      desmontado = true
      window.clearTimeout(inicioSocket)
      socket?.removeAllListeners()
      socket?.disconnect()
    }
  }, [cargarEntregas, usuario.demo, usuario.token])

  async function recargarPedidos() {
    setCargando(true)
    setPaginaActual(0)

    try {
      const pagina = usuario.demo
        ? await obtenerPaginaPedidosParaVistaPrevia(0, TAMANO_PAGINA)
        : await obtenerPaginaPedidosAdministrativos(
            usuario.token,
            0,
            TAMANO_PAGINA
          )
      setPedidos(pagina.data)
      setTotalPedidos(pagina.total)
      setOffsetSiguiente(pagina.data.length)
      setHayMasPedidos(
        pagina.total === null
          ? pagina.data.length === TAMANO_PAGINA
          : pagina.data.length < pagina.total
      )
      setError('')
      void cargarEntregas(pagina.data)
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los pedidos.')
    } finally {
      setCargando(false)
    }
  }

  async function cargarMasPedidos() {
    if (cargandoMas) {
      return
    }

    const siguientePaginaYaCargada =
      (paginaActual + 1) * TAMANO_PAGINA < pedidos.length

    if (siguientePaginaYaCargada) {
      setPaginaActual((pagina) => pagina + 1)
      return
    }

    if (!hayMasPedidos) {
      return
    }

    setCargandoMas(true)

    try {
      const pagina = usuario.demo
        ? await obtenerPaginaPedidosParaVistaPrevia(
            offsetSiguiente,
            TAMANO_PAGINA
          )
        : await obtenerPaginaPedidosAdministrativos(
            usuario.token,
            offsetSiguiente,
            TAMANO_PAGINA
          )

      setPedidos((anteriores) => {
        const idsExistentes = new Set(anteriores.map((pedido) => pedido.id))
        return [
          ...anteriores,
          ...pagina.data.filter((pedido) => !idsExistentes.has(pedido.id)),
        ]
      })
      void cargarEntregas(pagina.data)
      if (pagina.data.length > 0) {
        setPaginaActual((pagina) => pagina + 1)
      }
      setOffsetSiguiente((offset) => offset + pagina.data.length)
      if (pagina.total !== null) {
        setTotalPedidos(pagina.total)
        setHayMasPedidos(offsetSiguiente + pagina.data.length < pagina.total)
      } else {
        setHayMasPedidos(pagina.data.length === TAMANO_PAGINA)
      }
      setError('')
    } catch (err) {
      setError(err.message || 'No se pudieron cargar más pedidos.')
    } finally {
      setCargandoMas(false)
    }
  }

  const pedidosVisibles =
    filtro === 'TODOS'
      ? pedidos
      : pedidos.filter((pedido) => pedido.estado === filtro)
  const pedidosDeLaPagina = pedidosVisibles.slice(
    paginaActual * TAMANO_PAGINA,
    (paginaActual + 1) * TAMANO_PAGINA
  )
  const pendientes = pedidos.filter((pedido) => pedido.estado === 'PENDIENTE')
  const enProceso = pedidos.filter(
    (pedido) =>
      ['CONFIRMADO', 'EN_PREPARACION', 'EN_CAMINO'].includes(pedido.estado)
  )
  const entregados = pedidos.filter((pedido) => pedido.estado === 'ENTREGADO')
  return (
    <main className="mx-auto max-w-7xl space-y-7 px-5 py-8 text-slate-900 sm:px-8 sm:py-10">
      <section className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-r from-white via-white to-blue-50 p-6 shadow-sm sm:p-8">
        <div className="absolute -right-10 -top-16 h-48 w-48 rounded-full bg-blue-200/40 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-700">
              Operaciones · Administrador
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">
              Panel de pedidos
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Supervisa los pedidos y sus cambios de estado en tiempo real.
            </p>
          </div>

          {usuario.demo ? (
            <div
              role="status"
              className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800"
            >
              Vista previa · datos desde API
            </div>
          ) : (
            <div
              role="status"
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold ${
                estadoSocket === 'conectado'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-amber-200 bg-amber-50 text-amber-800'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  estadoSocket === 'conectado'
                    ? 'bg-emerald-500'
                    : 'bg-amber-500'
                }`}
              />
              {estadoSocket === 'conectado'
                ? 'Actualizaciones en vivo'
                : estadoSocket === 'conectando'
                  ? 'Conectando en tiempo real…'
                  : 'Sin conexión en tiempo real'}
            </div>
          )}
        </div>
      </section>

      <section
        aria-label="Resumen de pedidos"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {[
          {
            etiqueta: 'Total de pedidos',
            valor: totalPedidos ?? pedidos.length,
          },
          { etiqueta: 'Pendientes cargados', valor: pendientes.length },
          { etiqueta: 'En proceso cargados', valor: enProceso.length },
          { etiqueta: 'Entregados cargados', valor: entregados.length },
        ].map((dato) => (
          <article
            key={dato.etiqueta}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/60"
          >
            <p className="text-sm text-slate-500">{dato.etiqueta}</p>
            <p className="mt-2 text-3xl font-bold text-slate-950">{dato.valor}</p>
          </article>
        ))}
      </section>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/60">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-7">
          <div>
            <h3 className="text-lg font-bold text-slate-950 sm:text-xl">
              Todos los pedidos
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Elige un estado para filtrar la tabla.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              Estado
              <select
                aria-label="Filtrar pedidos por estado"
                value={filtro}
                onChange={(evento) => {
                  setFiltro(evento.target.value)
                  setPaginaActual(0)
                }}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15"
              >
                {FILTROS.map((estado) => (
                  <option key={estado} value={estado}>
                    {estado === 'TODOS' ? 'Todos' : etiquetaEstado(estado)}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={recargarPedidos}
              disabled={cargando || cargandoMas}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800 disabled:cursor-wait disabled:opacity-60"
            >
              {cargando ? 'Cargando…' : 'Actualizar'}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th scope="col" className="px-5 py-4 sm:px-7">
                  Pedido
                </th>
                <th scope="col" className="px-5 py-4">
                  Cliente
                </th>
                <th scope="col" className="px-5 py-4">
                  Estado
                </th>
                <th scope="col" className="px-5 py-4">
                  Repartidor
                </th>
                <th scope="col" className="px-5 py-4">
                  Lugar de entrega
                </th>
                <th scope="col" className="px-5 py-4">
                  Total
                </th>
                <th scope="col" className="px-5 py-4 sm:px-7">
                  Tiempo de entrega
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {cargando && pedidos.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center text-slate-500">
                    Cargando pedidos…
                  </td>
                </tr>
              ) : pedidosDeLaPagina.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center text-slate-500">
                    {pedidos.length === 0
                      ? 'Todavía no hay pedidos registrados.'
                      : 'No hay pedidos para este estado.'}
                  </td>
                </tr>
              ) : (
                pedidosDeLaPagina.map((pedido) => {
                  const entrega = entregas[pedido.id]
                  const nombreCliente = `Cliente ${pedido.cliente}`
                  const courierId = entrega?.status === 'loaded' ? entrega.data.courierId : null

                  return (
                    <tr key={pedido.id} className="text-slate-700">
                      <th
                        scope="row"
                        className="whitespace-nowrap px-5 py-4 font-semibold text-slate-950 sm:px-7"
                      >
                        <span className="block">
                          PED-{String(pedido.id).padStart(3, '0')}
                        </span>
                        <span className="mt-1 block text-xs font-normal text-slate-500">
                          {pedido.fecha}
                        </span>
                      </th>
                      <td className="max-w-48 truncate px-5 py-4" title={nombreCliente}>
                        {nombreCliente}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ring-1 ring-inset ${colorEstadoAdmin(pedido.estado)}`}
                        >
                          {etiquetaEstado(pedido.estado)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        {courierId
                          ? `Repartidor ${courierId}`
                          : 'Sin asignar'}
                      </td>
                      <td
                        className="max-w-64 truncate px-5 py-4"
                        title={pedido.direccion || entrega?.data?.deliveryAddress || ''}
                      >
                        {pedido.direccion || entrega?.data?.deliveryAddress || '—'}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        {mostrarTotal(pedido.total)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 font-semibold tabular-nums sm:px-7">
                        {tiempoDeEntrega(entrega, ahora)}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-200 px-5 py-3 text-xs text-slate-500 sm:px-7">
          Mostrando {pedidosDeLaPagina.length} pedidos en esta página
          {totalPedidos !== null ? ` de ${totalPedidos}` : ''} · El estado y
          las horas se actualizan en vivo.
        </div>

        {(paginaActual > 0 ||
          hayMasPedidos ||
          (paginaActual + 1) * TAMANO_PAGINA < pedidos.length) && (
          <nav
            aria-label="Paginación de pedidos"
            className="flex items-center justify-center gap-3 border-t border-slate-200 px-5 py-4"
          >
            <button
              type="button"
              onClick={() => setPaginaActual((pagina) => Math.max(0, pagina - 1))}
              disabled={paginaActual === 0 || cargando || cargandoMas}
              aria-label="Ver pedidos anteriores"
              title="Ver pedidos anteriores"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-lg font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span aria-hidden="true">&lt;</span>
            </button>
            <span className="min-w-20 text-center text-xs text-slate-500">
              Página {paginaActual + 1}
            </span>
            <button
              type="button"
              onClick={cargarMasPedidos}
              disabled={
                cargandoMas ||
                cargando ||
                (!hayMasPedidos &&
                  (paginaActual + 1) * TAMANO_PAGINA >= pedidos.length)
              }
              aria-label="Ver siguientes pedidos"
              title="Ver siguientes pedidos"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-lg font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span aria-hidden="true">&gt;</span>
            </button>
          </nav>
        )}
      </section>
    </main>
  )
}

export default PanelAdministrativo
