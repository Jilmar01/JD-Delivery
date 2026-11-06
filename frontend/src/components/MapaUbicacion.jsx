import { useCallback, useEffect, useRef, useState } from 'react'
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import L from 'leaflet'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import 'leaflet/dist/leaflet.css'

const CENTRO_ECUADOR = [-1.8312, -78.1834]
let siguienteSolicitudNominatim = 0

const iconoMarcador = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIconRetina,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

async function consultarNominatim(url) {
  const horaProgramada = Math.max(Date.now(), siguienteSolicitudNominatim)
  siguienteSolicitudNominatim = horaProgramada + 1100
  await new Promise((resolver) =>
    setTimeout(resolver, Math.max(0, horaProgramada - Date.now()))
  )

  const respuesta = await fetch(url, {
    headers: { 'Accept-Language': 'es' },
  })
  if (!respuesta.ok) {
    throw new Error(`Nominatim respondió con HTTP ${respuesta.status}`)
  }

  return respuesta.json()
}

function MoverMapa({ ubicacion }) {
  const mapa = useMap()

  useEffect(() => {
    mapa.flyTo([ubicacion.lat, ubicacion.lng], Math.max(mapa.getZoom(), 16), { duration: 0.5 })
  }, [mapa, ubicacion.lat, ubicacion.lng])

  return null
}

function SeleccionarMapa({ alSeleccionar }) {
  useMapEvents({
    click(event) {
      alSeleccionar(event.latlng)
    },
  })

  return null
}

const etiquetaCoordenadas = ({ lat, lng }) =>
  `Punto en el mapa (${lat.toFixed(5)}, ${lng.toFixed(5)})`

