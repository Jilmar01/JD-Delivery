
import { useState } from 'react'
import { iniciarSesion as autenticarUsuario } from './services/authService'
import CampoFormulario from './components/CampoFormulario'
import FormularioRegistro from './components/FormularioRegistro'

function Login({ alIniciarSesion, avisoSesion }) {
  const [modo, setModo] = useState('login')
  const [aviso, setAviso] = useState('')
  const [nombreUsuario, setNombreUsuario] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [mostrarContrasena, setMostrarContrasena] = useState(false)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  async function iniciarSesion(e) {
    e.preventDefault()
    setError('')
    setCargando(true)

    try {
      const usuario = await autenticarUsuario(nombreUsuario.trim(), contrasena)

      alIniciarSesion(usuario)
    } catch (err) {
      setError(err.message || 'No se pudo iniciar sesión. Intenta nuevamente.')
    } finally {
      setCargando(false)
    }
  }

  const esRegistro = modo === 'registro'

  function cambiarModo(nuevoModo) {
    setModo(nuevoModo)
    setError('')
    setAviso('')
  }

  function alRegistrar(usuarioRegistrado) {
    setNombreUsuario(usuarioRegistrado)
    setContrasena('')
    setModo('login')
    setError('')
    setAviso('Cuenta creada correctamente. Ahora inicia sesión.')
  }

  function entrarEnDemo(rol) {
    alIniciarSesion({
      nombre:
        rol === 'CLIENTE'
          ? 'Cliente de demostración'
          : 'Repartidor de demostración',
      correo:
        rol === 'CLIENTE'
          ? 'cliente.demo@ejemplo.com'
          : 'repartidor.demo@ejemplo.com',
      rol,
      modoDemostracion: true,
    })
  }

  return (
    <main className="min-h-screen bg-[#07111F] p-0 sm:flex sm:items-center sm:justify-center sm:p-5 lg:p-8">
      <section className="mx-auto grid min-h-screen w-full max-w-6xl overflow-hidden bg-white shadow-2xl shadow-black/30 sm:min-h-0 sm:rounded-[2rem] lg:grid-cols-[0.95fr_1.05fr]">
        <div className="relative flex min-h-[300px] flex-col justify-between overflow-hidden px-6 py-7 text-white sm:min-h-[350px] sm:px-10 sm:py-9 lg:min-h-[760px] lg:px-12 lg:py-12">
          <img
            src="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1400&q=85"
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#07172D]/90 via-[#07172D]/55 to-[#07172D]/25" />
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#061226]/85 to-transparent" />

          <div className="relative flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 shadow-lg backdrop-blur-md">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-6 w-6"
                aria-hidden="true"
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
            <p className="text-xl font-bold tracking-tight sm:text-2xl">
              J&amp;D <span className="text-blue-300">Delivery</span>
            </p>
          </div>

          <div className="relative mt-12 max-w-lg sm:mt-16 lg:mt-auto lg:pb-8">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-blue-100 backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-300" />
              Tu comida favorita, más cerca
            </span>
            <h2 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-[2.75rem]">
              Buen sabor.
              <br />
              Directo a tu puerta.
            </h2>
            <p className="mt-4 max-w-md text-sm leading-6 text-blue-50/85 sm:text-base">
              Pide fácil, sigue tu entrega y disfruta cada momento.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center bg-white px-6 py-9 sm:px-12 sm:py-12 lg:px-14">
          <div className="w-full max-w-md">
            <div className="mb-7">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
                J&D Delivery
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                {esRegistro ? 'Crea tu cuenta' : 'Bienvenido de nuevo'}
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {esRegistro
                  ? 'Regístrate para organizar tus entregas.'
                  : 'Ingresa para gestionar tus pedidos.'}
              </p>
            </div>

            {esRegistro ? (
              <FormularioRegistro alRegistrar={alRegistrar} />
            ) : (
              <>
                <form onSubmit={iniciarSesion} className="space-y-5">
                  <CampoFormulario
                    id="usuario"
                    etiqueta="Usuario"
                    type="text"
                    value={nombreUsuario}
                    onChange={(e) => setNombreUsuario(e.target.value)}
                    placeholder="Tu nombre de usuario"
                    autoComplete="username"
                    icono={
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        className="h-5 w-5"
                        aria-hidden="true"
                      >
                        <circle cx="12" cy="8" r="4" />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4 20c0-4 3.6-6 8-6s8 2 8 6"
                        />
                      </svg>
                    }
                    required
                  />

                  <CampoFormulario
                    id="contrasena"
                    etiqueta="Contraseña"
                    type={mostrarContrasena ? 'text' : 'password'}
                    value={contrasena}
                    onChange={(e) => setContrasena(e.target.value)}
                    placeholder="Ingresa tu contraseña"
                    autoComplete="current-password"
                    icono={
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        className="h-5 w-5"
                        aria-hidden="true"
                      >
                        <rect x="4" y="10" width="16" height="11" rx="2" />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M8 10V7a4 4 0 0 1 8 0v3"
                        />
                      </svg>
                    }
                    controlDerecho={
                      <button
                        type="button"
                        onClick={() =>
                          setMostrarContrasena((visible) => !visible)
                        }
                        aria-label={
                          mostrarContrasena
                            ? 'Ocultar contraseña'
                            : 'Mostrar contraseña'
                        }
                        aria-pressed={mostrarContrasena}
                        className="rounded-md p-1 text-slate-400 transition hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
                      >
                        {mostrarContrasena ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            className="h-5 w-5"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5 0 8.5 4.5 9.5 7-.4 1-1.3 2.3-2.6 3.5M6.2 6.2C4.2 7.4 2.8 9.4 2.5 12c.7 1.8 2.3 4.1 5.4 5.5A10.5 10.5 0 0 0 12 18"
                            />
                          </svg>
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            className="h-5 w-5"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z"
                            />
                            <circle cx="12" cy="12" r="2.5" />
                          </svg>
                        )}
                      </button>
                    }
                    required
                  />

                  {avisoSesion && (
                    <p
                      role="alert"
                      className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
                    >
                      {avisoSesion}
                    </p>
                  )}

                  {aviso && (
                    <p
                      role="status"
                      className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-5 text-emerald-800"
                    >
                      {aviso}
                    </p>
                  )}

                  {error && (
                    <p
                      role="alert"
                      className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
                    >
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={cargando}
                    className="w-full rounded-xl bg-blue-700 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/15 transition duration-200 hover:-translate-y-0.5 hover:bg-blue-800 hover:shadow-blue-900/20 focus:outline-none focus:ring-4 focus:ring-blue-600/20 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                  >
                    {cargando ? 'Iniciando sesión...' : 'Iniciar sesión'}
                  </button>
                </form>

                {import.meta.env.DEV && (
                  <div className="mt-7 border-t border-slate-100 pt-5">
                    <p className="mb-3 text-center text-sm font-medium text-slate-600">
                      ¿Solo quieres revisar las vistas?
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => entrarEnDemo('CLIENTE')}
                        className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-3 text-sm font-semibold text-blue-800 transition hover:border-blue-300 hover:bg-blue-100 focus:outline-none focus:ring-4 focus:ring-blue-600/15"
                      >
                        Vista de cliente
                      </button>
                      <button
                        type="button"
                        onClick={() => entrarEnDemo('REPARTIDOR')}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 focus:outline-none focus:ring-4 focus:ring-blue-600/15"
                      >
                        Vista de repartidor
                      </button>
                    </div>
                    <p className="mt-3 text-center text-xs leading-5 text-slate-400">
                      Acceso local de prueba; no valida una cuenta real.
                    </p>
                  </div>
                )}
              </>
            )}

            <p className="mt-7 text-center text-sm text-slate-500">
              {esRegistro ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}{' '}
              <button
                type="button"
                onClick={() => cambiarModo(esRegistro ? 'login' : 'registro')}
                className="font-semibold text-blue-700 transition hover:text-blue-900 focus:outline-none focus:underline focus:underline-offset-4"
              >
                {esRegistro ? 'Inicia sesión' : 'Crear una cuenta'}
              </button>
            </p>

            <p className="mt-8 text-center text-xs leading-5 text-slate-400">
              © {new Date().getFullYear()} J&D Delivery
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}

export default Login
