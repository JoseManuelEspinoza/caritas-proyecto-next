import { describe, it, expect } from "vitest";
import {
  calcularUmbral,
  evaluarQuorum,
} from "@/core/application/use-cases/comite-donaciones/calcularQuorum";

describe("calcularUmbral (50% o más)", () => {
  it("[positivo] N=1 → 1", () => expect(calcularUmbral(1)).toBe(1));
  it("[positivo] N=2 → 1 (50%)", () => expect(calcularUmbral(2)).toBe(1));
  it("[positivo] N=3 → 2", () => expect(calcularUmbral(3)).toBe(2));
  it("[positivo] N=4 → 2 (50%)", () => expect(calcularUmbral(4)).toBe(2));
  it("[positivo] N=5 → 3", () => expect(calcularUmbral(5)).toBe(3));
  it("[positivo] N=7 → 4", () => expect(calcularUmbral(7)).toBe(4));
  it("[positivo] N=8 → 4 (50%)", () => expect(calcularUmbral(8)).toBe(4));
  it("[positivo] N=10 → 5 (50%)", () => expect(calcularUmbral(10)).toBe(5));
  it("[negativo] N=0 lanza Error", () =>
    expect(() => calcularUmbral(0)).toThrow(/sin miembros activos/i));
});

describe("evaluarQuorum", () => {
  it("[positivo] EN_CURSO cuando ni a favor ni contra alcanzan corte", () => {
    expect(evaluarQuorum(10, 2, 2)).toEqual({ tipo: "EN_CURSO" });
  });
  it("[positivo] APROBAR cuando aFavor alcanza umbral (N=10, U=5)", () => {
    expect(evaluarQuorum(10, 5, 0)).toEqual({ tipo: "APROBAR" });
  });
  it("[positivo] EN_CURSO con 4 a favor de 10 (aún < 50%)", () => {
    expect(evaluarQuorum(10, 4, 0)).toEqual({ tipo: "EN_CURSO" });
  });
  it("[positivo] RECHAZAR cuando enContra hace imposible el umbral (N=10, U=5, contra>5)", () => {
    expect(evaluarQuorum(10, 0, 6)).toEqual({ tipo: "RECHAZAR" });
  });
  it("[positivo] N=5 aprueba con 3 a favor (50% o más)", () => {
    expect(evaluarQuorum(5, 3, 0)).toEqual({ tipo: "APROBAR" });
  });
  it("[positivo] N=4 aprueba con 2 a favor (50%)", () => {
    expect(evaluarQuorum(4, 2, 0)).toEqual({ tipo: "APROBAR" });
  });
  it("[positivo] N=5 rechaza con 3 en contra (queda < umbral alcanzable)", () => {
    expect(evaluarQuorum(5, 0, 3)).toEqual({ tipo: "RECHAZAR" });
  });
});
