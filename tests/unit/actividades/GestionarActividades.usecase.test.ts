import { describe, it, expect, vi } from "vitest";
import {
  ProgramarActividadUseCase,
  ListarActividadesUseCase,
  AsignarResponsableUseCase,
  EjecutarActividadUseCase,
  CancelarActividadUseCase,
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
    actividad.ejecutar({ resultadoGeneral: "OK" });
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
    actividad.ejecutar({ resultadoGeneral: "OK" });
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(actividad) });

    await expect(new CancelarActividadUseCase(repo).execute("act-1", "Tarde")).rejects.toThrow(
      BusinessRuleError
    );
  });
});
