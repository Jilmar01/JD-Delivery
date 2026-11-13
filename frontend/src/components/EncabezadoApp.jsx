
import InsigniaRol from './InsigniaRol'

function EncabezadoApp({ usuario, alCerrarSesion }) {
  const esCliente = usuario.rol === 'CLIENTE'
  const nombre = esCliente
    ? usuario.nombre?.trim() || 'Mi cuenta'
    : usuario.nombre || usuario.correo
  const nombreParaIniciales = usuario.nombre?.trim() || 'Mi cuenta'
  const iniciales = nombreParaIniciales
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('')
    .toUpperCase()

  return (
    <header
      className={`sticky top-0 z-20 border-b shadow-xl backdrop-blur ${
        esCliente
          ? 'border-white/10 bg-[#07172D]/95 shadow-blue-950/15'
          : 'border-white/10 bg-[#111113]/95 shadow-black/20'
      }`}
    >
      <div
        className={`mx-auto flex max-w-6xl flex-wrap items-center justify-between ${
          esCliente
            ? 'gap-x-6 gap-y-4 px-4 py-3.5 sm:px-8 sm:py-4'
            : 'gap-4 px-5 py-4 sm:px-8'
        }`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex shrink-0 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-600/20 ${
              esCliente ? 'h-11 w-11 sm:h-12 sm:w-12' : 'h-12 w-12'
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-7 w-7 text-white"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 7h11v11H3zM14 11h4l3 3v4h-7z"
              />
              <circle cx="7.5" cy="18" r="1.5" />
              <circle cx="17.5" cy="18" r="1.5" />
            </svg>
          </div>

          <div>
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              J&amp;D <span className="text-blue-500">Delivery</span>
            </h1>
            <p
              className={`mt-1 text-xs text-zinc-400 sm:text-sm ${
                esCliente ? 'hidden sm:block' : ''
              }`}
            >
              Sistema de gestión de pedidos y entregas
            </p>
          </div>
        </div>

        {esCliente && (
          <label className="relative hidden min-w-0 max-w-md flex-1 md:block">
            <span className="sr-only">Buscar restaurantes o productos</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-200/60"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path strokeLinecap="round" d="m16 16 4 4" />
            </svg>
            <input
              type="search"
              disabled
              placeholder="Búsqueda no disponible todavía"
              className="w-full rounded-xl border border-white/10 bg-white/10 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-blue-100/50 outline-none disabled:cursor-not-allowed"
            />
          </label>
        )}

        <nav
          aria-label="Navegación de usuario"
          className={`flex items-center gap-3 ${
            esCliente
              ? 'w-full justify-between sm:w-auto sm:justify-end'
              : 'flex-wrap'
          }`}
        >
          {esCliente && (
            <div className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 sm:flex">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-4 w-4 shrink-0 text-blue-300"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"
                />
                <circle cx="12" cy="10" r="2" />
              </svg>
              <span className="text-xs font-medium text-blue-100/80">
                Ubicación no configurada
              </span>
            </div>
          )}

          <div className={esCliente ? 'min-w-0 text-left sm:text-right' : 'hidden text-right sm:block'}>
            <p
              className={`text-sm font-semibold text-zinc-100 ${
                esCliente ? 'max-w-40 truncate sm:max-w-56' : ''
              }`}
            >
              {nombre}
            </p>
            {!esCliente && usuario.nombre && usuario.correo && (
              <p
                className="text-xs text-zinc-500"
              >
                {usuario.correo}
              </p>
            )}
          </div>

          <span className="hidden sm:inline-flex">
            <InsigniaRol rol={usuario.rol} />
          </span>

          {esCliente && (
            <button
              type="button"
              disabled
              aria-label="Notificaciones no disponibles"
              className="hidden h-10 w-10 cursor-not-allowed items-center justify-center rounded-xl border border-white/10 bg-white/5 text-blue-100/50 sm:flex"
            >
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
                  d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"
                />
              </svg>
            </button>
          )}

          {esCliente && (
            <span
              aria-label={`Perfil de ${nombre}`}
              className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border border-blue-300/30 bg-blue-500/20 text-sm font-bold text-blue-100 sm:inline-flex"
            >
              {iniciales}
            </span>
          )}

          <button
            type="button"
            onClick={alCerrarSesion}
            className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-blue-500/50 hover:bg-zinc-700 hover:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/20"
          >
            Cerrar sesión
          </button>
        </nav>
      </div>
    </header>
  )
}

export default EncabezadoApp
