import { useEffect, useState } from 'react'
import {
  buscarRepartidorDeNuevo,
  cancelarPedido,
  obtenerOfertasPedido,
} from '../services/pedidosService'

const INTERVALO_MS = 2000

// Convierte los eventos del servidor TCP en el estado de cada repartidor consultado
function resumir(eventos) {
  const repartidores = new Map()
  let expiraEn = null
  let final = null

  for (const e of eventos) {
    if (e.evento === 'OFRECIDA') {
      expiraEn = e.expiraEn
      if (final?.tipo === 'SIN_REPARTIDORES') final = null
      for (const r of e.repartidores) {
        repartidores.set(r.repartidorId, { ...r, estado: 'ESPERANDO' })
      }
    } else if (e.evento === 'RECHAZADA') {
      const r = repartidores.get(e.repartidorId)
      if (r) r.estado = 'RECHAZO'
    } else if (e.evento === 'EXPIRADA') {
      for (const id of e.repartidores) {
        const r = repartidores.get(id)
        if (r?.estado === 'ESPERANDO') r.estado = 'EXPIRO'
      }
    } else if (e.evento === 'ACEPTADA') {
      final = { tipo: 'ASIGNADO', repartidorId: e.repartidorId }
      const r = repartidores.get(e.repartidorId)
      if (r) r.estado = 'ACEPTO'
      for (const otro of repartidores.values()) {
        if (otro.estado === 'ESPERANDO') otro.estado = 'TOMADO'
      }
    } else if (e.evento === 'FALLIDA') {
      const r = repartidores.get(e.repartidorId)
      if (r) r.estado = 'TOMADO'
    } else if (e.evento === 'CANCELADA') {
      final = { tipo: 'CANCELADO' }
    } else if (e.evento === 'SIN_REPARTIDORES' && !final) {
      final = { tipo: 'SIN_REPARTIDORES' }
    }
  }

  return { repartidores: [...repartidores.values()], expiraEn, final }
}

