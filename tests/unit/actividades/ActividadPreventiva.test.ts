import { describe, it, expect } from "vitest";
import { ActividadPreventiva, ActividadProps } from "@/core/domain/entities/actividad/ActividadPreventiva";
import { ValidationError, BusinessRuleError } from "@/core/domain/errors/DomainError";

const BASE = {
  id: "act-1",
  idParroquia: "parroquia-1",
  idUsuarioRegistroGRD: "usuario-1",
  idTipoActividadPreventiva: "tipo-1",
  nombreActividad: "Simulacro de evacuación",
};

function crearProgramada(): ActividadPreventiva {
  return ActividadPreventiva.crear(BASE);
}

describe("ActividadPreventiva.crear", () => {
  it("[positivo] crea la actividad con estado PROGRAMADA", () => {
    const a = crearProgramada();
    expect(a.snapshot.estadoActividad).toBe("PROGRAMADA");
  });

  it("[positivo] trimea nombreActividad", () => {
    const a = ActividadPreventiva.crear({ ...BASE, nombreActividad: "  Simulacro  " });
    expect(a.snapshot.nombreActividad).toBe("Simulacro");
  });

  it("[negativo] lanza ValidationError cuando idParroquia está vacío", () => {
    expect(() => ActividadPreventiva.crear({ ...BASE, idParroquia: "" })).toThrow(ValidationError);
  });

  it("[negativo] lanza ValidationError cuando nombreActividad tiene menos de 3 caracteres", () => {
    expect(() => ActividadPreventiva.crear({ ...BASE, nombreActividad: "AB" })).toThrow(
      ValidationError
    );
  });

  it("[negativo] lanza ValidationError cuando idTipoActividadPreventiva está vacío", () => {
    expect(() => ActividadPreventiva.crear({ ...BASE, idTipoActividadPreventiva: "" })).toThrow(
      ValidationError
    );
  });
});

describe("ActividadPreventiva.asignarResponsable", () => {
  it("[positivo] asigna responsable cuando está PROGRAMADA", () => {
    const a = crearProgramada();
    a.asignarResponsable("brigadista-1");
    expect(a.snapshot.idBrigadistaResponsable).toBe("brigadista-1");
  });

  it("[negativo] lanza BusinessRuleError al asignar responsable en actividad EJECUTADA", () => {
    const a = crearProgramada();
    a.ejecutar({ resultadoGeneral: "Exitoso" });
    expect(() => a.asignarResponsable("brigadista-1")).toThrow(BusinessRuleError);
  });
});

describe("ActividadPreventiva.ejecutar", () => {
  it("[positivo] cambia el estado a EJECUTADA", () => {
    const a = crearProgramada();
    a.ejecutar({ resultadoGeneral: "Exitoso", numeroParticipantesReal: 30 });
    expect(a.snapshot.estadoActividad).toBe("EJECUTADA");
    expect(a.snapshot.resultadoGeneral).toBe("Exitoso");
    expect(a.snapshot.numeroParticipantesReal).toBe(30);
  });

  it("[positivo] registra la fecha de ejecución", () => {
    const a = crearProgramada();
    a.ejecutar({ resultadoGeneral: "Completado" });
    expect(a.snapshot.fechaEjecucion).not.toBeNull();
  });

  it("[negativo] lanza BusinessRuleError al ejecutar una actividad ya EJECUTADA", () => {
    const a = crearProgramada();
    a.ejecutar({ resultadoGeneral: "Primera ejecución" });
    expect(() => a.ejecutar({ resultadoGeneral: "Segunda ejecución" })).toThrow(BusinessRuleError);
  });

  it("[negativo] lanza BusinessRuleError al ejecutar una actividad CANCELADA", () => {
    const a = crearProgramada();
    a.cancelar("Sin presupuesto");
    expect(() => a.ejecutar({ resultadoGeneral: "Tardío" })).toThrow(BusinessRuleError);
  });
});

describe("ActividadPreventiva.cancelar", () => {
  it("[positivo] cambia el estado a CANCELADA y guarda el motivo", () => {
    const a = crearProgramada();
    a.cancelar("Mal clima");
    expect(a.snapshot.estadoActividad).toBe("CANCELADA");
    expect(a.snapshot.observaciones).toBe("Mal clima");
  });

  it("[negativo] lanza BusinessRuleError al cancelar una actividad EJECUTADA", () => {
    const a = crearProgramada();
    a.ejecutar({ resultadoGeneral: "Exitoso sin contratiempos" });
    expect(() => a.cancelar("Ya fue ejecutada")).toThrow(BusinessRuleError);
  });
});

