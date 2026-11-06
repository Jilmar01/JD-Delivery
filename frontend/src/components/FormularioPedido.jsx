import { useCallback } from 'react'
import MapaUbicacion from './MapaUbicacion'
import { formatoMoneda } from '../utils/catalogo'

/**
 * Dirección de entrega elegida en el mapa. El pago se hace en la ventana que se abre
 * con "Continuar al pago" (ModalPago).
 */
function FormularioPedido({ direccion, setDireccion, ubicacion, setUbicacion, totalCentavos, alContinuar }) {
  // El mapa llena la dirección y las coordenadas al elegir o arrastrar el punto
  const alCambiarUbicacion = useCallback(
    (punto) => {
      setUbicacion({ lat: punto.lat, lng: punto.lng })
      setDireccion(punto.direccion || '')
    },
    [setDireccion, setUbicacion]
  )

  // Si el cliente escribe a mano, el punto anterior ya no corresponde a lo escrito:
  // debe elegir un resultado de la búsqueda o tocar el mapa
  const alEscribirDireccion = useCallback(
    (texto) => {
      setDireccion(texto)
      setUbicacion(null)
    },
    [setDireccion, setUbicacion]
  )

  function enviar(e) {
    e.preventDefault()
    alContinuar()
  }

  return (
    <form onSubmit={enviar} className="space-y-6">
      <MapaUbicacion
        ubicacionPendiente={ubicacion ? { ...ubicacion, direccion } : null}
        alCambiarUbicacionPendiente={alCambiarUbicacion}
        direccion={direccion}
        alCambiarDireccion={setDireccion}
        alEscribirDireccion={alEscribirDireccion}
      />

      {!ubicacion && (
        <p
          role="status"
          className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-5 text-amber-900"
        >
          Toca el mapa, usa tu ubicación o elige un resultado de la búsqueda: así se
          calcula qué repartidores están más cerca.
        </p>
      )}

      <div className="flex flex-col gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-base font-bold text-slate-950">
          Total: {formatoMoneda.format(totalCentavos / 100)}
        </p>
        <button
          type="submit"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/15 transition duration-200 hover:-translate-y-0.5 hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-600/20 active:scale-[0.99] sm:w-auto"
        >
          Continuar al pago
        </button>
      </div>
    </form>
  )
}

export default FormularioPedido
