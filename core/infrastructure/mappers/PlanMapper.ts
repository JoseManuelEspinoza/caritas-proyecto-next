import { Prisma } from '@prisma/client'
import type { Plan as PlanRow, PlanActivity as ActivityRow } from '@prisma/client'
import { Plan, ActivityState } from '../../domain/entities/plan/Plan'

type PlanRowFull = PlanRow & { actividades: ActivityRow[] }
const iso = (d: Date) => d.toISOString()

export const PlanMapper = {
  toDomain(row: PlanRowFull): Plan {
    return Plan.desdePersistencia({
      id: row.id,
      parroquia: row.parroquia,
      titulo: row.titulo,
      objetivos: row.objetivos,
      fechaInicio: iso(row.fechaInicio),
      fechaFin: iso(row.fechaFin),
      responsable: row.responsable,
      actividades: row.actividades.map((a) => ({
        id: a.id,
        descripcion: a.descripcion,
        responsable: a.responsable,
        fechaInicio: iso(a.fechaInicio),
        fechaFin: iso(a.fechaFin),
        estado: a.estado as ActivityState,
      })),
    })
  },

  toScalarData(p: Plan): Prisma.PlanUncheckedCreateInput {
    const s = p.snapshot
    return {
      id: s.id,
      parroquia: s.parroquia,
      titulo: s.titulo,
      objetivos: s.objetivos,
      fechaInicio: new Date(s.fechaInicio),
      fechaFin: new Date(s.fechaFin),
      responsable: s.responsable,
    }
  },

  actividadesToPersistence(p: Plan): Prisma.PlanActivityCreateWithoutPlanInput[] {
    return p.snapshot.actividades.map((a) => ({
      id: a.id,
      descripcion: a.descripcion,
      responsable: a.responsable,
      fechaInicio: new Date(a.fechaInicio),
      fechaFin: new Date(a.fechaFin),
      estado: a.estado,
    }))
  },
}