describe("ActividadPreventiva — nuevo flujo (PROGRAMADA → ASIGNADA → EJECUTADA → VALIDADA)", () => {
  it("[positivo] asignarEquipo transiciona PROGRAMADA → ASIGNADA", () => {
    const a = crearProgramada();
    a.asignarEquipo("Llevar chalecos");
    expect(a.snapshot.estadoActividad).toBe("ASIGNADA");
    expect(a.snapshot.indicacionesEquipo).toBe("Llevar chalecos");
  });

  it("[negativo] asignarEquipo lanza BusinessRuleError si no está PROGRAMADA", () => {
    const a = crearProgramada();
    a.asignarEquipo();
    expect(() => a.asignarEquipo()).toThrow(BusinessRuleError);
  });

  it("[positivo] autoasignarme transiciona PROGRAMADA → ASIGNADA con idUsuario", () => {
    const a = crearProgramada();
    a.autoasignarme("grd-1", "Indicaciones especiales");
    expect(a.snapshot.estadoActividad).toBe("ASIGNADA");
    expect(a.snapshot.idUsuarioResponsableGRD).toBe("grd-1");
  });

  it("[positivo] enviarReporte transiciona ASIGNADA → EJECUTADA", () => {
    const a = crearProgramada();
    a.asignarEquipo();
    a.enviarReporte("Todo salió bien sin inconvenientes");
    expect(a.snapshot.estadoActividad).toBe("EJECUTADA");
    expect(a.snapshot.reporteBrigadista).toBe("Todo salió bien sin inconvenientes");
    expect(a.snapshot.fechaEjecucion).not.toBeNull();
  });

  it("[negativo] enviarReporte lanza BusinessRuleError si está PROGRAMADA", () => {
    const a = crearProgramada();
    expect(() => a.enviarReporte("Reporte sin asignación")).toThrow(BusinessRuleError);
  });

  it("[negativo] enviarReporte lanza ValidationError con notas vacías", () => {
    const a = crearProgramada();
    a.asignarEquipo();
    expect(() => a.enviarReporte("")).toThrow(ValidationError);
  });

  it("[positivo] observar transiciona EJECUTADA → OBSERVADA", () => {
    const a = crearProgramada();
    a.asignarEquipo();
    a.enviarReporte("Reporte inicial enviado");
    a.observar("Falta evidencia fotográfica del simulacro");
    expect(a.snapshot.estadoActividad).toBe("OBSERVADA");
    expect(a.snapshot.observaciones).toBe("Falta evidencia fotográfica del simulacro");
  });

  it("[negativo] observar lanza BusinessRuleError si no está EJECUTADA", () => {
    const a = crearProgramada();
    expect(() => a.observar("comentario")).toThrow(BusinessRuleError);
  });

  it("[positivo] validar transiciona EJECUTADA → VALIDADA", () => {
    const a = crearProgramada();
    a.asignarEquipo();
    a.enviarReporte("Reporte completo y detallado");
    a.validar();
    expect(a.snapshot.estadoActividad).toBe("VALIDADA");
  });

  it("[negativo] validar lanza BusinessRuleError si no está EJECUTADA", () => {
    const a = crearProgramada();
    expect(() => a.validar()).toThrow(BusinessRuleError);
  });

  it("[positivo] cancelar desde ASIGNADA", () => {
    const a = crearProgramada();
    a.asignarEquipo();
    a.cancelar("Cancelada por fuerza mayor");
    expect(a.snapshot.estadoActividad).toBe("CANCELADA");
  });
});

describe("ActividadPreventiva — assertEnteroNoNegativo (via ejecutar)", () => {
  it("[negativo] lanza BusinessRuleError con numeroParticipantesReal no entero", () => {
    const a = crearProgramada();
    expect(() => a.ejecutar({ resultadoGeneral: "Exitoso completo sin problemas", numeroParticipantesReal: 1.5 }))
      .toThrow(BusinessRuleError);
  });

  it("[negativo] lanza BusinessRuleError con numeroParticipantesReal negativo", () => {
    const a = crearProgramada();
    expect(() => a.ejecutar({ resultadoGeneral: "Exitoso completo sin problemas", numeroParticipantesReal: -1 }))
      .toThrow(BusinessRuleError);
  });
});

describe("ActividadPreventiva — desdePersistencia e id", () => {
  it("[positivo] desdePersistencia restaura el estado", () => {
    const a = ActividadPreventiva.desdePersistencia({
      id: "act-99",
      idParroquia: "p-1",
      idUsuarioRegistroGRD: "u-1",
      idTipoActividadPreventiva: "tipo-1",
      nombreActividad: "Simulacro",
      estadoActividad: "VALIDADA",
    });
    expect(a.snapshot.estadoActividad).toBe("VALIDADA");
    expect(a.id).toBe("act-99");
  });
});
