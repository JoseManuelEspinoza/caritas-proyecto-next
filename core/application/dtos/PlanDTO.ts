import { Plan, PlanActivity } from '../../domain/entities/plan/Plan'

export interface CrearPlanInput {
  parroquia: string
  titulo: string
  objetivos: string
  fechaInicio: string
  fechaFin: string
  responsable: string
}

export interface PlanOutput {
  id: string
  parroquia: string
  titulo: string
  objetivos: string
  fechaInicio: string
  fechaFin: string
  responsable: string
  avance: number
  actividades: PlanActivity[]
}

export function toPlanOutput(p: Plan): PlanOutput {
  const s = p.snapshot
  return {
    id: s.id,
    parroquia: s.parroquia,
    titulo: s.titulo,
    objetivos: s.objetivos,
    fechaInicio: s.fechaInicio,
    fechaFin: s.fechaFin,
    responsable: s.responsable,
    avance: p.avance,
    actividades: s.actividades,
  }
}
