
import { useState } from 'react'
import CampoFormulario, { estiloCampo } from './CampoFormulario'
import { registrarUsuario } from '../services/authService'

function FormularioRegistro({ alRegistrar }) {
  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [rol, setRol] = useState('CLIENTE')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  async function registrar(e) {
    e.preventDefault()
    setError('')

    const usuario = nombre.trim()
    const correoNormalizado = correo.trim().toLowerCase()

    if (!usuario || !correoNormalizado || !contrasena) {
      setError('Completa todos los campos.')
      return
    }

    if (usuario.length < 3 || usuario.length > 50) {
      setError('El nombre debe tener entre 3 y 50 caracteres.')
      return
    }

    if (contrasena !== confirmacion) {
      setError('Las contraseñas no coinciden.')
      return
    }

    if (contrasena.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    if (new TextEncoder().encode(contrasena).length > 72) {
      setError('La contraseña no puede superar 72 bytes.')
      return
    }

    if (!['CLIENTE', 'REPARTIDOR'].includes(rol)) {
      setError('Selecciona un tipo de cuenta válido.')
      return
    }

    setCargando(true)

    try {
      await registrarUsuario({
        usuario,
        correo: correoNormalizado,
        contrasena,
        rol,
      })

      alRegistrar(usuario)
    } catch (err) {
      setError(err.message || 'No se pudo crear la cuenta. Intenta nuevamente.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <form onSubmit={registrar} className="space-y-4 sm:space-y-5">
      <CampoFormulario
        id="nombre"
        etiqueta="Nombre completo"
        type="text"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Ingresa tu nombre"
        autoComplete="name"
        minLength={3}
        maxLength={50}
        required
      />

      <CampoFormulario
        id="correo-registro"
        etiqueta="Correo electrónico"
        type="email"
        value={correo}
        onChange={(e) => setCorreo(e.target.value)}
        placeholder="cliente@ejemplo.com"
        autoComplete="username"
        required
      />

      <CampoFormulario
        id="contrasena-registro"
        etiqueta="Contraseña"
        type="password"
        value={contrasena}
        onChange={(e) => setContrasena(e.target.value)}
        placeholder="Mínimo 8 caracteres"
        autoComplete="new-password"
        minLength={8}
        required
      />

      <CampoFormulario
        id="confirmacion"
        etiqueta="Confirmar contraseña"
        type="password"
        value={confirmacion}
        onChange={(e) => setConfirmacion(e.target.value)}
        placeholder="Repite tu contraseña"
        autoComplete="new-password"
        required
      />

      <CampoFormulario id="rol" etiqueta="Tipo de cuenta">
        <select
          id="rol"
          value={rol}
          onChange={(e) => setRol(e.target.value)}
          className={estiloCampo}
        >
          <option value="CLIENTE">Cliente</option>
          <option value="REPARTIDOR">Repartidor</option>
        </select>
      </CampoFormulario>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm leading-5 text-red-300"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={cargando}
        className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-950/50 transition duration-200 hover:-translate-y-0.5 hover:from-blue-500 hover:to-blue-400 hover:shadow-blue-900/50 focus:outline-none focus:ring-4 focus:ring-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
      >
        {cargando ? 'Creando cuenta...' : 'Crear cuenta'}
      </button>
    </form>
  )
}

export default FormularioRegistro
