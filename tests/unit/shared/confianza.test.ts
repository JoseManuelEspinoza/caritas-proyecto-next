import { describe, it, expect } from "vitest";
import {
  confianzaMixta,
  scoreTiempoRespuesta,
  PESOS_DEFAULT,
} from "@/core/domain/services/confianza";

describe("scoreTiempoRespuesta", () => {
  it("[positivo] retorna null cuando horas es null", () => {
    expect(scoreTiempoRespuesta(null)).toBeNull();
  });

  it("[positivo] retorna 10 cuando horas <= 2 (TR_OPTIMO_H)", () => {
    expect(scoreTiempoRespuesta(2)).toBe(10);
    expect(scoreTiempoRespuesta(0)).toBe(10);
  });

  it("[positivo] retorna 0 cuando horas >= 48 (TR_MAXIMO_H)", () => {
    expect(scoreTiempoRespuesta(48)).toBe(0);
    expect(scoreTiempoRespuesta(100)).toBe(0);
  });

  it("[positivo] retorna un valor intermedio entre 0 y 10", () => {
    const score = scoreTiempoRespuesta(25);
    expect(score).not.toBeNull();
    expect(score!).toBeGreaterThan(0);
    expect(score!).toBeLessThan(10);
  });
});

describe("confianzaMixta — scoreCapacitaciones", () => {
  it("[positivo] score GENERADA devuelve contribución máxima", () => {
    const score = confianzaMixta(
      { certificacionCurso: { estadoCertificacion: "GENERADA" } },
      0,
      PESOS_DEFAULT
    );
    expect(score).toBeGreaterThan(5); // pesoManual*5 + pesoAuto*10 = 0.4*5 + 0.6*10 = 8
  });

  it("[positivo] score ENVIADA devuelve la misma contribución que GENERADA", () => {
    const scoreGen = confianzaMixta(
      { certificacionCurso: { estadoCertificacion: "GENERADA" } },
      0,
      PESOS_DEFAULT
    );
    const scoreEnv = confianzaMixta(
      { certificacionCurso: { estadoCertificacion: "ENVIADA" } },
      0,
      PESOS_DEFAULT
    );
    expect(scoreEnv).toBe(scoreGen);
  });

  it("[positivo] score PENDIENTE devuelve contribución media (5 puntos capacitacion)", () => {
    const score = confianzaMixta(
      { certificacionCurso: { estadoCertificacion: "PENDIENTE" } },
      0,
      PESOS_DEFAULT
    );
    // pesoManual*5 + pesoAuto*5 = 0.4*5 + 0.6*5 = 5
    expect(score).toBeCloseTo(5, 1);
  });

  it("[positivo] score ANULADA devuelve contribución cero de capacitación", () => {
    const score = confianzaMixta(
      { certificacionCurso: { estadoCertificacion: "ANULADA" } },
      0,
      PESOS_DEFAULT
    );
    // pesoManual*5 + pesoAuto*0 = 0.4*5 = 2
    expect(score).toBeCloseTo(2, 1);
  });

  it("[positivo] sin certificación retorna score basado en manual + 0 auto", () => {
    const score = confianzaMixta({ certificacionCurso: null }, 0, PESOS_DEFAULT);
    // pesoManual*5 + pesoAuto*0 = 2
    expect(score).toBeCloseTo(2, 1);
  });

  it("[positivo] incidenciasAtendidas > 0 incorpora scoreIncidencias", () => {
    const scoreConInc = confianzaMixta(
      { certificacionCurso: null },
      5,
      PESOS_DEFAULT
    );
    const scoreSinInc = confianzaMixta(
      { certificacionCurso: null },
      0,
      PESOS_DEFAULT
    );
    expect(scoreConInc).toBeGreaterThan(scoreSinInc);
  });

  it("[positivo] tiempoRespuestaHoras incorpora scoreTiempoRespuesta", () => {
    const conTR = confianzaMixta({ certificacionCurso: null }, 0, PESOS_DEFAULT, 1);
    const sinTR = confianzaMixta({ certificacionCurso: null }, 0, PESOS_DEFAULT, null);
    expect(conTR).toBeGreaterThan(sinTR);
  });
});
