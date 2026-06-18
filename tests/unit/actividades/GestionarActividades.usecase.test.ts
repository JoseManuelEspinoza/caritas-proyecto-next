import { describe, it, expect, vi } from "vitest";
import {
  ProgramarActividadUseCase,
  ListarActividadesUseCase,
  AsignarResponsableUseCase,
  EjecutarActividadUseCase,
  CancelarActividadUseCase,
  AsignarEquipoSimulacroUseCase,
  AutoasignarmeSimulacroUseCase,
  EnviarReporteSimulacroUseCase,
  ObservarSimulacroUseCase,
  ValidarSimulacroUseCase,
} from "@/core/application/use-cases/simulacros/GestionarActividades.usecase";
import { IActividadRepository } from "@/core/domain/repositories/IActividadRepository";
import { ActividadPreventiva } from "@/core/domain/entities/actividad/ActividadPreventiva";
import {
  NotFoundError,
  ValidationError,
  BusinessRuleError,
} from "@/core/domain/errors/DomainError";

function makeRepo(overrides: Partial<IActividadRepository> = {}): IActividadRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn().mockResolvedValue(null),
    findAll: vi.fn().mockResolvedValue([]),
    nextCodigo: vi.fn().mockResolvedValue("ACT-2026-0001"),
    asignarEquipo: vi.fn().mockResolvedValue(undefined),
    autoasignarme: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function actividadProgramada(id = "act-1"): ActividadPreventiva {
  return ActividadPreventiva.crear({
    id,
    idParroquia: "parroquia-1",
    idUsuarioRegistroGRD: "usuario-1",
    idTipoActividadPreventiva: "tipo-1",
    nombreActividad: "Simulacro de evacuación",
  });
}

const INPUT = {
  idParroquia: "parroquia-1",
  idUsuarioRegistroGRD: "usuario-1",
  idTipoActividadPreventiva: "tipo-1",
  nombreActividad: "Simulacro de evacuación",
  fechaProgramada: "2099-12-31",
  lugarActividad: "Local parroquial San José",
};

// ---------------------------------------------------------------------------
// ProgramarActividadUseCase
// ---------------------------------------------------------------------------
describe("ProgramarActividadUseCase", () => {
  it("[positivo] programa la actividad con estado PROGRAMADA", async () => {
    const repo = makeRepo();
    const result = await new ProgramarActividadUseCase(repo).execute(INPUT);

    expect(repo.nextCodigo).toHaveBeenCalledOnce();
    expect(repo.save).toHaveBeenCalledOnce();
    expect(result.estadoActividad).toBe("PROGRAMADA");
    expect(result.codigoActividad).toBe("ACT-2026-0001");
  });

  it("[negativo] lanza ValidationError cuando idParroquia está vacío", async () => {
    const repo = makeRepo();
    await expect(
      new ProgramarActividadUseCase(repo).execute({ ...INPUT, idParroquia: "" })
    ).rejects.toThrow(ValidationError);
  });

  it("[negativo] lanza ValidationError cuando nombreActividad tiene menos de 3 caracteres", async () => {
    const repo = makeRepo();
    await expect(
      new ProgramarActividadUseCase(repo).execute({ ...INPUT, nombreActividad: "AB" })
    ).rejects.toThrow(ValidationError);
  });
});

// ---------------------------------------------------------------------------
// ListarActividadesUseCase
// ---------------------------------------------------------------------------
describe("ListarActividadesUseCase", () => {
  it("[positivo] retorna la lista de actividades", async () => {
    const actividades = [actividadProgramada("a1"), actividadProgramada("a2")];
    const repo = makeRepo({ findAll: vi.fn().mockResolvedValue(actividades) });
    const result = await new ListarActividadesUseCase(repo).execute();
    expect(result).toHaveLength(2);
    expect(result[0].estadoActividad).toBe("PROGRAMADA");
  });
});

