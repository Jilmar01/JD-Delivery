import { useEffect, useRef, useState } from 'react'

const NAVEGACION = {
  CLIENTE: [
    { id: 'inicio', etiqueta: 'Inicio' },
    { id: 'pedidos', etiqueta: 'Mis pedidos' },
    { id: 'historial', etiqueta: 'Historial' },
    { id: 'ubicacion', etiqueta: 'Ubicación de entrega' },
  ],
  REPARTIDOR: [
    { id: 'panel', etiqueta: 'Panel', destino: 'panel-repartidor' },
    { id: 'entregas', etiqueta: 'Mis entregas', destino: 'entregas-repartidor' },
  ],
  ADMIN: [
    { id: 'dashboard', etiqueta: 'Dashboard', destino: 'dashboard-admin' },
    { id: 'pedidos-admin', etiqueta: 'Pedidos', destino: 'pedidos-admin' },
  ],
}

function CamionIcono() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h11v11H3zM14 11h4l3 3v4h-7z" />
      <circle cx="7.5" cy="18" r="1.5" />
      <circle cx="17.5" cy="18" r="1.5" />
    </svg>
  )
}

function EncabezadoApp({ usuario, seccionActiva, onNavegar, disponibilidad, alCerrarSesion }) {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [perfilAbierto, setPerfilAbierto] = useState(false)
  const perfilRef = useRef(null)
  const opciones = NAVEGACION[usuario.rol] || []
  const nombre = usuario.nombre?.trim() || usuario.correo || 'Usuario'
  const inicial = nombre.charAt(0).toUpperCase()
  const esRepartidor = usuario.rol === 'REPARTIDOR'

  useEffect(() => {
    function cerrarAlInteractuarFuera(evento) {
      if (!perfilRef.current?.contains(evento.target)) setPerfilAbierto(false)
    }
    function cerrarConEscape(evento) {
      if (evento.key === 'Escape') setPerfilAbierto(false)
    }
    document.addEventListener('pointerdown', cerrarAlInteractuarFuera)
    document.addEventListener('keydown', cerrarConEscape)
    return () => {
      document.removeEventListener('pointerdown', cerrarAlInteractuarFuera)
      document.removeEventListener('keydown', cerrarConEscape)
    }
  }, [])

  function seleccionar(opcion) {
    if (!opcion?.id) return
    onNavegar?.(opcion.id, opcion.destino)
    setMenuAbierto(false)
  }

  function enlace(opcion, movil = false) {
    const activo = seccionActiva === opcion.id
    return (
      <button
        key={opcion.id}
        type="button"
        aria-current={activo ? 'page' : undefined}
        onClick={() => seleccionar(opcion)}
        className={[
          'relative transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400',
          movil
            ? 'w-full rounded-lg px-3 py-2.5 text-left text-sm'
            : 'relative flex h-12 items-center whitespace-nowrap px-3 text-sm font-medium',
          activo
            ? movil
              ? 'bg-blue-50 font-semibold text-blue-700'
              : 'text-blue-700'
            : movil
              ? 'text-slate-600 hover:bg-slate-50 hover:text-blue-700'
              : 'text-slate-600 hover:text-blue-700',
        ].join(' ')}
      >
        {opcion.etiqueta}
        {activo && !movil && <span className="absolute inset-x-2 bottom-0 h-[3px] rounded-t-full bg-blue-600" />}
      </button>
    )
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white text-slate-900 shadow-sm shadow-slate-900/[0.03]">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-8">
        <div className="flex min-h-[72px] items-center justify-between gap-4">
          <a href="#inicio" onClick={(event) => { event.preventDefault(); seleccionar(opciones[0]) }} className="flex min-w-0 shrink-0 items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400" aria-label="J&D Delivery, inicio">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm shadow-blue-700/20">
              <CamionIcono />
            </span>
            <span className="text-base font-bold tracking-tight text-blue-700 sm:text-lg">J&amp;D Delivery</span>
          </a>

          <nav aria-label="Navegación principal" className="hidden h-[72px] min-w-0 flex-1 items-center justify-center gap-1 lg:flex">
            {opciones.map((opcion) => enlace(opcion))}
          </nav>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {esRepartidor && disponibilidad !== undefined && (
              <span className={`hidden items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold sm:inline-flex ${disponibilidad ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                <span className={`h-2 w-2 rounded-full ${disponibilidad ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                {disponibilidad ? 'Disponible' : 'No disponible'}
              </span>
            )}

            <button
              type="button"
              aria-label="Notificaciones"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
              </svg>
            </button>

            <div className="relative border-l border-slate-200 pl-3" ref={perfilRef}>
              <button
                type="button"
                aria-label={`Opciones de ${nombre}`}
                aria-expanded={perfilAbierto}
                aria-haspopup="menu"
                onClick={() => setPerfilAbierto((abierto) => !abierto)}
                className="flex min-w-0 items-center gap-2 rounded-full px-1.5 py-1 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700 ring-1 ring-blue-200" aria-hidden="true">
                  {inicial}
                </span>
                <span className="max-w-28 truncate text-sm font-semibold text-slate-800 sm:max-w-40">{nombre}</span>
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${perfilAbierto ? 'rotate-180' : ''}`} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="m5 7.5 5 5 5-5" /></svg>
              </button>

              {perfilAbierto && (
                <div role="menu" aria-label="Menú de usuario" className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-xl shadow-slate-900/10">
                  <div className="border-b border-slate-100 px-3 pb-3 pt-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{usuario.nombre?.trim() || nombre}</p>
                    {usuario.correo && <p className="mt-0.5 truncate text-sm text-slate-500">{usuario.correo}</p>}
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setPerfilAbierto(false)
                      alCerrarSesion?.()
                    }}
                    className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 17l5-5-5-5m5 5H3m9-9h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
                    </svg>
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              aria-label={menuAbierto ? 'Cerrar navegación' : 'Abrir navegación'}
              aria-expanded={menuAbierto}
              onClick={() => setMenuAbierto((abierto) => !abierto)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 lg:hidden"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
                {menuAbierto ? <path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </div>
        </div>

        {menuAbierto && (
          <nav aria-label="Navegación móvil" className="grid gap-1 border-t border-slate-200 pb-3 pt-2 lg:hidden">
            {opciones.map((opcion) => enlace(opcion, true))}
            {esRepartidor && (
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-slate-600 sm:hidden">
                <span className={`h-2 w-2 rounded-full ${disponibilidad ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                {disponibilidad ? 'Disponible para pedidos' : 'No disponible'}
              </div>
            )}
            <div className="px-3 py-2 text-xs text-slate-500 sm:hidden">{nombre}</div>
          </nav>
        )}
      </div>
    </header>
  )
}

export default EncabezadoApp
