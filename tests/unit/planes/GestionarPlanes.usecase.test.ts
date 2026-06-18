import { describe, it, expect, vi } from "vitest";
import {
  CrearPlanUseCase,
  ListarPlanesUseCase,
  ActualizarPlanUseCase,
  CambiarAprobacionPlanUseCase,
} from "@/core/application/use-cases/planes/GestionarPlanes.usecase";
import { IPlanRepository } from "@/core/domain/repositories/IPlanRepository";
import { PlanTrabajo } from "@/core/domain/entities/plan/PlanTrabajo";
import {
  NotFoundError,
  ValidationError,
  BusinessRuleError,
} from "@/core/domain/errors/DomainError";

function makeRepo(overrides: Partial<IPlanRepository> = {}): IPlanRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn().mockResolvedValue(null),
    findAll: vi.fn().mockResolvedValue([]),
    nextCodigo: vi.fn().mockResolvedValue("PLAN-2026-0001"),
    ...overrides,
  };
}

function planBorrador(id = "plan-1"): PlanTrabajo {
  return PlanTrabajo.crear({
    id,
    idParroquia: "parroquia-1",
    idUsuarioResponsableGRD: "usuario-1",
    nombrePlan: "Plan GRD 2026",
  });
}

const INPUT = {
  idParroquia: "parroquia-1",
  idUsuarioResponsableGRD: "usuario-1",
  nombrePlan: "Plan GRD 2026",
};

// ---------------------------------------------------------------------------
// CrearPlanUseCase
// ---------------------------------------------------------------------------
describe("CrearPlanUseCase", () => {
  it("[positivo] crea el plan con código y estado BORRADOR", async () => {
    const repo = makeRepo();
    const result = await new CrearPlanUseCase(repo).execute(INPUT);

    expect(repo.nextCodigo).toHaveBeenCalledOnce();
    expect(repo.save).toHaveBeenCalledOnce();
    expect(result.estadoAprobacion).toBe("BORRADOR");
    expect(result.codigoPlan).toBe("PLAN-2026-0001");
  });

  it("[negativo] lanza ValidationError cuando idParroquia está vacío", async () => {
    const repo = makeRepo();
    await expect(new CrearPlanUseCase(repo).execute({ ...INPUT, idParroquia: "" })).rejects.toThrow(
      ValidationError
    );
  });

  it("[negativo] lanza ValidationError cuando nombrePlan es muy corto", async () => {
    const repo = makeRepo();
    await expect(
      new CrearPlanUseCase(repo).execute({ ...INPUT, nombrePlan: "AB" })
    ).rejects.toThrow(ValidationError);
  });
});

// ---------------------------------------------------------------------------
// ListarPlanesUseCase
// ---------------------------------------------------------------------------
describe("ListarPlanesUseCase", () => {
  it("[positivo] retorna la lista de planes", async () => {
    const planes = [planBorrador("p1"), planBorrador("p2")];
    const repo = makeRepo({ findAll: vi.fn().mockResolvedValue(planes) });
    const result = await new ListarPlanesUseCase(repo).execute();
    expect(result).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// ActualizarPlanUseCase
// ---------------------------------------------------------------------------
describe("ActualizarPlanUseCase", () => {
  it("[positivo] actualiza el nombre del plan en BORRADOR", async () => {
    const plan = planBorrador();
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(plan) });

    const result = await new ActualizarPlanUseCase(repo).execute("plan-1", {
      nombrePlan: "Plan Nuevo 2026",
    });

    expect(repo.update).toHaveBeenCalledOnce();
    expect(result.nombrePlan).toBe("Plan Nuevo 2026");
  });

  it("[negativo] lanza NotFoundError cuando el plan no existe", async () => {
    const repo = makeRepo();
    await expect(
      new ActualizarPlanUseCase(repo).execute("no-existe", { nombrePlan: "Nuevo" })
    ).rejects.toThrow(NotFoundError);
  });

  it("[negativo] lanza BusinessRuleError al actualizar un plan EN_REVISION", async () => {
    const plan = planBorrador();
    plan.enviarRevision();
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(plan) });

    await expect(
      new ActualizarPlanUseCase(repo).execute("plan-1", { nombrePlan: "Nuevo Plan" })
    ).rejects.toThrow(BusinessRuleError);
  });
});

// ---------------------------------------------------------------------------
// CambiarAprobacionPlanUseCase
// ---------------------------------------------------------------------------
describe("CambiarAprobacionPlanUseCase", () => {
  it("[positivo] ENVIAR transiciona BORRADOR → EN_REVISION", async () => {
    const plan = planBorrador();
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(plan) });

    const result = await new CambiarAprobacionPlanUseCase(repo).execute("plan-1", "ENVIAR");

    expect(result.estadoAprobacion).toBe("EN_REVISION");
    expect(repo.update).toHaveBeenCalledOnce();
  });

  it("[positivo] APROBAR transiciona EN_REVISION → APROBADO", async () => {
    const plan = planBorrador();
    plan.enviarRevision();
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(plan) });

    const result = await new CambiarAprobacionPlanUseCase(repo).execute("plan-1", "APROBAR");

    expect(result.estadoAprobacion).toBe("APROBADO");
  });

  it("[positivo] OBSERVAR transiciona EN_REVISION → OBSERVADO", async () => {
    const plan = planBorrador();
    plan.enviarRevision();
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(plan) });

    const result = await new CambiarAprobacionPlanUseCase(repo).execute(
      "plan-1",
      "OBSERVAR",
      "Faltan datos"
    );

    expect(result.estadoAprobacion).toBe("OBSERVADO");
    expect(result.observaciones).toBe("Faltan datos");
  });

  it("[negativo] lanza NotFoundError cuando el plan no existe", async () => {
    const repo = makeRepo();
    await expect(
      new CambiarAprobacionPlanUseCase(repo).execute("no-existe", "ENVIAR")
    ).rejects.toThrow(NotFoundError);
  });

  it("[negativo] lanza BusinessRuleError al ENVIAR desde APROBADO", async () => {
    const plan = planBorrador();
    plan.enviarRevision();
    plan.aprobar();
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(plan) });

    await expect(
      new CambiarAprobacionPlanUseCase(repo).execute("plan-1", "ENVIAR")
    ).rejects.toThrow(BusinessRuleError);
  });

  it("[negativo] lanza ValidationError al OBSERVAR sin observaciones", async () => {
    const plan = planBorrador();
    plan.enviarRevision();
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(plan) });

    await expect(
      new CambiarAprobacionPlanUseCase(repo).execute("plan-1", "OBSERVAR", "")
    ).rejects.toThrow(ValidationError);
  });

  it("[negativo] lanza ValidationError al OBSERVAR sin pasar observaciones (cubre rama ?? '')", async () => {
    const plan = planBorrador();
    plan.enviarRevision();
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(plan) });

    await expect(
      new CambiarAprobacionPlanUseCase(repo).execute("plan-1", "OBSERVAR")
    ).rejects.toThrow(ValidationError);
  });
});
