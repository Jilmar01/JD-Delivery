// Dirección aproximada de unas coordenadas (Nominatim, máximo 1 consulta por segundo).
// Si no se puede resolver devuelve null y quien la usa muestra las coordenadas.
const cache = new Map()
let siguienteConsulta = 0

export async function direccionDe(lat, lng) {
  const clave = `${lat.toFixed(5)},${lng.toFixed(5)}`
  if (cache.has(clave)) return cache.get(clave)

  const hora = Math.max(Date.now(), siguienteConsulta)
  siguienteConsulta = hora + 1100
  await new Promise((resolver) => setTimeout(resolver, Math.max(0, hora - Date.now())))

  try {
    const parametros = new URLSearchParams({ lat: String(lat), lon: String(lng), format: 'jsonv2' })
    const respuesta = await fetch(`https://nominatim.openstreetmap.org/reverse?${parametros}`, {
      headers: { 'Accept-Language': 'es' },
    })
    const lugar = respuesta.ok ? await respuesta.json() : null
    const texto = lugar?.display_name ?? null
    cache.set(clave, texto)
    return texto
  } catch {
    return null
  }
}
