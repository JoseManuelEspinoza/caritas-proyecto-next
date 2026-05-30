import { randomUUID } from 'crypto'
import { Guard } from '../../shared/Guard'
import { BusinessRuleError, ValidationError } from '../../errors/DomainError'

export type ActivityState = 'PENDIENTE' | 'EN_PROCESO' | 'CUMPLIDO'

export interface PlanActivity {
  id: string
  descripcion: string
  responsable: string
  fechaInicio: string
  fechaFin: string
  estado: ActivityState
}

export interface PlanProps {
  id: string
  parroquia: string
  titulo: string
  objetivos: string
  fechaInicio: string
  fechaFin: string
  responsable: string
  actividades: PlanActivity[]
}

/**
 * Plan GRD por parroquia.
 *
 * Agrupa actividades con su propio ciclo (Pendiente → En proceso → Cumplido).
 * El avance del plan se deriva de cuántas actividades están cumplidas.
 */
export class Plan {
  private constructor(private props: PlanProps) {}

  static crear(input: {
    id: string
    parroquia: string
    titulo: string
    objetivos: string
    fechaInicio: string
    fechaFin: string
    responsable: string
  }): Plan {
    Guard.minLength(input.titulo, 3, 'titulo')
    Guard.required(input.parroquia, 'parroquia')
    if (new Date(input.fechaFin) < new Date(input.fechaInicio)) {
      throw new ValidationError('La fecha de fin no puede ser anterior a la de inicio.')
    }
    return new Plan({ ...input, actividades: [] })
  }

  static desdePersistencia(props: PlanProps): Plan {
    return new Plan(props)
  }

  agregarActividad(act: Omit<PlanActivity, 'id' | 'estado'>): void {
    Guard.required(act.descripcion, 'descripcion')
    this.props.actividades.push({ ...act, id: randomUUID(), estado: 'PENDIENTE' })
  }

  cambiarEstadoActividad(actividadId: string, estado: ActivityState): void {
    const act = this.props.actividades.find((a) => a.id === actividadId)
    if (!act) throw new BusinessRuleError('Actividad no encontrada en el plan.')
    act.estado = estado
  }

  /** Porcentaje de avance (0–100) según actividades cumplidas. */
  get avance(): number {
    if (this.props.actividades.length === 0) return 0
    const cumplidas = this.props.actividades.filter((a) => a.estado === 'CUMPLIDO').length
    return Math.round((cumplidas / this.props.actividades.length) * 100)
  }

  get id(): string { return this.props.id }
  get snapshot(): Readonly<PlanProps> { return this.props }
}