// ---------------------------------------------------------------------------
// AsignarResponsableUseCase
// ---------------------------------------------------------------------------
describe("AsignarResponsableUseCase", () => {
  it("[positivo] asigna el brigadista responsable", async () => {
    const actividad = actividadProgramada();
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(actividad) });

    const result = await new AsignarResponsableUseCase(repo).execute("act-1", "brigadista-1");

    expect(repo.update).toHaveBeenCalledOnce();
    expect(result.estadoActividad).toBe("PROGRAMADA");
  });

  it("[negativo] lanza NotFoundError cuando la actividad no existe", async () => {
    const repo = makeRepo();
    await expect(
      new AsignarResponsableUseCase(repo).execute("no-existe", "brigadista-1")
    ).rejects.toThrow(NotFoundError);
  });

  it("[negativo] lanza BusinessRuleError al asignar en actividad EJECUTADA", async () => {
    const actividad = actividadProgramada();
    actividad.ejecutar({ resultadoGeneral: "Exitoso sin contratiempos" });
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(actividad) });

    await expect(
      new AsignarResponsableUseCase(repo).execute("act-1", "brigadista-1")
    ).rejects.toThrow(BusinessRuleError);
  });
});

// ---------------------------------------------------------------------------
// EjecutarActividadUseCase
// ---------------------------------------------------------------------------
describe("EjecutarActividadUseCase", () => {
  it("[positivo] transiciona PROGRAMADA → EJECUTADA", async () => {
    const actividad = actividadProgramada();
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(actividad) });

    const result = await new EjecutarActividadUseCase(repo).execute("act-1", {
      resultadoGeneral: "Exitoso",
      numeroParticipantesReal: 50,
    });

    expect(result.estadoActividad).toBe("EJECUTADA");
    expect(result.resultadoGeneral).toBe("Exitoso");
    expect(result.fechaEjecucion).not.toBeNull();
    expect(repo.update).toHaveBeenCalledOnce();
  });

  it("[negativo] lanza NotFoundError cuando la actividad no existe", async () => {
    const repo = makeRepo();
    await expect(
      new EjecutarActividadUseCase(repo).execute("no-existe", { resultadoGeneral: "OK" })
    ).rejects.toThrow(NotFoundError);
  });

  it("[negativo] lanza BusinessRuleError al ejecutar una actividad ya EJECUTADA", async () => {
    const actividad = actividadProgramada();
    actividad.ejecutar({ resultadoGeneral: "Primera" });
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(actividad) });

    await expect(
      new EjecutarActividadUseCase(repo).execute("act-1", { resultadoGeneral: "Segunda" })
    ).rejects.toThrow(BusinessRuleError);
  });
});

// ---------------------------------------------------------------------------
// CancelarActividadUseCase
// ---------------------------------------------------------------------------
describe("CancelarActividadUseCase", () => {
  it("[positivo] transiciona PROGRAMADA → CANCELADA", async () => {
    const actividad = actividadProgramada();
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(actividad) });

    const result = await new CancelarActividadUseCase(repo).execute("act-1", "Mal clima");

    expect(result.estadoActividad).toBe("CANCELADA");
    expect(repo.update).toHaveBeenCalledOnce();
  });

  it("[negativo] lanza NotFoundError cuando la actividad no existe", async () => {
    const repo = makeRepo();
    await expect(new CancelarActividadUseCase(repo).execute("no-existe", "Motivo")).rejects.toThrow(
      NotFoundError
    );
  });

  it("[negativo] lanza BusinessRuleError al cancelar una actividad EJECUTADA", async () => {
    const actividad = actividadProgramada();
    actividad.ejecutar({ resultadoGeneral: "Exitoso sin contratiempos" });
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(actividad) });

    await expect(new CancelarActividadUseCase(repo).execute("act-1", "Tarde")).rejects.toThrow(
      BusinessRuleError
    );
  });
});

