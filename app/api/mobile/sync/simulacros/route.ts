import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

type SimulacroSyncPayload = {
  uuidSync?: string | null;
  idActividadPreventivaRemota?: string | null;
  idUsuarioGRD?: string | null;
  idBrigadistaParroquial?: string | null;
  estadoActividad?: string | null;
  fechaEjecucion?: string | null;
  resultadoGeneral?: string | null;
  reporteBrigadista?: string | null;
  numeroParticipantesReal?: number | string | null;
  duracionSimulacro?: number | string | null;
  recomendaciones?: string | null;
  observaciones?: string | null;
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

function texto(value?: string | null): string {
  return value?.trim() ?? "";
}

function parseFechaEjecucion(value?: string | null): Date {
  const limpio = texto(value);

  if (!limpio) return new Date();

  const fecha = new Date(limpio);

  if (Number.isNaN(fecha.getTime())) {
    throw new MobileSyncError("fechaEjecucion no tiene un formato valido.");
  }

  return fecha;
}

function parseEnteroNoNegativo(
  value: number | string | null | undefined,
  campo: string
): number | null {
  if (value === null || value === undefined || value === "") return null;

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new MobileSyncError(`${campo} debe ser un numero valido.`);
  }

  if (!Number.isInteger(parsed)) {
    throw new MobileSyncError(`${campo} debe ser un numero entero.`);
  }

  if (parsed < 0) {
    throw new MobileSyncError(`${campo} debe ser mayor o igual a cero.`);
  }

  return parsed;
}

function validarPayload(body: SimulacroSyncPayload): {
  uuidSync: string;
  idActividadPreventiva: string;
  idUsuarioGRD: string;
  idBrigadistaParroquial: string;
  fechaEjecucion: Date;
  resultadoGeneral: string;
  reporteBrigadista: string;
  numeroParticipantesReal: number | null;
  duracionSimulacro: number | null;
  recomendaciones: string | null;
  observaciones: string | null;
} {
  const uuidSync = texto(body.uuidSync);
  const idActividadPreventiva = texto(body.idActividadPreventivaRemota);
  const idUsuarioGRD = texto(body.idUsuarioGRD);
  const idBrigadistaParroquial = texto(body.idBrigadistaParroquial);
  const estadoActividad = texto(body.estadoActividad).toUpperCase();
  const resultadoGeneral = texto(body.resultadoGeneral);
  const reporteBrigadista = texto(body.reporteBrigadista);

  if (!uuidSync) {
    throw new MobileSyncError("uuidSync es obligatorio.");
  }

  if (!idActividadPreventiva) {
    throw new MobileSyncError("idActividadPreventivaRemota es obligatorio.");
  }

  if (estadoActividad !== "EJECUTADA") {
    throw new MobileSyncError("estadoActividad debe ser EJECUTADA.");
  }

  if (!idUsuarioGRD && !idBrigadistaParroquial) {
    throw new MobileSyncError(
      "Debes enviar idUsuarioGRD o idBrigadistaParroquial para ejecutar el simulacro."
    );
  }

  if (!resultadoGeneral && !reporteBrigadista) {
    throw new MobileSyncError("resultadoGeneral o reporteBrigadista es obligatorio.");
  }

  if (resultadoGeneral && resultadoGeneral.length < 5) {
    throw new MobileSyncError("resultadoGeneral debe tener al menos 5 caracteres.");
  }

  if (reporteBrigadista && reporteBrigadista.length < 5) {
    throw new MobileSyncError("reporteBrigadista debe tener al menos 5 caracteres.");
  }

  return {
    uuidSync,
    idActividadPreventiva,
    idUsuarioGRD,
    idBrigadistaParroquial,
    fechaEjecucion: parseFechaEjecucion(body.fechaEjecucion),
    resultadoGeneral,
    reporteBrigadista,
    numeroParticipantesReal: parseEnteroNoNegativo(
      body.numeroParticipantesReal,
      "numeroParticipantesReal"
    ),
    duracionSimulacro: parseEnteroNoNegativo(
      body.duracionSimulacro,
      "duracionSimulacro"
    ),
    recomendaciones: texto(body.recomendaciones) || null,
    observaciones: texto(body.observaciones) || null,
  };
}

function usuarioPuedeEjecutar(params: {
  idUsuarioGRD: string;
  idBrigadistaParroquial: string;
  idUsuarioResponsableGRD: string | null;
  asignaciones: {
    idBrigadistaParroquial: string;
    brigadista: { idUsuarioGRD: string | null };
  }[];
}): boolean {
  const {
    idUsuarioGRD,
    idBrigadistaParroquial,
    idUsuarioResponsableGRD,
    asignaciones,
  } = params;

  const brigadistaAsignado = idBrigadistaParroquial
    ? asignaciones.some(
        (asignacion) =>
          asignacion.idBrigadistaParroquial === idBrigadistaParroquial
      )
    : false;

  if (idUsuarioGRD && idUsuarioResponsableGRD === idUsuarioGRD) return true;
  if (brigadistaAsignado) return true;

  if (idUsuarioGRD) {
    return asignaciones.some(
      (asignacion) => asignacion.brigadista.idUsuarioGRD === idUsuarioGRD
    );
  }

  return false;
}

