'use client'

import { useState } from 'react'
import { MapPin, LocateFixed, ExternalLink, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

// Centro de Lima por defecto (para que el mapa siempre se vea aunque no haya punto).
const LIMA = { lat: -12.0464, lng: -77.0428 }

interface Props {
  lat: number | null
  lng: number | null
  onChange: (lat: number | null, lng: number | null) => void
}

/**
 * Ingreso de ubicación (RF07 GPS / RF08 manual).
 *
 * - GPS: usa la geolocalización del navegador.
 * - Manual: campos de latitud/longitud editables.
 * - Mapa: se incrusta vía el embed de Google Maps (NO requiere API key ni
 *   facturación), por lo que el mapita siempre se ve.
 */
export function LocationPicker({ lat, lng, onChange }: Props) {
  const [loading, setLoading] = useState(false)

  const hasPoint = lat != null && lng != null
  const viewLat = lat ?? LIMA.lat
  const viewLng = lng ?? LIMA.lng
  const mapSrc = `https://www.google.com/maps?q=${viewLat},${viewLng}&z=16&output=embed`

  const usarGPS = () => {
    if (!('geolocation' in navigator)) { toast.error('Tu navegador no soporta geolocalización.'); return }
    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLoading(false)
        onChange(Number(pos.coords.latitude.toFixed(7)), Number(pos.coords.longitude.toFixed(7)))
        toast.success('Ubicación obtenida por GPS.')
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
        <iframe
          title="Mapa de ubicación"
          src={mapSrc}
          className="w-full h-56 border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
        <div className="bg-gray-50 px-3 py-2 border-t border-gray-200 flex items-center gap-2">
          <MapPin className={`w-4 h-4 ${hasPoint ? 'text-red-500' : 'text-gray-400'}`} />
          <p className="text-xs text-gray-600">
            {hasPoint
              ? <>Ubicación: <span className="font-mono font-semibold">{lat}, {lng}</span></>
              : 'Sin ubicación marcada — usa el GPS o ingresa las coordenadas (se muestra Lima por defecto).'}
          </p>
        </div>
      </div>
    </div>
  )
}
