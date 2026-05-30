import { randomUUID } from 'crypto'
import { Guard } from '../../shared/Guard'
import { BusinessRuleError } from '../../errors/DomainError'
import { IncidentStatus, assertTransicion } from './IncidentStatus'
import {
  AffectedPerson,
  BrigadistaAsignado,
  HistoryAction,
  HistoryEntry,
  InfoPrimeraVisita,
  InfoSeguimiento,
  InformeAtencion,
  InformeEvaluacion,
  NivelAfectacion,
  ReportadoPor,
} from './types'

export interface IncidentProps {
  id: string
  name: string
  responsible: string
  category: string
  status: IncidentStatus
  fuenteAlerta: string[]
  fuenteOtra?: string
  startDate: string
  endDate: string
  horaSuceso?: string
  description?: string
  causaSuceso?: string
  location: string
  pais?: string
  region?: string
  distrito?: string
  parroquia?: string
  direccion?: string
  referencia?: string
  lat?: number
  lng?: number
  participants: number
  nivelAfectacion?: NivelAfectacion
  numFamiliasAfectadas?: number
  gruposVulnerables: string[]
  necesidadesUrgentes: string[]
  uploadedFiles: string[]
  reportadoPor?: ReportadoPor
  evidenciasPorFuente?: { fuente: string; archivos: string[] }[]
  brigadistaAsignado?: BrigadistaAsignado
  brigadistasSeguimiento?: BrigadistaAsignado[]
  notasAsignacion?: string
  asignadoTipo?: 'brigadista' | 'especialista'
  infoPrimeraVisita?: InfoPrimeraVisita
  informeEvaluacion?: InformeEvaluacion
  informeAtencion?: InformeAtencion
  seguimientos: InfoSeguimiento[]
  affectedPeople: AffectedPerson[]
  history: HistoryEntry[]
  createdBy?: string
  updatedBy?: string
  createdAt: string
  updatedAt: string
}

/**
 * Agregado raíz del núcleo GRD.
 *
 * Encapsula el ciclo de vida completo de un incidente: desde el registro
 * (ABIERTO) hasta el cierre (CERRADO), pasando por la evaluación social, la
 * decisión del Comité de Donaciones, la atención y el seguimiento.
 *
 * TODA transición de estado pasa por aquí y:
 *   1. valida que sea legal con `assertTransicion` (tabla en IncidentStatus.ts),
 *   2. registra una entrada inmutable en el historial de auditoría.
 *
 * Es TypeScript puro: no conoce Prisma ni Next.js.
 */
export class Incident {
  private constructor(private props: IncidentProps) {}

  /** Crea un incidente NUEVO (siempre nace en ABIERTO). */
  static crear(input: {
    id: string
    name: string
    responsible: string
    category: string
    location: string
    startDate: string
    endDate: string
    createdBy?: string
    reportadoPor?: ReportadoPor
    description?: string
    fuenteAlerta?: string[]
    parroquia?: string
    distrito?: string
  }): Incident {
    Guard.required(input.id, 'id')
    Guard.minLength(input.name, 3, 'name')
    Guard.required(input.category, 'category')
    Guard.required(input.location, 'location')

    const now = new Date().toISOString()
    const incident = new Incident({
      id: input.id,
      name: input.name,
      responsible: input.responsible,
      category: input.category,
      status: 'ABIERTO',
      fuenteAlerta: input.fuenteAlerta ?? [],
      startDate: input.startDate,
      endDate: input.endDate,
      description: input.description,
      location: input.location,
      parroquia: input.parroquia,
      distrito: input.distrito,
      participants: 0,
      gruposVulnerables: [],
      necesidadesUrgentes: [],
      uploadedFiles: [],
      reportadoPor: input.reportadoPor,
      seguimientos: [],
      affectedPeople: [],
      history: [],
      createdBy: input.createdBy,
      updatedBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
    })
    incident.appendHistory({
      user: input.createdBy ?? 'sistema',
      action: 'CREACION',
      newStatus: 'ABIERTO',
      notes: 'Registro inicial del incidente.',
    })
    return incident
  }

  /** Reconstruye desde persistencia (usado por el mapper). */
  static desdePersistencia(props: IncidentProps): Incident {
    return new Incident(props)
  }

  // ── Transiciones del flujo ────────────────────────────────────────────────

  /** ABIERTO → ASIGNADO: el especialista asigna un brigadista de campo. */
  asignarBrigadista(
    brig: Omit<BrigadistaAsignado, 'fechaAsignacion' | 'asignadoPor'>,
    asignadoPor: string,
    notasAsignacion?: string,
  ): void {
    this.transicion('ASIGNADO', asignadoPor, 'ASIGNACION', notasAsignacion)
    this.props.brigadistaAsignado = {
      ...brig,
      fechaAsignacion: new Date().toISOString(),
      asignadoPor,
    }
    this.props.asignadoTipo = 'brigadista'
    this.props.notasAsignacion = notasAsignacion
  }

  /** ABIERTO → ASIGNADO: el especialista se autoasigna el levantamiento. */
  autoAsignarEspecialista(especialista: { displayName: string; parroquia?: string; celular?: string }, notas?: string): void {
    this.transicion('ASIGNADO', especialista.displayName, 'ASIGNACION', notas)
    this.props.brigadistaAsignado = {
      id: `ESP-${randomUUID().slice(0, 8)}`,
      nombre: especialista.displayName,
      parroquia: especialista.parroquia ?? '',
      celular: especialista.celular,
      fechaAsignacion: new Date().toISOString(),
      asignadoPor: especialista.displayName,
    }
    this.props.asignadoTipo = 'especialista'
  }

