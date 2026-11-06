import { useCallback, useEffect, useRef, useState } from 'react'
import MapaRepartidor from './MapaRepartidor'
import { conectarRepartidor } from '../services/socketService'
import { actualizarEstadoPedido } from '../services/pedidosService'
import { etiquetaEstado } from '../utils/estados'
import { formatoDuracion } from '../utils/tiempo'

const POSICION_POR_DEFECTO = { lat: -0.180653, lng: -78.467834 }
const LATIDO_MS = 10000

const ESTILOS_ESTADO = {
  CONFIRMED: 'bg-blue-50 text-blue-800 ring-blue-200',
  IN_TRANSIT: 'bg-violet-50 text-violet-800 ring-violet-200',
  DELIVERED: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
}

const PASOS_ENTREGA = [
  { estado: 'CONFIRMED', texto: 'Aceptado' },
  { estado: 'IN_TRANSIT', texto: 'En camino' },
  { estado: 'DELIVERED', texto: 'Entregado' },
]

function Icono({ ruta, className = 'h-5 w-5' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={ruta} />
    </svg>
  )
}

const RUTAS = {
  ofertas: 'M12 3a6 6 0 0 0-6 6c0 5-2 6-2 6h16s-2-1-2-6a6 6 0 0 0-6-6Zm-2 15a2 2 0 0 0 4 0',
  entrega: 'M3 7h11v9H3zM14 10h4l3 3v3h-7zM7 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm10 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z',
  check: 'm5 12 4.5 4.5L19 7',
  senal: 'M5 12.5a10 10 0 0 1 14 0M8 15.5a6 6 0 0 1 8 0M12 19h.01',
  pin: 'M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
}

