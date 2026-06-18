import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

const ESTADOS_VALIDOS = [
  "PROGRAMADA",
  "ASIGNADA",
  "EJECUTADA",
  "OBSERVADA",
  "VALIDADA",
  "CANCELADA",
] as const;

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

function requireMobileSyncKey(request: Request): NextResponse | null {
  const expected = process.env.MOBILE_SYNC_API_KEY?.trim();

  if (!expected) {
    return NextResponse.json(
      { ok: false, message: "Sincronizacion movil no configurada." },
      { status: 503 }
    );
  }

  const received = request.headers.get("x-mobile-sync-key")?.trim() ?? "";

  if (received !== expected) {
    return jsonError("No autorizado.", 401);
  }

  return null;
}

function texto(value: string | null): string {
  return value?.trim() ?? "";
}

function parseTake(value: string | null): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) return 50;

  return Math.min(Math.max(Math.trunc(parsed), 1), 200);
}

function parseUpdatedSince(value: string | null): Date | null {
  const limpio = texto(value);

  if (!limpio) return null;

  const fecha = new Date(limpio);

  if (Number.isNaN(fecha.getTime())) return null;

  return fecha;
}

function parseEstados(value: string | null): string[] | null {
  const limpio = texto(value);

  if (!limpio) return null;

  const estados = limpio
    .split(",")
    .map((estado) => estado.trim().toUpperCase())
    .filter(Boolean);

  if (estados.length === 0) return null;

  const invalidos = estados.filter(
    (estado) => !ESTADOS_VALIDOS.includes(estado as (typeof ESTADOS_VALIDOS)[number])
  );

  if (invalidos.length > 0) {
    throw new Error(`Estado no valido: ${invalidos.join(", ")}.`);
  }

  return estados;
}

