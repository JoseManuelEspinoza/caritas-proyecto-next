"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Loader2, X } from "lucide-react";

const pinIcon = new L.DivIcon({
  className: "",
  html: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36"><path fill="#009850" stroke="white" stroke-width="1.5" d="M12 1C6.2 1 1 6.1 1 12c0 8.6 11 22.5 11 22.5S23 20.6 23 12C23 6.1 17.8 1 12 1z"/><circle fill="white" cx="12" cy="12" r="4"/></svg>',
  iconSize: [24, 36],
  iconAnchor: [12, 36],
});

type Suggestion = {
  lat: number;
  lng: number;
  name: string;
  subtext: string;
  addressForField: string;
};

async function searchPlaces(q: string): Promise<Suggestion[]> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&countrycodes=pe`;
    const res = await fetch(url, { headers: { "Accept-Language": "es" } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data as Array<{ lat: string; lon: string; display_name: string; name?: string }>).map((item) => {
      const parts = item.display_name.split(", ");
      return {
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        name: item.name || parts[0],
        subtext: parts.slice(1, 4).join(", "),
        addressForField: parts.slice(0, 3).join(", "),
      };
    });
  } catch {
    return [];
  }
}

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
    const res = await fetch(url, { headers: { "Accept-Language": "es" } });
    if (!res.ok) return null;
    const data = await res.json() as { display_name: string };
    const parts = data.display_name.split(", ");
    return parts.slice(0, 3).join(", ");
  } catch {
    return null;
  }
}

function FlyTo({ pos }: { pos: [number, number] }) {
  const map = useMap();
  useEffect(() => { map.setView(pos, 16); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

export type LocationPickerProps = {
  lat?: number | null;
  lng?: number | null;
  onLocationChange: (lat: number | null, lng: number | null, address: string | null) => void;
};

const LIMA: [number, number] = [-12.0464, -77.0428];

export function LocationPicker({ lat, lng, onLocationChange }: LocationPickerProps) {
  const [pos, setPos] = useState<[number, number] | null>(
    lat != null && lng != null ? [lat, lng] : null
  );
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function handleInputChange(value: string) {
    setQuery(value);
    setSuggestions([]);
    setShowDropdown(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 3) return;
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchPlaces(value.trim());
      setIsSearching(false);
      if (results.length > 0) {
        setSuggestions(results);
        setShowDropdown(true);
      }
    }, 400);
  }

  function selectSuggestion(s: Suggestion) {
    const p: [number, number] = [s.lat, s.lng];
    setPos(p);
    setFlyTarget(p);
    setQuery(s.name);
    setSuggestions([]);
    setShowDropdown(false);
    onLocationChange(s.lat, s.lng, s.addressForField);
  }

  async function handleMapPick(newLat: number, newLng: number) {
    const p: [number, number] = [newLat, newLng];
    setPos(p);
    setIsGeocoding(true);
    const address = await reverseGeocode(newLat, newLng);
    setIsGeocoding(false);
    if (address) setQuery(address.split(", ")[0]);
    onLocationChange(newLat, newLng, address);
  }

  function clear() {
    setPos(null);
    setQuery("");
    setSuggestions([]);
    setShowDropdown(false);
    onLocationChange(null, null, null);
  }

  return (
    <div className="space-y-2">
      {/* Search con autocomplete */}
      <div className="relative" ref={containerRef}>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
            placeholder="Busca una dirección en el mapa..."
            className="w-full pl-9 pr-8 py-2.5 text-sm bg-[#F5F5F5] border border-[#DDDDDD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009850]/20 focus:border-[#009850] transition-colors"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {isSearching || isGeocoding ? (
              <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin" />
            ) : query ? (
              <button type="button" onClick={clear} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </div>
        </div>

        {/* Dropdown de sugerencias */}
        {showDropdown && suggestions.length > 0 && (
          <div className="absolute z-1001 top-full left-0 right-0 mt-1 bg-white border border-[#DDDDDD] rounded-xl shadow-lg overflow-hidden">
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectSuggestion(s)}
                className="w-full flex items-start gap-3 px-4 py-3 hover:bg-[#F5F5F5] text-left transition-colors border-b border-[#DDDDDD] last:border-b-0"
              >
                <MapPin className="w-4 h-4 text-[#009850] shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{s.name}</p>
                  <p className="text-xs text-gray-500 truncate">{s.subtext}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Mapa */}
      <div className="h-64 rounded-xl overflow-hidden border border-[#DDDDDD]">
        <MapContainer
          center={pos ?? LIMA}
          zoom={pos ? 15 : 11}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <ClickHandler onPick={handleMapPick} />
          {flyTarget && (
            <FlyTo key={`${flyTarget[0]}-${flyTarget[1]}`} pos={flyTarget} />
          )}
          {pos && (
            <Marker
              position={pos}
              icon={pinIcon}
              draggable
              eventHandlers={{
                dragend(e) {
                  const marker = e.target as L.Marker;
                  const p = marker.getLatLng();
                  handleMapPick(p.lat, p.lng);
                },
              }}
            />
          )}
        </MapContainer>
      </div>

      {/* Coordenadas */}
      <div className="flex items-center justify-center text-xs text-gray-400">
        {pos ? (
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3 text-[#009850]" />
            {pos[0].toFixed(6)}, {pos[1].toFixed(6)}
            {isGeocoding && <Loader2 className="w-3 h-3 animate-spin ml-1" />}
          </span>
        ) : (
          <span>Busca una dirección o haz clic en el mapa para marcar la ubicación</span>
        )}
      </div>
    </div>
  );
}
