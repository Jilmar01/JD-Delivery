
export const ESTADOS_PROGRESO_PEDIDO = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'IN_TRANSIT',
  'DELIVERED',
]

export function colorEstado(estado) {
  switch (estado) {
    case 'PENDING':
      return 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20'
    case 'CONFIRMED':
    case 'ASIGNADO':
    case 'CONFIRMADO':
      return 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20'
    case 'PREPARING':
      return 'bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20'
    case 'IN_TRANSIT':
    case 'EN_PREPARACION':
    case 'EN_CAMINO':
      return 'bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/20'
    case 'DELIVERED':
      return 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20'
    case 'CANCELLED':
      return 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20'
    default:
      return 'bg-zinc-700 text-zinc-300'
  }
}

export function etiquetaEstado(estado) {
  const etiquetas = {
    PENDING: 'Pendiente',
    CONFIRMED: 'Confirmado',
    PREPARING: 'En preparación',
    IN_TRANSIT: 'En camino',
    DELIVERED: 'Entregado',
    CANCELLED: 'Cancelado',
  }

  // Los estados en español del panel administrativo (EN_CAMINO...) se muestran sin guion bajo
  return etiquetas[estado] || estado?.replaceAll('_', ' ') || 'Estado no disponible'
}
