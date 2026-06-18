"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, Polygon, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ParroquiaRiesgoData, RiesgoNivel } from "./types";

// ── Colores por nivel ─────────────────────────────────────────────────────────
const RIESGO_COLOR: Record<RiesgoNivel, string> = {
  CRÍTICO: "#EF4444",
  ALTO:    "#F97316",
  MEDIO:   "#F59E0B",
  BAJO:    "#009850",
};

// ── Contorno Lima Metropolitana ───────────────────────────────────────────────
const LIMA_POLY: [number, number][] = [
  [-11.770, -77.157], [-11.780, -77.040], [-11.820, -76.980], [-11.860, -76.870],
  [-11.880, -76.750], [-11.910, -76.630], [-11.970, -76.540], [-12.040, -76.560],
  [-12.130, -76.620], [-12.220, -76.720], [-12.320, -76.820], [-12.480, -76.930],
  [-12.540, -77.000], [-12.480, -77.060], [-12.370, -77.060], [-12.250, -77.030],
  [-12.150, -77.010], [-12.000, -77.050], [-11.960, -77.090], [-11.870, -77.080],
  [-11.810, -77.100], [-11.770, -77.157],
];

// ── Contorno Callao ───────────────────────────────────────────────────────────
const CALLAO_POLY: [number, number][] = [
  [-11.882, -77.175], [-11.882, -77.070], [-11.940, -77.070], [-12.000, -77.085],
  [-12.065, -77.110], [-12.075, -77.155], [-12.060, -77.185], [-11.990, -77.230],
  [-11.920, -77.215], [-11.882, -77.175],
];

// ── Componente auxiliar: fuerza invalidación del mapa en montaje ──────────────
function MapInvalidator() {
  const map = useMap();
  useEffect(() => {
    // Necesario cuando el mapa se muestra dentro de un tab que inicia oculto
    setTimeout(() => map.invalidateSize(), 150);
  }, [map]);
  return null;
}

// ── MapaRiesgoParroquial ──────────────────────────────────────────────────────
interface MapaRiesgoProps {
  parroquias: ParroquiaRiesgoData[];
  filtroNivel?: RiesgoNivel | "TODOS";
}

export function MapaRiesgoParroquial({ parroquias, filtroNivel = "TODOS" }: MapaRiesgoProps) {
  const conCoordenadas = parroquias.filter(p => p.latitud && p.longitud);
  const visibles = filtroNivel === "TODOS" ? conCoordenadas : conCoordenadas.filter(p => p.riesgoNivel === filtroNivel);

  // Centrado en Lima Metropolitana + Callao
  const center: [number, number] = [-12.046, -77.07];
  // Bounds suaves: tiles renderizan bien con padding generoso
  const SOFT_BOUNDS: [[number, number], [number, number]] = [
    [-12.70, -77.50],
    [-11.60, -76.40],
  ];

  return (
    <div className="relative rounded-xl overflow-hidden border border-gray-200 shadow-sm" style={{ height: 520, isolation: "isolate" }}>
      <MapContainer
        center={center}
        zoom={11}
        minZoom={10}
        maxZoom={15}
        maxBounds={SOFT_BOUNDS}
        maxBoundsViscosity={0.6}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <MapInvalidator />

        {/* Tile layer (OpenStreetMap) */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Contorno Lima Metropolitana */}
        <Polygon
          positions={LIMA_POLY}
          pathOptions={{ color: "#009850", weight: 2, fillColor: "#009850", fillOpacity: 0.04, dashArray: "6 4" }}
        />

        {/* Contorno Callao */}
        <Polygon
          positions={CALLAO_POLY}
          pathOptions={{ color: "#3B82F6", weight: 2, fillColor: "#3B82F6", fillOpacity: 0.04, dashArray: "6 4" }}
        />

        {/* Marcadores de parroquias */}
        {visibles.map((p, i) => {
          const color = RIESGO_COLOR[p.riesgoNivel];
          const actPct = p.actividadesTotal > 0 ? Math.round((p.actividadesEjecutadas / p.actividadesTotal) * 100) : 0;
          const radius = Math.max(8, Math.min(20, 8 + p.incidencias * 1.5));
          return (
            <CircleMarker
              key={i}
              center={[p.latitud!, p.longitud!]}
              radius={radius}
              pathOptions={{
                color: "#fff",
                weight: 2,
                fillColor: color,
                fillOpacity: 0.85,
              }}
            >
              <Popup>
                <div className="min-w-50 text-xs space-y-1.5">
                  <p className="font-bold text-sm text-gray-900">{p.nombre}</p>
                  <span
                    className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold text-white"
                    style={{ background: color }}
                  >
                    Afectación {p.riesgoNivel}
                  </span>
                  <table className="w-full text-[11px] mt-2">
                    <tbody>
                      <tr><td className="text-gray-500 pr-3">Incidencias</td><td className="font-semibold text-gray-800">{p.incidencias}</td></tr>
                      <tr><td className="text-gray-500 pr-3">Brigadistas</td><td className="font-semibold text-gray-800">{p.brigadistas}</td></tr>
                      <tr><td className="text-gray-500 pr-3">Certificados</td><td className="font-semibold text-gray-800">{p.pctCapacitados}%</td></tr>
                      <tr><td className="text-gray-500 pr-3">Plan GRD</td><td className={`font-semibold ${p.tienePlan ? "text-green-600" : "text-red-500"}`}>{p.tienePlan ? "Aprobado" : "Sin plan"}</td></tr>
                      <tr><td className="text-gray-500 pr-3">Actividades</td><td className="font-semibold text-gray-800">{p.actividadesEjecutadas}/{p.actividadesTotal} ({actPct}%)</td></tr>
                    </tbody>
                  </table>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Leyenda flotante */}
      <div className="absolute bottom-4 left-4 z-1000 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl px-3 py-2.5 shadow-lg text-xs space-y-1.5">
        <p className="font-bold text-gray-700 text-[11px] uppercase tracking-wide mb-2">Nivel de afectación</p>
        {(["CRÍTICO","ALTO","MEDIO","BAJO"] as RiesgoNivel[]).map(n => (
          <div key={n} className="flex items-center gap-2">
            <div className="w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm" style={{ background: RIESGO_COLOR[n] }} />
            <span className="text-gray-700 font-medium">{n}</span>
          </div>
        ))}
        <div className="border-t border-gray-100 mt-2 pt-2 text-[10px] text-gray-400">
          <div className="flex items-center gap-1"><div className="w-3 h-px border border-[#009850] border-dashed" /> Lima Metr.</div>
          <div className="flex items-center gap-1 mt-0.5"><div className="w-3 h-px border border-[#3B82F6] border-dashed" /> Callao</div>
          <p className="mt-1">Tamaño = n.° de incidencias</p>
        </div>
      </div>

      {/* Contador */}
      <div className="absolute top-3 right-3 z-1000 bg-white/95 border border-gray-200 rounded-lg px-2.5 py-1.5 shadow text-[11px] text-gray-600">
        <span className="font-bold text-gray-900">{visibles.length}</span> parroquias mostradas
        {conCoordenadas.length < parroquias.length && (
          <span className="text-gray-400"> · {parroquias.length - conCoordenadas.length} sin coords.</span>
        )}
      </div>
    </div>
  );
}
