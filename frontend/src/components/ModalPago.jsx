import { useEffect, useState } from 'react'
import { formatoMoneda } from '../utils/catalogo'

const estiloCampo =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10'

// Solo muestra: los datos del pago no se envían ni se guardan en ningún lado
function validarPago(metodo, tarjeta, efectivo, totalCentavos) {
  if (metodo === 'EFECTIVO') {
    // Vacío = paga exactamente el total al recibir el pedido
    if (!efectivo.trim()) return ''
    const monto = Number(efectivo.replace(',', '.'))
    if (!Number.isFinite(monto) || Math.round(monto * 100) < totalCentavos) {
      return 'El monto con el que pagas debe cubrir el total del pedido.'
    }
    return ''
  }

  if (!tarjeta.titular.trim()) return 'Ingresa el nombre del titular de la tarjeta.'
  if (tarjeta.numero.replace(/\s/g, '').length !== 16) {
    return 'El número de tarjeta debe tener 16 dígitos.'
  }
  if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(tarjeta.vence)) {
    return 'El vencimiento debe tener el formato MM/AA.'
  }
  if (!/^\d{3,4}$/.test(tarjeta.cvv)) return 'El CVV debe tener 3 o 4 dígitos.'
  return ''
}

function Campo({ id, etiqueta, ...propiedades }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
        {etiqueta}
      </label>
      <input id={id} className={estiloCampo} {...propiedades} />
    </div>
  )
}

function IconoCandado() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path strokeLinecap="round" d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  )
}

/** Tarjeta que se va llenando mientras el cliente escribe */
function TarjetaVista({ tarjeta }) {
  const digitos = tarjeta.numero.replace(/\s/g, '').padEnd(16, '•')
  const numero = digitos.replace(/(.{4})/g, '$1 ').trim()

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0B2A50] via-[#0B3F8F] to-[#1D4ED8] p-5 text-white shadow-lg shadow-blue-950/25">
      <div className="absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/10" />
      <div className="absolute -bottom-12 right-10 h-32 w-32 rounded-full bg-white/5" />
      <div className="relative flex items-center justify-between">
        <span className="h-8 w-11 rounded-md bg-gradient-to-br from-amber-200 to-amber-400" aria-hidden="true" />
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-blue-100">Débito</span>
      </div>
      <p className="relative mt-6 font-mono text-lg tracking-[0.12em] tabular-nums sm:text-xl">{numero}</p>
      <div className="relative mt-4 flex items-end justify-between gap-4 text-xs">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-blue-200">Titular</p>
          <p className="truncate font-semibold uppercase">{tarjeta.titular || 'Nombre del titular'}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-blue-200">Vence</p>
          <p className="font-semibold tabular-nums">{tarjeta.vence || 'MM/AA'}</p>
        </div>
      </div>
    </div>
  )
}

/**
 * Ventana de pago: resumen del pedido a la izquierda y método de pago a la derecha.
 * El pago es de muestra: solo se valida el formato y nada se envía ni se guarda.
 */
