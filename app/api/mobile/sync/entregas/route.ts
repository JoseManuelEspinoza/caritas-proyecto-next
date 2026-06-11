import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

type EntregaMovilPayload = {
  uuidEntrega?: string;

  idEntrega?: string;
  codigoEntrega?: string;

  idIncidencia?: string;
  idIncidenciaRemota?: string;
  idServidor?: string;
  uuidIncidencia?: string;
  uuidIncidenciaMovil?: string;
  uuidReferencia?: string;
  codigoCaso?: string;

  idSolicitud?: string;
  idSolicitudRemota?: string;

  idUsuarioResponsableGRD?: string;
  idUsuarioGRD?: string;

  fechaEntrega?: string | null;
  lugarEntrega?: string | null;
  tipoAyuda?: string | null;
  descripcionAyuda?: string | null;
  cantidadEntregada?: number | string | null;
  conformidadRecepcion?: boolean | string | null;
  entregaParcial?: boolean | string | null;
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

function parseFecha(value?: string | null): Date | null {
  const limpio = texto(value);

  if (!limpio) return new Date();

  const fecha = new Date(limpio);

  if (Number.isNaN(fecha.getTime())) {
    throw new MobileSyncError("fechaEntrega no tiene un formato válido.");
  }

  return fecha;
}

function parseCantidad(value?: number | string | null): number | null {
  if (value === null || value === undefined || value === "") return null;

  const cantidad = Number(value);

  if (!Number.isFinite(cantidad) || !Number.isInteger(cantidad)) {
    throw new MobileSyncError("cantidadEntregada debe ser un número entero.");
  }

  if (cantidad <= 0) {
    throw new MobileSyncError("cantidadEntregada debe ser mayor que cero.");
  }

  return cantidad;
}

function parseBooleanOpcional(value?: boolean | string | null): boolean | null {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "boolean") return value;

  const limpio = value.trim().toLowerCase();

  if (["true", "1", "si", "sí", "yes"].includes(limpio)) return true;
  if (["false", "0", "no"].includes(limpio)) return false;

  throw new MobileSyncError("El valor booleano recibido no es válido.");
}

function validarPayload(body: EntregaMovilPayload): string {
  const uuidMovil = texto(body.uuidEntrega);

  if (!uuidMovil) {
    throw new MobileSyncError("uuidEntrega es obligatorio.");
  }

  const tipoAyuda = texto(body.tipoAyuda);
  const descripcionAyuda = texto(body.descripcionAyuda);

  if (!tipoAyuda && !descripcionAyuda) {
    throw new MobileSyncError("Ingresa tipoAyuda o descripcionAyuda.");
  }

  if (tipoAyuda && tipoAyuda.length < 3) {
    throw new MobileSyncError("tipoAyuda debe tener al menos 3 caracteres.");
  }

  if (descripcionAyuda && descripcionAyuda.length < 5) {
    throw new MobileSyncError("descripcionAyuda debe tener al menos 5 caracteres.");
  }

  parseCantidad(body.cantidadEntregada);
  parseFecha(body.fechaEntrega);
  parseBooleanOpcional(body.conformidadRecepcion);
  parseBooleanOpcional(body.entregaParcial);

  return uuidMovil;
}

async function resolveIncidencia(body: EntregaMovilPayload): Promise<{
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
    "No se encontró la incidencia asociada a la entrega. Envía idIncidenciaRemota, uuidIncidencia o codigoCaso."
  );
}

async function resolveSolicitudId(body: EntregaMovilPayload): Promise<string | null> {
  const idSolicitud = texto(body.idSolicitudRemota) || texto(body.idSolicitud);

  if (!idSolicitud) return null;

  const solicitud = await prisma.solicitudAyudaHumanitaria.findUnique({
    where: { idSolicitud },
    select: { idSolicitud: true },
  });

  if (!solicitud) {
    throw new MobileSyncError("No se encontró la solicitud de ayuda indicada.");
  }

  return solicitud.idSolicitud;
}

async function resolveUsuarioResponsableId(
  body: EntregaMovilPayload
): Promise<string | null> {
  const idUsuarioResponsableGRD =
    texto(body.idUsuarioResponsableGRD) || texto(body.idUsuarioGRD);

  if (!idUsuarioResponsableGRD) return null;

  const usuario = await prisma.usuarioGRD.findUnique({
    where: { idUsuarioGRD: idUsuarioResponsableGRD },
    select: { idUsuarioGRD: true },
  });

  if (!usuario) {
    throw new MobileSyncError("No se encontró el usuario responsable GRD indicado.");
  }

  return usuario.idUsuarioGRD;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/mobile/sync/entregas",
    method: "POST",
    message: "Endpoint de sincronización móvil de entregas activo.",
  });
}

