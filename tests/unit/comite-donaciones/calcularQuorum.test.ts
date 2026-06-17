import { describe, it, expect } from "vitest";
import {
  calcularUmbral,
  evaluarQuorum,
} from "@/core/application/use-cases/comite-donaciones/calcularQuorum";

describe("calcularUmbral", () => {
  it("[positivo] N=1 → 1", () => expect(calcularUmbral(1)).toBe(1));
  it("[positivo] N=3 → 2", () => expect(calcularUmbral(3)).toBe(2));
  it("[positivo] N=5 → 3", () => expect(calcularUmbral(5)).toBe(3));
  it("[positivo] N=7 → 4 (mayoría)", () => expect(calcularUmbral(7)).toBe(4));
  it("[positivo] N=8 → 4 (tope 4)", () => expect(calcularUmbral(8)).toBe(4));
  it("[positivo] N=10 → 4 (tope 4)", () => expect(calcularUmbral(10)).toBe(4));
  it("[negativo] N=0 lanza Error", () =>
    expect(() => calcularUmbral(0)).toThrow(/sin miembros activos/i));
});

describe("evaluarQuorum", () => {
  it("[positivo] EN_CURSO cuando ni a favor ni contra alcanzan corte", () => {
    expect(evaluarQuorum(10, 2, 2)).toEqual({ tipo: "EN_CURSO" });
  });
  it("[positivo] APROBAR cuando aFavor alcanza umbral (N=10, U=4)", () => {
    expect(evaluarQuorum(10, 4, 0)).toEqual({ tipo: "APROBAR" });
  });
  it("[positivo] RECHAZAR cuando enContra hace imposible el umbral (N=10, U=4, contra>6)", () => {
    expect(evaluarQuorum(10, 0, 7)).toEqual({ tipo: "RECHAZAR" });
  });
  it("[positivo] N=5 aprueba con 3 a favor (mayoría < 4)", () => {
    expect(evaluarQuorum(5, 3, 0)).toEqual({ tipo: "APROBAR" });
  });
  it("[positivo] N=5 rechaza con 3 en contra (queda < umbral alcanzable)", () => {
    expect(evaluarQuorum(5, 0, 3)).toEqual({ tipo: "RECHAZAR" });
  });
});
