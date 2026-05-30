import { Prisma } from '@prisma/client'
import type {
  Course as CourseRow,
  CourseSession as SessionRow,
  CourseParticipant as ParticipantRow,
} from '@prisma/client'
import { Course, AttendanceState, CertState, SessionMaterial } from '../../domain/entities/course/Course'

type CourseRowFull = CourseRow & { sesiones: SessionRow[]; participantes: ParticipantRow[] }

const iso = (d: Date) => d.toISOString()

/** Traduce entre la fila de Prisma (con sesiones y participantes) y el agregado Course. */
export const CourseMapper = {
  toDomain(row: CourseRowFull): Course {
    return Course.desdePersistencia({
      id: row.id,
      nombre: row.nombre,
      modalidad: row.modalidad,
      zoomLink: row.zoomLink ?? undefined,
      fechaInicio: iso(row.fechaInicio),
      fechaFin: iso(row.fechaFin),
      responsable: row.responsable,
      descripcion: row.descripcion ?? undefined,
      sesiones: row.sesiones.map((s) => ({
        id: s.id,
        fecha: iso(s.fecha),
        tema: s.tema,
        materiales: ((s.materiales as unknown as SessionMaterial[] | null) ?? []),
      })),
      participantes: row.participantes.map((p) => ({
        id: p.id,
        brigadistaId: p.brigadistaId,
        nombreCompleto: p.nombreCompleto,
        parroquia: p.parroquia,
        rol: p.rol,
        evalInicial: p.evalInicial ?? undefined,
        evalFinal: p.evalFinal ?? undefined,
        certState: p.certState as CertState,
        attendance: (p.attendance as unknown as Record<string, AttendanceState> | null) ?? {},
      })),
    })
  },

  toScalarData(c: Course): Prisma.CourseUncheckedCreateInput {
    const s = c.snapshot
    return {
      id: s.id,
      nombre: s.nombre,
      modalidad: s.modalidad,
      zoomLink: s.zoomLink,
      fechaInicio: new Date(s.fechaInicio),
      fechaFin: new Date(s.fechaFin),
      responsable: s.responsable,
      descripcion: s.descripcion,
    }
  },

  sesionesToPersistence(c: Course): Prisma.CourseSessionCreateWithoutCourseInput[] {
    return c.snapshot.sesiones.map((s) => ({
      id: s.id,
      fecha: new Date(s.fecha),
      tema: s.tema,
      materiales: s.materiales as unknown as Prisma.InputJsonValue,
    }))
  },

  participantesToPersistence(c: Course): Prisma.CourseParticipantCreateWithoutCourseInput[] {
    return c.snapshot.participantes.map((p) => ({
      id: p.id,
      brigadistaId: p.brigadistaId,
      nombreCompleto: p.nombreCompleto,
      parroquia: p.parroquia,
      rol: p.rol,
      evalInicial: p.evalInicial,
      evalFinal: p.evalFinal,
      certState: p.certState,
      attendance: p.attendance as unknown as Prisma.InputJsonValue,
    }))
  },
}
