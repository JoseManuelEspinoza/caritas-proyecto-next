import { IncidentStatus } from './IncidentStatus'

/**
 * Tipos de apoyo del agregado Incident.
 *
 * Las sub-entidades de lista (AffectedPerson, HistoryEntry) y los documentos
 * anidados (informes) viven aquí como tipos de dominio puros. Los informes son
 * "value objects documentales": se editan como un todo y se persisten en
 * columnas jsonb.
 */

export type TipoDocumento = 'DNI' | 'CE' | 'PASAPORTE' | 'OTRO'
export type Genero = 'MASCULINO' | 'FEMENINO' | 'OTRO' | 'PREFIERE_NO_DECIR'
export type NivelAfectacion = 'LEVE' | 'MODERADO' | 'SEVERO'
export type EvalRiesgoSocial = 'Bajo' | 'Medio' | 'Alto' | 'Crítico'
export type NivelUrgencia = 'Inmediata' | 'Alta' | 'Media' | 'Baja'

export type HistoryAction =
  | 'CREACION'
  | 'ASIGNACION'
  | 'CAMPO'
  | 'INFORME_EVALUACION'
  | 'APROBACION'
  | 'OBSERVACION'
  | 'RECHAZO'
  | 'ATENCION'
  | 'SEGUIMIENTO'
  | 'CIERRE'
  | 'EDICION'
  | 'CAMBIO_ESTADO'
  | 'EVIDENCIA_ADJUNTA'

export interface AffectedPerson {
  id: string
  tipoDoc: TipoDocumento
  dni: string
  nombre: string
  apellidoPaterno?: string
  apellidoMaterno?: string
  edad: string
  fechaNacimiento?: string
  genero?: Genero
  celular: string
  parentesco?: string
  familiaId?: string
  familiaNombre?: string
  situacionActual?: string
}

export interface HistoryEntry {
  id: string
  user: string
  userRole?: string
  timestamp: string
  action: HistoryAction
  prevStatus?: IncidentStatus
  newStatus?: IncidentStatus
  field?: string
  prevValue?: string
  newValue?: string
  notes?: string
}

export interface ReportadoPor {
  nombreCompleto: string
  dni: string
  telefono: string
}

export interface BrigadistaAsignado {
  id: string
  nombre: string
  parroquia: string
  celular?: string
  fechaAsignacion: string
  asignadoPor: string
}

export interface InfoPrimeraVisita {
  fechaVisita: string
  responsable: string
  motivoVisita: string
  objetivos: string
  descripcionEvento: string
  condHabitabilidad: {
    agua: boolean
    electricidad: boolean
    refugio: boolean
    saludAmbiental: boolean
    acceso: boolean
  }
  nivelVulnerabilidad: 'Bajo' | 'Medio' | 'Alto' | 'Crítico'
  necesidadesPrioritarias: string[]
  recomendacion: string
  observaciones?: string
}

export interface KitItem {
  codigo: string
  descripcion: string
  cantidad: number
}

export interface KitTipo {
  id: string
  nombre: string
  items: KitItem[]
}

export interface AsignacionFamilia {
  familiaId: string
  familiaNombre: string
  observacionesEspecialista?: string
  kits: KitTipo[]
}

export interface InformeEvaluacion {
  fecha: string
  elaboradoPor: string
  emitidoPor?: string
  visadoPor?: string
  oficina?: string
  motivo?: string
  dirigidoA?: string[]
  objetivoGeneral?: string
  objetivosEspecificos?: string[]
  analisisSituacion: string
  hallazgosTexto?: string
  hallazgosBullets?: string[]
  asignacionPorFamilia?: AsignacionFamilia[]
  conclusiones?: string
  nivelUrgencia?: NivelUrgencia
  tipoIntervencion?: string
  descripcionAyuda?: string
  criteriosPriorizacion?: string[]
  recomendacionComite?: string
  observacionesComite?: string
  observaciones?: string
}

export interface InformeAtencion {
  fecha: string
  elaboradoPor: string
  descripcionEntrega: string
  itemsEntregados: string[]
  montoTotal?: number
  beneficiariosAtendidos: number
  observaciones?: string
}

export interface InfoSeguimiento {
  id: string
  fecha: string
  medio: 'Presencial' | 'Telefónico' | 'Parroquial' | 'Municipal'
  situacion: 'Mejoró' | 'Igual' | 'Empeoró'
  usoAyuda: 'Adecuado' | 'Parcial' | 'No verificable'
  necesidadesPersistentes: string[]
  derivaciones: string[]
  recomendacion: 'Cierre' | 'Nueva entrega' | 'Derivación' | 'Acompañamiento'
  estado: 'Abierto' | 'En seguimiento' | 'Cerrado'
  notas?: string
  registradoPor: string
}
