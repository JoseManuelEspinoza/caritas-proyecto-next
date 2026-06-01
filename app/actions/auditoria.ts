'use server'

import { prisma } from '@/app/lib/prisma'
import { GRD_ACTIONS } from '@/app/lib/audit'

export type AuditEntry = {
  id: string
  timestamp: string
  user: string
  userRole?: string
  action: string
  entity: string
  entityId: string
  entityName: string
  prevStatus?: string
  newStatus?: string
  field?: string
  prevValue?: string
  newValue?: string
  notes?: string
  source: 'grd' | 'estado' | 'auth'
}

export async function getAuditEntries(): Promise<AuditEntry[]> {
  const [historialGRD, historialEstados, authLogs, usuariosGRD] = await Promise.all([
    prisma.historialAuditoriaGRD.findMany({
      include: { usuario: true, tipoAccion: true },
      orderBy: { fechaHora: 'desc' },
      take: 500,
    }),
    prisma.historialEstadoIncidencia.findMany({
      include: { incidencia: true },
      orderBy: { fechaCambio: 'desc' },
      take: 500,
    }),
    prisma.auditLog.findMany({
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    prisma.usuarioGRD.findMany({
      select: { idUsuarioGRD: true, nombres: true, apellidos: true },
    }),
  ])

  const userMap = new Map(
    usuariosGRD.map((u) => [u.idUsuarioGRD, `${u.nombres} ${u.apellidos ?? ''}`.trim()])
  )

  const entriesGRD: AuditEntry[] = historialGRD.map((h) => ({
    id: h.idAuditoriaGRD,
    timestamp: h.fechaHora.toISOString(),
    user: h.usuario
      ? `${h.usuario.nombres} ${h.usuario.apellidos ?? ''}`.trim()
      : (h.idUsuarioGRD ?? 'Sistema'),
    action: h.tipoAccion?.valor ?? (h.campoModificado ? 'edición' : h.estadoNuevo ? 'cambio_estado' : 'acción'),
    entity: h.modulo ?? 'GRD',
    entityId: h.idReferencia,
    entityName: h.modulo ?? 'Registro GRD',
    prevStatus: h.estadoAnterior ?? undefined,
    newStatus: h.estadoNuevo ?? undefined,
    field: h.campoModificado ?? undefined,
    prevValue: h.valorAnterior ?? undefined,
    newValue: h.valorNuevo ?? undefined,
    notes: h.observacion ?? undefined,
    source: 'grd',
  }))

  const entriesEstado: AuditEntry[] = historialEstados.map((h) => ({
    id: h.idHistorial,
    timestamp: h.fechaCambio.toISOString(),
    user: h.idUsuarioGRD ? (userMap.get(h.idUsuarioGRD) ?? h.idUsuarioGRD) : 'Sistema',
    action: 'cambio_estado',
    entity: 'Incidencia',
    entityId: h.idIncidencia,
    entityName: h.incidencia.tituloIncidencia ?? h.incidencia.codigoCaso ?? h.idIncidencia,
    prevStatus: h.estadoAnterior ?? undefined,
    newStatus: h.estadoNuevo,
    notes: h.observaciones ?? h.motivoCambio ?? undefined,
    source: 'estado',
  }))

  const ACTION_LABEL: Record<string, string> = {
    CREAR: 'creación',
    EDITAR: 'edición',
    ASIGNAR: 'asignación',
  }

  const entriesAuth: AuditEntry[] = authLogs
    .filter((h) => !GRD_ACTIONS.has(h.action))
    .map((h) => ({
      id: h.id,
      timestamp: h.createdAt.toISOString(),
      user: h.user?.name ?? h.user?.email ?? 'Desconocido',
      userRole: h.user?.role ?? undefined,
      action: h.action.toLowerCase().replace(/_/g, ' '),
      entity: 'Autenticación',
      entityId: h.userId ?? '',
      entityName: 'Sistema',
      notes: h.detail ? JSON.stringify(h.detail) : undefined,
      source: 'auth',
    }))

  const entriesCRUD: AuditEntry[] = authLogs
    .filter((h) => GRD_ACTIONS.has(h.action))
    .map((h) => {
      const d = (h.detail ?? {}) as Record<string, string>
      return {
        id: h.id,
        timestamp: h.createdAt.toISOString(),
        user: h.user?.name ?? h.user?.email ?? 'Sistema',
        userRole: h.user?.role ?? undefined,
        action: ACTION_LABEL[h.action] ?? h.action.toLowerCase(),
        entity: d.module ?? d.entity ?? 'GRD',
        entityId: d.entityId ?? '',
        entityName: d.entityName ?? '',
        field: d.field ?? undefined,
        prevValue: d.prevValue ?? undefined,
        newValue: d.newValue ?? undefined,
        notes: d.notes ?? undefined,
        source: 'grd',
      }
    })

  const all = [...entriesGRD, ...entriesEstado, ...entriesAuth, ...entriesCRUD]
  all.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
  return all
}
