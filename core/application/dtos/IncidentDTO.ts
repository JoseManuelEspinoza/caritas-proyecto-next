import { Incident } from '../../domain/entities/incident/Incident'
import { IncidentStatus } from '../../domain/entities/incident/IncidentStatus'
import { AffectedPerson, HistoryEntry, ReportadoPor } from '../../domain/entities/incident/types'

/** Entrada para registrar un incidente nuevo. */
export interface RegistrarIncidenteInput {
  name: string
  responsible: string
  category: string
  location: string
  startDate: string
  endDate: string
  description?: string
  fuenteAlerta?: string[]
  parroquia?: string
  distrito?: string
  reportadoPor?: ReportadoPor
  createdBy?: string
}

/** Resumen plano para listados. */
export interface IncidentSummary {
  id: string
  name: string
  category: string
  status: IncidentStatus
  location: string
  parroquia?: string
  participants: number
  startDate: string
  updatedAt: string
  brigadistaAsignado?: string
}

/** Vista completa (detalle) plana de un incidente. */
export interface IncidentDetail extends IncidentSummary {
  responsible: string
  description?: string
  affectedPeople: AffectedPerson[]
  history: HistoryEntry[]
  numFamiliasAfectadas?: number
  hasInformeEvaluacion: boolean
  hasInformeAtencion: boolean
  seguimientosCount: number
}

export function toIncidentSummary(i: Incident): IncidentSummary {
  const s = i.snapshot
  return {
    id: s.id,
    name: s.name,
    category: s.category,
    status: s.status,
    location: s.location,
    parroquia: s.parroquia,
    participants: s.participants,
    startDate: s.startDate,
    updatedAt: s.updatedAt,
    brigadistaAsignado: s.brigadistaAsignado?.nombre,
  }
}

export function toIncidentDetail(i: Incident): IncidentDetail {
  const s = i.snapshot
  return {
    ...toIncidentSummary(i),
    responsible: s.responsible,
    description: s.description,
    affectedPeople: s.affectedPeople,
    history: s.history,
    numFamiliasAfectadas: s.numFamiliasAfectadas,
    hasInformeEvaluacion: !!s.informeEvaluacion,
    hasInformeAtencion: !!s.informeAtencion,
    seguimientosCount: s.seguimientos.length,
  }
}
