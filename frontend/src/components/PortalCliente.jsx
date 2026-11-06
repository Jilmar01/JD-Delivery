
import { useEffect, useState } from 'react'
import FormularioPedido from './FormularioPedido'
import ListaPedidos from './ListaPedidos'
import SeguimientoPedido from './SeguimientoPedido'
import PedidoEnCurso from './PedidoEnCurso'
import ModalPago from './ModalPago'
import { agregarTiemposDeEntrega } from '../services/entregasService'
import { cancelarPedido, crearPedido, obtenerPedidosCliente } from '../services/pedidosService'
import { CATEGORIAS, COMIDAS_DEMO, formatoMoneda } from '../utils/catalogo'
import pizza from '../assets/images/pizza.jpg'

function PortalCliente({ usuario, alCerrarSesion }) {
  const [pedidos, setPedidos] = useState([])
  const [cantidadesCarrito, setCantidadesCarrito] = useState({})
  const [direccion, setDireccion] = useState('')
  const [ubicacion, setUbicacion] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [seguimiento, setSeguimiento] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)
  const [pestana, setPestana] = useState('inicio')
  const [categoriaActiva, setCategoriaActiva] = useState('todas')
  const [pagoAbierto, setPagoAbierto] = useState(false)
  const [errorPago, setErrorPago] = useState('')
  const customerId = String(usuario.id ?? '')
  const sinSesion = !usuario.token || !customerId

  function cambiarCantidad(comida, cambio) {
    setError('')
    setCantidadesCarrito((cantidades) => {
      const cantidadActual = cantidades[comida.idLocal] || 0
      const nuevaCantidad = Math.max(0, cantidadActual + cambio)

      if (nuevaCantidad === 0) {
        const restantes = { ...cantidades }
        delete restantes[comida.idLocal]
        return restantes
      }

      return { ...cantidades, [comida.idLocal]: nuevaCantidad }
    })
  }

  const productosSeleccionados = COMIDAS_DEMO
    .map((comida) => ({
      ...comida,
      cantidad: cantidadesCarrito[comida.idLocal] || 0,
    }))
    .filter((comida) => comida.cantidad > 0)
  const totalCarritoCentavos = productosSeleccionados.reduce(
    (total, comida) =>
      total + Math.round(comida.precioDemo * 100) * comida.cantidad,
    0
  )

  // Refresca los pedidos cada 5 s para ver cuándo lo asignan y lo entregan
  useEffect(() => {
    const refresco = setInterval(() => setVersion((v) => v + 1), 5000)
    return () => clearInterval(refresco)
  }, [])

  // Cada cambio de "version" vuelve a consultar los pedidos (p. ej. tras crear uno)
  useEffect(() => {
    let activo = true

    async function cargar() {
      if (usuario.modoDemostracion || sinSesion) return

      try {
        const datos = await obtenerPedidosCliente(customerId, usuario.token)
        // Si delivery-service no responde, se muestran los pedidos sin tiempos
        const conTiempos = await agregarTiemposDeEntrega(datos, usuario.token).catch(() => datos)
        if (activo) setPedidos(conTiempos)
      } catch (error) {
        if (!activo) return
        setError(error.message || 'No se pudieron cargar los pedidos.')
        if (error.status === 401) alCerrarSesion(error.message)
      }
    }

    cargar().finally(() => {
      if (activo) setCargando(false)
    })
    return () => {
      activo = false
    }
  }, [alCerrarSesion, customerId, sinSesion, usuario.modoDemostracion, usuario.token, version])

  // Antes de abrir la ventana de pago se comprueba que haya dirección y productos
  function abrirPago() {
    setError('')
    setErrorPago('')

    if (!ubicacion || !direccion.trim() || direccion.startsWith('Buscando')) {
      setError('Elige el punto de entrega en el mapa y espera a que se complete la dirección.')
      return
    }

    if (productosSeleccionados.length === 0) {
      setError('Agrega al menos un producto al carrito.')
      return
    }

    setPagoAbierto(true)
  }

  async function pagarPedido() {
    setErrorPago('')
    setEnviando(true)
    try {
      const { pedido, oferta } = await crearPedido(
        {
          customerId,
          direccion: direccion.trim(),
          lat: ubicacion.lat,
          lng: ubicacion.lng,
          total: totalCarritoCentavos / 100,
          notas: productosSeleccionados
            .map((comida) => `${comida.nombre} x${comida.cantidad}`)
            .join(', '),
        },
        usuario.token
      )
      setSeguimiento({ pedido, oferta })
      setCantidadesCarrito({})
      setDireccion('')
      setUbicacion(null)
      setPagoAbierto(false)
      setVersion((v) => v + 1)
    } catch (error) {
      setErrorPago(error.message || 'No se pudo registrar el pedido.')
      if (error.status === 401) alCerrarSesion(error.message)
    } finally {
      setEnviando(false)
    }
  }

  const productosVisibles =
    categoriaActiva === 'todas'
      ? COMIDAS_DEMO
      : COMIDAS_DEMO.filter((comida) => comida.categoria === categoriaActiva)
  const categoriaElegida = CATEGORIAS.find((c) => c.id === categoriaActiva)

  const enProgreso = pedidos.filter((p) => p.estado !== 'DELIVERED' && p.estado !== 'CANCELLED')
  const historial = pedidos.filter((p) => p.estado === 'DELIVERED' || p.estado === 'CANCELLED')

  async function cancelarDesdeTarjeta(pedido) {
    try {
      await cancelarPedido(pedido.id, usuario.token)
      setVersion((v) => v + 1)
    } catch (error) {
      setError(error.message || 'No se pudo cancelar el pedido.')
    }
  }

  const nombreCorto = usuario.nombre?.trim().split(/\s+/)[0] || 'cliente'

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-7 sm:space-y-10 sm:px-8 sm:py-10">
        <section className="relative isolate min-h-[320px] overflow-hidden rounded-3xl bg-[#07172D] shadow-xl shadow-blue-950/10 sm:min-h-[350px] lg:min-h-[390px]">
          <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#0B2A50] via-[#0B1D38] to-[#061226]" />
          <img
            src={pizza}
            alt="Fotografía de referencia de pizza"
            className="absolute inset-y-0 right-0 z-0 h-full w-full object-cover object-center opacity-55 sm:w-3/4 sm:opacity-70"
          />
          <div className="absolute inset-0 z-10 bg-gradient-to-r from-[#07172D] via-[#07172D]/90 to-[#07172D]/30 sm:to-transparent" />
          <div className="relative z-20 flex min-h-[320px] flex-col justify-center p-6 sm:min-h-[350px] sm:p-10 lg:min-h-[390px] lg:p-14">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-300 sm:text-sm">
              J-D Delivery
            </p>
            <h2 className="mt-3 max-w-xl text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
              Hola, {nombreCorto}.
              <br />
              Algo rico está más cerca.
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-6 text-blue-50/80 sm:text-base">
              Explora opciones y organiza tu entrega desde un solo lugar.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 text-xs font-medium text-white/90 sm:gap-3 sm:text-sm">
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-2 backdrop-blur-sm">
                Seguimiento de pedidos
              </span>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-2 backdrop-blur-sm">
                Entrega organizada
              </span>
            </div>
            <a
              href="#crear-pedido"
              className="mt-7 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-950/30 transition hover:-translate-y-0.5 hover:bg-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-300/30 sm:w-fit"
            >
              Realizar un pedido
            </a>
          </div>
        </section>

        <nav
          role="tablist"
          aria-label="Secciones del portal"
          className="flex w-full gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm shadow-slate-200/60 sm:w-fit"
        >
          {[
            { id: 'inicio', texto: 'Pedir' },
            { id: 'historial', texto: `Historial${historial.length ? ` (${historial.length})` : ''}` },
          ].map((opcion) => (
            <button
              key={opcion.id}
              type="button"
              role="tab"
              aria-selected={pestana === opcion.id}
              onClick={() => setPestana(opcion.id)}
              className={`flex-1 rounded-xl px-6 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-4 focus:ring-blue-600/15 sm:flex-none ${
                pestana === opcion.id
                  ? 'bg-blue-700 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {opcion.texto}
            </button>
          ))}
        </nav>

        {pestana === 'historial' ? (
          <section
            id="historial"
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/70"
          >
            <div className="p-5 sm:p-7">
              {cargando ? (
                <p className="text-sm text-slate-500">Cargando pedidos...</p>
              ) : sinSesion ? (
                <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  No hay una sesión autenticada para consultar pedidos.
                </p>
              ) : (
                <ListaPedidos
                  pedidos={historial}
                  titulo="Historial de pedidos"
                  subtitulo="Tus pedidos entregados y cancelados."
                  mensajeVacio="Aún no tienes pedidos finalizados."
                  detalleVacio="Cuando recibas o canceles un pedido aparecerá aquí."
                />
              )}
            </div>
          </section>
        ) : (
          <>
        <section aria-labelledby="progreso-titulo" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
                Ahora mismo
              </p>
              <h2
                id="progreso-titulo"
                className="mt-1 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl"
              >
                Tu pedido en progreso
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setPestana('historial')}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-blue-800 shadow-sm transition hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-blue-600/15"
            >
              Ver historial{historial.length ? ` (${historial.length})` : ''}
            </button>
          </div>

          {enProgreso.length > 0 ? (
            enProgreso.map((pedido) => (
              <PedidoEnCurso
                key={pedido.id}
                pedido={pedido}
                alVerBusqueda={(elegido) => setSeguimiento({ pedido: elegido, oferta: null })}
                alCancelar={cancelarDesdeTarjeta}
              />
            ))
          ) : (
            <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-center sm:flex-row sm:text-left">
              <div className="flex -space-x-3">
                {COMIDAS_DEMO.slice(0, 3).map((comida) => (
                  <img
                    key={comida.idLocal}
                    src={comida.imagen}
                    alt=""
                    className="h-16 w-16 rounded-2xl object-cover ring-4 ring-white"
                  />
                ))}
              </div>
              <div>
                <p className="font-semibold text-slate-900">
                  {cargando ? 'Buscando tus pedidos…' : 'No tienes ningún pedido en progreso'}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Elige tu comida más abajo; tus pedidos anteriores están en la pestaña Historial.
                </p>
              </div>
            </div>
          )}
        </section>

        <section aria-labelledby="categorias-titulo" className="space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
              Todo el menú
            </p>
            <h2
              id="categorias-titulo"
              className="mt-1 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl"
            >
              Explora por categoría
            </h2>
          </div>

          <div
            role="tablist"
            aria-label="Categorías de comida"
            className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-10"
          >
            {[{ id: 'todas', nombre: 'Todo' }, ...CATEGORIAS].map((categoria) => {
              const activa = categoriaActiva === categoria.id
              return (
                <button
                  key={categoria.id}
                  type="button"
                  role="tab"
                  aria-selected={activa}
                  onClick={() => setCategoriaActiva(categoria.id)}
                  className={`group overflow-hidden rounded-2xl border bg-white text-center shadow-sm shadow-slate-200/50 transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-blue-600/15 ${
                    activa ? 'border-blue-600 ring-2 ring-blue-600/20' : 'border-slate-200'
                  }`}
                >
                  {categoria.imagen ? (
                    <img
                      src={categoria.imagen}
                      alt=""
                      loading="lazy"
                      className="h-20 w-full object-cover transition duration-300 group-hover:scale-105 sm:h-24"
                    />
                  ) : (
                    <span className="flex h-20 items-center justify-center bg-gradient-to-br from-[#0B2A50] to-[#1D4ED8] text-lg font-bold text-white sm:h-24">
                      Todo
                    </span>
                  )}
                  <span
                    className={`block px-1.5 py-2.5 text-xs font-semibold leading-4 sm:text-sm ${
                      activa ? 'text-blue-800' : 'text-slate-800'
                    }`}
                  >
                    {categoria.nombre}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        <section aria-labelledby="inspiracion-titulo">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2
                id="inspiracion-titulo"
                className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl"
              >
                {categoriaElegida ? categoriaElegida.nombre : 'Todos los productos'}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {productosVisibles.length} productos · agrega los que quieras a tu pedido
              </p>
            </div>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
              Precios de muestra
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {productosVisibles.map((comida) => (
              <article
                key={comida.idLocal}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50"
              >
                <img
                  src={comida.imagen}
                  alt={comida.alt}
                  loading="lazy"
                  className="h-32 w-full object-cover sm:h-36"
                />
                <div className="p-3">
                  <h3 className="text-sm font-semibold text-slate-800">{comida.nombre}</h3>
                  <p className="mt-1 text-sm font-semibold text-blue-700">
                    {formatoMoneda.format(comida.precioDemo)}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => cambiarCantidad(comida, -1)}
                      disabled={!cantidadesCarrito[comida.idLocal]}
                      aria-label={`Disminuir cantidad de ${comida.nombre}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-lg font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      −
                    </button>
                    <span
                      aria-live="polite"
                      aria-label={`Cantidad de ${comida.nombre}`}
                      className="min-w-6 text-center text-sm font-semibold text-slate-800"
                    >
                      {cantidadesCarrito[comida.idLocal] || 0}
                    </span>
                    <button
                      type="button"
                      onClick={() => cambiarCantidad(comida, 1)}
                      aria-label={`Aumentar cantidad de ${comida.nombre}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-700 text-lg font-semibold text-white transition hover:bg-blue-800"
                    >
                      +
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div
            aria-live="polite"
            className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/50 sm:p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Tu carrito</h3>
                <p className="mt-1 text-xs leading-5 text-amber-700">
                  Productos y precios de muestra: el catálogo real aún no está conectado.
                  Se envía el total del carrito con tu pedido.
                </p>
              </div>
              <p className="text-lg font-bold text-slate-950">
                Total: {formatoMoneda.format(totalCarritoCentavos / 100)}
              </p>
            </div>
            {productosSeleccionados.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center text-sm text-slate-600">
                Tu carrito está vacío. Agrega productos con el botón +.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-slate-100">
                {productosSeleccionados.map((comida) => (
                  <li
                    key={comida.idLocal}
                    className="flex items-center gap-3 py-3 text-sm"
                  >
                    <img src={comida.imagen} alt="" className="h-12 w-12 rounded-xl object-cover" />
                    <span className="min-w-0 flex-1 truncate font-medium text-slate-800">
                      {comida.nombre} × {comida.cantidad}
                    </span>
                    <span className="font-semibold text-slate-700">
                      {formatoMoneda.format((Math.round(comida.precioDemo * 100) * comida.cantidad) / 100)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section
          aria-labelledby="promociones-titulo"
          className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]"
        >
          <div className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-white to-blue-50 p-6 shadow-sm shadow-slate-200/70 sm:p-8">
            <div className="absolute -right-10 -top-14 h-48 w-48 rounded-full bg-blue-200/40 blur-3xl" />
            <div className="relative">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
                Novedades
              </p>
              <h2
                id="promociones-titulo"
                className="mt-2 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl"
              >
                Promociones
              </h2>
              <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600">
                Las promociones aparecerán aquí cuando haya ofertas disponibles.
              </p>
              <div className="mt-5 inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-500">
                Sin promociones publicadas
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/70 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                  Tu actividad
                </p>
                <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
                  Tus pedidos
                </h2>
              </div>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 5h16v15H4zM8 9h8M8 13h8M8 17h5"
                  />
                </svg>
              </span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">Total</p>
                <p className="mt-1 text-2xl font-bold text-slate-950">
                  {pedidos.length}
                </p>
              </div>
              <div className="rounded-2xl bg-amber-50 p-4">
                <p className="text-xs font-medium text-amber-800">En progreso</p>
                <p className="mt-1 text-2xl font-bold text-amber-700">
                  {enProgreso.length}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          id="crear-pedido"
          className="scroll-mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/70"
        >
          <div className="border-b border-slate-100 px-5 py-5 sm:px-7">
            <h2 className="text-lg font-bold tracking-tight text-slate-950 sm:text-xl">
              Registrar un pedido
            </h2>
            <p className="mt-1.5 text-sm leading-5 text-slate-600">
              Elige dónde entregamos tu pedido; el pago es el último paso.
            </p>
          </div>

          <div className="p-5 sm:p-7">
            <FormularioPedido
              direccion={direccion}
              setDireccion={setDireccion}
              ubicacion={ubicacion}
              setUbicacion={setUbicacion}
              totalCentavos={totalCarritoCentavos}
              alContinuar={abrirPago}
            />
          </div>
        </section>

        {error && (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-5 text-red-700"
          >
            {error}
          </p>
        )}

          </>
        )}
      </div>

      {pagoAbierto && (
        <ModalPago
          productos={productosSeleccionados}
          totalCentavos={totalCarritoCentavos}
          direccion={direccion}
          enviando={enviando}
          error={errorPago}
          alCerrar={() => setPagoAbierto(false)}
          alConfirmar={pagarPedido}
        />
      )}

      {seguimiento && (
        <SeguimientoPedido
          pedido={seguimiento.pedido}
          ofertaInicial={seguimiento.oferta}
          token={usuario.token}
          alCerrar={() => setSeguimiento(null)}
          alCambiar={() => setVersion((v) => v + 1)}
        />
      )}
    </main>
  )
}

export default PortalCliente
