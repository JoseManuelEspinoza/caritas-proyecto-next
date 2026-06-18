"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polygon, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { toast } from "sonner";

// Arregla el ícono por defecto de Leaflet (rutas rotas en bundlers) usando el CDN.
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ─── Contorno simplificado de Lima Metropolitana (43 distritos) ──────────────
// Coordenadas [lat, lng] en sentido horario desde el noroeste (Ancón).
const LIMA_POLY: [number, number][] = [
  [-11.770, -77.157], // Ancón (noroeste, costa)
  [-11.780, -77.040], // Ancón (norte)
  [-11.820, -76.980], // Carabayllo norte
  [-11.860, -76.870], // Comas norte
  [-11.880, -76.750], // San Juan de Lurigancho norte
  [-11.910, -76.630], // Lurigancho-Chosica (Chosica incluido)
  [-11.970, -76.540], // Lurigancho este (extremo)
  [-12.040, -76.560], // Chaclacayo este
  [-12.130, -76.620], // Cieneguilla norte
  [-12.220, -76.720], // Cieneguilla sur
  [-12.320, -76.820], // Lurín sur-este
  [-12.480, -76.930], // Pucusana (extremo sur)
  [-12.460, -77.020], // Villa María del Triunfo sur
  [-12.370, -77.095], // Chorrillos sur-oeste
  [-12.270, -77.150], // Barranco / Miraflores (costa)
  [-12.050, -77.175], // Lima Centro (costa)
  [-11.900, -77.163], // Lima norte (costa)
  [-11.770, -77.157], // Cierre en Ancón
];

// Bounding box holgado de Lima Metropolitana para maxBounds del mapa.
const LIMA_BOUNDS = L.latLngBounds(
  [-12.55, -77.25], // SW
  [-11.70, -76.55]  // NE
);

// ─── Ray casting: ¿está [lat, lng] dentro del polígono? ─────────────────────
function pointInPolygon(lat: number, lng: number, poly: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [yi, xi] = poly[i];
    const [yj, xj] = poly[j];
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

const round = (n: number) => Number(n.toFixed(7));

// ─── Click handler con validación de Lima ────────────────────────────────────
function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      const la = round(e.latlng.lat);
      const lo = round(e.latlng.lng);
      if (!pointInPolygon(la, lo, LIMA_POLY)) {
        toast.error("Selecciona un punto dentro de Lima Metropolitana.");
        return;
      }
      onPick(la, lo);
    },
  });
  return null;
}

// ─── Drag handler con validación de Lima ────────────────────────────────────
function ValidatedMarker({
  lat,
  lng,
  onPick,
}: {
  lat: number;
  lng: number;
  onPick: (lat: number, lng: number) => void;
}) {
  return (
    <Marker
      position={[lat, lng]}
      draggable
      eventHandlers={{
        dragend: (e) => {
          const p = (e.target as L.Marker).getLatLng();
          const la = round(p.lat);
          const lo = round(p.lng);
          if (!pointInPolygon(la, lo, LIMA_POLY)) {
            toast.error("Selecciona un punto dentro de Lima Metropolitana.");
            // Regresa el pin a su posición anterior
            (e.target as L.Marker).setLatLng([lat, lng]);
            return;
          }
          onPick(la, lo);
        },
      }}
    />
  );
}

/** Recentra el mapa cuando cambian las coordenadas. */
function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng]);
  }, [lat, lng, map]);
  return null;
}

/** Evita tiles grises en contenedores flex. */
function ResizeFix() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 120);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

interface Props {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
  className?: string;
}

/** Mapa interactivo con borde de Lima Metropolitana y validación de punto. */
export default function LocationMap({ lat, lng, onChange, className = "h-56 w-full" }: Props) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={11}
      scrollWheelZoom
      maxBounds={LIMA_BOUNDS}
      maxBoundsViscosity={0.85}
      className={className}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Borde de Lima Metropolitana */}
      <Polygon
        positions={LIMA_POLY}
        pathOptions={{
          color: "#009850",
          weight: 2,
          opacity: 0.8,
          fillColor: "#009850",
          fillOpacity: 0.04,
        }}
      />

      <ClickHandler onPick={onChange} />
      <ValidatedMarker lat={lat} lng={lng} onPick={onChange} />
      <Recenter lat={lat} lng={lng} />
      <ResizeFix />
    </MapContainer>
  );
}
