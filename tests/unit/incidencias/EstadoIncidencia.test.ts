import { describe, it, expect } from "vitest";
import { assertTransicion, TRANSICIONES } from "@/core/domain/entities/incidencia/EstadoIncidencia";
import { BusinessRuleError } from "@/core/domain/errors/DomainError";

describe("assertTransicion — transiciones válidas", () => {
  it("ABIERTO → ASIGNADO", () => {
    expect(() => assertTransicion("ABIERTO", "ASIGNADO")).not.toThrow();
  });

  it("ASIGNADO → DATA RECOPILADA", () => {
    expect(() => assertTransicion("ASIGNADO", "DATA RECOPILADA")).not.toThrow();
  });

  it("DATA RECOPILADA → EN EVALUACION", () => {
    expect(() => assertTransicion("DATA RECOPILADA", "EN EVALUACION")).not.toThrow();
  });

  it("EN EVALUACION → APROBADO", () => {
    expect(() => assertTransicion("EN EVALUACION", "APROBADO")).not.toThrow();
  });

  it("EN EVALUACION → OBSERVADO", () => {
    expect(() => assertTransicion("EN EVALUACION", "OBSERVADO")).not.toThrow();
  });

  it("EN EVALUACION → RECHAZADO", () => {
    expect(() => assertTransicion("EN EVALUACION", "RECHAZADO")).not.toThrow();
  });

  it("OBSERVADO → EN EVALUACION", () => {
    expect(() => assertTransicion("OBSERVADO", "EN EVALUACION")).not.toThrow();
  });

  it("OBSERVADO → RECHAZADO", () => {
    expect(() => assertTransicion("OBSERVADO", "RECHAZADO")).not.toThrow();
  });

  it("APROBADO → ATENDIDO", () => {
    expect(() => assertTransicion("APROBADO", "ATENDIDO")).not.toThrow();
  });

  it("ATENDIDO → SEGUIMIENTO ABIERTO", () => {
    expect(() => assertTransicion("ATENDIDO", "SEGUIMIENTO ABIERTO")).not.toThrow();
  });

  it("SEGUIMIENTO ABIERTO → SEGUIMIENTO ABIERTO (puede repetirse)", () => {
    expect(() => assertTransicion("SEGUIMIENTO ABIERTO", "SEGUIMIENTO ABIERTO")).not.toThrow();
  });

  it("SEGUIMIENTO ABIERTO → CERRADO", () => {
    expect(() => assertTransicion("SEGUIMIENTO ABIERTO", "CERRADO")).not.toThrow();
  });

  it("RECHAZADO → CERRADO", () => {
    expect(() => assertTransicion("RECHAZADO", "CERRADO")).not.toThrow();
  });
});

describe("assertTransicion — transiciones inválidas", () => {
  it("ABIERTO no puede ir a CERRADO", () => {
    expect(() => assertTransicion("ABIERTO", "CERRADO")).toThrow(BusinessRuleError);
  });

  it("CERRADO no tiene transiciones salientes", () => {
    expect(TRANSICIONES["CERRADO"]).toHaveLength(0);
    expect(() => assertTransicion("CERRADO", "ABIERTO")).toThrow(BusinessRuleError);
  });

  it("APROBADO no puede ir a EN EVALUACION", () => {
    expect(() => assertTransicion("APROBADO", "EN EVALUACION")).toThrow(BusinessRuleError);
  });

  it("el mensaje incluye los estados origen y destino", () => {
    expect(() => assertTransicion("ABIERTO", "CERRADO")).toThrow("ABIERTO");
  });
});
