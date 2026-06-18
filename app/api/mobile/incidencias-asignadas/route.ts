import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { isS3Configured, presignGet } from "@/app/lib/s3";

export const dynamic = "force-dynamic";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

function requireMobileSyncKey(request: Request): NextResponse | null {
  const expected = process.env.MOBILE_SYNC_API_KEY?.trim();

  if (!expected) {
    return NextResponse.json(
      { ok: false, message: "Sincronización móvil no configurada." },
      { status: 503 }
    );
  }

  const received = request.headers.get("x-mobile-sync-key")?.trim() ?? "";

  if (received !== expected) {
    return jsonError("No autorizado.", 401);
  }

  return null;
}

function decimalToNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function parseTake(value: string | null): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) return 50;

  return Math.min(Math.max(Math.trunc(parsed), 1), 200);
}

export async function GET(request: Request) {
  const unauthorized = requireMobileSyncKey(request);
  if (unauthorized) return unauthorized;

  try {
    const { searchParams } = new URL(request.url);

    const FALLBACK_USUARIO_GRD = "d6deaf92-a3a3-46e6-a3ce-efed1a75c21d";

    const idUsuarioGRD =
      searchParams.get("idUsuarioGRD")?.trim() ||
      process.env.MOBILE_SYNC_USUARIO_GRD_ID?.trim() ||
      FALLBACK_USUARIO_GRD;
    const idBrigadistaParroquial = searchParams.get("idBrigadistaParroquial")?.trim();
    const estadoAsignacion = searchParams.get("estadoAsignacion")?.trim();
    const incluirCerradas = searchParams.get("incluirCerradas") === "true";
    const take = parseTake(searchParams.get("limit"));

    const brigadista = idBrigadistaParroquial
      ? await prisma.brigadistaParroquial.findUnique({
          where: { idBrigadistaParroquial },
          select: {
            idBrigadistaParroquial: true,
            idUsuarioGRD: true,
            idParroquia: true,
            nombres: true,
            apellidos: true,
            celular: true,
            correo: true,
            disponibilidad: true,
            estado: true,
          },
        })
      : await prisma.brigadistaParroquial.findFirst({
          where: { idUsuarioGRD, estado: "ACTIVO" },
          select: {
            idBrigadistaParroquial: true,
            idUsuarioGRD: true,
            idParroquia: true,
            nombres: true,
            apellidos: true,
            celular: true,
            correo: true,
            disponibilidad: true,
            estado: true,
          },
        });

    const estadoFiltro = incluirCerradas
      ? {}
      : { estadoActual: { notIn: ["CERRADA", "CANCELADA", "ANULADA"] } };

    const incidenciaSelect = {
      idIncidencia: true,
      codigoCaso: true,
      tipoEvento: true,
      descripcionEvento: true,
      estadoActual: true,
      fechaRegistro: true,
      fechaSuceso: true,
      horaSuceso: true,
      distritoEvento: true,
      direccionEvento: true,
      referenciaEvento: true,
      latitud: true,
      longitud: true,
      gravedad: true,
      numAfectadosReportado: true,
      tituloIncidencia: true,
      relatoActual: true,
      causaEvento: true,
      necesidades: true,
      necesidadesObs: true,
      observacionesGenerales: true,
      reportadoPorNombre: true,
      reportadoPorDni: true,
      reportadoPorCelular: true,
      reportadoPorRol: true,
      parroquiaNombreSnapshot: true,
      contextoCaso: true,
      uuidMovil: true,
      syncEstado: true,
      fechaSincronizacion: true,
      idUsuarioResponsableGRD: true,
      parroquia: {
        select: {
          idParroquia: true,
          nombre: true,
          direccion: true,
          referencia: true,
          latitud: true,
          longitud: true,
          telefono: true,
          correo: true,
          estado: true,
        },
      },
      gruposFamiliares: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" as const },
        select: {
          idGrupoFamiliar: true,
          codigoGrupo: true,
          nombreReferencia: true,
          direccion: true,
          condicionVivienda: true,
          condicionFinal: true,
          observaciones: true,
          uuidMovil: true,
          syncEstado: true,
          fechaSincronizacion: true,
          personas: {
            where: { deletedAt: null },
            orderBy: { createdAt: "asc" as const },
            select: {
              idPersonaAfectada: true,
              tipoDocumento: true,
              numeroDocumento: true,
              nombres: true,
              apellidos: true,
              fechaNacimiento: true,
              sexo: true,
              parentesco: true,
              condicionSalud: true,
              condicionEspecial: true,
              esVulnerable: true,
              telefono: true,
              observaciones: true,
              uuidMovil: true,
              syncEstado: true,
              fechaSincronizacion: true,
            },
          },
        },
      },
    } as const;

    // ── 1. Por asignación de equipo (brigadista_parroquial) ──────────────────
    const asignaciones = brigadista
      ? await prisma.asignacionBrigadistaIncidencia.findMany({
          where: {
            idBrigadistaParroquial: brigadista.idBrigadistaParroquial,
            deletedAt: null,
            ...(estadoAsignacion
              ? { estadoAsignacion }
              : incluirCerradas
                ? {}
                : { estadoAsignacion: { notIn: ["CANCELADA", "ANULADA", "CERRADA"] } }),
            incidencia: {
              deletedAt: null,
              ...estadoFiltro,
            },
          },
          orderBy: { fechaAsignacion: "desc" },
          take,
          select: {
            idAsignacionBrigadista: true,
            idIncidencia: true,
            idBrigadistaParroquial: true,
            fechaAsignacion: true,
            fechaInicioCampo: true,
            fechaLlegadaCampo: true,
            fechaCierreCampo: true,
            estadoAsignacion: true,
            rolEnEquipo: true,
            esResponsableEquipo: true,
            origenAsignacion: true,
            progresoEvidencias: true,
            observaciones: true,
            uuidMovil: true,
            syncEstado: true,
            fechaSincronizacion: true,
            incidencia: { select: incidenciaSelect },
          },
        })
      : [];

    // ── 2. Por responsable directo (idUsuarioResponsableGRD) ─────────────────
    const idsYaIncluidos = new Set(asignaciones.map((a) => a.idIncidencia));

    const incidenciasResponsable = await prisma.incidencia.findMany({
      where: {
        idUsuarioResponsableGRD: idUsuarioGRD,
        deletedAt: null,
        ...estadoFiltro,
        // Excluir las que ya vienen por asignación para no duplicar
        ...(idsYaIncluidos.size > 0
          ? { idIncidencia: { notIn: [...idsYaIncluidos] } }
          : {}),
      },
      orderBy: { fechaRegistro: "desc" },
      take,
      select: incidenciaSelect,
    });

    // ── 3. Combinar y mapear ──────────────────────────────────────────────────
    const allIds = [
      ...asignaciones.map((a) => a.incidencia.idIncidencia),
      ...incidenciasResponsable.map((i) => i.idIncidencia),
    ].filter(Boolean);

    const tiposRef = await prisma.tipoReferencia.findMany({
      where: {
        estado: "ACTIVO",
        OR: ["INCIDENCIA", "INCIDENCIA_GRD"].map((codigo) => ({
          codigoEntidad: { equals: codigo, mode: "insensitive" as const },
        })),
      },
      select: { idTipoReferencia: true },
    });

    const idsTipoReferencia = tiposRef.map((t) => t.idTipoReferencia);

    const observaciones = allIds.length && idsTipoReferencia.length
      ? await prisma.observacionGRD.findMany({
          where: {
            idReferencia: { in: allIds },
            idTipoReferencia: { in: idsTipoReferencia },
            estado: "ACTIVO",
          },
          orderBy: { fechaRegistro: "desc" },
          select: {
            idObservacionGRD: true,
            idTipoReferencia: true,
            idReferencia: true,
            uuidMovil: true,
            textoObservacion: true,
            estado: true,
            syncEstado: true,
            fechaRegistro: true,
            fechaSincronizacion: true,
          },
        })
      : [];

    const obsPorIncidencia = new Map<string, (typeof observaciones)[number][]>();
    for (const obs of observaciones) {
      const lista = obsPorIncidencia.get(obs.idReferencia) ?? [];
      lista.push(obs);
      obsPorIncidencia.set(obs.idReferencia, lista);
    }

    // Cargar evidencias para todas las incidencias
    const evidenciasDB = allIds.length
      ? await prisma.evidenciaGRD.findMany({
          where: { idReferencia: { in: allIds }, estado: "ACTIVO", deletedAt: null },
          select: {
            idEvidenciaGRD: true,
            idReferencia: true,
            uuidMovil: true,
            nombreArchivo: true,
            urlArchivo: true,
            formatoArchivo: true,
            descripcion: true,
            tamanoArchivo: true,
          },
          orderBy: { fechaCarga: "asc" },
        })
      : [];

    const s3Ok = isS3Configured();
    const evidenciasConUrl = await Promise.all(
      evidenciasDB.map(async (ev) => {
        let urlFirmada = ev.urlArchivo;
        if (ev.urlArchivo && s3Ok && !/^https?:\/\//i.test(ev.urlArchivo)) {
          try { urlFirmada = await presignGet(ev.urlArchivo); } catch { /* ignora */ }
        }
        return { ...ev, urlFirmada };
      })
    );

    const evPorIncidencia = new Map<string, typeof evidenciasConUrl>();
    for (const ev of evidenciasConUrl) {
      const lista = evPorIncidencia.get(ev.idReferencia) ?? [];
      lista.push(ev);
      evPorIncidencia.set(ev.idReferencia, lista);
    }

    const mapIncidencia = (inc: typeof incidenciasResponsable[number]) => ({
      asignacion: null,
      incidencia: {
        ...inc,
        latitud: decimalToNumber(inc.latitud),
        longitud: decimalToNumber(inc.longitud),
        observaciones: obsPorIncidencia.get(inc.idIncidencia) ?? [],
        evidencias: evPorIncidencia.get(inc.idIncidencia) ?? [],
        parroquia: inc.parroquia
          ? {
              ...inc.parroquia,
              latitud: decimalToNumber(inc.parroquia.latitud),
              longitud: decimalToNumber(inc.parroquia.longitud),
            }
          : null,
      },
    });

    const incidencias = [
      ...asignaciones.map((asignacion) => ({
        asignacion: {
          idAsignacionBrigadista: asignacion.idAsignacionBrigadista,
          idBrigadistaParroquial: asignacion.idBrigadistaParroquial,
          fechaAsignacion: asignacion.fechaAsignacion,
          fechaInicioCampo: asignacion.fechaInicioCampo,
          fechaLlegadaCampo: asignacion.fechaLlegadaCampo,
          fechaCierreCampo: asignacion.fechaCierreCampo,
          estadoAsignacion: asignacion.estadoAsignacion,
          rolEnEquipo: asignacion.rolEnEquipo,
          esResponsableEquipo: asignacion.esResponsableEquipo,
          origenAsignacion: asignacion.origenAsignacion,
          progresoEvidencias: asignacion.progresoEvidencias,
          observaciones: asignacion.observaciones,
          uuidMovil: asignacion.uuidMovil,
          syncEstado: asignacion.syncEstado,
          fechaSincronizacion: asignacion.fechaSincronizacion,
        },
        incidencia: {
          ...asignacion.incidencia,
          latitud: decimalToNumber(asignacion.incidencia.latitud),
          longitud: decimalToNumber(asignacion.incidencia.longitud),
          observaciones: obsPorIncidencia.get(asignacion.incidencia.idIncidencia) ?? [],
          evidencias: evPorIncidencia.get(asignacion.incidencia.idIncidencia) ?? [],
          parroquia: asignacion.incidencia.parroquia
            ? {
                ...asignacion.incidencia.parroquia,
                latitud: decimalToNumber(asignacion.incidencia.parroquia.latitud),
                longitud: decimalToNumber(asignacion.incidencia.parroquia.longitud),
              }
            : null,
        },
      })),
      ...incidenciasResponsable.map(mapIncidencia),
    ];

    return NextResponse.json({
      ok: true,
      serverTime: new Date().toISOString(),
      total: incidencias.length,
      brigadista,
      incidencias,
    });
  } catch (error) {
    console.error("[mobile/incidencias-asignadas][GET]", error);

    return jsonError("No se pudieron obtener las incidencias asignadas.", 500);
  }
}
