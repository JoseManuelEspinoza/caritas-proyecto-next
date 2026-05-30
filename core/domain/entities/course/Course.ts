import { Guard } from '../../shared/Guard'
import { BusinessRuleError, ValidationError } from '../../errors/DomainError'

export type CertState = 'APROBADO' | 'NO_APROBADO' | 'PENDIENTE'
export type AttendanceState = 'Presente' | 'Ausente' | 'Tardanza' | 'Justificado'

export interface SessionMaterial {
  id: string
  nombre: string
  tipo: 'documento' | 'video' | 'enlace'
  url?: string
  archivo?: string
  fechaSubida: string
}

export interface CourseSession {
  id: string
  fecha: string
  tema: string
  materiales: SessionMaterial[]
}

export interface CourseParticipant {
  id: string
  brigadistaId: string
  nombreCompleto: string
  parroquia: string
  rol: string
  evalInicial?: number
  evalFinal?: number
  certState: CertState
  attendance: Record<string, AttendanceState>
}

export interface CourseProps {
  id: string
  nombre: string
  modalidad: string
  zoomLink?: string
  fechaInicio: string
  fechaFin: string
  responsable: string
  descripcion?: string
  sesiones: CourseSession[]
  participantes: CourseParticipant[]
}

/** Nota mínima para aprobar la evaluación final. */
const NOTA_APROBATORIA = 11

/**
 * Agregado de Capacitación y Certificación.
 *
 * Un curso asincrónico con sesiones, materiales y participantes. Reglas que
 * protege: no inscribir dos veces al mismo brigadista; la certificación final
 * se deriva de la nota (>= 11 aprueba).
 */
export class Course {
  private constructor(private props: CourseProps) {}

  static crear(input: {
    id: string
    nombre: string
    fechaInicio: string
    fechaFin: string
    responsable: string
    modalidad?: string
    descripcion?: string
  }): Course {
    Guard.minLength(input.nombre, 3, 'nombre')
    Guard.required(input.responsable, 'responsable')
    if (new Date(input.fechaFin) < new Date(input.fechaInicio)) {
      throw new ValidationError('La fecha de fin no puede ser anterior a la de inicio.')
    }
    return new Course({
      id: input.id,
      nombre: input.nombre,
      modalidad: input.modalidad ?? 'Asincrónica',
      fechaInicio: input.fechaInicio,
      fechaFin: input.fechaFin,
      responsable: input.responsable,
      descripcion: input.descripcion,
      sesiones: [],
      participantes: [],
    })
  }

  static desdePersistencia(props: CourseProps): Course {
    return new Course(props)
  }

  inscribir(p: Omit<CourseParticipant, 'certState'> & { certState?: CertState }): void {
    if (this.props.participantes.some((x) => x.brigadistaId === p.brigadistaId)) {
      throw new BusinessRuleError('El brigadista ya está inscrito en este curso.')
    }
    this.props.participantes.push({ ...p, certState: p.certState ?? 'PENDIENTE' })
  }

  registrarAsistencia(participantId: string, sessionId: string, estado: AttendanceState): void {
    const p = this.participante(participantId)
    p.attendance[sessionId] = estado
  }

  evaluar(participantId: string, campo: 'evalInicial' | 'evalFinal', valor: number): void {
    if (valor < 0 || valor > 20) throw new ValidationError('La nota debe estar entre 0 y 20.')
    const p = this.participante(participantId)
    p[campo] = valor
    // La certificación se deriva automáticamente de la nota final.
    if (campo === 'evalFinal') {
      p.certState = valor >= NOTA_APROBATORIA ? 'APROBADO' : 'NO_APROBADO'
    }
  }

  agregarSesion(sesion: CourseSession): void {
    this.props.sesiones.push(sesion)
  }

  private participante(id: string): CourseParticipant {
    const p = this.props.participantes.find((x) => x.id === id)
    if (!p) throw new BusinessRuleError('Participante no encontrado en el curso.')
    return p
  }

  get id(): string { return this.props.id }
  get snapshot(): Readonly<CourseProps> { return this.props }
}
