import { Incident } from '../entities/incident/Incident'
import { IncidentStatus } from '../entities/incident/IncidentStatus'

export interface IncidentFilter {
  status?: IncidentStatus
  category?: string
  search?: string
  /** Filtra por brigadista asignado (vista del brigadista). */
  brigadistaId?: string
}

/**
 * Contrato de persistencia del agregado Incident.
 *
 * `nextCorrelativo` delega en la infraestructura la generación del código
 * GRD-YYYY-NNNN (necesita contar los existentes en la base de datos).
 */
export interface IIncidentRepository {
  save(incident: Incident): Promise<void>
  update(incident: Incident): Promise<void>
  findById(id: string): Promise<Incident | null>
  findAll(filter?: IncidentFilter): Promise<Incident[]>
  /** Genera el siguiente código correlativo del año en curso. */
  nextCorrelativo(): Promise<string>
}
