import { describe, it, expect, vi } from "vitest";
import { DecisionComiteUseCase } from "@/core/application/use-cases/incidencias/DecisionComite.usecase";
import { IIncidenciaRepository } from "@/core/domain/repositories/IIncidenciaRepository";
import { Incidencia } from "@/core/domain/entities/incidencia/Incidencia";
import {
  NotFoundError,
  ValidationError,
  BusinessRuleError,
} from "@/core/domain/errors/DomainError";

function makeRepo(overrides: Partial<IIncidenciaRepository> = {}): IIncidenciaRepository {
  return {
    nextCodigo: vi.fn().mockResolvedValue("GRD-2026-0001"),
    crear: vi.fn().mockResolvedValue("inc-uuid"),
    findById: vi.fn().mockResolvedValue(null),
    actualizarDatos: vi.fn().mockResolvedValue(undefined),
    guardarTransicion: vi.fn().mockResolvedValue(undefined),
    registrarAsignacion: vi.fn().mockResolvedValue(undefined),
    asignarResponsable: vi.fn().mockResolvedValue(undefined),
    guardarInforme: vi.fn().mockResolvedValue(undefined),
    upsertSolicitudEnEvaluacion: vi.fn().mockResolvedValue(undefined),
    resolverSolicitud: vi.fn().mockResolvedValue(undefined),
    registrarEntrega: vi.fn().mockResolvedValue(undefined),
    agregarSeguimiento: vi.fn().mockResolvedValue(undefined),
    liberarBrigadistas: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function incEnEvaluacion(id = "inc-1"): Incidencia {
  return Incidencia.desdePersistencia({ id, estadoActual: "EN EVALUACION" });
}

describe("DecisionComiteUseCase — APROBAR", () => {
  it("[positivo] transiciona EN EVALUACION → APROBADO", async () => {
    const inc = incEnEvaluacion();
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(inc) });

    await new DecisionComiteUseCase(repo).execute("inc-1", "APROBAR");

    expect(inc.estadoActual).toBe("APROBADO");
    expect(repo.resolverSolicitud).toHaveBeenCalledWith("inc-1", "APROBADA");
    expect(repo.guardarTransicion).toHaveBeenCalledOnce();
  });

  it("[positivo] APROBAR no requiere observaciones", async () => {
    const inc = incEnEvaluacion();
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(inc) });
    await expect(
      new DecisionComiteUseCase(repo).execute("inc-1", "APROBAR")
    ).resolves.not.toThrow();
  });
});

describe("DecisionComiteUseCase — OBSERVAR", () => {
  it("[positivo] transiciona EN EVALUACION → OBSERVADO con observaciones", async () => {
    const inc = incEnEvaluacion();
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(inc) });

    await new DecisionComiteUseCase(repo).execute("inc-1", "OBSERVAR", "Falta documentación");

    expect(inc.estadoActual).toBe("OBSERVADO");
    expect(repo.resolverSolicitud).toHaveBeenCalledWith(
      "inc-1",
      "EN_EVALUACION",
      "Falta documentación"
    );
  });

  it("[negativo] lanza ValidationError si OBSERVAR sin observaciones", async () => {
    const inc = incEnEvaluacion();
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(inc) });
    await expect(new DecisionComiteUseCase(repo).execute("inc-1", "OBSERVAR")).rejects.toThrow(
      ValidationError
    );
  });

  it("[negativo] lanza ValidationError si OBSERVAR con observaciones vacías", async () => {
    const inc = incEnEvaluacion();
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(inc) });
    await expect(
      new DecisionComiteUseCase(repo).execute("inc-1", "OBSERVAR", "   ")
    ).rejects.toThrow(ValidationError);
  });
});

describe("DecisionComiteUseCase — RECHAZAR", () => {
  it("[positivo] transiciona EN EVALUACION → RECHAZADO", async () => {
    const inc = incEnEvaluacion();
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(inc) });

    await new DecisionComiteUseCase(repo).execute("inc-1", "RECHAZAR", "No aplica");

    expect(inc.estadoActual).toBe("RECHAZADO");
    expect(repo.resolverSolicitud).toHaveBeenCalledWith("inc-1", "RECHAZADA", "No aplica");
  });

  it("[negativo] lanza ValidationError si RECHAZAR sin observaciones", async () => {
    const inc = incEnEvaluacion();
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(inc) });
    await expect(new DecisionComiteUseCase(repo).execute("inc-1", "RECHAZAR")).rejects.toThrow(
      ValidationError
    );
  });
});

describe("DecisionComiteUseCase — errores comunes", () => {
  it("[negativo] lanza NotFoundError cuando el incidente no existe", async () => {
    const repo = makeRepo();
    await expect(new DecisionComiteUseCase(repo).execute("no-existe", "APROBAR")).rejects.toThrow(
      NotFoundError
    );
  });

  it("[negativo] lanza BusinessRuleError si el incidente no está EN EVALUACION", async () => {
    const inc = Incidencia.crear({ id: "inc-2" });
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(inc) });
    await expect(new DecisionComiteUseCase(repo).execute("inc-2", "APROBAR")).rejects.toThrow(
      BusinessRuleError
    );
  });
});
