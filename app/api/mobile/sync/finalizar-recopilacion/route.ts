import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

type FinalizarRecopilacionPayload = {
  uuidCierre?: string;
  uuidFinalizacion?: string;

  idIncidencia?: string;
  idIncidenciaRemota?: string;
  uuidIncidencia?: string;
  uuidIncidenciaMovil?: string;
  codigoCaso?: string;

  idUsuarioGRD?: string;
  observacionCierre?: string;
  observaciones?: string;
};

class MobileSyncError extends Error {
  constructor(
    message: string,
    readonly status = 400
  ) {
    super(message);
  }
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

function requireMobileSyncKey(request: Request): NextResponse | null {
  const expected = process.env.MOBILE_SYNC_API_KEY?.trim();

  if (!expected) return null;

  const received = request.headers.get("x-mobile-sync-key")?.trim() ?? "";

  if (received !== expected) {
    return jsonError("No autorizado.", 401);
  }

  return null;
}

function texto(value?: string | null): string {
  return value?.trim() ?? "";
}

async function resolveIncidencia(body: FinalizarRecopilacionPayload) {
  const idIncidencia = texto(body.idIncidenciaRemota) || texto(body.idIncidencia);

  if (idIncidencia) {
    const incidencia = await prisma.incidencia.findUnique({
      where: { idIncidencia },
      select: {
        idIncidencia: true,
        codigoCaso: true,
        uuidMovil: true,
        estadoActual: true,
      },
    });

    if (incidencia) return incidencia;
  }

  const uuidMovil =
    texto(body.uuidIncidenciaMovil) ||
    texto(body.uuidIncidencia);

  if (uuidMovil) {
    const incidencia = await prisma.incidencia.findUnique({
      where: { uuidMovil },
      select: {
        idIncidencia: true,
        codigoCaso: true,
        uuidMovil: true,
        estadoActual: true,
      },
    });

    if (incidencia) return incidencia;
  }

  const codigoCaso = texto(body.codigoCaso);

  if (codigoCaso) {
    const incidencia = await prisma.incidencia.findUnique({
      where: { codigoCaso },
      select: {
        idIncidencia: true,
        codigoCaso: true,
        uuidMovil: true,
        estadoActual: true,
      },
    });

    if (incidencia) return incidencia;
  }

  throw new MobileSyncError("No se pudo resolver la incidencia indicada.", 404);
}

async function resolveUsuarioYBrigadista(body: FinalizarRecopilacionPayload) {
  const idUsuarioGRD = texto(body.idUsuarioGRD);

  if (!idUsuarioGRD) {
    throw new MobileSyncError("idUsuarioGRD es obligatorio.");
  }

  const usuario = await prisma.usuarioGRD.findUnique({
    where: { idUsuarioGRD },
    select: { idUsuarioGRD: true },
  });

  if (!usuario) {
    throw new MobileSyncError("No se encontró el usuario GRD indicado.", 404);
  }

  const brigadista = await prisma.brigadistaParroquial.findFirst({
    where: {
      idUsuarioGRD,
      estado: "ACTIVO",
    },
    select: {
      idBrigadistaParroquial: true,
      idUsuarioGRD: true,
      estado: true,
      disponibilidad: true,
    },
  });

  if (!brigadista) {
    throw new MobileSyncError("No se encontró un brigadista activo para el usuario indicado.", 404);
  }

  return { usuario, brigadista };
}

export async function POST(request: Request) {
  const unauthorized = requireMobileSyncKey(request);
  if (unauthorized) return unauthorized;

  try {
    const body = (await request.json()) as FinalizarRecopilacionPayload;

    const incidencia = await resolveIncidencia(body);
    const { usuario, brigadista } = await resolveUsuarioYBrigadista(body);

    const asignacion = await prisma.asignacionBrigadistaIncidencia.findFirst({
      where: {
        idIncidencia: incidencia.idIncidencia,
        idBrigadistaParroquial: brigadista.idBrigadistaParroquial,
        deletedAt: null,
        estadoAsignacion: {
          notIn: ["CANCELADA", "ANULADA"],
        },
      },
      select: {
        idAsignacionBrigadista: true,
        fechaCierreCampo: true,
        estadoAsignacion: true,
      },
    });

    if (!asignacion) {
      throw new MobileSyncError("No se encontró una asignación activa para esta incidencia y brigadista.", 404);
    }

    const estadoAnterior = incidencia.estadoActual;
    const estadoNuevo = "DATA RECOPILADA";
    const fechaCierre = new Date();

    const observacionCierre =
      texto(body.observacionCierre) ||
      texto(body.observaciones) ||
      "Recopilación de información finalizada desde la aplicación móvil.";

    const uuidHistorial =
      texto(body.uuidCierre) ||
      texto(body.uuidFinalizacion) ||
      `mobile-cierre-${incidencia.idIncidencia}-${usuario.idUsuarioGRD}`;

    const resultado = await prisma.$transaction(async (tx) => {
      const incidenciaActualizada = await tx.incidencia.update({
        where: { idIncidencia: incidencia.idIncidencia },
        data: {
          estadoActual: estadoNuevo,
          syncEstado: "SINCRONIZADO",
          fechaSincronizacion: fechaCierre,
        },
        select: {
          idIncidencia: true,
          codigoCaso: true,
          uuidMovil: true,
          estadoActual: true,
          fechaSincronizacion: true,
        },
      });

      const asignacionActualizada = await tx.asignacionBrigadistaIncidencia.update({
        where: {
          idAsignacionBrigadista: asignacion.idAsignacionBrigadista,
        },
        data: {
          fechaCierreCampo: asignacion.fechaCierreCampo ?? fechaCierre,
          syncEstado: "SINCRONIZADO",
          fechaSincronizacion: fechaCierre,
        },
        select: {
          idAsignacionBrigadista: true,
          estadoAsignacion: true,
          fechaCierreCampo: true,
          fechaSincronizacion: true,
        },
      });

      const historialExistente = await tx.historialEstadoIncidencia.findUnique({
        where: {
          uuidMovil: uuidHistorial,
        },
        select: {
          idHistorial: true,
        },
      });

      const historial = historialExistente
        ? await tx.historialEstadoIncidencia.update({
            where: {
              uuidMovil: uuidHistorial,
            },
            data: {
              estadoAnterior,
              estadoNuevo,
              motivoCambio: "FINALIZAR_RECOLECCION_MOVIL",
              observaciones: observacionCierre,
              syncEstado: "SINCRONIZADO",
              fechaSincronizacion: fechaCierre,
            },
            select: {
              idHistorial: true,
              estadoAnterior: true,
              estadoNuevo: true,
              fechaCambio: true,
            },
          })
        : await tx.historialEstadoIncidencia.create({
            data: {
              idIncidencia: incidencia.idIncidencia,
              idUsuarioGRD: usuario.idUsuarioGRD,
              estadoAnterior,
              estadoNuevo,
              motivoCambio: "FINALIZAR_RECOLECCION_MOVIL",
              observaciones: observacionCierre,
              uuidMovil: uuidHistorial,
              syncEstado: "SINCRONIZADO",
              fechaSincronizacion: fechaCierre,
            },
            select: {
              idHistorial: true,
              estadoAnterior: true,
              estadoNuevo: true,
              fechaCambio: true,
            },
          });

      return {
        incidencia: incidenciaActualizada,
        asignacion: asignacionActualizada,
        historial,
      };
    });

    return NextResponse.json({
      ok: true,
      idIncidenciaRemota: resultado.incidencia.idIncidencia,
      uuidIncidencia: resultado.incidencia.uuidMovil,
      codigoCaso: resultado.incidencia.codigoCaso,
      estadoAnterior,
      estadoActual: resultado.incidencia.estadoActual,
      idAsignacionBrigadista: resultado.asignacion.idAsignacionBrigadista,
      estadoAsignacion: resultado.asignacion.estadoAsignacion,
      fechaCierreCampo: resultado.asignacion.fechaCierreCampo,
      idHistorial: resultado.historial.idHistorial,
      fechaSincronizacion: resultado.incidencia.fechaSincronizacion,
    });
  } catch (error) {
    console.error("[mobile/sync/finalizar-recopilacion][POST]", error);

    if (error instanceof MobileSyncError) {
      return jsonError(error.message, error.status);
    }

    return jsonError("No se pudo finalizar la recopilación de información.", 500);
  }
}