function PanelRepartidor({ usuario, alCerrarSesion }) {
  const [posicion, setPosicion] = useState(null)
  const [disponible, setDisponible] = useState(true)
  const [conectado, setConectado] = useState(false)
  const [ofertas, setOfertas] = useState([])
  const [entregas, setEntregas] = useState([])
  const [aviso, setAviso] = useState('')
  const [error, setError] = useState('')
  const [ahora, setAhora] = useState(() => Date.now())

  const conexion = useRef(null)
  const posicionRef = useRef(null)
  const disponibleRef = useRef(true)
  const ofertasRef = useRef([])

  const repartidorId = Number(usuario.id)
  const tienePosicion = posicion !== null

  useEffect(() => {
    posicionRef.current = posicion
    disponibleRef.current = disponible
    ofertasRef.current = ofertas
  }, [posicion, disponible, ofertas])

  // Al iniciar sesión se toma la ubicación del dispositivo; si no hay permiso, se parte
  // del local y el repartidor puede mover su marcador en el mapa
  const localizar = useCallback(() => {
    const respaldo = (mensaje) => {
      setPosicion((actual) => actual ?? POSICION_POR_DEFECTO)
      setAviso(mensaje)
    }

    if (!navigator.geolocation) {
      setTimeout(
        () => respaldo('Tu navegador no ofrece ubicación: mueve el marcador en el mapa.'),
        0
      )
      return
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setPosicion({ lat: coords.latitude, lng: coords.longitude })
        setAviso('')
      },
      () =>
        respaldo(
          'No pudimos leer tu ubicación: arrastra el marcador o toca el mapa para indicar dónde estás.'
        ),
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }, [])

  useEffect(() => {
    localizar()
  }, [localizar])

  // Cuenta regresiva de las ofertas
  useEffect(() => {
    const reloj = setInterval(() => setAhora(Date.now()), 1000)
    return () => clearInterval(reloj)
  }, [])

  // Conexión con el servicio de sockets: se abre cuando ya hay una posición
  useEffect(() => {
    if (!tienePosicion) return undefined
    if (!usuario.token || !Number.isSafeInteger(repartidorId)) {
      setTimeout(() => setError('No hay una sesión válida para conectarse a los sockets.'), 0)
      return undefined
    }

    const quitarOferta = (pedidoId) =>
      setOfertas((anteriores) => anteriores.filter((o) => o.pedidoId !== pedidoId))

    const alEvento = (tipo, datos = {}) => {
      if (tipo === 'OFERTA_PEDIDO') {
        setOfertas((anteriores) =>
          anteriores.some((o) => o.pedidoId === datos.pedidoId)
            ? anteriores
            : [...anteriores, { ...datos, recibidaEn: Date.now() }]
        )
        setAviso('')
      } else if (tipo === 'PEDIDO_TOMADO') {
        quitarOferta(datos.pedidoId)
        setAviso(`El pedido #${datos.pedidoId} lo tomó otro repartidor.`)
      } else if (tipo === 'OFERTA_EXPIRADA') {
        quitarOferta(datos.pedidoId)
      } else if (tipo === 'PEDIDO_CANCELADO') {
        quitarOferta(datos.pedidoId)
        setAviso(`El cliente canceló el pedido #${datos.pedidoId}.`)
      } else if (tipo === 'ASIGNACION_OK') {
        const oferta = ofertasRef.current.find((o) => o.pedidoId === datos.pedidoId)
        quitarOferta(datos.pedidoId)
        disponibleRef.current = false
        setDisponible(false)
        setEntregas((anteriores) => [
          ...anteriores.filter((e) => e.pedidoId !== datos.pedidoId),
          {
            pedidoId: datos.pedidoId,
            direccion: oferta?.direccion || '',
            entregaLat: oferta?.entregaLat,
            entregaLng: oferta?.entregaLng,
            estado: 'CONFIRMED',
            asignadoEn: Date.now(),
          },
        ])
        setAviso(`¡Pedido #${datos.pedidoId} asignado a ti!`)
      } else if (tipo === 'ASIGNACION_RECHAZADA') {
        quitarOferta(datos.pedidoId)
        setAviso(`No conseguiste el pedido #${datos.pedidoId}: otro repartidor lo aceptó primero.`)
      }
    }

    const canal = conectarRepartidor(usuario.token, {
      alConectar: () => {
        setConectado(true)
        setError('')
        canal.conectarse(posicionRef.current)
      },
      alDesconectar: () => setConectado(false),
      alSolicitarUbicacion: () => canal.conectarse(posicionRef.current),
      alError: (mensaje) => {
        setConectado(false)
        setError(mensaje)
      },
      alEvento,
    })
    conexion.current = canal

    // El servidor TCP descarta posiciones de más de 60 s: se renueva cada 10 s
    const latido = setInterval(
      () => canal.enviarUbicacion(posicionRef.current, disponibleRef.current),
      LATIDO_MS
    )

    return () => {
      clearInterval(latido)
      canal.cerrar()
      conexion.current = null
    }
  }, [tienePosicion, usuario.token, repartidorId])

  function moverA(punto) {
    setPosicion(punto)
    conexion.current?.enviarUbicacion(punto, disponibleRef.current)
  }

  function cambiarDisponibilidad() {
    const nuevo = !disponible
    setDisponible(nuevo)
    conexion.current?.enviarUbicacion(posicionRef.current, nuevo)
  }

  function responder(oferta, aceptar) {
    if (aceptar) {
      conexion.current?.aceptar(oferta.pedidoId)
      setOfertas((anteriores) =>
        anteriores.map((o) => (o.pedidoId === oferta.pedidoId ? { ...o, respondiendo: true } : o))
      )
    } else {
      conexion.current?.rechazar(oferta.pedidoId)
      setOfertas((anteriores) => anteriores.filter((o) => o.pedidoId !== oferta.pedidoId))
    }
  }

  async function avanzar(entrega, nuevoEstado) {
    setError('')
    try {
      await actualizarEstadoPedido(entrega.pedidoId, nuevoEstado, usuario.token)
      setEntregas((anteriores) =>
        anteriores.map((e) =>
          e.pedidoId === entrega.pedidoId
            ? { ...e, estado: nuevoEstado, ...(nuevoEstado === 'DELIVERED' && { entregadoEn: Date.now() }) }
            : e
        )
      )
      if (nuevoEstado === 'DELIVERED') {
        // Entrega terminada: vuelve a recibir ofertas
        setDisponible(true)
        conexion.current?.enviarUbicacion(posicionRef.current, true)
      }
    } catch (err) {
      setError(err.message || 'No se pudo actualizar el estado del pedido.')
      if (err.status === 401) alCerrarSesion(err.message)
    }
  }

  const activas = entregas.filter((e) => e.estado !== 'DELIVERED')
  const entregadas = entregas.length - activas.length
  const nombreCorto = usuario.nombre?.trim().split(/\s+/)[0] || 'repartidor'

  const tarjeta = 'rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-200/70'

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-7 sm:px-8 sm:py-10">
        <section className="relative isolate overflow-hidden rounded-3xl border border-white/10 text-white bg-gradient-to-br from-[#0B2A50] via-[#0A1E39] to-[#07172D] p-6 shadow-2xl shadow-blue-950/30 sm:p-9">
          <div className="absolute -right-16 -top-24 -z-10 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute -bottom-24 left-1/3 -z-10 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-blue-100 ring-1 ring-white/15 backdrop-blur-sm">
                <span className={`h-2 w-2 rounded-full ${conectado ? 'animate-pulse bg-emerald-400' : 'bg-red-400'}`} />
                {conectado ? 'En línea' : 'Sin conexión'} · Repartidor #{usuario.id}
              </span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                Hola, {nombreCorto}
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-blue-50/75 sm:text-base">
                Recibes una oferta cuando eres uno de los 3 repartidores más cercanos al
                local. El primero en aceptar se queda con el pedido.
              </p>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={disponible}
              onClick={cambiarDisponibilidad}
              className={`group flex items-center gap-4 rounded-2xl px-5 py-4 text-left ring-1 transition focus:outline-none focus:ring-4 focus:ring-blue-400/30 ${
                disponible
                  ? 'bg-emerald-500/15 ring-emerald-400/40 hover:bg-emerald-500/20'
                  : 'bg-white/5 ring-white/15 hover:bg-white/10'
              }`}
            >
              <span
                className={`relative h-8 w-14 shrink-0 rounded-full transition ${disponible ? 'bg-emerald-500' : 'bg-zinc-600'}`}
              >
                <span
                  className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${disponible ? 'left-7' : 'left-1'}`}
                />
              </span>
              <span>
                <span className="block text-sm font-bold">
                  {disponible ? 'Disponible para pedidos' : 'No disponible'}
                </span>
                <span className="block text-xs text-blue-100/70">
                  {disponible ? 'Estás recibiendo ofertas' : 'Actívalo para recibir ofertas'}
                </span>
              </span>
            </button>
          </div>
        </section>

        <section aria-label="Resumen" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { etiqueta: 'Conexión', valor: conectado ? 'En línea' : 'Caída', icono: RUTAS.senal, color: conectado ? 'text-emerald-600' : 'text-red-600' },
            { etiqueta: 'Ofertas nuevas', valor: ofertas.length, icono: RUTAS.ofertas, color: 'text-amber-600' },
            { etiqueta: 'Entregas en curso', valor: activas.length, icono: RUTAS.entrega, color: 'text-blue-600' },
            { etiqueta: 'Entregadas hoy', valor: entregadas, icono: RUTAS.check, color: 'text-emerald-600' },
          ].map((dato) => (
            <article key={dato.etiqueta} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/60 p-4 sm:p-5">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 ${dato.color}`}>
                <Icono ruta={dato.icono} />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500">{dato.etiqueta}</p>
                <p className="truncate text-2xl font-bold tracking-tight text-slate-950">{dato.valor}</p>
              </div>
            </article>
          ))}
        </section>

        {error && (
          <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-5 text-red-700">
            {error}
          </p>
        )}
        {aviso && (
          <p role="status" className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-5 text-blue-900">
            {aviso}
          </p>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.45fr_1fr]">
          <section className={`${tarjeta} space-y-4 p-4 sm:p-6`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-slate-950">Tu ubicación</h2>
                <p className="text-xs text-slate-500">Arrastra el marcador o toca el mapa para moverte.</p>
              </div>
              <button
                type="button"
                onClick={localizar}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-600/15"
              >
                <Icono ruta={RUTAS.pin} className="h-4 w-4" />
                Usar mi ubicación
              </button>
            </div>
            {posicion ? (
              <MapaRepartidor posicion={posicion} alMover={moverA} ofertas={ofertas} entregas={activas} />
            ) : (
              <div className="flex h-80 items-center justify-center rounded-2xl border border-dashed border-slate-300 text-sm text-slate-500">
                Obteniendo tu ubicación…
              </div>
            )}
            {posicion && (
              <p className="text-xs text-slate-500">
                Posición enviada: {posicion.lat.toFixed(5)}, {posicion.lng.toFixed(5)} · se renueva cada 10 s y
                el servidor la usa para elegir a los más cercanos.
              </p>
            )}
          </section>

          <div className="space-y-6">
            <section className={`${tarjeta} p-5 sm:p-6`}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold tracking-tight text-slate-950">Ofertas nuevas</h2>
                {ofertas.length > 0 && (
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800 ring-1 ring-amber-200">
                    {ofertas.length}
                  </span>
                )}
              </div>

              {ofertas.length === 0 ? (
                <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-9 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                    <Icono ruta={RUTAS.ofertas} className="h-6 w-6" />
                  </span>
                  <p className="text-sm text-slate-500">
                    {disponible ? 'Esperando pedidos cercanos…' : 'Estás no disponible: no recibirás ofertas.'}
                  </p>
                </div>
              ) : (
                <ul className="mt-4 space-y-3">
                  {ofertas.map((oferta) => {
                    const total = Math.max(1, new Date(oferta.expiraEn).getTime() - (oferta.recibidaEn ?? ahora))
                    const restante = Math.max(0, new Date(oferta.expiraEn).getTime() - ahora)
                    const segundos = Math.ceil(restante / 1000)
                    const porcentaje = Math.min(100, (restante / total) * 100)
                    return (
                      <li key={oferta.pedidoId} className="overflow-hidden rounded-2xl border border-amber-200 bg-amber-50">
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Nuevo pedido</p>
                              <p className="text-lg font-bold text-slate-950">#{oferta.pedidoId}</p>
                            </div>
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold tabular-nums text-amber-800 ring-1 ring-amber-200">
                              {segundos} s
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-5 text-slate-800">{oferta.direccion || 'Sin dirección'}</p>
                          <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-500">
                            <Icono ruta={RUTAS.pin} className="h-3.5 w-3.5" />
                            A {oferta.distanciaKm} km del local
                          </p>
                          <div className="mt-4 grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              disabled={oferta.respondiendo}
                              onClick={() => responder(oferta, true)}
                              className="rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-400/30 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {oferta.respondiendo ? 'Esperando…' : 'Aceptar'}
                            </button>
                            <button
                              type="button"
                              disabled={oferta.respondiendo}
                              onClick={() => responder(oferta, false)}
                              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-300/40 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Rechazar
                            </button>
                          </div>
                        </div>
                        <div className="h-1.5 bg-amber-100" aria-hidden="true">
                          <div className="h-full bg-amber-400 transition-[width] duration-1000 ease-linear" style={{ width: `${porcentaje}%` }} />
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            <section className={`${tarjeta} p-5 sm:p-6`}>
              <h2 className="text-lg font-bold tracking-tight text-slate-950">Mis entregas</h2>

              {entregas.length === 0 ? (
                <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-9 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                    <Icono ruta={RUTAS.entrega} className="h-6 w-6" />
                  </span>
                  <p className="text-sm text-slate-500">Aquí aparecerán los pedidos que aceptes.</p>
                </div>
              ) : (
                <ul className="mt-4 space-y-3">
                  {entregas.map((entrega) => {
                    const indice = PASOS_ENTREGA.findIndex((paso) => paso.estado === entrega.estado)
                    return (
                      <li key={entrega.pedidoId} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-lg font-bold text-slate-950">#{entrega.pedidoId}</p>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${ESTILOS_ESTADO[entrega.estado]}`}>
                            {etiquetaEstado(entrega.estado)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm leading-5 text-slate-700">{entrega.direccion}</p>

                        <ol className="mt-4 grid grid-cols-3 gap-2" aria-label="Etapas de la entrega">
                          {PASOS_ENTREGA.map((paso, i) => (
                            <li key={paso.estado} className="text-center">
                              <span className={`mx-auto block h-1.5 rounded-full ${i <= indice ? 'bg-blue-500' : 'bg-slate-200'}`} />
                              <span className={`mt-1.5 block text-[11px] font-semibold ${i <= indice ? 'text-blue-800' : 'text-slate-500'}`}>
                                {paso.texto}
                              </span>
                            </li>
                          ))}
                        </ol>

                        <p className="mt-3 text-xs font-semibold tabular-nums text-slate-500">
                          {entrega.estado === 'DELIVERED' ? 'Tiempo total' : 'Tiempo en curso'}:{' '}
                          <span className="text-slate-800">
                            {formatoDuracion((entrega.entregadoEn ?? ahora) - entrega.asignadoEn)}
                          </span>
                        </p>

                        {entrega.estado === 'CONFIRMED' && (
                          <button
                            type="button"
                            onClick={() => avanzar(entrega, 'IN_TRANSIT')}
                            className="mt-3 w-full rounded-xl bg-violet-600 px-3 py-2.5 text-sm font-bold text-white transition hover:bg-violet-500 focus:outline-none focus:ring-4 focus:ring-violet-400/30"
                          >
                            Iniciar entrega
                          </button>
                        )}
                        {entrega.estado === 'IN_TRANSIT' && (
                          <button
                            type="button"
                            onClick={() => avanzar(entrega, 'DELIVERED')}
                            className="mt-3 w-full rounded-xl bg-emerald-600 px-3 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-400/30"
                          >
                            Marcar como entregado
                          </button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  )
}

export default PanelRepartidor
