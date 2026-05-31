import { verifySession } from '@/app/lib/dal'
import { toFrontendRole } from '@/app/lib/roles'
import { redirect } from 'next/navigation'
import { prisma } from '@/app/lib/prisma'
import { AuditoriaModule, type AuditEntry } from '@/app/ui/auditoria/auditoria-module'

export default async function AuditoriaPage() {
  const session = await verifySession()
  if (toFrontendRole(session.role) !== 'admin') redirect('/dashboard')

  // Reporte read-only: historial de cambios de estado de las incidencias.
  const rows = await prisma.historialEstadoIncidencia.findMany({
    orderBy: { fechaCambio: 'desc' },
    take: 200,
    include: { incidencia: { select: { codigoCaso: true, tituloIncidencia: true } } },
  })

  const entries: AuditEntry[] = rows.map((r) => ({
    id: r.idHistorial,
    fecha: r.fechaCambio.toISOString(),
    usuario: r.idUsuarioGRD ?? 'sistema',
    estadoAnterior: r.estadoAnterior,
    estadoNuevo: r.estadoNuevo,
    motivo: r.motivoCambio,
    casoCodigo: r.incidencia?.codigoCaso ?? null,
    casoTitulo: r.incidencia?.tituloIncidencia ?? null,
  }))

  return <AuditoriaModule entries={entries} />
}
