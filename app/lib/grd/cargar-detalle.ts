import "server-only";
import { verifySession } from "@/app/lib/dal";
import { getUsuarioGRDId } from "@/app/lib/usuario-grd";
import { prisma } from "@/app/lib/prisma";
import { toFrontendRole } from "@/app/lib/roles";
import { presignGet, isS3Configured } from "@/app/lib/s3";
import type { IncidenciaDetalleOutput } from "@/core/application/dtos/IncidenciaDetalleDTO";

/**
 * Carga el read-model de detalle de una incidencia: ejecuta las consultas,
 * prefirma las evidencias de S3 y arma el DTO `IncidenciaDetalleOutput`.
 *
 * Vive en la capa de composición (app), no en `core`, porque el prefirmado de
 * S3 y la sesión son detalles de presentación/infra de Next; mantenerlo aquí
 * evita que el dominio dependa de `app/lib/s3`. La ruta solo decide el 404.
 */
export async function cargarDetalleIncidencia(
  id: string
): Promise<IncidenciaDetalleOutput | null> {
  const session = await verifySession();
  const role = toFrontendRole(session.role);
  const idUsuarioGRDActual = await getUsuarioGRDId();

  // Identificar si el usuario actual ES un brigadista asignado a este incidente
  let currentUserBrigadistaId: string | null = null;

  const currentUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { name: true },
  });
  const currentUserName = currentUser?.name ?? "Usuario";

  if (role === "brigadista") {
    const ugu = await prisma.usuarioGRD.findUnique({
      where: { idCredencial: session.userId },
      select: { idUsuarioGRD: true },
    });
    if (ugu) {
      const brig = await prisma.brigadistaParroquial.findFirst({
        where: { idUsuarioGRD: ugu.idUsuarioGRD },
        select: { idBrigadistaParroquial: true },
      });
      currentUserBrigadistaId = brig?.idBrigadistaParroquial ?? null;
    }
  }

  const inc = await prisma.incidencia.findUnique({
    where: { idIncidencia: id, deletedAt: null },
    include: {
      parroquia: { select: { nombre: true } },
      aviso: {
        select: {
          nombreInformante: true,
          telefonoInformante: true,
          descripcion: true,
          medioAviso: true,
        },
      },
      usuarioResponsable: {
        select: { idUsuarioGRD: true, nombres: true, apellidos: true, correoReferencia: true },
      },
      asignaciones: {
        where: { estadoAsignacion: "ASIGNADA" },
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
        include: {
          personas: {
            select: {
              idPersonaAfectada: true,
              nombres: true,
              apellidos: true,
              fechaNacimiento: true,
              sexo: true,
              tipoDocumento: true,
              numeroDocumento: true,
              parentesco: true,
              condicionEspecial: true,
              telefono: true,
            },
          },
        },
      },
      informes: {
        orderBy: { fechaElaboracion: "desc" },
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
        orderBy: { fechaSeguimiento: "desc" },
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
        orderBy: { fechaEntrega: "desc" },
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
        orderBy: { fechaCambio: "desc" },
        select: {
          estadoAnterior: true,
          estadoNuevo: true,
          motivoCambio: true,
          observaciones: true,
          fechaCambio: true,
        },
      },
      solicitudesAyuda: {
        orderBy: { fechaSolicitud: "desc" },
        take: 1,
        select: {
          estadoSolicitud: true,
          resultadoEvaluacion: true,
          observaciones: true,
          fechaEvaluacion: true,
        },
      },
    },
  });

  if (!inc) return null;

  // ¿Este brigadista está asignado a este incidente?
  const isBrigadistaAsignado = currentUserBrigadistaId
    ? inc.asignaciones.some((a) => a.brigadista.idBrigadistaParroquial === currentUserBrigadistaId)
    : false;

  // Catálogo de artículos por tipo de kit (solo catálogos "Kit de ...").
  const catalogoArticulos = await prisma.catalogoDetalleGRD.findMany({
    where: { estado: "ACTIVO", catalogo: { nombreCatalogo: { startsWith: "Kit de " } } },
    select: {
      codigo: true,
      valor: true,
      descripcion: true,
      catalogo: { select: { nombreCatalogo: true } },
    },
    orderBy: { codigo: "asc" },
    take: 300,
  });

  const parroquiasDisp = await prisma.parroquia.findMany({
    where: { estado: "ACTIVO" },
    select: { nombre: true },
    orderBy: { nombre: "asc" },
  });

  // Registro de TODAS las evidencias capturadas para esta incidencia
  // (EvidenciaGRD es polimórfica: idReferencia = idIncidencia).
  const evidenciasInc = await prisma.evidenciaGRD.findMany({
    where: { idReferencia: id, estado: "ACTIVO", deletedAt: null },
    orderBy: { fechaCarga: "desc" },
    select: {
      idEvidenciaGRD: true,
      nombreArchivo: true,
      urlArchivo: true,
      formatoArchivo: true,
      descripcion: true,
      fechaCarga: true,
      tamanoArchivo: true,
      latitud: true,
      longitud: true,
      usuarioCarga: { select: { nombres: true, apellidos: true } },
    },
  });

  // El campo urlArchivo guarda el object key de S3 → se prefirma un GET temporal
  // para mostrarlo. Si es una URL absoluta (datos demo/seed), se usa tal cual.
  const s3Ok = isS3Configured();
  const evidenciasMapped = await Promise.all(
    evidenciasInc.map(async (e) => {
      let url = e.urlArchivo;
      if (url && !/^https?:\/\//i.test(url) && s3Ok) {
        try {
          url = await presignGet(url);
        } catch {
          url = "#";
        }
      }
      return {
        id: e.idEvidenciaGRD,
        nombreArchivo: e.nombreArchivo,
        urlArchivo: url,
        formato: e.formatoArchivo,
        descripcion: e.descripcion,
        fecha: e.fechaCarga.toISOString(),
        tamano: e.tamanoArchivo,
        lat: e.latitud != null ? Number(e.latitud) : null,
        lng: e.longitud != null ? Number(e.longitud) : null,
        cargadoPor: e.usuarioCarga
          ? `${e.usuarioCarga.nombres} ${e.usuarioCarga.apellidos ?? ""}`.trim()
          : null,
      };
    })
  );

  const brigadistasDisp = await prisma.brigadistaParroquial.findMany({
    where: { estado: "ACTIVO" },
    select: {
      idBrigadistaParroquial: true,
      nombres: true,
      apellidos: true,
      celular: true,
      disponibilidad: true,
      parroquia: { select: { nombre: true } },
    },
    orderBy: { nombres: "asc" },
    take: 100,
  });

  // Kits reales del módulo de Kits de Emergencia (con composición y stock),
  // para que el informe asigne kits del sistema en lugar de una lista fija.
  const kitsEmergencia = await prisma.kitEmergencia.findMany({
    where: { estadoKit: "ACTIVO" },
    select: {
      idKitEmergencia: true,
      tipoKit: true,
      descripcion: true,
      stockActual: true,
      articulos: {
        orderBy: { orden: "asc" },
        select: { codigo: true, descripcion: true, cantidad: true },
      },
    },
    orderBy: { tipoKit: "asc" },
  });

  const data: IncidenciaDetalleOutput = {
    idIncidencia: inc.idIncidencia,
    codigoCaso: inc.codigoCaso,
    tituloIncidencia: inc.tituloIncidencia,
    tipoEvento: inc.tipoEvento,
    estadoActual: inc.estadoActual,
    direccionEvento: inc.direccionEvento,
    descripcionEvento: inc.descripcionEvento,
    gravedad: inc.gravedad,
    causa: inc.contextoCaso ?? null,
    reportanteRol: inc.aviso?.medioAviso ?? null,
    fechaRegistro: inc.fechaRegistro.toISOString(),
    parroquia: inc.parroquia?.nombre ?? null,
    idParroquia: inc.idParroquia ?? null,
    latitud: inc.latitud != null ? Number(inc.latitud) : null,
    longitud: inc.longitud != null ? Number(inc.longitud) : null,

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
      esResponsable: a.esResponsableEquipo,
      observaciones: a.observaciones,
    })),

    responsableGRD: inc.usuarioResponsable
      ? {
          id: inc.usuarioResponsable.idUsuarioGRD,
          nombre: `${inc.usuarioResponsable.nombres} ${inc.usuarioResponsable.apellidos ?? ""}`.trim(),
          correo: inc.usuarioResponsable.correoReferencia,
        }
      : null,

    instruccionesAsignacion:
      inc.asignaciones.find((a) => a.observaciones)?.observaciones ??
      inc.observacionesGenerales ??
      null,

    gruposFamiliares: inc.gruposFamiliares.map((g) => ({
      id: g.idGrupoFamiliar,
      nombreReferencia: g.nombreReferencia,
      totalPersonas: g.personas.length,
      personas: g.personas.map((p) => {
        // Calcular edad aproximada desde fechaNacimiento
        const edad = p.fechaNacimiento
          ? String(new Date().getFullYear() - new Date(p.fechaNacimiento).getFullYear())
          : null;
        return {
          id: p.idPersonaAfectada,
          nombres: p.nombres,
          apellidos: p.apellidos,
          edad,
          sexo: p.sexo,
          tipoDocumento: p.tipoDocumento,
          numeroDocumento: p.numeroDocumento,
          parentesco: p.parentesco,
          condicionEspecial: p.condicionEspecial,
          telefono: p.telefono,
        };
      }),
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
      disponibilidad: b.disponibilidad ?? "DISPONIBLE",
      parroquia: b.parroquia?.nombre ?? null,
    })),

    evidencias: evidenciasMapped,

    catalogoArticulos: catalogoArticulos.map((c) => ({
      codigo: c.codigo,
      valor: c.valor,
      descripcion: c.descripcion,
      catalogo: c.catalogo?.nombreCatalogo ?? "",
    })),

    kitsEmergencia: kitsEmergencia.map((k) => ({
      id: k.idKitEmergencia,
      tipoKit: k.tipoKit,
      descripcion: k.descripcion,
      stockActual: k.stockActual,
      articulos: k.articulos,
    })),

    parroquias: parroquiasDisp.map((p) => p.nombre),

    // Contexto del usuario actual
    role,
    userId: session.userId,
    idUsuarioGRDActual,
    currentUserName,
    currentUserBrigadistaId,
    isBrigadistaAsignado,
    isResponsableGRD:
      Boolean(idUsuarioGRDActual) && inc.usuarioResponsable?.idUsuarioGRD === idUsuarioGRDActual,
  };

  return data;
}
