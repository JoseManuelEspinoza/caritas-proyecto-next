// grafoParroquias.ts — Grafo de adyacencia de parroquias (RF36, opción híbrida).
//
// Modela las parroquias como nodos y conecta con una arista las que están a
// menos de `radioKm` (proximidad geográfica via Haversine). Un BFS desde la
// parroquia del incidente da el "nivel" de cada parroquia por SALTOS:
//   nivel 1 = parroquia del incidente
//   nivel 2 = parroquias vecinas (1 salto)        ≈ "sector cercano"
//   nivel 3 = vecinas de las vecinas (2 saltos)    ≈ "distrito / distritos cercanos"
//
// Es lógica de dominio PURA (no conoce Prisma ni HTTP).

import { haversine } from "./haversine";

export type ParroquiaNodo = {
  idParroquia: string;
  latitud: number | null;
  longitud: number | null;
};

/** Construye la lista de adyacencia: arista si distancia(i,j) ≤ radioKm. */
export function construirAdyacencia(
  parroquias: ParroquiaNodo[],
  radioKm: number
): Map<string, Set<string>> {
  const conCoords = parroquias.filter((p) => p.latitud != null && p.longitud != null);
  const adj = new Map<string, Set<string>>();
  for (const p of conCoords) adj.set(p.idParroquia, new Set());

  for (let i = 0; i < conCoords.length; i++) {
    for (let j = i + 1; j < conCoords.length; j++) {
      const a = conCoords[i];
      const b = conCoords[j];
      const d = haversine(a.latitud as number, a.longitud as number, b.latitud as number, b.longitud as number);
      if (d <= radioKm) {
        adj.get(a.idParroquia)!.add(b.idParroquia);
        adj.get(b.idParroquia)!.add(a.idParroquia);
      }
    }
  }
  return adj;
}

/**
 * BFS desde `origenId`: devuelve el nivel (1..maxNivel) de cada parroquia
 * alcanzable. Las parroquias fuera de `maxNivel` saltos no se incluyen.
 */
export function nivelesPorSaltos(
  origenId: string,
  adj: Map<string, Set<string>>,
  maxNivel = 3
): Map<string, number> {
  const niveles = new Map<string, number>();
  niveles.set(origenId, 1);
  if (!adj.has(origenId)) return niveles; // origen sin coords/aristas: solo él

  const cola: Array<[string, number]> = [[origenId, 1]];
  while (cola.length > 0) {
    const [id, nivel] = cola.shift()!;
    if (nivel >= maxNivel) continue;
    for (const vecino of adj.get(id) ?? []) {
      if (!niveles.has(vecino)) {
        niveles.set(vecino, nivel + 1);
        cola.push([vecino, nivel + 1]);
      }
    }
  }
  return niveles;
}