export async function POST(request: Request) {
  let body: SimulacroSyncPayload;

  try {
    body = await request.json();
  } catch {
    return jsonError("Body JSON invalido.");
  }

  let datos: ReturnType<typeof validarPayload>;

  try {
    datos = validarPayload(body);
  } catch (err) {
    if (err instanceof MobileSyncError) {
      return jsonError(err.message, err.status);
    }

    return jsonError("Payload de simulacro invalido.");
  }

  try {
    const actividad = await prisma.actividadPreventiva.findUnique({
      where: { idActividadPreventiva: datos.idActividadPreventiva },
      select: {
        idActividadPreventiva: true,
        estadoActividad: true,
        idUsuarioResponsableGRD: true,
        syncEstado: true,
        fechaSincronizacion: true,
        simulacroBrigadistas: {
          where: { estadoAsignacion: "ASIGNADA" },
          select: {
            idBrigadistaParroquial: true,
            brigadista: {
              select: {
                idUsuarioGRD: true,
              },
            },
          },
        },
      },
    });

    if (!actividad) {
      return jsonError("No se encontro el simulacro indicado.", 404);
    }

    if (actividad.estadoActividad === "EJECUTADA") {
      return NextResponse.json({
        ok: true,
        duplicated: true,
        alreadySynced: true,
        uuidSync: datos.uuidSync,
        idActividadPreventivaRemota: actividad.idActividadPreventiva,
        idServidor: actividad.idActividadPreventiva,
        estadoActividad: actividad.estadoActividad,
        syncEstado: actividad.syncEstado ?? "SINCRONIZADO",
        fechaSincronizacion: actividad.fechaSincronizacion ?? new Date(),
      });
    }

    if (["CANCELADA", "VALIDADA"].includes(actividad.estadoActividad)) {
      return jsonError(
        `No se puede ejecutar un simulacro en estado ${actividad.estadoActividad}.`
      );
    }

    if (!["ASIGNADA", "OBSERVADA"].includes(actividad.estadoActividad)) {
      return jsonError(
        `Solo se puede ejecutar un simulacro en estado ASIGNADA u OBSERVADA. Estado actual: ${actividad.estadoActividad}.`
      );
    }

    const puedeEjecutar = usuarioPuedeEjecutar({
      idUsuarioGRD: datos.idUsuarioGRD,
      idBrigadistaParroquial: datos.idBrigadistaParroquial,
      idUsuarioResponsableGRD: actividad.idUsuarioResponsableGRD,
      asignaciones: actividad.simulacroBrigadistas,
    });

    if (!puedeEjecutar) {
      return jsonError(
        "El usuario o brigadista indicado no esta asignado a este simulacro.",
        403
      );
    }

    const fechaSincronizacion = new Date();

    const actualizado = await prisma.actividadPreventiva.update({
      where: { idActividadPreventiva: actividad.idActividadPreventiva },
      data: {
        estadoActividad: "EJECUTADA",
        fechaEjecucion: datos.fechaEjecucion,
        resultadoGeneral: datos.resultadoGeneral || datos.reporteBrigadista,
        reporteBrigadista: datos.reporteBrigadista || datos.resultadoGeneral,
        numeroParticipantesReal: datos.numeroParticipantesReal,
        duracionSimulacro:
          datos.duracionSimulacro === null ? null : String(datos.duracionSimulacro),
        recomendaciones: datos.recomendaciones,
        observaciones: datos.observaciones,
        syncEstado: "SINCRONIZADO",
        fechaSincronizacion,
      },
      select: {
        idActividadPreventiva: true,
        estadoActividad: true,
        syncEstado: true,
        fechaSincronizacion: true,
      },
    });

    return NextResponse.json({
      ok: true,
      duplicated: false,
      uuidSync: datos.uuidSync,
      idActividadPreventivaRemota: actualizado.idActividadPreventiva,
      idServidor: actualizado.idActividadPreventiva,
      estadoActividad: actualizado.estadoActividad,
      syncEstado: actualizado.syncEstado,
      fechaSincronizacion: actualizado.fechaSincronizacion,
    });
  } catch (err) {
    console.error("[mobile/sync/simulacros][POST]", err);

    return jsonError("No se pudo sincronizar la ejecucion del simulacro.", 500);
  }
}
