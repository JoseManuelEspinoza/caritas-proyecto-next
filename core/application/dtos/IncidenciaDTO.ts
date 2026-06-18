/**
 * Tipos de entrada del módulo de Incidencias. Son planos (cruzan la frontera
 * presentación ↔ aplicación) y reflejan los formularios de la UI de intermedia.
 * Se re-exportan desde app/actions/incidents.ts para no romper los imports de la UI.
 */

export type PersonaForm = {
  id: string;
  tipoDoc: string;
  dni: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  edad: string;
  genero: string;
  celular: string;
  parentesco: string;
  situacionActual: string;
  familiaId?: string;
};

export type FamiliaForm = {
  id: string;
  nombre: string;
  observaciones?: string;
};

/** Evidencia ya subida a almacenamiento (S3); se persiste como EvidenciaGRD. */
export type EvidenciaInput = {
  key: string; // object key en el bucket
  nombreArchivo: string;
  formato: string | null;
  tamano: number | null;
  descripcion?: string | null; // fuente / nota
};

export type CreateIncidenteData = {
  // Sección 1 - Informante
  reportaTipoDoc?: string; // "DNI" | "Carnet de Extranjería" | "Pasaporte" | "Otro" (default DNI)
  reportaDni: string;
  reportaNombre: string;
  reportaTel: string;
  reportaRol: string;
  fechaReporte: string;
  // Sección 2 - Evento
  fechaSuceso: string;
  horaSuceso: string;
  categoria: string;
  pais: string;
  region: string;
  distrito: string;
  parroquia: string;
  direccion: string;
  referencia: string;
  // Sección 3 - Descripción
  descripcion: string;
  causa: string;
  // Sección 4 - Personas
  familias: FamiliaForm[];
  personas: PersonaForm[];
  // Sección 5 - Necesidades
  necesidades: string[];
  necesidadOtra: string;
  necesidadesObs: string;
  // Sección 7 - Estimación
  nivelAfectacion: string;
  // Ubicación geográfica (RF07 GPS / RF08 manual)
  lat?: number | null;
  lng?: number | null;
  // Sección 6 - Evidencias ya subidas a S3
  evidencias?: EvidenciaInput[];
  numAfectadosReportado?: number | null;
  origenRegistro?: string | null;
};

export type InfoCampoData = {
  fechaVisita: string;
  responsable: string;
  descripcionEvento: string;
  nivelVulnerabilidad: string;
  necesidadesPrioritarias: string[];
  recomendacion: string;
  observaciones?: string;
  notasFamilias?: { id: string; nota: string }[];
  condHabitabilidad: Record<string, boolean>;
};

/** Artículo asignado dentro de un kit. */
export type ArticuloKit = { codigo: string; descripcion: string; cantidad: number };
/** Kit asignado a una familia/persona. `idKit` referencia al KitEmergencia real (trazabilidad/stock). */
export type KitAsignado = { tipoKit: string; idKit?: string; articulos: ArticuloKit[] };
/** Asignación de ayuda por familia/persona. */
export type AsignacionFamilia = {
  refId: string; // id de grupo familiar o persona
  nombre: string;
  kits: KitAsignado[];
};

export type InformeEvaluacionData = {
  analisisSituacion: string;
  hallazgosTexto: string;
  conclusiones: string;
  nivelUrgencia: string;
  tipoIntervencion: string;
  recomendacionComite: string;
  // Campos enriquecidos del informe del Especialista (se serializan en el JSON)
  motivo?: string;
  dirigidoA?: string;
  objetivoGeneral?: string;
  objetivosEspecificos?: string[];
  hallazgosClave?: string[];
  asignacionFamilias?: AsignacionFamilia[];
  evidenciasSeleccionadas?: string[]; // IDs de evidencias incluidas en el informe
  documentoAdjunto?: string | null;   // URL o clave S3 del documento de respaldo
};

export type CorreccionData = {
  analisisSituacion: string;
  hallazgosTexto: string;
  conclusiones: string;
  recomendacionComite: string;
};

export type AtencionData = {
  tipoAyuda: string;
  descripcionAyuda: string;
  lugarEntrega: string;
  observaciones?: string;
  /** Fecha de entrega en formato ISO. Si se omite, se usa la fecha actual. */
  fechaEntrega?: string;
};

export type SeguimientoData = {
  situacion: string;
  descripcion: string;
  necesidadesPendientes?: string;
  recomendaciones?: string;
  observaciones?: string;
  /** Fecha del seguimiento en formato ISO. Si se omite, se usa la fecha actual. */
  fecha?: string;
};
