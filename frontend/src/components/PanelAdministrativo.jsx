import { useCallback, useEffect, useState } from 'react'
import {
  normalizarEventoPedido,
  obtenerOfertasPedido,
  obtenerPaginaPedidosAdministrativos,
  obtenerPaginaPedidosParaVistaPrevia,
  WS_URL,
} from '../services/pedidosService'
import { obtenerEntregasPorPedidos } from '../services/entregasService'
import { obtenerNombresUsuarios } from '../services/authService'
import { direccionDe } from '../services/geocodificacion'
import { formatoDuracion } from '../utils/tiempo'
import { colorEstado, etiquetaEstado } from '../utils/estados'

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

function mostrarFechaHora(fecha) {
  if (!fecha) {
    return '—'
  }

  const fechaValida = new Date(fecha)
  return Number.isNaN(fechaValida.getTime())
    ? '—'
    : fechaValida.toLocaleString('es-EC')
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
  const [nombres, setNombres] = useState({})
  const [ahora, setAhora] = useState(() => Date.now())
  const [ubicaciones, setUbicaciones] = useState({})

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

    const cargadas = resultados.filter((r) => r.status === 'loaded')

    // Nombres de clientes y repartidores en lugar de sus números de usuario
    const nuevosNombres = await obtenerNombresUsuarios(
      [
        ...listaPedidos.map((p) => p.cliente),
        ...cargadas.map((r) => r.data.courierId),
      ],
      token
    )
    setNombres((anteriores) => ({ ...anteriores, ...nuevosNombres }))

    // Dónde estaba el repartidor cuando aceptó el pedido (primero coordenadas, luego la dirección)
    for (const { orderId, data } of cargadas) {
      if (!data.courierId) continue

      obtenerOfertasPedido(orderId, token)
        .then((eventos) => {
          const aceptada = eventos.find(
            (e) => e.evento === 'ACEPTADA' && Number.isFinite(e.lat) && Number.isFinite(e.lng)
          )
          if (!aceptada) return undefined

          setUbicaciones((anteriores) => ({
            ...anteriores,
            [orderId]: { lat: aceptada.lat, lng: aceptada.lng, texto: anteriores[orderId]?.texto ?? null },
          }))
          return direccionDe(aceptada.lat, aceptada.lng).then((texto) => {
            if (texto) {
              setUbicaciones((anteriores) => ({
                ...anteriores,
                [orderId]: { lat: aceptada.lat, lng: aceptada.lng, texto },
              }))
            }
          })
        })
        .catch(() => {})
    }
  }, [usuario.demo, usuario.token])

  useEffect(() => {
    let desmontado = false
    let reintento
    let socket
    let versionEventos = 0
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

        if (!desmontado && versionInicial === versionEventos) {
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

    function conectarWebSocket() {
      if (desmontado) {
        return
      }

      setEstadoSocket('conectando')
      socket = new WebSocket(WS_URL)

      socket.onopen = () => {
        if (!desmontado) {
          socket.send(
            JSON.stringify({ tipo: 'AUTENTICAR', token: usuario.token })
          )
        }
      }

      socket.onmessage = (mensaje) => {
        try {
          const evento = JSON.parse(mensaje.data)

          if (evento.tipo === 'CONECTADO') {
            setEstadoSocket('conectado')
            return
          }

          if (
            !['PEDIDO_CREADO', 'PEDIDO_ACTUALIZADO'].includes(evento.tipo) ||
            !evento.datos
          ) {
            return
          }

          const pedidoActualizado = normalizarEventoPedido(evento.datos)
          versionEventos += 1
          if (evento.tipo === 'PEDIDO_CREADO') {
            setTotalPedidos((total) =>
              total === null ? null : total + 1
            )
          }
          setPedidos((anteriores) => {
            const yaExiste = anteriores.some(
              (pedido) => pedido.id === pedidoActualizado.id
            )

            return yaExiste
              ? anteriores.map((pedido) =>
                  pedido.id === pedidoActualizado.id
                    ? pedidoActualizado
                    : pedido
                )
              : [pedidoActualizado, ...anteriores]
          })
          void cargarEntregas([pedidoActualizado])
          setError('')
        } catch (err) {
          setError(
            err.message || 'No se pudo procesar una actualización en tiempo real.'
          )
        }
      }

      socket.onerror = () => {
        socket.close()
      }

      socket.onclose = () => {
        if (!desmontado) {
          setEstadoSocket('desconectado')
          reintento = window.setTimeout(conectarWebSocket, 3000)
        }
      }
    }

    conectarWebSocket()

    return () => {
      desmontado = true
      window.clearTimeout(reintento)
      socket?.close()
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
    <main className="mx-auto max-w-7xl space-y-7 px-5 py-8 sm:px-8 sm:py-10">
      <section className="relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-r from-purple-950/60 via-[#18151f] to-[#15151A] p-6 sm:p-8">
        <div className="absolute -right-10 -top-16 h-48 w-48 rounded-full bg-purple-500/10 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-purple-300">
              Operaciones · Administrador
            </p>
            <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
              Panel de pedidos
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
              Supervisa los pedidos y sus cambios de estado en tiempo real.
            </p>
          </div>

          {usuario.demo ? (
            <div
              role="status"
              className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300"
            >
              Vista previa · datos desde API
            </div>
          ) : (
            <div
              role="status"
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold ${
                estadoSocket === 'conectado'
                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                  : 'border-amber-500/10 bg-amber-500/10 text-amber-300'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  estadoSocket === 'conectado'
                    ? 'bg-emerald-400'
                    : 'bg-amber-400'
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
            className="rounded-2xl border border-white/10 bg-[#18181B] p-5 shadow-lg shadow-black/10"
          >
            <p className="text-sm text-zinc-400">{dato.etiqueta}</p>
            <p className="mt-2 text-3xl font-bold text-white">{dato.valor}</p>
          </article>
        ))}
      </section>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300"
        >
          {error}
        </p>
      )}

      <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#18181B] shadow-xl shadow-black/10">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 px-5 py-5 sm:px-7">
          <div>
            <h3 className="text-lg font-bold text-white sm:text-xl">
              Todos los pedidos
            </h3>
            <p className="mt-1 text-sm text-zinc-400">
              Elige un estado para filtrar la tabla.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              Estado
              <select
                aria-label="Filtrar pedidos por estado"
                value={filtro}
                onChange={(evento) => {
                  setFiltro(evento.target.value)
                  setPaginaActual(0)
                }}
                className="rounded-lg border border-zinc-700 bg-[#09090B] px-3 py-2 text-sm text-white outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10"
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
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:border-purple-500/50 hover:text-white disabled:cursor-wait disabled:opacity-60"
            >
              {cargando ? 'Cargando…' : 'Actualizar'}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1450px] text-left text-sm">
            <thead className="bg-[#111113] text-xs uppercase tracking-wider text-zinc-500">
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
                  Lugar del repartidor
                </th>
                <th scope="col" className="px-5 py-4">
                  Hora asignada
                </th>
                <th scope="col" className="px-5 py-4">
                  Hora de recogida
                </th>
                <th scope="col" className="px-5 py-4">
                  Hora de llegada
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
                  <td colSpan="11" className="px-5 py-12 text-center text-zinc-400">
                    Cargando pedidos…
                  </td>
                </tr>
              ) : pedidosDeLaPagina.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-5 py-12 text-center text-zinc-400">
                    {pedidos.length === 0
                      ? 'Todavía no hay pedidos registrados.'
                      : 'No hay pedidos para este estado.'}
                  </td>
                </tr>
              ) : (
                pedidosDeLaPagina.map((pedido) => {
                  const entrega = entregas[pedido.id]
                  const ubicacion = ubicaciones[pedido.id]
                  const nombreCliente = nombres[pedido.cliente] || `Cliente ${pedido.cliente}`
                  const courierId = entrega?.status === 'loaded' ? entrega.data.courierId : null

                  return (
                    <tr key={pedido.id} className="text-zinc-300">
                      <th
                        scope="row"
                        className="whitespace-nowrap px-5 py-4 font-semibold text-white sm:px-7"
                      >
                        <span className="block">
                          PED-{String(pedido.id).padStart(3, '0')}
                        </span>
                        <span className="mt-1 block text-xs font-normal text-zinc-500">
                          {pedido.fecha}
                        </span>
                      </th>
                      <td className="max-w-48 truncate px-5 py-4" title={nombreCliente}>
                        {nombreCliente}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${colorEstado(pedido.estado)}`}
                        >
                          {etiquetaEstado(pedido.estado)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        {courierId
                          ? nombres[courierId] || `Repartidor ${courierId}`
                          : 'Sin asignar'}
                      </td>
                      <td
                        className="max-w-64 truncate px-5 py-4"
                        title={entrega?.data?.deliveryAddress || ''}
                      >
                        {entrega?.status === 'loaded'
                          ? entrega.data.deliveryAddress || '—'
                          : '—'}
                      </td>
                      <td
                        className="max-w-64 truncate px-5 py-4"
                        title={ubicacion?.texto || ''}
                      >
                        {ubicacion
                          ? ubicacion.texto ||
                            `${ubicacion.lat.toFixed(5)}, ${ubicacion.lng.toFixed(5)}`
                          : '—'}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        {entrega?.status === 'loaded'
                          ? mostrarFechaHora(entrega.data.assignedAt)
                          : '—'}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        {entrega?.status === 'loaded'
                          ? mostrarFechaHora(entrega.data.startedAt)
                          : '—'}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        {entrega?.status === 'loaded'
                          ? mostrarFechaHora(entrega.data.deliveredAt)
                          : '—'}
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

        <div className="border-t border-white/10 px-5 py-3 text-xs text-zinc-500 sm:px-7">
          Mostrando {pedidosDeLaPagina.length} pedidos en esta página
          {totalPedidos !== null ? ` de ${totalPedidos}` : ''} · El estado y
          las horas se actualizan en vivo.
        </div>

        {(paginaActual > 0 ||
          hayMasPedidos ||
          (paginaActual + 1) * TAMANO_PAGINA < pedidos.length) && (
          <nav
            aria-label="Paginación de pedidos"
            className="flex items-center justify-center gap-3 border-t border-white/10 px-5 py-4"
          >
            <button
              type="button"
              onClick={() => setPaginaActual((pagina) => Math.max(0, pagina - 1))}
              disabled={paginaActual === 0 || cargando || cargandoMas}
              aria-label="Ver pedidos anteriores"
              title="Ver pedidos anteriores"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-lg font-semibold text-zinc-200 transition hover:border-purple-500/50 hover:bg-purple-500/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span aria-hidden="true">&lt;</span>
            </button>
            <span className="min-w-20 text-center text-xs text-zinc-400">
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
              className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-lg font-semibold text-zinc-200 transition hover:border-purple-500/50 hover:bg-purple-500/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
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
