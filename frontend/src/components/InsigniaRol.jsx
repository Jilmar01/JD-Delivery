
const ROLES = {
  CLIENTE: {
    etiqueta: 'Portal del cliente',
    estilo: 'border-blue-500/20 bg-blue-500/10 text-blue-400',
  },
  REPARTIDOR: {
    etiqueta: 'Panel del repartidor',
    estilo: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
  },
  ADMIN: {
    etiqueta: 'Panel administrativo',
    estilo: 'border-purple-500/20 bg-purple-500/10 text-purple-400',
  },
}

function InsigniaRol({ rol }) {
  const datos = ROLES[rol] || {
    etiqueta: rol,
    estilo: 'border-zinc-700 bg-zinc-800 text-zinc-300',
  }

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-2 text-xs font-medium ${datos.estilo}`}
    >
      {datos.etiqueta}
    </span>
  )
}

export default InsigniaRol