function MapaUbicacion({
  ubicacionPendiente,
  alCambiarUbicacionPendiente,
  direccion,
  alCambiarDireccion,
  alEscribirDireccion,
}) {
  const numeroSolicitud = useRef(0)
  const consulta = direccion
  const setConsulta = alCambiarDireccion
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [localizando, setLocalizando] = useState(false)
  const [error, setError] = useState('')
  const [errorMapa, setErrorMapa] = useState(false)

  useEffect(() => {
    if (!ubicacionPendiente) {
      numeroSolicitud.current += 1
    }
  }, [ubicacionPendiente])

  const buscarDireccion = useCallback(
    async () => {
      const texto = consulta.trim()
      if (!texto || buscando) return

      setBuscando(true)
      setError('')
      setResultados([])

      try {
        const parametros = new URLSearchParams({
          q: texto,
          format: 'jsonv2',
          addressdetails: '1',
          limit: '5',
          countrycodes: 'ec',
        })
        const lugares = await consultarNominatim(
          `https://nominatim.openstreetmap.org/search?${parametros}`
        )

        if (!lugares.length) {
          setError('No se encontraron direcciones. Prueba con otra búsqueda.')
        } else {
          setResultados(lugares)
        }
      } catch {
        setError(
          'No se pudo buscar la dirección. Puedes seleccionar el punto en el mapa o escribir la dirección manualmente.'
        )
      } finally {
        setBuscando(false)
      }
    },
    [buscando, consulta]
  )

  const seleccionarPunto = useCallback(
    async ({ lat, lng }, direccion = '') => {
      const idSolicitud = ++numeroSolicitud.current
      const coordenadas = { lat: Number(lat), lng: Number(lng) }
      alCambiarUbicacionPendiente({
        ...coordenadas,
        direccion: direccion || 'Buscando dirección…',
      })
      setResultados([])
      setError('')

      if (direccion) {
        setConsulta(direccion)
        return
      }

      try {
        const parametros = new URLSearchParams({
          lat: String(coordenadas.lat),
          lon: String(coordenadas.lng),
          format: 'jsonv2',
          addressdetails: '1',
        })
        const lugar = await consultarNominatim(
          `https://nominatim.openstreetmap.org/reverse?${parametros}`
        )

        if (idSolicitud !== numeroSolicitud.current) return

        if (!lugar.display_name) {
          const etiqueta = etiquetaCoordenadas(coordenadas)
          setConsulta(etiqueta)
          alCambiarUbicacionPendiente({ ...coordenadas, direccion: etiqueta })
          setError('No se encontró el nombre de este lugar: se usará el punto exacto del mapa.')
          return
        }

        setConsulta(lugar.display_name)
        alCambiarUbicacionPendiente({
          ...coordenadas,
          direccion: lugar.display_name,
        })
      } catch {
        if (idSolicitud === numeroSolicitud.current) {
          const etiqueta = etiquetaCoordenadas(coordenadas)
          setConsulta(etiqueta)
          alCambiarUbicacionPendiente({ ...coordenadas, direccion: etiqueta })
          setError(
            'No se pudo obtener el nombre de este lugar: se usará el punto exacto del mapa.'
          )
        }
      }
    },
    [alCambiarUbicacionPendiente, setConsulta]
  )

  function usarMiUbicacion() {
    if (!navigator.geolocation) {
      setError('Tu navegador no permite obtener la ubicación. Toca el mapa para elegir el punto.')
      return
    }

    setLocalizando(true)
    setError('')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocalizando(false)
        seleccionarPunto({ lat: coords.latitude, lng: coords.longitude })
      },
      () => {
        setLocalizando(false)
        setError('No pudimos leer tu ubicación. Revisa el permiso del navegador o toca el mapa.')
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  return (
    <div className="space-y-3">
      <label
        htmlFor="buscar-direccion-mapa"
        className="block text-sm font-semibold text-slate-700"
      >
        Dirección de entrega
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="buscar-direccion-mapa"
          type="search"
          value={consulta}
          onChange={(event) => (alEscribirDireccion ?? setConsulta)(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              buscarDireccion()
            }
          }}
          placeholder="Escribe una dirección y pulsa Buscar, o toca el mapa"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
        />
        <button
          type="button"
          onClick={buscarDireccion}
          disabled={buscando || !consulta.trim()}
          className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-600/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {buscando ? 'Buscando…' : 'Buscar'}
        </button>
        <button
          type="button"
          onClick={usarMiUbicacion}
          disabled={localizando}
          className="rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-semibold text-blue-800 shadow-sm transition hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-blue-600/15 disabled:cursor-wait disabled:opacity-60"
        >
          {localizando ? 'Ubicando…' : 'Mi ubicación'}
        </button>
      </div>
      <p className="text-xs leading-5 text-slate-500">
        La dirección se completa sola al tocar el mapa; también puedes escribirla
        y buscarla, o arrastrar el marcador para ajustar el punto. La búsqueda se
        limita a Ecuador.
      </p>

      {resultados.length > 0 && (
        <ul
          aria-label="Resultados de búsqueda"
          className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm"
        >
          {resultados.map((lugar) => (
            <li key={lugar.place_id}>
              <button
                type="button"
                onClick={() =>
                  seleccionarPunto(
                    { lat: lugar.lat, lng: lugar.lon },
                    lugar.display_name
                  )
                }
                className="w-full border-b border-slate-100 px-4 py-3 text-left text-sm text-slate-700 transition last:border-b-0 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
              >
                {lugar.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative isolate z-0 h-64 w-full overflow-hidden rounded-2xl border border-slate-200 sm:h-80">
        <MapContainer
          center={CENTRO_ECUADOR}
          zoom={6}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            eventHandlers={{
              tileerror: () => setErrorMapa(true),
              tileload: () => setErrorMapa(false),
            }}
          />
          <SeleccionarMapa
            alSeleccionar={(punto) => seleccionarPunto(punto)}
          />
          {ubicacionPendiente && (
            <>
              <MoverMapa ubicacion={ubicacionPendiente} />
              <Marker
                position={[
                  ubicacionPendiente.lat,
                  ubicacionPendiente.lng,
                ]}
                icon={iconoMarcador}
                draggable
                eventHandlers={{
                  dragend(event) {
                    seleccionarPunto(event.target.getLatLng())
                  },
                }}
              />
            </>
          )}
        </MapContainer>
      </div>

      {errorMapa && (
        <p
          role="alert"
          className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
        >
          No se pudieron cargar algunas imágenes del mapa. Puedes intentar
          seleccionar un punto o continuar con la dirección manual.
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
        >
          {error}
        </p>
      )}

      {ubicacionPendiente && (
        <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4">
          <p className="text-sm font-semibold text-slate-800">
            Punto de entrega seleccionado
          </p>
          <p className="mt-1 break-words text-sm text-slate-600">
            {ubicacionPendiente.direccion || 'Dirección no disponible'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Latitud: {ubicacionPendiente.lat.toFixed(6)} · Longitud:{' '}
            {ubicacionPendiente.lng.toFixed(6)}
          </p>
        </div>
      )}
    </div>
  )
}

export default MapaUbicacion
