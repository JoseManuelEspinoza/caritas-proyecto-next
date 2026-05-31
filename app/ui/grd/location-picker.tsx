'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { MapPin, LocateFixed, ExternalLink, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

// Centro de Lima por defecto (para que el mapa siempre se vea aunque no haya punto).
const LIMA = { lat: -12.0464, lng: -77.0428 }

// Leaflet solo funciona en el navegador → carga dinámica sin SSR.
const LocationMap = dynamic(() => import('./location-map'), {
  ssr: false,
  loading: () => (
    <div className="h-56 w-full bg-gray-100 flex items-center justify-center text-xs text-gray-400">
      <Loader2 className="w-4 h-4 animate-spin mr-2" /> Cargando mapa…
    </div>
  ),
})

interface Props {
  lat: number | null
  lng: number | null
  onChange: (lat: number | null, lng: number | null) => void
  /** Se llama con la dirección y candidatos de distrito (reverse geocoding) al elegir un punto. */
  onAddressResolved?: (info: { direccion: string; candidatosDistrito: string[] }) => void
}

/**
 * Ingreso de ubicación (RF07 GPS / RF08 manual).
 *
 * - GPS: geolocalización del navegador.
 * - Manual: campos de latitud/longitud.
 * - Mapa interactivo (OpenStreetMap + Leaflet): click o arrastra el pin para fijar
 *   la ubicación. GRATIS, sin API key ni facturación.
 */
export function LocationPicker({ lat, lng, onChange, onAddressResolved }: Props) {
  const [loading, setLoading] = useState(false)
  const [geocoding, setGeocoding] = useState(false)

  const hasPoint = lat != null && lng != null
  const viewLat = lat ?? LIMA.lat
  const viewLng = lng ?? LIMA.lng

  /** Reverse geocoding gratis vía Nominatim (OpenStreetMap). Autocompleta la dirección. */
  const resolveAddress = async (la: number, lo: number) => {
    if (!onAddressResolved) return
    try {
      setGeocoding(true)
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=${la}&lon=${lo}&accept-language=es`,
        { headers: { Accept: 'application/json' } },
      )
      if (!res.ok) throw new Error('geocode')
      const data = await res.json()
      const a = data?.address ?? {}
      // Dirección concisa: calle + número; si no hay, el nombre completo.
      const direccion = [a.road, a.house_number].filter(Boolean).join(' ') || (data.display_name as string) || ''
      // Candidatos de distrito (en Lima el distrito aparece en distintos campos según la zona).
      const candidatosDistrito = [a.city_district, a.suburb, a.town, a.quarter, a.borough, a.municipality, a.city]
        .filter((x): x is string => Boolean(x))
      if (direccion) {
        onAddressResolved({ direccion, candidatosDistrito })
        toast.success('Ubicación autocompletada desde el mapa.')
      }
    } catch {
      toast.error('No se pudo obtener la dirección automáticamente.')
    } finally {
      setGeocoding(false)
    }
  }

  /** Fija el punto y, si viene de una selección en el mapa/GPS, resuelve la dirección. */
  const elegirPunto = (la: number, lo: number) => {
    onChange(la, lo)
    resolveAddress(la, lo)
  }

  const usarGPS = () => {
    if (!('geolocation' in navigator)) { toast.error('Tu navegador no soporta geolocalización.'); return }
    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLoading(false)
        toast.success('Ubicación obtenida por GPS.')
        elegirPunto(Number(pos.coords.latitude.toFixed(7)), Number(pos.coords.longitude.toFixed(7)))
      },
      (err) => {
        setLoading(false)
        toast.error(err.code === err.PERMISSION_DENIED ? 'Permiso de ubicación denegado.' : 'No se pudo obtener la ubicación.')
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  const setManual = (campo: 'lat' | 'lng', valor: string) => {
    const n = valor === '' ? null : Number(valor)
    if (campo === 'lat') onChange(n, lng)
    else onChange(lat, n)
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={usarGPS}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-[#009850] text-white rounded-lg text-xs font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4" />}
          Usar mi ubicación (GPS)
        </button>
        {hasPoint && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-[#009850] hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Abrir en Google Maps
          </a>
        )}
        <span className="text-[11px] text-gray-400">Haz click en el mapa o arrastra el pin para fijar la ubicación.</span>
        {geocoding && <span className="flex items-center gap-1 text-[11px] text-[#009850]"><Loader2 className="w-3 h-3 animate-spin" /> Buscando dirección…</span>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Latitud</label>
          <input
            type="number" step="any" placeholder="-12.0464"
            value={lat ?? ''} onChange={(e) => setManual('lat', e.target.value)}
            className="w-full px-3 py-2 border border-[#DDDDDD] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009850]/20"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Longitud</label>
          <input
            type="number" step="any" placeholder="-77.0428"
            value={lng ?? ''} onChange={(e) => setManual('lng', e.target.value)}
            className="w-full px-3 py-2 border border-[#DDDDDD] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009850]/20"
          />
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <LocationMap lat={viewLat} lng={viewLng} onChange={elegirPunto} />
        <div className="bg-gray-50 px-3 py-2 border-t border-gray-200 flex items-center gap-2">
          <MapPin className={`w-4 h-4 ${hasPoint ? 'text-red-500' : 'text-gray-400'}`} />
          <p className="text-xs text-gray-600">
            {hasPoint
              ? <>Ubicación: <span className="font-mono font-semibold">{lat}, {lng}</span></>
              : 'Sin ubicación marcada — usa el GPS, escribe las coordenadas o haz click en el mapa (se muestra Lima por defecto).'}
          </p>
        </div>
      </div>
    </div>
  )
}
