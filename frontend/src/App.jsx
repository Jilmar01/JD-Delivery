
import { useCallback, useEffect, useState } from 'react'
import Login from './Login'
import EncabezadoApp from './components/EncabezadoApp'
import PortalCliente from './components/PortalCliente'
import PanelRepartidor from './components/PanelRepartidor'
import PanelAdministrativo from './pages/PanelAdministrativo'

// Todas las rutas autenticadas usan la interfaz clara.
const CLARO = ['CLIENTE', 'REPARTIDOR', 'ADMIN']
const CLAVE_SESION = 'jd-delivery-sesion'

function leerSesion() {
  try {
    const guardada = localStorage.getItem(CLAVE_SESION)
    const usuarioGuardado = guardada ? JSON.parse(guardada) : null
    if (
      usuarioGuardado?.token &&
      ['CLIENTE', 'REPARTIDOR', 'ADMIN'].includes(usuarioGuardado.rol)
    ) return usuarioGuardado
  } catch {
    localStorage.removeItem(CLAVE_SESION)
  }
  return null
}

function rutaPorRol(rol) {
  if (rol === 'CLIENTE') return '/customer'
  if (rol === 'REPARTIDOR') return '/delivery'
  if (rol === 'ADMIN') return '/admin'
  return '/login'
}

function normalizarRuta(ruta) {
  const limpia = ruta.replace(/\/+$/, '') || '/'
  return limpia === '/client' ? '/customer' : limpia
}

function VistaPorRol({ usuario, alCerrarSesion }) {
  switch (usuario.rol) {
    case 'CLIENTE':
      return (
        <PortalCliente usuario={usuario} alCerrarSesion={alCerrarSesion} />
      )
    case 'REPARTIDOR':
      return (
        <PanelRepartidor usuario={usuario} alCerrarSesion={alCerrarSesion} />
      )
    case 'ADMIN':
      return <PanelAdministrativo usuario={usuario} />
    default:
      return (
        <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
          <p
            role="alert"
            className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400"
          >
            Tu rol ({usuario.rol}) no tiene una vista disponible.
          </p>
        </main>
      )
  }
}

function App() {
  const esDemoAdmin =
    import.meta.env.DEV &&
    new URLSearchParams(window.location.search).get('demo') === 'admin'
  const [usuario, setUsuario] = useState(() =>
    leerSesion() || (esDemoAdmin
      ? {
          nombre: 'Administrador (demo)',
          correo: 'demo@jd-delivery.local',
          rol: 'ADMIN',
          token: 'demo',
          demo: true,
        }
      : null)
  )
  const [mensajeSesion, setMensajeSesion] = useState('')
  const [ruta, setRuta] = useState(() => normalizarRuta(window.location.pathname))

  const navegar = useCallback((destino, reemplazar = false) => {
    destino = normalizarRuta(destino)
    if (window.location.pathname !== destino) {
      window.history[reemplazar ? 'replaceState' : 'pushState']({}, '', destino)
    }
    setRuta(destino)
  }, [])

  useEffect(() => {
    const alCambiarRuta = () => setRuta(normalizarRuta(window.location.pathname))
    window.addEventListener('popstate', alCambiarRuta)
    return () => window.removeEventListener('popstate', alCambiarRuta)
  }, [])

  useEffect(() => {
    function sincronizarSesion(evento) {
      if (evento.key !== CLAVE_SESION) return
      if (!evento.newValue) {
        setUsuario(null)
        navegar('/login', true)
        return
      }
      try {
        const usuarioNuevo = JSON.parse(evento.newValue)
        if (usuarioNuevo?.token && ['CLIENTE', 'REPARTIDOR', 'ADMIN'].includes(usuarioNuevo.rol)) {
          setUsuario(usuarioNuevo)
          navegar(rutaPorRol(usuarioNuevo.rol), true)
        }
      } catch {
        localStorage.removeItem(CLAVE_SESION)
      }
    }
    window.addEventListener('storage', sincronizarSesion)
    return () => window.removeEventListener('storage', sincronizarSesion)
  }, [navegar])

  useEffect(() => {
    if (usuario?.token && !usuario.demo && !usuario.modoDemostracion) {
      localStorage.setItem(CLAVE_SESION, JSON.stringify(usuario))
    } else {
      localStorage.removeItem(CLAVE_SESION)
    }
  }, [usuario])

  useEffect(() => {
    const esperada = usuario ? rutaPorRol(usuario.rol) : '/login'
    const conocidas = ['/login', '/customer', '/client', '/delivery', '/admin']
    if (!conocidas.includes(ruta) || normalizarRuta(ruta) !== esperada) {
      navegar(esperada, true)
    }
  }, [usuario, ruta, navegar])

  const alCerrarSesionPorExpiracion = useCallback((mensaje) => {
    setMensajeSesion(
      mensaje || 'La sesión expiró. Inicia sesión nuevamente.'
    )
    setUsuario(null)
    localStorage.removeItem(CLAVE_SESION)
    navegar('/login', true)
  }, [navegar])

  if (!usuario || ruta === '/login') {
    return (
      <Login
        avisoSesion={mensajeSesion}
        alIniciarSesion={(usuarioAutenticado) => {
          setMensajeSesion('')
          setUsuario(usuarioAutenticado)
          navegar(rutaPorRol(usuarioAutenticado.rol), true)
        }}
      />
    )
  }

  return (
    <div
      className={`min-h-screen ${
        CLARO.includes(usuario.rol)
          ? 'bg-slate-50 text-slate-900'
          : 'bg-[#09090B] text-zinc-100'
      }`}
    >
      <EncabezadoApp
        usuario={usuario}
        alCerrarSesion={() => {
          setMensajeSesion('')
          setUsuario(null)
          localStorage.removeItem(CLAVE_SESION)
          navegar('/login', true)
        }}
      />

      {usuario.modoDemostracion && (
        <p
          role="status"
          className="border-b border-amber-500/20 bg-amber-500/10 px-5 py-3 text-center text-sm text-amber-300"
        >
          Modo demostración local: los datos no se guardan en el backend.
        </p>
      )}

      <VistaPorRol
        usuario={usuario}
        alCerrarSesion={alCerrarSesionPorExpiracion}
      />

      <footer
        className={`border-t px-5 py-6 text-center text-xs ${
          CLARO.includes(usuario.rol)
            ? 'border-slate-200 bg-slate-50 text-slate-500'
            : 'border-white/10 text-zinc-500'
        }`}
      >
        © {new Date().getFullYear()} J&D Delivery · Sistema distribuido de gestión de pedidos y entregas
      </footer>
    </div>
  )
}

export default App
