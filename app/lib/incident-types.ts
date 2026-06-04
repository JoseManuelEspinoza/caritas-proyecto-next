export type IncidentStatus =
  | "ABIERTO"
  | "ASIGNADO"
  | "DATA RECOPILADA"
  | "EN EVALUACION"
  | "APROBADO"
  | "OBSERVADO"
  | "RECHAZADO"
  | "ATENDIDO"
  | "SEGUIMIENTO ABIERTO"
  | "CERRADO";

export type TipoDocumento = "DNI" | "CE" | "Pasaporte" | "Otro";
export type Genero = "Masculino" | "Femenino" | "Otro" | "Prefiere no decir";
export type NivelAfectacion = "Leve" | "Moderado" | "Severo";
export type EvalRiesgoSocial = "Bajo" | "Medio" | "Alto" | "Crítico";
export type NivelUrgencia = "Inmediata" | "Alta" | "Media" | "Baja";
export type TipoIntervencion =
  | "Donación en especie"
  | "Donación económica"
  | "Derivación institucional"
  | "Acompañamiento pastoral"
  | "No aplica";

export interface AffectedPerson {
  id: string;
  tipoDoc: TipoDocumento;
  dni: string;
  nombre: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  edad: string;
  fechaNacimiento?: string;
  genero?: Genero;
  celular: string;
  parentesco?: string;
  familiaId?: string;
  familiaNombre?: string;
  situacionActual?: string;
}

export type HistoryAction =
  | "creación"
  | "asignación"
  | "campo"
  | "informe_evaluacion"
  | "aprobacion"
  | "observacion"
  | "rechazo"
  | "atencion"
  | "seguimiento"
  | "cierre"
  | "edición"
  | "cambio_estado"
  | "evidencia_adjunta"
  | "primera_visita";

export interface HistoryEntry {
  id: string;
  user: string;
  userRole?: string;
  timestamp: string;
  action: HistoryAction;
  prevStatus?: IncidentStatus;
  newStatus?: IncidentStatus;
  field?: string;
  prevValue?: string;
  newValue?: string;
  notes?: string;
}

export interface BrigadistaAsignado {
  id: string;
  nombre: string;
  parroquia: string;
  celular?: string;
  fechaAsignacion: string;
  asignadoPor: string;
}

export interface InfoPrimeraVisita {
  fechaVisita: string;
  responsable: string;
  motivoVisita: string;
  objetivos: string;
  descripcionEvento: string;
  condHabitabilidad: {
    agua: boolean;
    electricidad: boolean;
    refugio: boolean;
    saludAmbiental: boolean;
    acceso: boolean;
  };
  nivelVulnerabilidad: "Bajo" | "Medio" | "Alto" | "Crítico";
  necesidadesPrioritarias: string[];
  recomendacion: string;
  observaciones?: string;
}

export interface KitItem {
  codigo: string;
  descripcion: string;
  cantidad: number;
}

export interface KitTipo {
  id: string;
  nombre: string;
  items: KitItem[];
}

export interface AsignacionFamilia {
  familiaId: string;
  familiaNombre: string;
  observacionesEspecialista?: string;
  kits: KitTipo[];
}

export interface InformeEvaluacion {
  fecha: string;
  elaboradoPor: string;
  visadoPor?: string;
  oficina?: string;
  motivo?: string;
  dirigidoA?: string[];
  emitidoPor?: string;
  objetivoGeneral?: string;
  objetivosEspecificos?: string[];
  analisisSituacion: string;
  hallazgosTexto?: string;
  hallazgosBullets?: string[];
  asignacionPorFamilia?: AsignacionFamilia[];
  kits?: KitTipo[];
  conclusiones?: string;
  nivelUrgencia?: NivelUrgencia;
  tipoIntervencion?: TipoIntervencion;
  descripcionAyuda?: string;
  criteriosPriorizacion?: string[];
  recomendacionComite?: string;
  observacionesComite?: string;
  observaciones?: string;
}

export interface InformeAtencion {
  fecha: string;
  elaboradoPor: string;
  descripcionEntrega: string;
  itemsEntregados: string[];
  montoTotal?: number;
  beneficiariosAtendidos: number;
  observaciones?: string;
}

export interface InfoSeguimiento {
  id: string;
  fecha: string;
  medio: "Presencial" | "Telefónico" | "Parroquial" | "Municipal";
  situacion: "Mejoró" | "Igual" | "Empeoró";
  usoAyuda: "Adecuado" | "Parcial" | "No verificable";
  necesidadesPersistentes: string[];
  derivaciones: string[];
  recomendacion: "Cierre" | "Nueva entrega" | "Derivación" | "Acompañamiento";
  estado: "Abierto" | "En seguimiento" | "Cerrado";
  notas?: string;
  registradoPor: string;
}

export interface ReportadoPor {
  nombreCompleto: string;
  dni: string;
  telefono: string;
}

export interface Incident {
  id: string;
  name: string;
  responsible: string;
  category: string;
  fuenteAlerta?: string[];
  fuenteOtra?: string;
  startDate: string;
  endDate: string;
  horaSuceso?: string;
  status: IncidentStatus;
  location: string;
  participants: number;
  description?: string;
  causaSuceso?: string;
  pais?: string;
  region?: string;
  distrito?: string;
  parroquia?: string;
  direccion?: string;
  referencia?: string;
  coordenadas?: { lat: number; lng: number };
  nivelAfectacion?: NivelAfectacion;
  numFamiliasAfectadas?: number;
  gruposVulnerables?: string[];
  necesidadesUrgentes?: string[];
  affectedPeople?: AffectedPerson[];
  uploadedFiles?: string[];
  evidenciasPorFuente?: { fuente: string; archivos: string[] }[];
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: string;
  history?: HistoryEntry[];
  reportadoPor?: ReportadoPor;
  notasAsignacion?: string;
  asignadoTipo?: "brigadista" | "especialista";
  brigadistaAsignado?: BrigadistaAsignado;
  infoPrimeraVisita?: InfoPrimeraVisita;
  informeEvaluacionPdf?: string;
  informeEvaluacion?: InformeEvaluacion;
  informeAtencion?: InformeAtencion;
  informeAtencionPdf?: string;
  brigadistasSeguimiento?: BrigadistaAsignado[];
  seguimientos?: InfoSeguimiento[];
  informeSeguimientoPdf?: string;
}