// ---------------------------------------------------------------------------
// ProgramarActividadUseCase — validaciones adicionales
// ---------------------------------------------------------------------------
describe("ProgramarActividadUseCase — validaciones adicionales", () => {
  it("[negativo] lanza ValidationError cuando idUsuarioRegistroGRD está vacío", async () => {
    const repo = makeRepo();
    await expect(
      new ProgramarActividadUseCase(repo).execute({ ...INPUT, idUsuarioRegistroGRD: "" })
    ).rejects.toThrow(ValidationError);
  });

  it("[negativo] lanza ValidationError cuando idTipoActividadPreventiva está vacío", async () => {
    const repo = makeRepo();
    await expect(
      new ProgramarActividadUseCase(repo).execute({ ...INPUT, idTipoActividadPreventiva: "" })
    ).rejects.toThrow(ValidationError);
  });

  it("[negativo] lanza ValidationError cuando fechaProgramada es anterior a hoy", async () => {
    const repo = makeRepo();
    await expect(
      new ProgramarActividadUseCase(repo).execute({ ...INPUT, fechaProgramada: "2020-01-01" })
    ).rejects.toThrow(ValidationError);
  });

  it("[negativo] lanza ValidationError cuando lugarActividad está vacío", async () => {
    const repo = makeRepo();
    await expect(
      new ProgramarActividadUseCase(repo).execute({ ...INPUT, lugarActividad: "" })
    ).rejects.toThrow(ValidationError);
  });

  it("[negativo] lanza ValidationError cuando lugarActividad tiene menos de 3 caracteres", async () => {
    const repo = makeRepo();
    await expect(
      new ProgramarActividadUseCase(repo).execute({ ...INPUT, lugarActividad: "AB" })
    ).rejects.toThrow(ValidationError);
  });

  it("[negativo] lanza ValidationError cuando descripcion tiene menos de 5 caracteres", async () => {
    const repo = makeRepo();
    await expect(
      new ProgramarActividadUseCase(repo).execute({ ...INPUT, descripcionActividad: "Brv" })
    ).rejects.toThrow(ValidationError);
  });

  it("[negativo] lanza ValidationError cuando numeroParticipantesEstimado no es entero", async () => {
    const repo = makeRepo();
    await expect(
      new ProgramarActividadUseCase(repo).execute({ ...INPUT, numeroParticipantesEstimado: 1.5 })
    ).rejects.toThrow(ValidationError);
  });

  it("[negativo] lanza ValidationError cuando numeroParticipantesEstimado es negativo", async () => {
    const repo = makeRepo();
    await expect(
      new ProgramarActividadUseCase(repo).execute({ ...INPUT, numeroParticipantesEstimado: -1 })
    ).rejects.toThrow(ValidationError);
  });
});

// ---------------------------------------------------------------------------
// CancelarActividadUseCase — validaciones de motivo
// ---------------------------------------------------------------------------
describe("CancelarActividadUseCase — validaciones de motivo", () => {
  it("[negativo] lanza ValidationError cuando motivo está vacío", async () => {
    const repo = makeRepo();
    await expect(new CancelarActividadUseCase(repo).execute("act-1", "")).rejects.toThrow(
      ValidationError
    );
  });

  it("[negativo] lanza ValidationError cuando motivo tiene menos de 5 caracteres", async () => {
    const repo = makeRepo();
    await expect(new CancelarActividadUseCase(repo).execute("act-1", "Cor")).rejects.toThrow(
      ValidationError
    );
  });
});

// ---------------------------------------------------------------------------
// AsignarEquipoSimulacroUseCase
// ---------------------------------------------------------------------------
describe("AsignarEquipoSimulacroUseCase", () => {
  it("[positivo] transiciona PROGRAMADA → ASIGNADA y persiste el equipo", async () => {
    const actividad = actividadProgramada();
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(actividad) });

    const result = await new AsignarEquipoSimulacroUseCase(repo).execute(
      "act-1", "brigadista-1", ["brigadista-2"], "Llevar chalecos", "grd-1"
    );

    expect(result.estadoActividad).toBe("ASIGNADA");
    expect(repo.update).toHaveBeenCalledOnce();
    expect(repo.asignarEquipo).toHaveBeenCalledWith("act-1", "brigadista-1", ["brigadista-2"], "grd-1");
  });

  it("[negativo] lanza NotFoundError cuando la actividad no existe", async () => {
    const repo = makeRepo();
    await expect(
      new AsignarEquipoSimulacroUseCase(repo).execute("no-existe", null, [], "", "grd-1")
    ).rejects.toThrow(NotFoundError);
  });
});

