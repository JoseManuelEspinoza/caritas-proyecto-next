import { Prisma } from '@prisma/client'
import type { Simulacro as SimulacroRow } from '@prisma/client'
import { Simulacro, SimulacroTipo, AccionStatus, BrigadistaRef } from '../../domain/entities/simulacro/Simulacro'

export const SimulacroMapper = {
  toDomain(row: SimulacroRow): Simulacro {
    return Simulacro.desdePersistencia({
      id: row.id,
      parroquia: row.parroquia,
      tipo: row.tipo as SimulacroTipo,
      fecha: row.fecha.toISOString(),
      descripcion: row.descripcion ?? undefined,
      status: row.status as AccionStatus,
      creadoPor: row.creadoPor ?? undefined,
      brigadistasAsignados: (row.brigadistasAsignados as unknown as BrigadistaRef[] | null) ?? [],
      indicaciones: row.indicaciones ?? undefined,
      documentosEspecialista: row.documentosEspecialista,
      evidenciasBrigadista: row.evidenciasBrigadista,
      notasBrigadista: row.notasBrigadista ?? undefined,
      comentarioObservacion: row.comentarioObservacion ?? undefined,
    })
  },

  toPersistence(s: Simulacro): Prisma.SimulacroUncheckedCreateInput {
    const p = s.snapshot
    return {
      id: p.id,
      parroquia: p.parroquia,
      tipo: p.tipo,
      fecha: new Date(p.fecha),
      descripcion: p.descripcion,
      status: p.status,
      creadoPor: p.creadoPor,
      brigadistasAsignados: p.brigadistasAsignados as unknown as Prisma.InputJsonValue,
      indicaciones: p.indicaciones,
      documentosEspecialista: p.documentosEspecialista,
      evidenciasBrigadista: p.evidenciasBrigadista,
      notasBrigadista: p.notasBrigadista,
      comentarioObservacion: p.comentarioObservacion,
    }
  },
}
