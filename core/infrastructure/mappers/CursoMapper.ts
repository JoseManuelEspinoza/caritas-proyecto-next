import { Prisma } from '@prisma/client'
import type { CursoCapacitacion as CursoRow } from '@prisma/client'
import { Curso, EstadoCurso } from '../../domain/entities/curso/Curso'

const iso = (d: Date | null) => (d ? d.toISOString() : null)

export const CursoMapper = {
  toDomain(row: CursoRow): Curso {
    return Curso.desdePersistencia({
      id: row.idCursoCapacitacion,
      idUsuarioResponsableGRD: row.idUsuarioResponsableGRD,
      idInstitucionAliada: row.idInstitucionAliada,
      codigoCurso: row.codigoCurso,
      nombreCurso: row.nombreCurso,
      descripcion: row.descripcion,
      fechaPublicacion: iso(row.fechaPublicacion),
      fechaCierre: iso(row.fechaCierre),
      duracionEstimadaHoras: row.duracionEstimadaHoras,
      modalidadGeneral: row.modalidadGeneral,
      estadoCurso: row.estadoCurso as EstadoCurso,
    })
  },

  toPersistence(c: Curso): Prisma.CursoCapacitacionUncheckedCreateInput {
    const s = c.snapshot
    return {
      idCursoCapacitacion: s.id,
      idUsuarioResponsableGRD: s.idUsuarioResponsableGRD,
      idInstitucionAliada: s.idInstitucionAliada ?? undefined,
      codigoCurso: s.codigoCurso ?? undefined,
      nombreCurso: s.nombreCurso,
      descripcion: s.descripcion ?? undefined,
      fechaPublicacion: s.fechaPublicacion ? new Date(s.fechaPublicacion) : undefined,
      fechaCierre: s.fechaCierre ? new Date(s.fechaCierre) : undefined,
      duracionEstimadaHoras: s.duracionEstimadaHoras ?? undefined,
      modalidadGeneral: s.modalidadGeneral,
      estadoCurso: s.estadoCurso,
    }
  },
}
