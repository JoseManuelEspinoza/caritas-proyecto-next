import { verifySession } from '@/app/lib/dal'
import { prisma } from '@/app/lib/prisma'
import { toFrontendRole } from '@/app/lib/roles'
import { GrdList, type IncidenteItem } from '@/app/ui/grd/grd-list'

export default async function GrdPage() {
  const session = await verifySession()
  const role = toFrontendRole(session.role)

  // Brigadistas: solo ven sus incidentes asignados
  let whereClause: any = { deletedAt: null }

  if (role === 'brigadista') {
    const usuarioGRD = await prisma.usuarioGRD.findUnique({
      where: { idCredencial: session.userId },
      select: { idUsuarioGRD: true },
    })
    if (usuarioGRD) {
      const brigadista = await prisma.brigadistaParroquial.findFirst({
        where: { idUsuarioGRD: usuarioGRD.idUsuarioGRD },
        select: { idBrigadistaParroquial: true },
      })
      if (brigadista) {
        whereClause = {
          ...whereClause,
          asignaciones: {
            some: { idBrigadistaParroquial: brigadista.idBrigadistaParroquial },
          },
        }
      }
    }
  }

  const incidencias = await prisma.incidencia.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    select: {
      idIncidencia: true,
      codigoCaso: true,
      tituloIncidencia: true,
      tipoEvento: true,
      estadoActual: true,
      direccionEvento: true,
      fechaRegistro: true,
      parroquia: { select: { nombre: true } },
      gruposFamiliares: {
        select: {
          _count: { select: { personas: true } },
        },
      },
      asignaciones: {
        where: { estadoAsignacion: 'ASIGNADA' },
        select: {
          brigadista: { select: { nombres: true, apellidos: true } },
        },
      },
    },
  })

  const items: IncidenteItem[] = incidencias.map((i) => ({
    idIncidencia: i.idIncidencia,
    codigoCaso: i.codigoCaso,
    tituloIncidencia: i.tituloIncidencia,
    tipoEvento: i.tipoEvento,
    estadoActual: i.estadoActual,
    direccionEvento: i.direccionEvento,
    fechaRegistro: i.fechaRegistro.toISOString(),
    parroquia: i.parroquia?.nombre ?? null,
    totalFamilias: i.gruposFamiliares.length,
    totalPersonas: i.gruposFamiliares.reduce((s, g) => s + g._count.personas, 0),
    brigadistas: i.asignaciones.map((a) =>
      `${a.brigadista.nombres} ${a.brigadista.apellidos ?? ''}`.trim()
    ),
  }))

  return <GrdList items={items} role={role} />
}
