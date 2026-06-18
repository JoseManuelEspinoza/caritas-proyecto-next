import { describe, it, expect } from "vitest";
import { Incidencia } from "@/core/domain/entities/incidencia/Incidencia";
import { BusinessRuleError } from "@/core/domain/errors/DomainError";

function crearAbierta(): Incidencia {
  return Incidencia.crear({ id: "inc-1", codigoCaso: "GRD-2026-0001" });
}

describe("Incidencia.crear", () => {
  it("[positivo] se crea con estado ABIERTO", () => {
    const inc = crearAbierta();
    expect(inc.estadoActual).toBe("ABIERTO");
  });

  it("[positivo] desdePersistencia restaura el estado recibido", () => {
    const inc = Incidencia.desdePersistencia({ id: "inc-2", estadoActual: "ASIGNADO" });
    expect(inc.estadoActual).toBe("ASIGNADO");
  });
});

describe("Incidencia.asegurarEditable", () => {
  it("[positivo] no lanza error cuando está ABIERTO", () => {
    expect(() => crearAbierta().asegurarEditable()).not.toThrow();
  });

  it("[negativo] lanza BusinessRuleError cuando no está ABIERTO", () => {
    const inc = Incidencia.desdePersistencia({ id: "inc-3", estadoActual: "ASIGNADO" });
    expect(() => inc.asegurarEditable()).toThrow(BusinessRuleError);
  });
});

describe("Incidencia — flujo completo de transiciones", () => {
  it("[positivo] recorre el camino feliz hasta CERRADO por APROBADO", () => {
    const inc = crearAbierta();
    inc.asignar();
    expect(inc.estadoActual).toBe("ASIGNADO");
    inc.registrarCampo();
    expect(inc.estadoActual).toBe("DATA RECOPILADA");
    inc.enviarEvaluacion();
    expect(inc.estadoActual).toBe("EN EVALUACION");
    inc.aprobar();
    expect(inc.estadoActual).toBe("APROBADO");
    inc.atender();
    expect(inc.estadoActual).toBe("ATENDIDO");
    inc.iniciarSeguimiento();
    expect(inc.estadoActual).toBe("SEGUIMIENTO ABIERTO");
    inc.cerrar();
    expect(inc.estadoActual).toBe("CERRADO");
  });

  it("[positivo] recorre el camino RECHAZADO → CERRADO", () => {
    const inc = Incidencia.desdePersistencia({ id: "inc-4", estadoActual: "EN EVALUACION" });
    inc.rechazar();
    expect(inc.estadoActual).toBe("RECHAZADO");
    inc.cerrar();
    expect(inc.estadoActual).toBe("CERRADO");
  });

  it("[positivo] OBSERVADO puede reenviar a EN EVALUACION", () => {
    const inc = Incidencia.desdePersistencia({ id: "inc-5", estadoActual: "OBSERVADO" });
    inc.enviarEvaluacion();
    expect(inc.estadoActual).toBe("EN EVALUACION");
  });

  it("[positivo] registra el estado anterior tras cada transición", () => {
    const inc = crearAbierta();
    inc.asignar();
    expect(inc.estadoAnterior).toBe("ABIERTO");
  });

  it("[negativo] lanza BusinessRuleError en transición no permitida", () => {
    const inc = crearAbierta();
    expect(() => inc.cerrar()).toThrow(BusinessRuleError);
  });

  it("[negativo] CERRADO no admite más transiciones", () => {
    const inc = Incidencia.desdePersistencia({ id: "inc-6", estadoActual: "CERRADO" });
    expect(() => inc.asignar()).toThrow(BusinessRuleError);
  });
});

describe("Incidencia — getters", () => {
  it("[positivo] get id retorna el id", () => {
    const inc = Incidencia.crear({ id: "inc-99" });
    expect(inc.id).toBe("inc-99");
  });

  it("[positivo] get idAviso retorna null cuando no se pasó", () => {
    const inc = Incidencia.crear({ id: "inc-100" });
    expect(inc.idAviso).toBeUndefined();
  });

  it("[positivo] get idAviso retorna el valor cuando se pasó", () => {
    const inc = Incidencia.desdePersistencia({ id: "inc-101", idAviso: "aviso-1", estadoActual: "ABIERTO" });
    expect(inc.idAviso).toBe("aviso-1");
  });

  it("[positivo] get snapshot retorna los props del estado actual", () => {
    const inc = Incidencia.desdePersistencia({ id: "inc-102", estadoActual: "ASIGNADO", codigoCaso: "GRD-001" });
    expect(inc.snapshot.codigoCaso).toBe("GRD-001");
    expect(inc.snapshot.estadoActual).toBe("ASIGNADO");
  });

  it("[positivo] estadoAnterior es undefined antes de cualquier transición", () => {
    const inc = Incidencia.crear({ id: "inc-103" });
    expect(inc.estadoAnterior).toBeUndefined();
  });
});
