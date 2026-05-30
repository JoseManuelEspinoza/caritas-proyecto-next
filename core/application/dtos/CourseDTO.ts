import { Course, CourseParticipant, CourseSession } from '../../domain/entities/course/Course'

export interface CrearCursoInput {
  nombre: string
  fechaInicio: string
  fechaFin: string
  responsable: string
  modalidad?: string
  descripcion?: string
}

export interface CourseOutput {
  id: string
  nombre: string
  modalidad: string
  fechaInicio: string
  fechaFin: string
  responsable: string
  descripcion?: string
  totalSesiones: number
  totalParticipantes: number
  aprobados: number
  sesiones: CourseSession[]
  participantes: CourseParticipant[]
}

export function toCourseOutput(c: Course): CourseOutput {
  const s = c.snapshot
  return {
    id: s.id,
    nombre: s.nombre,
    modalidad: s.modalidad,
    fechaInicio: s.fechaInicio,
    fechaFin: s.fechaFin,
    responsable: s.responsable,
    descripcion: s.descripcion,
    totalSesiones: s.sesiones.length,
    totalParticipantes: s.participantes.length,
    aprobados: s.participantes.filter((p) => p.certState === 'APROBADO').length,
    sesiones: s.sesiones,
    participantes: s.participantes,
  }
}