  /** ASIGNADO → DATA_RECOPILADA: se registra el levantamiento de campo. */
  registrarLevantamiento(
    info: InfoPrimeraVisita,
    triggeredBy: string,
    extras?: { affectedPeople?: AffectedPerson[]; uploadedFiles?: string[]; numFamiliasAfectadas?: number },
  ): void {
    this.transicion('DATA_RECOPILADA', triggeredBy, 'CAMPO', 'Levantamiento de campo completado.')
    this.props.infoPrimeraVisita = info
    if (extras?.affectedPeople) this.props.affectedPeople = extras.affectedPeople
    if (extras?.uploadedFiles) this.props.uploadedFiles = [...this.props.uploadedFiles, ...extras.uploadedFiles]
    if (extras?.numFamiliasAfectadas !== undefined) this.props.numFamiliasAfectadas = extras.numFamiliasAfectadas
  }

  /** DATA_RECOPILADA → EN_EVALUACION: el especialista emite el informe social. */
  generarInformeEvaluacion(informe: InformeEvaluacion, triggeredBy: string): void {
    if (!this.props.infoPrimeraVisita) {
      throw new BusinessRuleError('No se puede emitir el informe sin levantamiento de campo previo.')
    }
    this.transicion('EN_EVALUACION', triggeredBy, 'INFORME_EVALUACION', 'Informe de evaluación social enviado al Comité.')
    this.props.informeEvaluacion = informe
  }

  /** OBSERVADO → EN_EVALUACION: el especialista corrige y reenvía. */
  corregirYReenviar(informe: InformeEvaluacion, triggeredBy: string): void {
    this.transicion('EN_EVALUACION', triggeredBy, 'INFORME_EVALUACION', 'Informe corregido y reenviado al Comité.')
    this.props.informeEvaluacion = informe
  }

  /** EN_EVALUACION → APROBADO: el Comité aprueba la donación. */
  aprobar(user: string, notas: string): void {
    this.transicion('APROBADO', user, 'APROBACION', notas)
  }

  /** EN_EVALUACION → OBSERVADO: el Comité devuelve con observaciones. */
  observar(user: string, observaciones: string): void {
    Guard.required(observaciones, 'observaciones')
    this.transicion('OBSERVADO', user, 'OBSERVACION', observaciones)
    if (this.props.informeEvaluacion) {
      this.props.informeEvaluacion.observacionesComite = observaciones
    }
  }

  /** EN_EVALUACION | OBSERVADO → RECHAZADO: el Comité rechaza el caso. */
  rechazar(user: string, notas: string): void {
    this.transicion('RECHAZADO', user, 'RECHAZO', notas)
  }

  /** APROBADO → ATENDIDO: el especialista registra la entrega de la donación. */
  marcarAtendido(informe: InformeAtencion, triggeredBy: string): void {
    this.transicion('ATENDIDO', triggeredBy, 'ATENCION', 'Donación entregada.')
    this.props.informeAtencion = informe
  }

  /** ATENDIDO → SEGUIMIENTO_ABIERTO: se asigna el equipo de seguimiento. */
  asignarSeguimiento(
    brigadistas: Omit<BrigadistaAsignado, 'fechaAsignacion' | 'asignadoPor'>[],
    asignadoPor: string,
    notas?: string,
  ): void {
    if (brigadistas.length === 0) {
      throw new BusinessRuleError('Debe asignar al menos un brigadista de seguimiento.')
    }
    this.transicion('SEGUIMIENTO_ABIERTO', asignadoPor, 'SEGUIMIENTO', notas)
    const now = new Date().toISOString()
    this.props.brigadistasSeguimiento = brigadistas.map((b) => ({ ...b, fechaAsignacion: now, asignadoPor }))
  }

  /** SEGUIMIENTO_ABIERTO → SEGUIMIENTO_ABIERTO: registra una visita de seguimiento. */
  registrarSeguimiento(seg: Omit<InfoSeguimiento, 'id'>): void {
    if (this.props.status !== 'SEGUIMIENTO_ABIERTO') {
      throw new BusinessRuleError('Solo se puede registrar seguimiento en un caso con seguimiento abierto.')
    }
    this.props.seguimientos.push({ ...seg, id: randomUUID() })
    this.appendHistory({ user: seg.registradoPor, action: 'SEGUIMIENTO', notes: 'Seguimiento registrado.' })
    this.touch(seg.registradoPor)
  }

  /** SEGUIMIENTO_ABIERTO → CERRADO: el especialista cierra el caso. */
  cerrar(user: string, notas: string): void {
    this.transicion('CERRADO', user, 'CIERRE', notas)
  }

  // ── Internos ──────────────────────────────────────────────────────────────

  private transicion(destino: IncidentStatus, user: string, action: HistoryAction, notes?: string): void {
    assertTransicion(this.props.status, destino)
    const prev = this.props.status
    this.props.status = destino
    this.appendHistory({ user, action, prevStatus: prev, newStatus: destino, notes })
    this.touch(user)
  }

  private appendHistory(entry: Omit<HistoryEntry, 'id' | 'timestamp'>): void {
    this.props.history.push({ ...entry, id: randomUUID(), timestamp: new Date().toISOString() })
  }

  private touch(user: string): void {
    this.props.updatedAt = new Date().toISOString()
    this.props.updatedBy = user
  }

  // ── Lectura ────────────────────────────────────────────────────────────────
  get id(): string { return this.props.id }
  get status(): IncidentStatus { return this.props.status }
  /** Snapshot de solo lectura de todas las propiedades (para mappers/DTOs). */
  get snapshot(): Readonly<IncidentProps> { return this.props }
}