// ---------------------------------------------------------------------------
// AutoasignarmeSimulacroUseCase
// ---------------------------------------------------------------------------
describe("AutoasignarmeSimulacroUseCase", () => {
  it("[positivo] transiciona PROGRAMADA → ASIGNADA con usuario GRD", async () => {
    const actividad = actividadProgramada();
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(actividad) });

    const result = await new AutoasignarmeSimulacroUseCase(repo).execute("act-1", "grd-1");

    expect(result.estadoActividad).toBe("ASIGNADA");
    expect(result.idUsuarioResponsableGRD).toBe("grd-1");
    expect(repo.autoasignarme).toHaveBeenCalledWith("act-1", "grd-1");
  });

  it("[negativo] lanza NotFoundError cuando la actividad no existe", async () => {
    const repo = makeRepo();
    await expect(
      new AutoasignarmeSimulacroUseCase(repo).execute("no-existe", "grd-1")
    ).rejects.toThrow(NotFoundError);
  });
});

// ---------------------------------------------------------------------------
// EnviarReporteSimulacroUseCase
// ---------------------------------------------------------------------------
describe("EnviarReporteSimulacroUseCase", () => {
  it("[positivo] transiciona ASIGNADA → EJECUTADA con el reporte", async () => {
    const actividad = actividadProgramada();
    actividad.asignarEquipo("indicaciones");
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(actividad) });

    const result = await new EnviarReporteSimulacroUseCase(repo).execute("act-1", "Todo salió bien");

    expect(result.estadoActividad).toBe("EJECUTADA");
    expect(result.reporteBrigadista).toBe("Todo salió bien");
  });

  it("[negativo] lanza NotFoundError cuando la actividad no existe", async () => {
    const repo = makeRepo();
    await expect(
      new EnviarReporteSimulacroUseCase(repo).execute("no-existe", "Reporte")
    ).rejects.toThrow(NotFoundError);
  });
});

// ---------------------------------------------------------------------------
// ObservarSimulacroUseCase
// ---------------------------------------------------------------------------
describe("ObservarSimulacroUseCase", () => {
  it("[positivo] transiciona EJECUTADA → OBSERVADA con comentario", async () => {
    const actividad = actividadProgramada();
    actividad.asignarEquipo();
    actividad.enviarReporte("Reporte del brigadista");
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(actividad) });

    const result = await new ObservarSimulacroUseCase(repo).execute("act-1", "Falta evidencia fotográfica");

    expect(result.estadoActividad).toBe("OBSERVADA");
    expect(result.observaciones).toBe("Falta evidencia fotográfica");
  });

  it("[negativo] lanza NotFoundError cuando la actividad no existe", async () => {
    const repo = makeRepo();
    await expect(
      new ObservarSimulacroUseCase(repo).execute("no-existe", "comentario")
    ).rejects.toThrow(NotFoundError);
  });
});

// ---------------------------------------------------------------------------
// ValidarSimulacroUseCase
// ---------------------------------------------------------------------------
describe("ValidarSimulacroUseCase", () => {
  it("[positivo] transiciona EJECUTADA → VALIDADA", async () => {
    const actividad = actividadProgramada();
    actividad.asignarEquipo();
    actividad.enviarReporte("Reporte final completo");
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(actividad) });

    const result = await new ValidarSimulacroUseCase(repo).execute("act-1");

    expect(result.estadoActividad).toBe("VALIDADA");
    expect(repo.update).toHaveBeenCalledOnce();
  });

  it("[negativo] lanza NotFoundError cuando la actividad no existe", async () => {
    const repo = makeRepo();
    await expect(
      new ValidarSimulacroUseCase(repo).execute("no-existe")
    ).rejects.toThrow(NotFoundError);
  });
});
