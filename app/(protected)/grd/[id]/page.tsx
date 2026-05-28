import { notFound } from 'next/navigation'
import { verifySession } from '@/app/lib/dal'
import { prisma } from '@/app/lib/prisma'
import { toFrontendRole } from '@/app/lib/roles'
import { IncidentDetail } from '@/app/ui/grd/incident-detail'

export default async function IncidentePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await verifySession()
  const role = toFrontendRole(session.role)

  const inc = await prisma.incidencia.findUnique({
    where: { idIncidencia: id, deletedAt: null },
    include: {
      parroquia: { select: { nombre: true } },
      aviso: {
        select: { nombreInformante: true, telefonoInformante: true, descripcion: true },
      },
      asignaciones: {
        where: { estadoAsignacion: 'ASIGNADA' },
        include: {
          brigadista: {
            select: {
              idBrigadistaParroquial: true,
              nombres: true,
              apellidos: true,
              celular: true,
              parroquia: { select: { nombre: true } },
            },
          },
        },
      },
      gruposFamiliares: {
        include: { personas: true },
      },
      informes: {
        orderBy: { fechaElaboracion: 'desc' },
        select: {
          idInforme: true,
          tituloInforme: true,
          tipoInforme: true,
          resumen: true,
          contenido: true,
          estadoInforme: true,
          fechaElaboracion: true,
        },
      },
      seguimientos: {
        orderBy: { fechaSeguimiento: 'desc' },
        select: {
          idSeguimiento: true,
          situacion: true,
          descripcion: true,
          necesidadesPendientes: true,
          recomendaciones: true,
          fechaSeguimiento: true,
        },
      },
      entregasAyuda: {
        orderBy: { fechaEntrega: 'desc' },
        select: {
          idEntrega: true,
          tipoAyuda: true,
          descripcionAyuda: true,
          lugarEntrega: true,
          fechaEntrega: true,
          observaciones: true,
        },
      },
      historialEstados: {
        orderBy: { fechaCambio: 'desc' },
        select: {
          estadoAnterior: true,
          estadoNuevo: true,
          motivoCambio: true,
          observaciones: true,
          fechaCambio: true,
        },
      },
      solicitudesAyuda: {
        orderBy: { fechaSolicitud: 'desc' },
        take: 1,
        select: {
          estadoSolicitud: true,
          resultadoEvaluacion: true,
          observaciones: true,
          fechaEvaluacion: true,
        },
      },
    },
  })

  if (!inc) notFound()

  // Brigadistas disponibles para asignación
  const brigadistasDisp = await prisma.brigadistaParroquial.findMany({
    where: { estado: 'ACTIVO', disponibilidad: 'DISPONIBLE' },
    select: {
      idBrigadistaParroquial: true,
      nombres: true,
      apellidos: true,
      celular: true,
      parroquia: { select: { nombre: true } },
    },
    take: 30,
  })

  // Serializar para el cliente
  const data = {
    idIncidencia: inc.idIncidencia,
    codigoCaso: inc.codigoCaso,
    tituloIncidencia: inc.tituloIncidencia,
    tipoEvento: inc.tipoEvento,
    estadoActual: inc.estadoActual,
    direccionEvento: inc.direccionEvento,
    descripcionEvento: inc.descripcionEvento,
    gravedad: inc.gravedad,
    fechaRegistro: inc.fechaRegistro.toISOString(),
    parroquia: inc.parroquia?.nombre ?? null,
    aviso: inc.aviso
      ? {
          nombreInformante: inc.aviso.nombreInformante,
          telefonoInformante: inc.aviso.telefonoInformante,
          descripcion: inc.aviso.descripcion,
        }
      : null,
    asignaciones: inc.asignaciones.map((a) => ({
      brigadistaId: a.brigadista.idBrigadistaParroquial,
      nombres: a.brigadista.nombres,
      apellidos: a.brigadista.apellidos,
      celular: a.brigadista.celular,
      parroquia: a.brigadista.parroquia?.nombre ?? null,
      fechaAsignacion: a.fechaAsignacion.toISOString(),
    })),
    gruposFamiliares: inc.gruposFamiliares.map((g) => ({
      id: g.idGrupoFamiliar,
      nombreReferencia: g.nombreReferencia,
      totalPersonas: g.personas.length,
    })),
    informes: inc.informes.map((i) => ({
      id: i.idInforme,
      titulo: i.tituloInforme,
      tipo: i.tipoInforme,
      resumen: i.resumen,
      contenido: i.contenido,
      estado: i.estadoInforme,
      fecha: i.fechaElaboracion.toISOString(),
    })),
    seguimientos: inc.seguimientos.map((s) => ({
      id: s.idSeguimiento,
      situacion: s.situacion,
      descripcion: s.descripcion,
      necesidadesPendientes: s.necesidadesPendientes,
      recomendaciones: s.recomendaciones,
      fecha: s.fechaSeguimiento.toISOString(),
    })),
    entregas: inc.entregasAyuda.map((e) => ({
      id: e.idEntrega,
      tipoAyuda: e.tipoAyuda,
      descripcionAyuda: e.descripcionAyuda,
      lugarEntrega: e.lugarEntrega,
      fecha: e.fechaEntrega?.toISOString() ?? null,
      observaciones: e.observaciones,
    })),
    historial: inc.historialEstados.map((h) => ({
      estadoAnterior: h.estadoAnterior,
      estadoNuevo: h.estadoNuevo,
      motivoCambio: h.motivoCambio,
      observaciones: h.observaciones,
      fecha: h.fechaCambio.toISOString(),
    })),
    solicitudComite: inc.solicitudesAyuda[0]
      ? {
          estado: inc.solicitudesAyuda[0].estadoSolicitud,
          resultado: inc.solicitudesAyuda[0].resultadoEvaluacion,
          observaciones: inc.solicitudesAyuda[0].observaciones,
          fecha: inc.solicitudesAyuda[0].fechaEvaluacion?.toISOString() ?? null,
        }
      : null,
    brigadistasDisponibles: brigadistasDisp.map((b) => ({
      id: b.idBrigadistaParroquial,
      nombres: b.nombres,
      apellidos: b.apellidos,
      celular: b.celular,
      parroquia: b.parroquia?.nombre ?? null,
    })),
    role,
    userId: session.userId,
  }

  return <IncidentDetail data={data} />
}