const ESTADOS = {
  ESPERANDO: { texto: 'Esperando respuesta…', estilo: 'bg-amber-50 text-amber-800 border-amber-200' },
  ACEPTO: { texto: 'Aceptó el pedido', estilo: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  RECHAZO: { texto: 'Rechazó', estilo: 'bg-red-50 text-red-700 border-red-200' },
  EXPIRO: { texto: 'No respondió a tiempo', estilo: 'bg-slate-100 text-slate-600 border-slate-200' },
  TOMADO: { texto: 'Pedido ya asignado', estilo: 'bg-slate-100 text-slate-600 border-slate-200' },
}

function SeguimientoPedido({ pedido, ofertaInicial, token, alCerrar, alCambiar }) {
  const [eventos, setEventos] = useState([])
  const [errorConexion, setErrorConexion] = useState(false)
  const [ahora, setAhora] = useState(() => Date.now())
  const [confirmando, setConfirmando] = useState(false)
  const [accion, setAccion] = useState('')
  const [aviso, setAviso] = useState('')
  const [canceladoLocal, setCanceladoLocal] = useState(false)

  const { repartidores, expiraEn, final } = resumir(eventos)
  const asignado = final?.tipo === 'ASIGNADO'
  const cancelado = canceladoLocal || final?.tipo === 'CANCELADO'
  // Solo termina con un repartidor o una cancelación; sin repartidores el pedido queda en espera
  const terminado = asignado || cancelado
  const esperando = repartidores.some((r) => r.estado === 'ESPERANDO')
  const sinRepartidores = final?.tipo === 'SIN_REPARTIDORES'

  useEffect(() => {
    if (terminado) return undefined
    let activo = true

    async function consultar() {
      try {
        const datos = await obtenerOfertasPedido(pedido.id, token)
        if (!activo) return
        setEventos(datos)
        setErrorConexion(false)
      } catch {
        if (activo) setErrorConexion(true)
      }
    }

    consultar()
    const intervalo = setInterval(consultar, INTERVALO_MS)
    return () => {
      activo = false
      clearInterval(intervalo)
    }
  }, [pedido.id, token, terminado])

  useEffect(() => {
    if (terminado) return undefined
    const reloj = setInterval(() => setAhora(Date.now()), 1000)
    return () => clearInterval(reloj)
  }, [terminado])

  const segundos = expiraEn
    ? Math.max(0, Math.ceil((new Date(expiraEn).getTime() - ahora) / 1000))
    : null

  async function buscarDeNuevo() {
    setAccion('buscando')
    setAviso('')
    try {
      const { oferta } = await buscarRepartidorDeNuevo(pedido.id, token)
      if (oferta?.respuesta?.motivo === 'OFERTA_EN_CURSO') {
        setAviso('La búsqueda sigue en curso: espera la respuesta de los repartidores.')
      } else if (!oferta?.enviada && oferta?.motivo) {
        setAviso(oferta.motivo)
      }
    } catch (error) {
      setAviso(error.message || 'No se pudo iniciar la búsqueda.')
    } finally {
      setAccion('')
    }
  }

  async function cancelar() {
    setAccion('cancelando')
    setAviso('')
    try {
      await cancelarPedido(pedido.id, token)
      setCanceladoLocal(true)
      alCambiar?.()
    } catch (error) {
      setAviso(error.message || 'No se pudo cancelar el pedido.')
    } finally {
      setAccion('')
      setConfirmando(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="seguimiento-titulo"
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/50 p-4"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
          Pedido #{pedido.id}
        </p>
        <h2
          id="seguimiento-titulo"
          className="mt-1 text-xl font-bold tracking-tight text-slate-950"
        >
          {asignado
            ? '¡Tu pedido tiene repartidor!'
            : cancelado
              ? 'Pedido cancelado'
              : sinRepartidores
                ? 'Tu pedido está en espera'
                : 'Buscando repartidor cercano'}
        </h2>
        <p className="mt-1 text-sm text-slate-500">{pedido.direccion}</p>

        {ofertaInicial && !ofertaInicial.enviada && repartidores.length === 0 && !final && (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            {ofertaInicial.motivo || 'El pedido aún no se pudo ofrecer a los repartidores.'}
          </p>
        )}

        {asignado && (
          <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">
            El repartidor #{final.repartidorId} aceptó tu pedido y va en camino
            a recogerlo.
          </p>
        )}

        {cancelado && (
          <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            Cancelaste este pedido. Los repartidores ya no lo ven. Si quieres
            pedir de nuevo, crea otro pedido.
          </p>
        )}

        {sinRepartidores && !cancelado && (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Ahora no hay repartidores disponibles cerca. Tu pedido quedó en
            espera y se volverá a ofrecer solo; también puedes buscar de nuevo
            ahora mismo o cancelarlo.
          </p>
        )}

        {!terminado && (
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-blue-50 p-3 text-sm text-blue-900">
            <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-blue-300 border-t-blue-700" />
            <span>
              {sinRepartidores
                ? 'Esperando a que haya un repartidor disponible…'
                : 'Avisamos a los 3 repartidores más cercanos.'}
              {esperando && segundos !== null && ` Quedan ${segundos} s para responder.`}
              {esperando && ' Si nadie acepta, el pedido se vuelve a ofrecer solo.'}
            </span>
          </div>
        )}

        {repartidores.length > 0 && (
          <ul className="mt-5 space-y-2" aria-label="Repartidores consultados">
            {repartidores.map((r) => (
              <li
                key={r.repartidorId}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Repartidor #{r.repartidorId}
                  </p>
                  <p className="text-xs text-slate-500">A {r.distanciaKm} km del local</p>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${ESTADOS[r.estado].estilo}`}
                >
                  {ESTADOS[r.estado].texto}
                </span>
              </li>
            ))}
          </ul>
        )}

        {errorConexion && (
          <p className="mt-4 text-xs text-red-600">
            No se pudo actualizar el estado; reintentando…
          </p>
        )}
        {aviso && (
          <p role="status" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            {aviso}
          </p>
        )}

        {!terminado && (
          <div className="mt-6 flex flex-col gap-2">
            {(sinRepartidores || !esperando) && (
              <button
                type="button"
                onClick={buscarDeNuevo}
                disabled={accion !== ''}
                className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-600/20 disabled:cursor-wait disabled:opacity-60"
              >
                {accion === 'buscando' ? 'Buscando…' : 'Buscar repartidor de nuevo'}
              </button>
            )}

            {confirmando ? (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3" role="group" aria-label="Confirmar cancelación">
                <span className="text-sm font-medium text-red-900">¿Cancelar el pedido?</span>
                <button
                  type="button"
                  onClick={cancelar}
                  disabled={accion !== ''}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-wait disabled:opacity-60"
                >
                  {accion === 'cancelando' ? 'Cancelando…' : 'Sí, cancelar'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmando(false)}
                  disabled={accion !== ''}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmando(true)}
                disabled={accion !== ''}
                className="rounded-xl border border-red-200 px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 focus:outline-none focus:ring-4 focus:ring-red-500/15"
              >
                Cancelar pedido
              </button>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={alCerrar}
          className="mt-3 w-full rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-300/40"
        >
          {terminado ? 'Cerrar' : 'Cerrar (seguirá buscando)'}
        </button>
      </div>
    </div>
  )
}

export default SeguimientoPedido
