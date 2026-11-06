// "12 min 05 s", "1 h 03 min" o "45 s"
export function formatoDuracion(milisegundos) {
  const total = Math.max(0, Math.floor(milisegundos / 1000))
  const horas = Math.floor(total / 3600)
  const minutos = Math.floor((total % 3600) / 60)
  const segundos = total % 60

  if (horas > 0) return `${horas} h ${String(minutos).padStart(2, '0')} min`
  if (minutos > 0) return `${minutos} min ${String(segundos).padStart(2, '0')} s`
  return `${segundos} s`
}

export function formatoHora(marca) {
  return new Date(marca).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })
}
