import { Plan, PlanActivity, ActivityState } from '../../../domain/entities/plan/Plan'
import { IPlanRepository } from '../../../domain/repositories/IPlanRepository'
import { NotFoundError } from '../../../domain/errors/DomainError'
import { CrearPlanInput, PlanOutput, toPlanOutput } from '../../dtos/PlanDTO'

async function cargar(repo: IPlanRepository, id: string): Promise<Plan> {
  const p = await repo.findById(id)
  if (!p) throw new NotFoundError(`No existe el plan ${id}.`)
  return p
}

/** Crea un plan GRD por parroquia (código PLAN-YYYY-NNNN). */
export class CrearPlanUseCase {
  constructor(private readonly repo: IPlanRepository) {}
  async execute(input: CrearPlanInput): Promise<PlanOutput> {
    const id = await this.repo.nextCorrelativo()
    const plan = Plan.crear({ id, ...input })
    await this.repo.save(plan)
    return toPlanOutput(plan)
  }
}

export class ListarPlanesUseCase {
  constructor(private readonly repo: IPlanRepository) {}
  async execute(): Promise<PlanOutput[]> {
    return (await this.repo.findAll()).map(toPlanOutput)
  }
}

/** Agrega una actividad al plan (nace en estado PENDIENTE). */
export class AgregarActividadUseCase {
  constructor(private readonly repo: IPlanRepository) {}
  async execute(planId: string, act: Omit<PlanActivity, 'id' | 'estado'>): Promise<PlanOutput> {
    const plan = await cargar(this.repo, planId)
    plan.agregarActividad(act)
    await this.repo.update(plan)
    return toPlanOutput(plan)
  }
}

/** Cambia el estado de una actividad (Pendiente / En proceso / Cumplido). */
export class CambiarEstadoActividadUseCase {
  constructor(private readonly repo: IPlanRepository) {}
  async execute(planId: string, actividadId: string, estado: ActivityState): Promise<PlanOutput> {
    const plan = await cargar(this.repo, planId)
    plan.cambiarEstadoActividad(actividadId, estado)
    await this.repo.update(plan)
    return toPlanOutput(plan)
  }
}

/** Elimina un plan. */
export class EliminarPlanUseCase {
  constructor(private readonly repo: IPlanRepository) {}
  async execute(id: string): Promise<void> {
    await cargar(this.repo, id)
    await this.repo.remove(id)
  }
}