function ModalPago({ productos, totalCentavos, direccion, enviando, error, alCerrar, alConfirmar }) {
  const [metodo, setMetodo] = useState('TARJETA')
  const [tarjeta, setTarjeta] = useState({ titular: '', numero: '', vence: '', cvv: '' })
  const [efectivo, setEfectivo] = useState('')
  const [errorPago, setErrorPago] = useState('')

  useEffect(() => {
    const alTeclear = (e) => {
      if (e.key === 'Escape' && !enviando) alCerrar()
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [alCerrar, enviando])

  const total = formatoMoneda.format(totalCentavos / 100)
  const montoEfectivo = Number(efectivo.replace(',', '.'))
  const cambio = metodo === 'EFECTIVO' && montoEfectivo * 100 > totalCentavos ? montoEfectivo - totalCentavos / 100 : 0

  const cambiarTarjeta = (campo, valor) => {
    setErrorPago('')
    setTarjeta((anterior) => ({ ...anterior, [campo]: valor }))
  }

  function confirmar(e) {
    e.preventDefault()
    const motivo = validarPago(metodo, tarjeta, efectivo, totalCentavos)
    setErrorPago(motivo)
    if (!motivo) alConfirmar({ metodo })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pago-titulo"
      className="fixed inset-0 z-[2000] flex items-end justify-center bg-[#07172D]/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <form
        onSubmit={confirmar}
        className="grid max-h-[94vh] w-full max-w-4xl overflow-hidden overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl md:grid-cols-[0.9fr_1.1fr]"
      >
        <aside className="relative bg-gradient-to-br from-[#0B2A50] via-[#0B1D38] to-[#061226] p-6 text-white sm:p-8">
          <div className="absolute -left-10 -top-12 h-40 w-40 rounded-full bg-blue-500/15 blur-3xl" />
          <div className="relative">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-300">J-D Delivery</p>
            <h2 id="pago-titulo" className="mt-2 text-2xl font-bold tracking-tight">
              Confirma y paga
            </h2>

            <ul className="mt-6 space-y-3" aria-label="Resumen del pedido">
              {productos.map((p) => (
                <li key={p.idLocal} className="flex items-center gap-3">
                  <span className="relative shrink-0">
                    <img src={p.imagen} alt="" className="h-12 w-12 rounded-xl object-cover ring-1 ring-white/20" />
                    <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-500 px-1 text-[11px] font-bold">
                      {p.cantidad}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.nombre}</span>
                  <span className="text-sm tabular-nums text-blue-100">
                    {formatoMoneda.format((Math.round(p.precioDemo * 100) * p.cantidad) / 100)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-6 border-t border-white/15 pt-4">
              <p className="text-xs uppercase tracking-wide text-blue-300">Se entrega en</p>
              <p className="mt-1 break-words text-sm leading-6 text-blue-50/90">{direccion}</p>
            </div>

            <div className="mt-6 flex items-end justify-between border-t border-white/15 pt-4">
              <span className="text-sm text-blue-200">Total a pagar</span>
              <span className="text-3xl font-bold tabular-nums">{total}</span>
            </div>
          </div>
        </aside>

        <div className="space-y-5 p-6 sm:p-8">
          <div role="tablist" aria-label="Método de pago" className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1">
            {[
              { id: 'TARJETA', texto: 'Tarjeta de débito' },
              { id: 'EFECTIVO', texto: 'Efectivo' },
            ].map((opcion) => (
              <button
                key={opcion.id}
                type="button"
                role="tab"
                aria-selected={metodo === opcion.id}
                onClick={() => {
                  setMetodo(opcion.id)
                  setErrorPago('')
                }}
                className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-4 focus:ring-blue-600/15 ${
                  metodo === opcion.id ? 'bg-white text-blue-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opcion.texto}
              </button>
            ))}
          </div>

          {metodo === 'TARJETA' ? (
            <div className="space-y-4">
              <TarjetaVista tarjeta={tarjeta} />
              <Campo
                id="tarjeta-titular"
                etiqueta="Titular"
                type="text"
                autoComplete="off"
                autoFocus
                value={tarjeta.titular}
                onChange={(e) => cambiarTarjeta('titular', e.target.value)}
                placeholder="Como aparece en la tarjeta"
              />
              <Campo
                id="tarjeta-numero"
                etiqueta="Número de tarjeta"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={tarjeta.numero}
                onChange={(e) =>
                  cambiarTarjeta(
                    'numero',
                    e.target.value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
                  )
                }
                placeholder="0000 0000 0000 0000"
              />
              <div className="grid grid-cols-2 gap-4">
                <Campo
                  id="tarjeta-vence"
                  etiqueta="Vencimiento"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={tarjeta.vence}
                  onChange={(e) => {
                    const d = e.target.value.replace(/\D/g, '').slice(0, 4)
                    cambiarTarjeta('vence', d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d)
                  }}
                  placeholder="MM/AA"
                />
                <Campo
                  id="tarjeta-cvv"
                  etiqueta="CVV"
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  value={tarjeta.cvv}
                  onChange={(e) => cambiarTarjeta('cvv', e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="•••"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                <p className="text-sm font-semibold text-blue-900">Pagas al recibir tu pedido</p>
                <p className="mt-1 text-sm text-blue-800">
                  {efectivo.trim()
                    ? 'Escribe el billete con el que pagarás para calcular tu cambio.'
                    : `Entregarás exactamente ${total} al repartidor.`}
                </p>
              </div>
              <Campo
                id="efectivo-monto"
                etiqueta="¿Con cuánto vas a pagar? (opcional)"
                type="text"
                inputMode="decimal"
                autoFocus
                value={efectivo}
                onChange={(e) => {
                  setErrorPago('')
                  setEfectivo(e.target.value.replace(/[^\d.,]/g, ''))
                }}
                placeholder={`Pagas exacto ${total}`}
              />
              {cambio > 0 && (
                <p className="text-sm text-slate-600">
                  Cambio a recibir: <span className="font-semibold text-slate-900">{formatoMoneda.format(cambio)}</span>
                </p>
              )}
            </div>
          )}

          {(errorPago || error) && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorPago || error}
            </p>
          )}

          <div className="space-y-3 pt-1">
            <button
              type="submit"
              disabled={enviando}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/20 transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-600/25 disabled:cursor-wait disabled:opacity-60"
            >
              <IconoCandado />
              {enviando ? 'Enviando tu pedido…' : metodo === 'TARJETA' ? `Pagar ${total}` : `Confirmar pedido · ${total}`}
            </button>
            <button
              type="button"
              onClick={alCerrar}
              disabled={enviando}
              className="w-full rounded-xl px-6 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring-4 focus:ring-slate-300/40"
            >
              Volver al pedido
            </button>
            <p className="text-center text-xs text-slate-500">
              Pago de muestra: los datos no se envían ni se guardan.
            </p>
          </div>
        </div>
      </form>
    </div>
  )
}

export default ModalPago
