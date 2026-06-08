import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

type SeguimientoMovilPayload = {
  uuidSeguimiento?: string;

  // Formas posibles de ubicar la incidencia remota.
  idIncidencia?: string;
  idIncidenciaRemota?: string;
  idServidor?: string;
  uuidIncidencia?: string;
  uuidIncidenciaMovil?: string;
  uuidReferencia?: string;
  codigoCaso?: string;

  idUsuarioGRD?: string | null;

  fechaSeguimiento?: string | null;
  situacion?: string | null;
  descripcion?: string | null;
  necesidadesPendientes?: string | null;
  recomendaciones?: string | null;
  estado?: string | null;
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

function requireMobileSyncKey(request: Request): NextResponse | null {
  const expected = process.env.MOBILE_SYNC_API_KEY?.trim();

  // En desarrollo, si no hay key configurada, no bloquea.
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

function parseFecha(value?: string | null): Date {
  const limpio = texto(value);

  if (!limpio) return new Date();

  const fecha = new Date(limpio);

  if (Number.isNaN(fecha.getTime())) {
    throw new MobileSyncError("fechaSeguimiento no tiene un formato válido.");
  }

  return fecha;
}

function validarPayload(body: SeguimientoMovilPayload): string {
  const uuidMovil = texto(body.uuidSeguimiento);

  if (!uuidMovil) {
    throw new MobileSyncError("uuidSeguimiento es obligatorio.");
  }

  const situacion = texto(body.situacion);
  const descripcion = texto(body.descripcion);

  if (!situacion && !descripcion) {
    throw new MobileSyncError("Ingresa la situación o descripción del seguimiento.");
  }

  if (descripcion && descripcion.length < 5) {
    throw new MobileSyncError("La descripción del seguimiento debe tener al menos 5 caracteres.");
  }

  if (situacion && situacion.length < 3) {
    throw new MobileSyncError("La situación del seguimiento debe tener al menos 3 caracteres.");
  }

  return uuidMovil;
}

async function resolveIncidencia(body: SeguimientoMovilPayload): Promise<{
  idIncidencia: string;
  codigoCaso: string | null;
}> {
  const idIncidencia =
    texto(body.idIncidenciaRemota) ||
    texto(body.idIncidencia) ||
    texto(body.idServidor);

  if (idIncidencia) {
    const incidencia = await prisma.incidencia.findUnique({
      where: { idIncidencia },
      select: {
        idIncidencia: true,
        codigoCaso: true,
      },
    });

    if (incidencia) return incidencia;
  }

  const uuidIncidencia =
    texto(body.uuidIncidencia) ||
    texto(body.uuidIncidenciaMovil) ||
    texto(body.uuidReferencia);

  if (uuidIncidencia) {
    const incidencia = await prisma.incidencia.findUnique({
      where: { uuidMovil: uuidIncidencia },
      select: {
        idIncidencia: true,
        codigoCaso: true,
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
      },
    });

    if (incidencia) return incidencia;
  }

  throw new MobileSyncError(
    "No se encontró la incidencia asociada al seguimiento. Envía idIncidenciaRemota, uuidIncidencia o codigoCaso."
  );
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/mobile/sync/seguimientos",
    method: "POST",
    message: "Endpoint de sincronización móvil de seguimientos activo.",
  });
}

export async function POST(request: Request) {
  const unauthorized = requireMobileSyncKey(request);
  if (unauthorized) return unauthorized;

  let body: SeguimientoMovilPayload;

  try {
    body = await request.json();
  } catch {
    return jsonError("Body JSON inválido.");
  }

  let uuidMovil: string;

  try {
    uuidMovil = validarPayload(body);
  } catch (err) {
    if (err instanceof MobileSyncError) {
      return jsonError(err.message, err.status);
    }

    return jsonError("Payload de seguimiento inválido.");
  }

  try {
    const existente = await prisma.seguimientoIncidencia.findUnique({
      where: { uuidMovil },
      select: {
        idSeguimiento: true,
        idIncidencia: true,
        uuidMovil: true,
        estado: true,
        syncEstado: true,
        fechaSincronizacion: true,
      },
    });

    if (existente) {
      return NextResponse.json({
        ok: true,
        duplicated: true,
        uuidSeguimiento: uuidMovil,
        idSeguimientoRemoto: existente.idSeguimiento,
        idServidor: existente.idSeguimiento,
        idIncidenciaRemota: existente.idIncidencia,
        estado: existente.estado,
        syncEstado: existente.syncEstado ?? "SINCRONIZADO",
        fechaSincronizacion: existente.fechaSincronizacion,
      });
    }

    const incidencia = await resolveIncidencia(body);
    const fechaSincronizacion = new Date();

    const seguimiento = await prisma.seguimientoIncidencia.create({
      data: {
        idIncidencia: incidencia.idIncidencia,
        idUsuarioGRD: texto(body.idUsuarioGRD) || null,
        fechaSeguimiento: parseFecha(body.fechaSeguimiento),
        situacion: texto(body.situacion) || null,
        descripcion: texto(body.descripcion) || null,
        necesidadesPendientes: texto(body.necesidadesPendientes) || null,
        recomendaciones: texto(body.recomendaciones) || null,
        estado: texto(body.estado) || "REGISTRADO",
        observaciones: texto(body.observaciones) || null,
        uuidMovil,
        syncEstado: "SINCRONIZADO",
        fechaSincronizacion,
      },
      select: {
        idSeguimiento: true,
        idIncidencia: true,
        estado: true,
        syncEstado: true,
        fechaSincronizacion: true,
      },
    });

    return NextResponse.json({
      ok: true,
      duplicated: false,
      uuidSeguimiento: uuidMovil,
      idSeguimientoRemoto: seguimiento.idSeguimiento,
      idServidor: seguimiento.idSeguimiento,
      idIncidenciaRemota: seguimiento.idIncidencia,
      codigoCaso: incidencia.codigoCaso,
      estado: seguimiento.estado,
      syncEstado: seguimiento.syncEstado,
      fechaSincronizacion: seguimiento.fechaSincronizacion,
    });
  } catch (err) {
    if (err instanceof MobileSyncError) {
      return jsonError(err.message, err.status);
    }

    console.error("[Mobile Sync][Seguimientos]", err);

    return jsonError("No se pudo sincronizar el seguimiento móvil.", 500);
  }
}