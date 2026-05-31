'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Arregla el ícono por defecto de Leaflet (rutas rotas en bundlers) usando el CDN.
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const round = (n: number) => Number(n.toFixed(7))

/** Click en el mapa → coloca el pin. */
function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onPick(round(e.latlng.lat), round(e.latlng.lng)) } })
  return null
}

/** Recentra el mapa cuando cambian las coordenadas (GPS / manual). */
function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => { map.setView([lat, lng]) }, [lat, lng, map])
  return null
}

interface Props {
  lat: number
  lng: number
  onChange: (lat: number, lng: number) => void
}

/** Mapa interactivo (OpenStreetMap, sin API key): click y arrastra para fijar el pin. */
export default function LocationMap({ lat, lng, onChange }: Props) {
  return (
    <MapContainer center={[lat, lng]} zoom={16} scrollWheelZoom className="h-56 w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onPick={onChange} />
      <Marker
        position={[lat, lng]}
        draggable
        eventHandlers={{
          dragend: (e) => {
            const p = (e.target as L.Marker).getLatLng()
            onChange(round(p.lat), round(p.lng))
          },
        }}
      />
      <Recenter lat={lat} lng={lng} />
    </MapContainer>
  )
}
