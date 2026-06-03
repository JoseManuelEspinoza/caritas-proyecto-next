// haversine.ts — Distancia entre dos coordenadas GPS (servicio de dominio puro).
// Usado por el algoritmo de sugerencia de brigadistas (RF36) en la Fase 2.

const RADIO_TIERRA_KM = 6371

/** Distancia en kilómetros entre dos puntos (lat/lng en grados). */
export function haversine(latA: number, lngA: number, latB: number, lngB: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(latB - latA)
  const dLng = toRad(lngB - lngA)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(latA)) * Math.cos(toRad(latB)) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return RADIO_TIERRA_KM * c
}
