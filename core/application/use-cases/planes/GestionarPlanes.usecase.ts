import { randomUUID } from 'crypto'
import { PlanTrabajo, DatosEditables } from '../../../domain/entities/plan/PlanTrabajo'
import { IPlanRepository } from '../../../domain/repositories/IPlanRepository'
import { NotFoundError } from '../../../domain/errors/DomainError'

export interface PlanOutput {
  id: string
  codigoPlan: string | null
  idParroquia: string
  nombrePlan: string
  objetivos: string | null
  estadoAprobacion: string
  fechaInicio: string | null
  fechaFin: string | null
  observaciones: string | null
}

function toOutput(p: PlanTrabajo): PlanOutput {
  const s = p.snapshot
  return {
    id: s.id,
    codigoPlan: s.codigoPlan ?? null,
    idParroquia: s.idParroquia,
    nombrePlan: s.nombrePlan,
    objetivos: s.objetivos ?? null,
    estadoAprobacion: s.estadoAprobacion,
    fechaInicio: s.fechaInicio ?? null,
    fechaFin: s.fechaFin ?? null,
    observaciones: s.observaciones ?? null,
  }
}

async function cargar(repo: IPlanRepository, id: string): Promise<PlanTrabajo> {
  const p = await repo.findById(id)
  if (!p) throw new NotFoundError('Plan no encontrado.')
  return p
}

/** Crea un plan de trabajo GRD (código PLAN-YYYY-NNNN, estado BORRADOR). */
export class CrearPlanUseCase {
  constructor(private readonly repo: IPlanRepository) {}
  async execute(input: { idParroquia: string; idUsuarioResponsableGRD: string; nombrePlan: string; diagnosticoRiesgo?: string; objetivos?: string; fechaInicio?: string; fechaFin?: string }): Promise<PlanOutput> {
    const codigoPlan = await this.repo.nextCodigo()
    const plan = PlanTrabajo.crear({ id: randomUUID(), codigoPlan, ...input })
    await this.repo.save(plan)
    return toOutput(plan)
  }
}

export class ListarPlanesUseCase {
  constructor(private readonly repo: IPlanRepository) {}
  async execute(): Promise<PlanOutput[]> {
    return (await this.repo.findAll()).map(toOutput)
  }
}

export class ActualizarPlanUseCase {
  constructor(private readonly repo: IPlanRepository) {}
  async execute(id: string, datos: DatosEditables): Promise<PlanOutput> {
    const plan = await cargar(this.repo, id)
    plan.actualizar(datos)
    await this.repo.update(plan)
    return toOutput(plan)
  }
}

/** Cambia el estado de aprobación (enviar a revisión / aprobar / observar). */
export class CambiarAprobacionPlanUseCase {
  constructor(private readonly repo: IPlanRepository) {}
  async execute(id: string, accion: 'ENVIAR' | 'APROBAR' | 'OBSERVAR', observaciones?: string): Promise<PlanOutput> {
    const plan = await cargar(this.repo, id)
    if (accion === 'ENVIAR') plan.enviarRevision()
    else if (accion === 'APROBAR') plan.aprobar()
    else plan.observar(observaciones ?? '')
    await this.repo.update(plan)
    return toOutput(plan)
  }
}
