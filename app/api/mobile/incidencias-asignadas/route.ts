import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

function requireMobileSyncKey(request: Request): NextResponse | null {
  const expected = process.env.MOBILE_SYNC_API_KEY?.trim();

  // En desarrollo permite probar sin key si no está configurada.
  // En producción conviene definir MOBILE_SYNC_API_KEY en el servidor.
  if (!expected) return null;

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

    const idUsuarioGRD = searchParams.get("idUsuarioGRD")?.trim();
    const idBrigadistaParroquial = searchParams.get("idBrigadistaParroquial")?.trim();
    const estadoAsignacion = searchParams.get("estadoAsignacion")?.trim();
    const incluirCerradas = searchParams.get("incluirCerradas") === "true";
    const take = parseTake(searchParams.get("limit"));

    if (!idUsuarioGRD && !idBrigadistaParroquial) {
      return jsonError("Debe indicar idUsuarioGRD o idBrigadistaParroquial.", 400);
    }

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
          where: {
            idUsuarioGRD,
            estado: "ACTIVO",
          },
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

    if (!brigadista) {
      return NextResponse.json({
        ok: true,
        serverTime: new Date().toISOString(),
        total: 0,
        brigadista: null,
        incidencias: [],
        message: "No se encontró un brigadista activo para el usuario indicado.",
      });
    }

    const asignaciones = await prisma.asignacionBrigadistaIncidencia.findMany({
      where: {
        idBrigadistaParroquial: brigadista.idBrigadistaParroquial,
        deletedAt: null,
        ...(estadoAsignacion
          ? { estadoAsignacion }
          : incluirCerradas
            ? {}
            : { estadoAsignacion: { notIn: ["CANCELADA", "ANULADA"] } }),
        incidencia: {
          deletedAt: null,
          ...(incluirCerradas
            ? {}
            : { estadoActual: { notIn: ["CERRADA", "CANCELADA", "ANULADA"] } }),
        },
      },
      orderBy: {
        fechaAsignacion: "desc",
      },
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
        incidencia: {
          select: {
            idIncidencia: true,
            idParroquia: true,
            idUsuarioResponsableGRD: true,
            codigoCaso: true,
            fechaRegistro: true,
            tituloIncidencia: true,
            relatoActual: true,
            direccionEvento: true,
            contextoCaso: true,
            tipoEvento: true,
            descripcionEvento: true,
            gravedad: true,
            estadoActual: true,
            latitud: true,
            longitud: true,
            observacionesGenerales: true,
            uuidMovil: true,
            syncEstado: true,
            fechaSincronizacion: true,
            reportadoPorNombre: true,
            reportadoPorDni: true,
            reportadoPorCelular: true,
            reportadoPorRol: true,
            fechaSuceso: true,
            horaSuceso: true,
            distritoEvento: true,
            referenciaEvento: true,
            parroquiaNombreSnapshot: true,
            causaEvento: true,
            necesidades: true,
            necesidadesObs: true,
            numAfectadosReportado: true,
            origenRegistro: true,
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
              where: {
                deletedAt: null,
              },
              orderBy: {
                createdAt: "asc",
              },
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
                  where: {
                    deletedAt: null,
                  },
                  orderBy: {
                    createdAt: "asc",
                  },
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
          },
        },
      },
    });

    const idsIncidencia = asignaciones
      .map((asignacion) => asignacion.incidencia.idIncidencia)
      .filter(Boolean);

    const tiposReferenciaIncidencia = await prisma.tipoReferencia.findMany({
      where: {
        estado: "ACTIVO",
        OR: ["INCIDENCIA", "INCIDENCIA_GRD"].map((codigo) => ({
          codigoEntidad: {
            equals: codigo,
            mode: "insensitive" as const,
          },
        })),
      },
      select: {
        idTipoReferencia: true,
      },
    });

    const idsTipoReferencia = tiposReferenciaIncidencia.map(
      (tipo) => tipo.idTipoReferencia
    );

    const observaciones = idsIncidencia.length && idsTipoReferencia.length
      ? await prisma.observacionGRD.findMany({
          where: {
            idReferencia: {
              in: idsIncidencia,
            },
            idTipoReferencia: {
              in: idsTipoReferencia,
            },
            estado: "ACTIVO",
          },
          orderBy: {
            fechaRegistro: "desc",
          },
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

    const observacionesPorIncidencia = new Map<
      string,
      (typeof observaciones)[number][]
    >();

    for (const observacion of observaciones) {
      const lista =
        observacionesPorIncidencia.get(observacion.idReferencia) ?? [];

      lista.push(observacion);
      observacionesPorIncidencia.set(observacion.idReferencia, lista);
    }    
    const incidencias = asignaciones.map((asignacion) => {
      const incidencia = asignacion.incidencia;

      return {
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
          ...incidencia,
          latitud: decimalToNumber(incidencia.latitud),
          longitud: decimalToNumber(incidencia.longitud),
          observaciones:
            observacionesPorIncidencia.get(incidencia.idIncidencia) ?? [],
          parroquia: incidencia.parroquia
            ? {
                ...incidencia.parroquia,
                latitud: decimalToNumber(incidencia.parroquia.latitud),
                longitud: decimalToNumber(incidencia.parroquia.longitud),
              }
            : null,
        },
      };
    });

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
