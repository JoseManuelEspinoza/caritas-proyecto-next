import { Guard } from '../../shared/Guard'
import { BusinessRuleError } from '../../errors/DomainError'

export type SimulacroTipo = 'SISMO' | 'INCENDIO' | 'INUNDACION' | 'EVACUACION'

/** Programada → Asignada → Ejecutada → Observada → (corrección) → Ejecutada → Validada */
export type AccionStatus = 'PROGRAMADA' | 'ASIGNADA' | 'EJECUTADA' | 'OBSERVADA' | 'VALIDADA'

const TRANSICIONES: Record<AccionStatus, AccionStatus[]> = {
  PROGRAMADA: ['ASIGNADA'],
  ASIGNADA: ['EJECUTADA'],
  EJECUTADA: ['OBSERVADA', 'VALIDADA'],
  OBSERVADA: ['EJECUTADA'],
  VALIDADA: [],
}

export interface BrigadistaRef {
  id: string
  nombre: string
  parroquia?: string
}

export interface SimulacroProps {
  id: string
  parroquia: string
  tipo: SimulacroTipo
  fecha: string
  descripcion?: string
  status: AccionStatus
  creadoPor?: string
  brigadistasAsignados: BrigadistaRef[]
  indicaciones?: string
  documentosEspecialista: string[]
  evidenciasBrigadista: string[]
  notasBrigadista?: string
  comentarioObservacion?: string
}

/**
 * Acción preventiva / Simulacro.
 *
 * Modela el flujo de trabajo entre el especialista (programa, asigna, valida)
 * y el brigadista (ejecuta y reporta). Cada cambio de estado se valida contra
 * la tabla de transiciones.
 */
export class Simulacro {
  private constructor(private props: SimulacroProps) {}

  static crear(input: {
    id: string
    parroquia: string
    tipo: SimulacroTipo
    fecha: string
    descripcion?: string
    creadoPor?: string
  }): Simulacro {
    Guard.required(input.parroquia, 'parroquia')
    Guard.required(input.fecha, 'fecha')
    return new Simulacro({
      ...input,
      status: 'PROGRAMADA',
      brigadistasAsignados: [],
      documentosEspecialista: [],
      evidenciasBrigadista: [],
    })
  }

  static desdePersistencia(props: SimulacroProps): Simulacro {
    return new Simulacro(props)
  }

  /** PROGRAMADA → ASIGNADA: el especialista asigna el equipo e indicaciones. */
  asignar(brigadistas: BrigadistaRef[], indicaciones: string, documentos: string[]): void {
    if (brigadistas.length === 0) throw new BusinessRuleError('Debe asignar al menos un brigadista.')
    this.transicion('ASIGNADA')
    this.props.brigadistasAsignados = brigadistas
    this.props.indicaciones = indicaciones
    this.props.documentosEspecialista = documentos
  }

  /** ASIGNADA | OBSERVADA → EJECUTADA: el brigadista envía su reporte. */
  enviarReporte(evidencias: string[], notas: string): void {
    this.transicion('EJECUTADA')
    this.props.evidenciasBrigadista = evidencias
    this.props.notasBrigadista = notas
  }

  /** EJECUTADA → OBSERVADA: el especialista devuelve con observaciones. */
  observar(comentario: string): void {
    Guard.required(comentario, 'comentario')
    this.transicion('OBSERVADA')
    this.props.comentarioObservacion = comentario
  }

  /** EJECUTADA → VALIDADA: el especialista valida la ejecución. */
  validar(): void {
    this.transicion('VALIDADA')
  }

  private transicion(destino: AccionStatus): void {
    if (!TRANSICIONES[this.props.status].includes(destino)) {
      throw new BusinessRuleError(`Transición no permitida: ${this.props.status} → ${destino}.`)
    }
    this.props.status = destino
  }

  get id(): string { return this.props.id }
  get snapshot(): Readonly<SimulacroProps> { return this.props }
}
