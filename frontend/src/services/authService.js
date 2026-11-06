
const AUTH_API_URL = import.meta.env.VITE_AUTH_API_URL || 'https://gph6pj52-3003.use2.devtunnels.ms'

async function solicitarAuth(ruta, opciones) {
  try {
    return await fetch(`${AUTH_API_URL}/api/auth/${ruta}`, opciones)
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        'No se pudo conectar con autenticación. Verifica que el servicio configurado esté activo.',
        { cause: error }
      )
    }

    throw error
  }
}

async function leerRespuesta(respuesta, mensajePorDefecto) {
  let datos = {}

  try {
    datos = await respuesta.json()
  } catch (error) {
    if (respuesta.ok) {
      throw new Error('El servidor de autenticación devolvió una respuesta inválida.', {
        cause: error,
      })
    }
  }

  if (!respuesta.ok) {
    if (respuesta.status >= 500) {
      throw new Error(
        `El servicio de autenticación no está disponible (HTTP ${respuesta.status}). Verifica que el backend esté activo.`
      )
    }

    throw new Error(datos.message || mensajePorDefecto)
  }

  return datos
}

export async function registrarUsuario({ usuario, correo, contrasena, rol }) {
  if (
    typeof usuario !== 'string' ||
    !usuario.trim() ||
    typeof correo !== 'string' ||
    !correo.trim() ||
    typeof contrasena !== 'string' ||
    !contrasena
  ) {
    throw new Error('Completa todos los campos.')
  }

  if (contrasena.length < 8) {
    throw new Error('La contraseña debe tener al menos 8 caracteres.')
  }

  if (new TextEncoder().encode(contrasena).length > 72) {
    throw new Error('La contraseña no puede superar 72 bytes.')
  }

  if (usuario.trim().length < 3 || usuario.trim().length > 50) {
    throw new Error('El nombre debe tener entre 3 y 50 caracteres.')
  }

  if (!['CLIENTE', 'REPARTIDOR'].includes(rol)) {
    throw new Error('El tipo de cuenta no es válido.')
  }

  const respuesta = await solicitarAuth('register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: usuario,
      email: correo,
      password: contrasena,
      role: rol === 'CLIENTE' ? 'CUSTOMER' : 'DELIVERY_PERSON',
    }),
  })

  return leerRespuesta(
    respuesta,
    'No se pudo crear la cuenta. Verifica tus datos.'
  )
}

export async function iniciarSesion(nombreUsuario, contrasena) {
  if (!nombreUsuario || !contrasena) {
    throw new Error('Ingresa tu usuario y contraseña.')
  }

  const respuesta = await solicitarAuth('login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: nombreUsuario,
      password: contrasena,
    }),
  })

  const datos = await leerRespuesta(
    respuesta,
    'No se pudo iniciar sesión. Verifica tus datos.'
  )

  const usuario = datos.data?.user || datos.data?.usuario || datos.data
  const rolRecibido = usuario?.rol || usuario?.role
  const rolNormalizado = String(rolRecibido || '').trim().toUpperCase()

  if (!usuario || !rolRecibido) {
    throw new Error(
      'El servidor respondió, pero no se encontró el rol del usuario.'
    )
  }

  if (typeof datos.data.token !== 'string' || !datos.data.token) {
    throw new Error(
      'El servidor respondió, pero no se encontró el token de autenticación.'
    )
  }

  return {
    ...usuario,
    nombre: usuario.nombre || usuario.username || '',
    correo: usuario.correo || usuario.email || '',
    rol:
      rolNormalizado === 'CUSTOMER'
        ? 'CLIENTE'
        : rolNormalizado === 'DELIVERY_PERSON'
          ? 'REPARTIDOR'
          : rolNormalizado,
    token: datos.data.token,
  }
}

const AUTH_USERS_URL = `${AUTH_API_URL}/api/auth/users`

/** Nombres de usuario por id (solo administradores): { 1: 'Dario', 2: 'Luis' } */
export async function obtenerNombresUsuarios(ids, token) {
  const unicos = [...new Set(ids.map(Number).filter((id) => Number.isSafeInteger(id) && id > 0))]
  if (unicos.length === 0 || !token) return {}

  try {
    const respuesta = await fetch(`${AUTH_USERS_URL}?ids=${unicos.join(',')}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!respuesta.ok) return {}
    const { data } = await respuesta.json()
    return Object.fromEntries(data.map((u) => [u.id, u.username]))
  } catch {
    return {}
  }
}
