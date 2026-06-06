"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { MapPin, ExternalLink, Loader2, Maximize2, X } from "lucide-react";
import { toast } from "sonner";

// Centro de Lima por defecto (para que el mapa siempre se vea aunque no haya punto).
const LIMA = { lat: -12.0464, lng: -77.0428 };

// Leaflet solo funciona en el navegador → carga dinámica sin SSR.
const LocationMap = dynamic(() => import("./location-map"), {
  ssr: false,
  loading: () => (
    <div className="h-56 w-full bg-gray-100 flex items-center justify-center text-xs text-gray-400">
      <Loader2 className="w-4 h-4 animate-spin mr-2" /> Cargando mapa…
    </div>
  ),
});

interface Props {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number | null, lng: number | null) => void;
  /** Se llama con la dirección y candidatos de distrito (reverse geocoding) al elegir un punto. */
  onAddressResolved?: (info: { direccion: string; candidatosDistrito: string[] }) => void;
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
  const [geocoding, setGeocoding] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const hasPoint = lat != null && lng != null;
  const viewLat = lat ?? LIMA.lat;
  const viewLng = lng ?? LIMA.lng;

  /** Reverse geocoding gratis vía Nominatim (OpenStreetMap). Autocompleta la dirección. */
  const resolveAddress = async (la: number, lo: number) => {
    if (!onAddressResolved) return;
    try {
      setGeocoding(true);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&lat=${la}&lon=${lo}&accept-language=es`,
        { headers: { Accept: "application/json" } }
      );
      if (!res.ok) throw new Error("geocode");
      const data = await res.json();
      const a = data?.address ?? {};
      // Dirección lo más exacta posible: calle + número (+ urbanización/barrio si existe).
      const calleNumero = [a.road, a.house_number].filter(Boolean).join(" ");
      const zona = a.neighbourhood || a.suburb || a.residential || a.quarter || "";
      const direccion =
        [calleNumero, zona].filter(Boolean).join(", ") || (data.display_name as string) || "";
      // Candidatos de distrito (en Lima el distrito aparece en distintos campos según la zona).
      const candidatosDistrito = [
        a.city_district,
        a.suburb,
        a.town,
        a.quarter,
        a.borough,
        a.municipality,
        a.city,
      ].filter((x): x is string => Boolean(x));
      if (direccion) {
        onAddressResolved({ direccion, candidatosDistrito });
        toast.success("Ubicación autocompletada desde el mapa.");
      }
    } catch {
      toast.error("No se pudo obtener la dirección automáticamente.");
    } finally {
      setGeocoding(false);
    }
  };

  /** Fija el punto y, si viene de una selección en el mapa/GPS, resuelve la dirección. */
  const elegirPunto = (la: number, lo: number) => {
    onChange(la, lo);
    resolveAddress(la, lo);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-wrap items-center gap-2 mb-2 flex-shrink-0">
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
        <span className="text-[11px] text-gray-400">
          Haz click en el mapa o arrastra el pin para fijar la ubicación.
        </span>
        {geocoding && (
          <span className="flex items-center gap-1 text-[11px] text-[#009850]">
            <Loader2 className="w-3 h-3 animate-spin" /> Buscando dirección…
          </span>
        )}
      </div>

      <div className="flex-1 min-h-0 relative isolate border border-gray-200 rounded-lg overflow-hidden flex flex-col">
        <div className="relative z-0 flex-1 min-h-0">
          <LocationMap
            lat={viewLat}
            lng={viewLng}
            onChange={elegirPunto}
            className="h-full w-full"
          />
          {/* Botón ampliar */}
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="absolute top-2 right-2 z-[500] flex items-center gap-1.5 px-2.5 py-1.5 bg-white/95 hover:bg-white border border-gray-300 rounded-lg shadow text-xs font-semibold text-gray-700"
            title="Ver el mapa en grande"
          >
            <Maximize2 className="w-3.5 h-3.5" /> Ampliar
          </button>
        </div>
        <div className="bg-gray-50 px-3 py-2 border-t border-gray-200 flex items-center gap-2 flex-shrink-0">
          <MapPin className={`w-4 h-4 ${hasPoint ? "text-red-500" : "text-gray-400"}`} />
          <p className="text-xs text-gray-600">
            {hasPoint ? (
              <>
                Ubicación:{" "}
                <span className="font-mono font-semibold">
                  {lat}, {lng}
                </span>
              </>
            ) : (
              "Sin ubicación marcada — usa el GPS, escribe las coordenadas o haz click en el mapa (se muestra Lima por defecto)."
            )}
          </p>
        </div>
      </div>

      {/* Modal: mapa en grande */}
      {expanded && (
        <div
          className="fixed inset-0 z-[1000] bg-black/60 flex items-center justify-center p-3 md:p-6"
          onClick={() => setExpanded(false)}
        >
          <div
            className="bg-white rounded-xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#009850]" />
                <h3 className="text-sm font-bold text-gray-800">
                  Seleccionar ubicación en el mapa
                </h3>
                {geocoding && (
                  <span className="flex items-center gap-1 text-xs text-[#009850]">
                    <Loader2 className="w-3 h-3 animate-spin" /> Buscando dirección…
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"
                title="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 min-h-0 relative z-0">
              <LocationMap
                lat={viewLat}
                lng={viewLng}
                onChange={elegirPunto}
                className="h-full w-full"
              />
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-gray-200 bg-gray-50">
              <p className="text-xs text-gray-600">
                {hasPoint ? (
                  <>
                    Seleccionado:{" "}
                    <span className="font-mono font-semibold">
                      {lat}, {lng}
                    </span>
                  </>
                ) : (
                  "Haz click en el mapa para marcar la ubicación."
                )}
              </p>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="px-4 py-2 bg-[#009850] text-white rounded-lg text-sm font-semibold hover:opacity-90"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