export async function GET(request: Request) {
  //const unauthorized = requireMobileSyncKey(request);
  //if (unauthorized) return unauthorized;

  try {
    const { searchParams } = new URL(request.url);
    const idUsuarioGRD = texto(searchParams.get("idUsuarioGRD"));
    const idBrigadistaParroquial = texto(searchParams.get("idBrigadistaParroquial"));
    const updatedSince = parseUpdatedSince(searchParams.get("updatedSince"));
    const take = parseTake(searchParams.get("take"));
    const estados = parseEstados(searchParams.get("estado"));

    const filtrosIdentidad: Prisma.ActividadPreventivaWhereInput[] = [];

    if (idBrigadistaParroquial) {
      filtrosIdentidad.push({
        simulacroBrigadistas: {
          some: {
            idBrigadistaParroquial,
            estadoAsignacion: "ASIGNADA",
          },
        },
      });
    }

    if (idUsuarioGRD) {
      filtrosIdentidad.push(
        { idUsuarioResponsableGRD: idUsuarioGRD },
        {
          simulacroBrigadistas: {
            some: {
              estadoAsignacion: "ASIGNADA",
              brigadista: {
                idUsuarioGRD,
              },
            },
          },
        }
      );
    }

    const where: Prisma.ActividadPreventivaWhereInput = {
      deletedAt: null,
      ...(estados ? { estadoActividad: { in: estados } } : {}),
      ...(updatedSince ? { updatedAt: { gte: updatedSince } } : {}),
      ...(filtrosIdentidad.length > 0 ? { OR: filtrosIdentidad } : {}),
    };

    const [tipoSimulacro, actividades] = await Promise.all([
      prisma.tipoReferencia.findUnique({
        where: { codigoEntidad: "SIMULACRO" },
        select: { idTipoReferencia: true },
      }),
      prisma.actividadPreventiva.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take,
        select: {
          idActividadPreventiva: true,
          uuidMovil: true,
          codigoActividad: true,
          estadoActividad: true,
          idParroquia: true,
          idPlanTrabajoGRD: true,
          idTipoActividadPreventiva: true,
          nombreActividad: true,
          fechaProgramada: true,
          horarioInicio: true,
          horarioFin: true,
          lugarActividad: true,
          publicoObjetivo: true,
          numeroParticipantesEstimado: true,
          numeroParticipantesReal: true,
          descripcionActividad: true,
          resultadoGeneral: true,
          recomendaciones: true,
          observaciones: true,
          indicacionesEquipo: true,
          reporteBrigadista: true,
          duracionSimulacro: true,
          fechaEjecucion: true,
          updatedAt: true,
          idUsuarioResponsableGRD: true,
          parroquia: {
            select: {
              idParroquia: true,
              nombre: true,
            },
          },
          planTrabajo: {
            select: {
              idPlanTrabajoGRD: true,
              codigoPlan: true,
              nombrePlan: true,
              estadoAprobacion: true,
              fechaInicio: true,
              fechaFin: true,
            },
          },
          usuarioResponsable: {
            select: {
              idUsuarioGRD: true,
              nombres: true,
              apellidos: true,
              correoReferencia: true,
              telefono: true,
            },
          },
          simulacroBrigadistas: {
            where: { estadoAsignacion: "ASIGNADA" },
            orderBy: [{ esResponsable: "desc" }, { fechaAsignacion: "asc" }],
            select: {
              idSimulacroBrigadista: true,
              idBrigadistaParroquial: true,
              idUsuarioAsignadorGRD: true,
              esResponsable: true,
              estadoAsignacion: true,
              fechaAsignacion: true,
              brigadista: {
                select: {
                  idBrigadistaParroquial: true,
                  idParroquia: true,
                  idUsuarioGRD: true,
                  dni: true,
                  nombres: true,
                  apellidos: true,
                  celular: true,
                  correo: true,
                  disponibilidad: true,
                  estado: true,
                },
              },
            },
          },
          observacionesSimulacro: {
            orderBy: { fechaCreacion: "asc" },
            select: {
              idObservacion: true,
              idUsuarioGRD: true,
              texto: true,
              tipo: true,
              fechaCreacion: true,
              fechaEdicion: true,
              usuario: {
                select: {
                  idUsuarioGRD: true,
                  nombres: true,
                  apellidos: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const idsActividad = actividades.map((actividad) => actividad.idActividadPreventiva);

    const evidencias =
      tipoSimulacro && idsActividad.length > 0
        ? await prisma.evidenciaGRD.findMany({
            where: {
              idTipoReferencia: tipoSimulacro.idTipoReferencia,
              idReferencia: { in: idsActividad },
              estado: "ACTIVO",
              deletedAt: null,
            },
            orderBy: { fechaCarga: "desc" },
            select: {
              idEvidenciaGRD: true,
              uuidMovil: true,
              idReferencia: true,
              nombreArchivo: true,
              urlArchivo: true,
              formatoArchivo: true,
              descripcion: true,
              fechaCarga: true,
              tamanoArchivo: true,
              latitud: true,
              longitud: true,
              syncEstado: true,
              fechaSincronizacion: true,
            },
          })
        : [];

    const evidenciasPorActividad = new Map<string, typeof evidencias>();

    for (const evidencia of evidencias) {
      const actuales = evidenciasPorActividad.get(evidencia.idReferencia) ?? [];
      actuales.push(evidencia);
      evidenciasPorActividad.set(evidencia.idReferencia, actuales);
    }

    const simulacros = actividades.map((actividad) => {
      const responsableEquipo = actividad.simulacroBrigadistas.find(
        (asignacion) => asignacion.esResponsable
      );

      return {
        idActividadPreventiva: actividad.idActividadPreventiva,
        uuidMovil: actividad.uuidMovil,
        codigoActividad: actividad.codigoActividad,
        estadoActividad: actividad.estadoActividad,
        idParroquia: actividad.idParroquia,
        parroquiaNombre: actividad.parroquia.nombre,
        idPlanTrabajoGRD: actividad.idPlanTrabajoGRD,
        planTrabajo: actividad.planTrabajo
          ? {
              idPlanTrabajoGRD: actividad.planTrabajo.idPlanTrabajoGRD,
              codigoPlan: actividad.planTrabajo.codigoPlan,
              nombrePlan: actividad.planTrabajo.nombrePlan,
              estadoAprobacion: actividad.planTrabajo.estadoAprobacion,
              fechaInicio: actividad.planTrabajo.fechaInicio?.toISOString() ?? null,
              fechaFin: actividad.planTrabajo.fechaFin?.toISOString() ?? null,
            }
          : null,
        idTipoActividadPreventiva: actividad.idTipoActividadPreventiva,
        nombreActividad: actividad.nombreActividad,
        fechaProgramada: actividad.fechaProgramada?.toISOString() ?? null,
        horarioInicio: actividad.horarioInicio,
        horarioFin: actividad.horarioFin,
        lugarActividad: actividad.lugarActividad,
        publicoObjetivo: actividad.publicoObjetivo,
        numeroParticipantesEstimado: actividad.numeroParticipantesEstimado,
        numeroParticipantesReal: actividad.numeroParticipantesReal,
        descripcionActividad: actividad.descripcionActividad,
        resultadoGeneral: actividad.resultadoGeneral,
        recomendaciones: actividad.recomendaciones,
        observaciones: actividad.observaciones,
        indicacionesEquipo: actividad.indicacionesEquipo,
        reporteBrigadista: actividad.reporteBrigadista,
        duracionSimulacro: actividad.duracionSimulacro,
        fechaEjecucion: actividad.fechaEjecucion?.toISOString() ?? null,
        updatedAt: actividad.updatedAt.toISOString(),
        responsable: responsableEquipo
          ? {
              tipo: "BRIGADISTA",
              idBrigadistaParroquial: responsableEquipo.brigadista.idBrigadistaParroquial,
              idUsuarioGRD: responsableEquipo.brigadista.idUsuarioGRD,
              nombre: `${responsableEquipo.brigadista.nombres} ${
                responsableEquipo.brigadista.apellidos ?? ""
              }`.trim(),
              celular: responsableEquipo.brigadista.celular,
              correo: responsableEquipo.brigadista.correo,
            }
          : actividad.usuarioResponsable
            ? {
                tipo: "USUARIO_GRD",
                idBrigadistaParroquial: null,
                idUsuarioGRD: actividad.usuarioResponsable.idUsuarioGRD,
                nombre: `${actividad.usuarioResponsable.nombres} ${
                  actividad.usuarioResponsable.apellidos ?? ""
                }`.trim(),
                celular: actividad.usuarioResponsable.telefono,
                correo: actividad.usuarioResponsable.correoReferencia,
              }
            : null,
        equipo: actividad.simulacroBrigadistas.map((asignacion) => ({
          idSimulacroBrigadista: asignacion.idSimulacroBrigadista,
          idBrigadistaParroquial: asignacion.brigadista.idBrigadistaParroquial,
          idUsuarioGRD: asignacion.brigadista.idUsuarioGRD,
          idParroquia: asignacion.brigadista.idParroquia,
          dni: asignacion.brigadista.dni,
          nombre: `${asignacion.brigadista.nombres} ${
            asignacion.brigadista.apellidos ?? ""
          }`.trim(),
          celular: asignacion.brigadista.celular,
          correo: asignacion.brigadista.correo,
          disponibilidad: asignacion.brigadista.disponibilidad,
          estadoBrigadista: asignacion.brigadista.estado,
          esResponsable: asignacion.esResponsable,
          estadoAsignacion: asignacion.estadoAsignacion,
          fechaAsignacion: asignacion.fechaAsignacion.toISOString(),
          idUsuarioAsignadorGRD: asignacion.idUsuarioAsignadorGRD,
        })),
        evidencias: (evidenciasPorActividad.get(actividad.idActividadPreventiva) ?? []).map(
          (evidencia) => ({
            idEvidenciaGRD: evidencia.idEvidenciaGRD,
            uuidMovil: evidencia.uuidMovil,
            nombreArchivo: evidencia.nombreArchivo,
            urlArchivo: evidencia.urlArchivo,
            formatoArchivo: evidencia.formatoArchivo,
            descripcion: evidencia.descripcion,
            fechaCarga: evidencia.fechaCarga.toISOString(),
            tamanoArchivo: evidencia.tamanoArchivo,
            latitud: evidencia.latitud === null ? null : Number(evidencia.latitud),
            longitud: evidencia.longitud === null ? null : Number(evidencia.longitud),
            syncEstado: evidencia.syncEstado,
            fechaSincronizacion: evidencia.fechaSincronizacion?.toISOString() ?? null,
          })
        ),
        observacionesSimulacro: actividad.observacionesSimulacro.map((observacion) => ({
          idObservacion: observacion.idObservacion,
          idUsuarioGRD: observacion.idUsuarioGRD,
          autorNombre: `${observacion.usuario.nombres} ${
            observacion.usuario.apellidos ?? ""
          }`.trim(),
          texto: observacion.texto,
          tipo: observacion.tipo,
          fechaCreacion: observacion.fechaCreacion.toISOString(),
          fechaEdicion: observacion.fechaEdicion?.toISOString() ?? null,
        })),
      };
    });

    return NextResponse.json({
      ok: true,
      fechaSincronizacion: new Date().toISOString(),
      total: simulacros.length,
      simulacros,
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Estado no valido:")) {
      return jsonError(error.message);
    }

    console.error("[mobile/simulacros][GET]", error);

    return jsonError("No se pudieron obtener los simulacros.", 500);
  }
}
