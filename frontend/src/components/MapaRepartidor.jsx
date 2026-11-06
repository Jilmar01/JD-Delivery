import { useEffect } from 'react'
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import L from 'leaflet'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import 'leaflet/dist/leaflet.css'

const iconoRepartidor = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIconRetina,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

const crearIcono = (texto) =>
  L.divIcon({
    html: `<span style="display:flex;width:30px;height:30px;align-items:center;justify-content:center;border-radius:9999px;background:#fff;border:2px solid #1d4ed8;font-size:16px;box-shadow:0 1px 4px rgba(0,0,0,.35)">${texto}</span>`,
    className: '',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  })

const iconoLocal = crearIcono('🏪')
const iconoEntrega = crearIcono('📦')

function Centrar({ posicion }) {
  const mapa = useMap()

  useEffect(() => {
    mapa.flyTo([posicion.lat, posicion.lng], mapa.getZoom() < 14 ? 15 : mapa.getZoom(), {
      duration: 0.5,
    })
  }, [mapa, posicion.lat, posicion.lng])

  return null
}

function ClicEnMapa({ alMover }) {
  useMapEvents({
    click(event) {
      alMover({ lat: event.latlng.lat, lng: event.latlng.lng })
    },
  })

  return null
}

/**
 * Mapa del repartidor: su posición (se puede arrastrar o tocar el mapa para moverla),
 * el local de salida y el punto de entrega de las ofertas y entregas activas.
 */
function MapaRepartidor({ posicion, alMover, ofertas, entregas }) {
  const locales = new Map()
  for (const oferta of ofertas) {
    if (Number.isFinite(oferta.lat) && Number.isFinite(oferta.lng)) {
      locales.set(`${oferta.lat},${oferta.lng}`, oferta)
    }
  }

  const puntosEntrega = [...ofertas, ...entregas].filter(
    (p) => Number.isFinite(p.entregaLat) && Number.isFinite(p.entregaLng)
  )

  return (
    <div className="relative isolate z-0 h-80 w-full overflow-hidden rounded-2xl border border-slate-200 sm:h-[28rem]">
      <MapContainer
        center={[posicion.lat, posicion.lng]}
        zoom={15}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClicEnMapa alMover={alMover} />
        <Centrar posicion={posicion} />

        <Marker
          position={[posicion.lat, posicion.lng]}
          icon={iconoRepartidor}
          draggable
          eventHandlers={{
            dragend(event) {
              const { lat, lng } = event.target.getLatLng()
              alMover({ lat, lng })
            },
          }}
        >
          <Popup>Tu posición. Arrástrala o toca el mapa para moverla.</Popup>
        </Marker>

        {[...locales.values()].map((oferta) => (
          <Marker
            key={`local-${oferta.lat},${oferta.lng}`}
            position={[oferta.lat, oferta.lng]}
            icon={iconoLocal}
          >
            <Popup>Local de salida: aquí recoges el pedido.</Popup>
          </Marker>
        ))}

        {puntosEntrega.map((punto) => (
          <Marker
            key={`entrega-${punto.pedidoId}`}
            position={[punto.entregaLat, punto.entregaLng]}
            icon={iconoEntrega}
          >
            <Popup>
              Entrega del pedido #{punto.pedidoId}
              {punto.direccion ? `: ${punto.direccion}` : ''}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}

export default MapaRepartidor
