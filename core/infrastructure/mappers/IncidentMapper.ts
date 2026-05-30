import { Prisma } from '@prisma/client'
import type {
  Incident as IncidentRow,
  AffectedPerson as AffectedPersonRow,
  HistoryEntry as HistoryEntryRow,
} from '@prisma/client'
import { Incident, IncidentProps } from '../../domain/entities/incident/Incident'
import {
  AffectedPerson,
  BrigadistaAsignado,
  HistoryEntry,
  InfoPrimeraVisita,
  InfoSeguimiento,
  InformeAtencion,
  InformeEvaluacion,
  NivelAfectacion,
  ReportadoPor,
} from '../../domain/entities/incident/types'
import { IncidentStatus } from '../../domain/entities/incident/IncidentStatus'

type IncidentRowFull = IncidentRow & {
  affectedPeople: AffectedPersonRow[]
  history: HistoryEntryRow[]
}

/** Casts seguros entre el JsonValue de Prisma y los tipos de dominio. */
const asJson = <T>(v: Prisma.JsonValue | null): T | undefined =>
  v === null || v === undefined ? undefined : (v as unknown as T)
const toJson = (v: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull =>
  v === undefined || v === null ? Prisma.JsonNull : (v as Prisma.InputJsonValue)
const iso = (d: Date): string => d.toISOString()

/**
 * Mapper del agregado Incident.
 *
 * Traduce entre la fila de Prisma (con relaciones `affectedPeople`/`history` y
 * columnas jsonb para los informes) y la entidad de dominio. Es el único lugar
 * que conoce ambas formas.
 */
export const IncidentMapper = {
  toDomain(row: IncidentRowFull): Incident {
    const props: IncidentProps = {
      id: row.id,
      name: row.name,
      responsible: row.responsible,
      category: row.category,
      status: row.status as IncidentStatus,
      fuenteAlerta: row.fuenteAlerta,
      fuenteOtra: row.fuenteOtra ?? undefined,
      startDate: iso(row.startDate),
      endDate: iso(row.endDate),
      horaSuceso: row.horaSuceso ?? undefined,
      description: row.description ?? undefined,
      causaSuceso: row.causaSuceso ?? undefined,
      location: row.location,
      pais: row.pais ?? undefined,
      region: row.region ?? undefined,
      distrito: row.distrito ?? undefined,
      parroquia: row.parroquia ?? undefined,
      direccion: row.direccion ?? undefined,
      referencia: row.referencia ?? undefined,
      lat: row.lat ?? undefined,
      lng: row.lng ?? undefined,
      participants: row.participants,
      nivelAfectacion: (row.nivelAfectacion as NivelAfectacion | null) ?? undefined,
      numFamiliasAfectadas: row.numFamiliasAfectadas ?? undefined,
      gruposVulnerables: row.gruposVulnerables,
      necesidadesUrgentes: row.necesidadesUrgentes,
      uploadedFiles: row.uploadedFiles,
      reportadoPor: asJson<ReportadoPor>(row.reportadoPor),
      evidenciasPorFuente: asJson<{ fuente: string; archivos: string[] }[]>(row.evidenciasPorFuente),
      brigadistaAsignado: asJson<BrigadistaAsignado>(row.brigadistaAsignado),
      brigadistasSeguimiento: asJson<BrigadistaAsignado[]>(row.brigadistasSeguimiento),
      notasAsignacion: row.notasAsignacion ?? undefined,
      asignadoTipo: (row.asignadoTipo as 'brigadista' | 'especialista' | null) ?? undefined,
      infoPrimeraVisita: asJson<InfoPrimeraVisita>(row.infoPrimeraVisita),
      informeEvaluacion: asJson<InformeEvaluacion>(row.informeEvaluacion),
      informeAtencion: asJson<InformeAtencion>(row.informeAtencion),
      seguimientos: asJson<InfoSeguimiento[]>(row.seguimientos) ?? [],
      affectedPeople: row.affectedPeople.map(IncidentMapper.personToDomain),
      history: row.history.map(IncidentMapper.historyToDomain),
      createdBy: row.createdBy ?? undefined,
      updatedBy: row.updatedBy ?? undefined,
      createdAt: iso(row.createdAt),
      updatedAt: iso(row.updatedAt),
    }
    return Incident.desdePersistencia(props)
  },

  personToDomain(p: AffectedPersonRow): AffectedPerson {
    return {
      id: p.id,
      tipoDoc: p.tipoDoc as AffectedPerson['tipoDoc'],
      dni: p.dni,
      nombre: p.nombre,
      apellidoPaterno: p.apellidoPaterno ?? undefined,
      apellidoMaterno: p.apellidoMaterno ?? undefined,
      edad: p.edad,
      fechaNacimiento: p.fechaNacimiento ?? undefined,
      genero: (p.genero as AffectedPerson['genero']) ?? undefined,
      celular: p.celular,
      parentesco: p.parentesco ?? undefined,
      familiaId: p.familiaId ?? undefined,
      familiaNombre: p.familiaNombre ?? undefined,
      situacionActual: p.situacionActual ?? undefined,
    }
  },

  historyToDomain(h: HistoryEntryRow): HistoryEntry {
    return {
      id: h.id,
      user: h.user,
      userRole: h.userRole ?? undefined,
      timestamp: iso(h.timestamp),
      action: h.action as HistoryEntry['action'],
      prevStatus: (h.prevStatus as IncidentStatus | null) ?? undefined,
      newStatus: (h.newStatus as IncidentStatus | null) ?? undefined,
      field: h.field ?? undefined,
      prevValue: h.prevValue ?? undefined,
      newValue: h.newValue ?? undefined,
      notes: h.notes ?? undefined,
    }
  },

  /** Campos escalares + jsonb del incidente (sin relaciones). */
  toScalarData(i: Incident): Prisma.IncidentUncheckedCreateInput {
    const s = i.snapshot
    return {
      id: s.id,
      name: s.name,
      responsible: s.responsible,
      category: s.category,
      status: s.status,
      fuenteAlerta: s.fuenteAlerta,
      fuenteOtra: s.fuenteOtra,
      startDate: new Date(s.startDate),
      endDate: new Date(s.endDate),
      horaSuceso: s.horaSuceso,
      description: s.description,
      causaSuceso: s.causaSuceso,
      location: s.location,
      pais: s.pais,
      region: s.region,
      distrito: s.distrito,
      parroquia: s.parroquia,
      direccion: s.direccion,
      referencia: s.referencia,
      lat: s.lat,
      lng: s.lng,
      participants: s.participants,
      nivelAfectacion: s.nivelAfectacion,
      numFamiliasAfectadas: s.numFamiliasAfectadas,
      gruposVulnerables: s.gruposVulnerables,
      necesidadesUrgentes: s.necesidadesUrgentes,
      uploadedFiles: s.uploadedFiles,
      reportadoPor: toJson(s.reportadoPor),
      evidenciasPorFuente: toJson(s.evidenciasPorFuente),
      brigadistaAsignado: toJson(s.brigadistaAsignado),
      brigadistasSeguimiento: toJson(s.brigadistasSeguimiento),
      notasAsignacion: s.notasAsignacion,
      asignadoTipo: s.asignadoTipo,
      infoPrimeraVisita: toJson(s.infoPrimeraVisita),
      informeEvaluacion: toJson(s.informeEvaluacion),
      informeAtencion: toJson(s.informeAtencion),
      seguimientos: toJson(s.seguimientos),
      createdBy: s.createdBy,
      updatedBy: s.updatedBy,
      // createdAt/updatedAt los gestiona Prisma (@default(now) / @updatedAt).
    }
  },

  personToPersistence(p: AffectedPerson): Prisma.AffectedPersonUncheckedCreateWithoutIncidentInput {
    return {
      id: p.id,
      tipoDoc: p.tipoDoc,
      dni: p.dni,
      nombre: p.nombre,
      apellidoPaterno: p.apellidoPaterno,
      apellidoMaterno: p.apellidoMaterno,
      edad: p.edad,
      fechaNacimiento: p.fechaNacimiento,
      genero: p.genero,
      celular: p.celular,
      parentesco: p.parentesco,
      familiaId: p.familiaId,
      familiaNombre: p.familiaNombre,
      situacionActual: p.situacionActual,
    }
  },

  historyToPersistence(h: HistoryEntry): Prisma.HistoryEntryUncheckedCreateWithoutIncidentInput {
    return {
      id: h.id,
      user: h.user,
      userRole: h.userRole,
      timestamp: new Date(h.timestamp),
      action: h.action,
      prevStatus: h.prevStatus,
      newStatus: h.newStatus,
      field: h.field,
      prevValue: h.prevValue,
      newValue: h.newValue,
      notes: h.notes,
    }
  },
}
