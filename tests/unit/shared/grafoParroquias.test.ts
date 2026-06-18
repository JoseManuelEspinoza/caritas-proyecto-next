import { describe, it, expect } from "vitest";
import {
  construirAdyacencia,
  nivelesPorSaltos,
} from "@/core/domain/services/grafoParroquias";

const PARROQUIAS = [
  { idParroquia: "P1", latitud: -12.0, longitud: -77.0 },
  { idParroquia: "P2", latitud: -12.005, longitud: -77.0 },  // ~0.55 km de P1
  { idParroquia: "P3", latitud: -12.01, longitud: -77.0 },   // ~1.1 km de P1, ~0.55 km de P2
  { idParroquia: "P4", latitud: -12.02, longitud: -77.0 },   // ~2.2 km de P1, 1.1 km de P3
];

describe("construirAdyacencia", () => {
  it("[positivo] conecta parroquias dentro del radio", () => {
    const adj = construirAdyacencia(PARROQUIAS, 1.0);
    expect(adj.get("P1")!.has("P2")).toBe(true);
    expect(adj.get("P2")!.has("P1")).toBe(true);
  });

  it("[positivo] no conecta parroquias fuera del radio", () => {
    const adj = construirAdyacencia(PARROQUIAS, 1.0);
    expect(adj.get("P1")!.has("P4")).toBe(false);
  });

  it("[positivo] filtra parroquias sin coordenadas", () => {
    const parroquiasConNull = [
      ...PARROQUIAS,
      { idParroquia: "P_NULL", latitud: null, longitud: null },
    ];
    const adj = construirAdyacencia(parroquiasConNull, 1.0);
    expect(adj.has("P_NULL")).toBe(false);
  });
});

describe("nivelesPorSaltos", () => {
  it("[positivo] el origen tiene nivel 1", () => {
    const adj = construirAdyacencia(PARROQUIAS, 1.0);
    const niveles = nivelesPorSaltos("P1", adj, 3);
    expect(niveles.get("P1")).toBe(1);
  });

  it("[positivo] parroquia vecina directa tiene nivel 2", () => {
    const adj = construirAdyacencia(PARROQUIAS, 1.0);
    const niveles = nivelesPorSaltos("P1", adj, 3);
    expect(niveles.get("P2")).toBe(2);
  });

  it("[positivo] parroquia a 2 saltos tiene nivel 3", () => {
    const adj = construirAdyacencia(PARROQUIAS, 1.0);
    const niveles = nivelesPorSaltos("P1", adj, 3);
    expect(niveles.get("P3")).toBe(3);
  });

  it("[borde] no expande más allá de maxNivel (línea de continue)", () => {
    const adj = construirAdyacencia(PARROQUIAS, 1.0);
    const niveles = nivelesPorSaltos("P1", adj, 3);
    // P4 está a 3 saltos (P1→P2→P3→P4) pero maxNivel=3, así que no se incluye
    expect(niveles.has("P4")).toBe(false);
  });

  it("[borde] origen sin coordenadas en el grafo retorna solo el origen", () => {
    const adj = construirAdyacencia(PARROQUIAS, 1.0);
    const niveles = nivelesPorSaltos("DESCONOCIDO", adj, 3);
    expect(niveles.get("DESCONOCIDO")).toBe(1);
    expect(niveles.size).toBe(1);
  });
});
