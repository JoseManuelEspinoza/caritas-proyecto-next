"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { MapPin, X, ExternalLink, Loader2 } from "lucide-react";

const LIMA = { lat: -12.0464, lng: -77.0428 };

// Leaflet requiere el navegador — sin SSR
const LocationMap = dynamic(() => import("@/app/ui/grd/location-map"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-gray-100 flex items-center justify-center gap-2 text-xs text-gray-400">
      <Loader2 className="w-4 h-4 animate-spin" /> Cargando mapa…
    </div>
  ),
});

type Props = {
  lat: number | null;
  lng: number | null;
  direccion: string | null;
  parroquia: string | null;
  onClose: () => void;
};

export function ModalUbicacion({ lat, lng, direccion, parroquia, onClose }: Props) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    lat != null && lng != null ? { lat, lng } : null
  );
  const [geocoding, setGeocoding] = useState(false);

  // Si no hay coordenadas guardadas, geocodifica la dirección con Nominatim
  useEffect(() => {
    if (coords) return;
    const q = [direccion, parroquia, "Lima, Perú"].filter(Boolean).join(", ");
    if (!q) return;
    setGeocoding(true);
    fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1&accept-language=es`,
      { headers: { Accept: "application/json" } }
    )
      .then((r) => r.json())
      .then((data) => {
        const hit = data?.[0];
        if (hit) setCoords({ lat: parseFloat(hit.lat), lng: parseFloat(hit.lon) });
      })
      .catch(() => {})
      .finally(() => setGeocoding(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const viewLat = coords?.lat ?? LIMA.lat;
  const viewLng = coords?.lng ?? LIMA.lng;

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    coords
      ? `${coords.lat},${coords.lng}`
      : [direccion, parroquia, "Lima, Perú"].filter(Boolean).join(", ")
  )}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[var(--caritas-green)]/10 flex items-center justify-center">
              <MapPin className="w-3.5 h-3.5 text-[var(--caritas-green)]" />
            </div>
            <h2 className="text-sm font-semibold text-gray-900">Ubicación del evento</h2>
            {geocoding && (
              <span className="flex items-center gap-1 text-[11px] text-gray-400">
                <Loader2 className="w-3 h-3 animate-spin" /> Localizando…
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mapa interactivo (read-only: onChange no-op) */}
        <div className="h-64 relative shrink-0">
          <LocationMap
            lat={viewLat}
            lng={viewLng}
            onChange={() => {}}
            className="h-full w-full"
          />
        </div>

        {/* Detalles de ubicación */}
        <div className="p-5 space-y-3 overflow-y-auto">
          {direccion && (
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Dirección</p>
              <p className="text-sm text-gray-800">{direccion}</p>
            </div>
          )}
          {parroquia && (
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Distrito / Parroquia</p>
              <p className="text-sm text-gray-800">{parroquia}</p>
            </div>
          )}
          {coords && (
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Coordenadas</p>
              <p className="text-xs font-mono text-gray-500">{coords.lat}, {coords.lng}</p>
            </div>
          )}
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-[var(--caritas-green)] text-[var(--caritas-green)] text-sm font-medium hover:bg-[var(--caritas-green)]/5 transition-colors cursor-pointer"
          >
            <ExternalLink className="w-4 h-4" />
            Ver en Google Maps
          </a>
        </div>
      </div>
    </div>
  );
}
