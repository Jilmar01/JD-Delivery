import { formatoMoneda, productosDeNotas } from '../utils/catalogo'

/** Foto, nombre y cantidad de cada producto del pedido (se leen de sus notas). */
function ProductosPedido({ notas, grande = false }) {
  const productos = productosDeNotas(notas)

  if (productos.length === 0) {
    return notas ? (
      <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
        {notas}
      </p>
    ) : null
  }

  return (
    <ul className="flex flex-wrap gap-3" aria-label="Productos del pedido">
      {productos.map(({ comida, cantidad }) => (
        <li
          key={comida.idLocal}
          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-2 pr-4 shadow-sm shadow-slate-200/50"
        >
          <span className="relative shrink-0">
            <img
              src={comida.imagen}
              alt={comida.alt}
              loading="lazy"
              className={`rounded-xl object-cover ${grande ? 'h-20 w-20' : 'h-14 w-14'}`}
            />
            <span className="absolute -right-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-blue-700 px-1.5 text-xs font-bold text-white ring-2 ring-white">
              {cantidad}
            </span>
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-slate-900">
              {comida.nombre}
            </span>
            <span className="block text-xs text-slate-500">
              {formatoMoneda.format(comida.precioDemo * cantidad)}
            </span>
          </span>
        </li>
      ))}
    </ul>
  )
}

export default ProductosPedido
