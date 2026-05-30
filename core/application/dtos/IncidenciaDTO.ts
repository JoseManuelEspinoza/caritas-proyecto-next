/**
 * Tipos de entrada del módulo de Incidencias. Son planos (cruzan la frontera
 * presentación ↔ aplicación) y reflejan los formularios de la UI de intermedia.
 * Se re-exportan desde app/actions/incidents.ts para no romper los imports de la UI.
 */

export type PersonaForm = {
  id: string
  tipoDoc: string
  dni: string
  nombre: string
  apellidoPaterno: string
  apellidoMaterno: string
  edad: string
  genero: string
  celular: string
  parentesco: string
  situacionActual: string
  familiaId?: string
}

export type FamiliaForm = {
  id: string
  nombre: string
  observaciones?: string
}

export type CreateIncidenteData = {
  // Sección 1 - Informante
  reportaDni: string
  reportaNombre: string
  reportaTel: string
  reportaRol: string
  fechaReporte: string
  // Sección 2 - Evento
  fechaSuceso: string
  horaSuceso: string
  categoria: string
  pais: string
  region: string
  distrito: string
  parroquia: string
  direccion: string
  referencia: string
  // Sección 3 - Descripción
  descripcion: string
  causa: string
  // Sección 4 - Personas
  familias: FamiliaForm[]
  personas: PersonaForm[]
  // Sección 5 - Necesidades
  necesidades: string[]
  necesidadOtra: string
  necesidadesObs: string
  // Sección 7 - Estimación
  nivelAfectacion: string
}

export type InfoCampoData = {
  fechaVisita: string
  responsable: string
  descripcionEvento: string
  nivelVulnerabilidad: string
  necesidadesPrioritarias: string[]
  recomendacion: string
  observaciones?: string
  condHabitabilidad: Record<string, boolean>
}

export type InformeEvaluacionData = {
  analisisSituacion: string
  hallazgosTexto: string
  conclusiones: string
  nivelUrgencia: string
  tipoIntervencion: string
  recomendacionComite: string
}

export type CorreccionData = {
  analisisSituacion: string
  hallazgosTexto: string
  conclusiones: string
  recomendacionComite: string
}

export type AtencionData = {
  tipoAyuda: string
  descripcionAyuda: string
  lugarEntrega: string
  observaciones?: string
}

export type SeguimientoData = {
  situacion: string
  descripcion: string
  necesidadesPendientes?: string
  recomendaciones?: string
}