export async function POST(request: Request) {
  const unauthorized = requireMobileSyncKey(request);
  if (unauthorized) return unauthorized;

  let body: EntregaMovilPayload;

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

    return jsonError("Payload de entrega inválido.");
  }

  try {
    const existente = await prisma.entregaAyudaHumanitaria.findUnique({
      where: { uuidMovil },
      select: {
        idEntrega: true,
        idIncidencia: true,
        codigoEntrega: true,
        fechaEntrega: true,
        lugarEntrega: true,
        tipoAyuda: true,
        descripcionAyuda: true,
        cantidadEntregada: true,
        conformidadRecepcion: true,
        entregaParcial: true,
        observaciones: true,
        syncEstado: true,
        fechaSincronizacion: true,
        },
    });

    if (existente) {
      return NextResponse.json({
        ok: true,
        duplicated: true,
        uuidEntrega: uuidMovil,
        idEntregaRemota: existente.idEntrega,
        idServidor: existente.idEntrega,
        idIncidenciaRemota: existente.idIncidencia,
        codigoEntrega: existente.codigoEntrega,
        fechaEntrega: existente.fechaEntrega,
        lugarEntrega: existente.lugarEntrega,
        conformidadRecepcion: existente.conformidadRecepcion,
        entregaParcial: existente.entregaParcial,
        observaciones: existente.observaciones,
        tipoAyuda: existente.tipoAyuda,
        descripcionAyuda: existente.descripcionAyuda,
        cantidadEntregada: existente.cantidadEntregada,
        syncEstado: existente.syncEstado ?? "SINCRONIZADO",
        fechaSincronizacion: existente.fechaSincronizacion,
      });
    }

    const incidencia = await resolveIncidencia(body);
    const idSolicitud = await resolveSolicitudId(body);
    const idUsuarioResponsableGRD = await resolveUsuarioResponsableId(body);
    const fechaSincronizacion = new Date();

    const entrega = await prisma.entregaAyudaHumanitaria.create({
      data: {
        idSolicitud,
        idIncidencia: incidencia.idIncidencia,
        idUsuarioResponsableGRD,
        codigoEntrega: texto(body.codigoEntrega) || null,
        fechaEntrega: parseFecha(body.fechaEntrega),
        lugarEntrega: texto(body.lugarEntrega) || null,
        tipoAyuda: texto(body.tipoAyuda) || null,
        descripcionAyuda: texto(body.descripcionAyuda) || null,
        cantidadEntregada: parseCantidad(body.cantidadEntregada),
        conformidadRecepcion: parseBooleanOpcional(body.conformidadRecepcion),
        entregaParcial: parseBooleanOpcional(body.entregaParcial) ?? false,
        observaciones: texto(body.observaciones) || null,
        uuidMovil,
        syncEstado: "SINCRONIZADO",
        fechaSincronizacion,
      },
      select: {
        idEntrega: true,
        idIncidencia: true,
        codigoEntrega: true,
        fechaEntrega: true,
        tipoAyuda: true,
        descripcionAyuda: true,
        cantidadEntregada: true,
        conformidadRecepcion: true,
        entregaParcial: true,
        syncEstado: true,
        fechaSincronizacion: true,
      },
    });

    return NextResponse.json({
      ok: true,
      duplicated: false,
      uuidEntrega: uuidMovil,
      idEntregaRemota: entrega.idEntrega,
      idServidor: entrega.idEntrega,
      idIncidenciaRemota: entrega.idIncidencia,
      codigoCaso: incidencia.codigoCaso,
      codigoEntrega: entrega.codigoEntrega,
      fechaEntrega: entrega.fechaEntrega,
      tipoAyuda: entrega.tipoAyuda,
      descripcionAyuda: entrega.descripcionAyuda,
      cantidadEntregada: entrega.cantidadEntregada,
      conformidadRecepcion: entrega.conformidadRecepcion,
      entregaParcial: entrega.entregaParcial,
      syncEstado: entrega.syncEstado,
      fechaSincronizacion: entrega.fechaSincronizacion,
    });
  } catch (err) {
    if (err instanceof MobileSyncError) {
      return jsonError(err.message, err.status);
    }

    console.error("[Mobile Sync][Entregas]", err);

    return jsonError("No se pudo sincronizar la entrega móvil.", 500);
  }
}