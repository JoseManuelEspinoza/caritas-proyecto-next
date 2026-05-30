import { Dni } from '../value-objects/Dni'
import { Guard } from '../shared/Guard'
import { BusinessRuleError } from '../errors/DomainError'

/** Rol pastoral del brigadista dentro de la estructura de Cáritas. */
export type RolPastoral = 'AGENTE_PASTORAL' | 'VOLUNTARIO' | 'BRIGADISTA'

export type EstadoCertificacion = 'VIGENTE' | 'POR_VENCER' | 'VENCIDA'

export interface CertificacionBrigadista {
  id?: string
  cursoCodigo: string
  cursoNombre: string
  fechaEmision: string
  estado: EstadoCertificacion
  notaFinal?: number
}

export interface BrigadistaProps {
  id: string
  dni: Dni
  nombres: string
  apellidoPaterno: string
  apellidoMaterno: string
  celular: string
  email?: string
  parroquia: string
  rolPastoral: RolPastoral
  fechaIngreso: Date
  disponible: boolean
  activo: boolean
  certificado: boolean
  horasFormacion: number
  cursosEnProceso: string[]
  notas?: string
  certificaciones: CertificacionBrigadista[]
}

/**
 * Entidad del padrón de brigadistas.
 *
 * Modela a un agente pastoral / voluntario / brigadista de Cáritas. Las reglas
 * que protege: un brigadista solo puede marcarse como disponible si está activo;
 * al certificarse acumula horas de formación y queda habilitado.
 *
 * TypeScript puro — sin Prisma ni Next.js.
 */
export class Brigadista {
  private constructor(private props: BrigadistaProps) {}

  static crear(input: {
    id: string
    dni: Dni
    nombres: string
    apellidoPaterno: string
    apellidoMaterno: string
    celular: string
    parroquia: string
    rolPastoral: RolPastoral
    email?: string
    fechaIngreso?: Date
  }): Brigadista {
    Guard.minLength(input.nombres, 2, 'nombres')
    Guard.required(input.apellidoPaterno, 'apellidoPaterno')
    Guard.required(input.parroquia, 'parroquia')
    Guard.required(input.celular, 'celular')

    return new Brigadista({
      id: input.id,
      dni: input.dni,
      nombres: input.nombres,
      apellidoPaterno: input.apellidoPaterno,
      apellidoMaterno: input.apellidoMaterno,
      celular: input.celular,
      email: input.email,
      parroquia: input.parroquia,
      rolPastoral: input.rolPastoral,
      fechaIngreso: input.fechaIngreso ?? new Date(),
      disponible: true,
      activo: true,
      certificado: false,
      horasFormacion: 0,
      cursosEnProceso: [],
      certificaciones: [],
    })
  }

  static desdePersistencia(props: BrigadistaProps): Brigadista {
    return new Brigadista(props)
  }

  /** Activa/desactiva al brigadista. Al desactivar deja de estar disponible. */
  toggleActivo(): void {
    this.props.activo = !this.props.activo
    if (!this.props.activo) this.props.disponible = false
  }

  /** Marca disponibilidad para asignaciones. Regla: debe estar activo. */
  marcarDisponible(disponible: boolean): void {
    if (disponible && !this.props.activo) {
      throw new BusinessRuleError('Un brigadista inactivo no puede marcarse como disponible.')
    }
    this.props.disponible = disponible
  }

  /** Registra una certificación obtenida y habilita al brigadista. */
  certificar(cert: CertificacionBrigadista, horas = 0): void {
    Guard.required(cert.cursoCodigo, 'cursoCodigo')
    this.props.certificaciones.push(cert)
    this.props.certificado = true
    this.props.horasFormacion += Math.max(0, horas)
    this.props.cursosEnProceso = this.props.cursosEnProceso.filter((c) => c !== cert.cursoCodigo)
  }

  get id(): string { return this.props.id }
  get snapshot(): Readonly<BrigadistaProps> { return this.props }
  get nombreCompleto(): string {
    return `${this.props.nombres} ${this.props.apellidoPaterno} ${this.props.apellidoMaterno}`.trim()
  }
}
