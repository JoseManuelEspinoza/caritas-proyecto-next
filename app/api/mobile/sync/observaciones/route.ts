import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

type ObservacionMovilPayload = {
  uuidObservacion?: string;

  tipoReferencia?: string;
  codigoTipoReferencia?: string;

  idReferencia?: string;
  idReferenciaRemota?: string;
  uuidReferencia?: string;

  idIncidencia?: string;
  idIncidenciaRemota?: string;
  uuidIncidencia?: string;
  uuidIncidenciaMovil?: string;
  codigoCaso?: string;

  idSeguimiento?: string;
  idSeguimientoRemoto?: string;
  uuidSeguimiento?: string;

  idAviso?: string;
  idAvisoRemoto?: string;
  uuidAviso?: string;
  codigoAviso?: string;

  idUsuarioGRD?: string;

  textoObservacion?: string;
  observacion?: string;
  descripcion?: string;
  comentario?: string;

  fechaRegistro?: string | null;
  estado?: string | null;
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

function parseFecha(value?: string | null): Date {
  const limpio = texto(value);

  if (!limpio) return new Date();

  const fecha = new Date(limpio);

  if (Number.isNaN(fecha.getTime())) {
    throw new MobileSyncError("fechaRegistro no tiene un formato válido.");
  }

  return fecha;
}

function getTextoObservacion(body: ObservacionMovilPayload): string {
  return (
    texto(body.textoObservacion) ||
    texto(body.observacion) ||
    texto(body.descripcion) ||
    texto(body.comentario)
  );
}

function getTipoReferenciaBase(body: ObservacionMovilPayload): string {
  return (
    texto(body.tipoReferencia) ||
    texto(body.codigoTipoReferencia) ||
    "INCIDENCIA"
  ).toUpperCase();
}

function getTipoReferenciaCandidates(tipoBase: string): string[] {
  const normalizado = tipoBase.trim().toUpperCase();

  if (normalizado.includes("INCIDENCIA")) {
    return ["INCIDENCIA", "INCIDENCIA_GRD"];
  }

  if (normalizado.includes("SEGUIMIENTO")) {
    return ["SEGUIMIENTO", "SEGUIMIENTO_INCIDENCIA"];
  }

  if (normalizado.includes("AVISO")) {
    return ["AVISO", "AVISO_EMERGENCIA"];
  }

  return [normalizado, `${normalizado}_GRD`];
}

async function resolveTipoReferencia(body: ObservacionMovilPayload) {
  const tipoBase = getTipoReferenciaBase(body);
  const candidates = getTipoReferenciaCandidates(tipoBase);

  const tipoReferencia = await prisma.tipoReferencia.findFirst({
    where: {
      estado: "ACTIVO",
      OR: candidates.map((codigo) => ({
        codigoEntidad: {
          equals: codigo,
          mode: "insensitive" as const,
        },
      })),
    },
    select: {
      idTipoReferencia: true,
      codigoEntidad: true,
      nombreEntidad: true,
    },
  });

  if (!tipoReferencia) {
    throw new MobileSyncError(
      `No se encontró tipoReferencia activo para: ${candidates.join(", ")}.`
    );
  }

  return tipoReferencia;
}

async function resolveUsuarioGRD(body: ObservacionMovilPayload): Promise<string> {
  const idUsuarioGRD = texto(body.idUsuarioGRD);

  if (!idUsuarioGRD) {
    throw new MobileSyncError("idUsuarioGRD es obligatorio para registrar la observación.");
  }

  const usuario = await prisma.usuarioGRD.findUnique({
    where: { idUsuarioGRD },
    select: { idUsuarioGRD: true },
  });

  if (!usuario) {
    throw new MobileSyncError("No se encontró el usuario GRD indicado.");
  }

  return usuario.idUsuarioGRD;
}

async function resolveIncidenciaId(body: ObservacionMovilPayload): Promise<string | null> {
  const idIncidencia = texto(body.idIncidenciaRemota) || texto(body.idIncidencia);

  if (idIncidencia) {
    const incidencia = await prisma.incidencia.findUnique({
      where: { idIncidencia },
      select: { idIncidencia: true },
    });

    if (incidencia) return incidencia.idIncidencia;
  }

  const uuidIncidencia =
    texto(body.uuidIncidencia) ||
    texto(body.uuidIncidenciaMovil) ||
    texto(body.uuidReferencia);

  if (uuidIncidencia) {
    const incidencia = await prisma.incidencia.findUnique({
      where: { uuidMovil: uuidIncidencia },
      select: { idIncidencia: true },
    });

    if (incidencia) return incidencia.idIncidencia;
  }

  const codigoCaso = texto(body.codigoCaso);

  if (codigoCaso) {
    const incidencia = await prisma.incidencia.findUnique({
      where: { codigoCaso },
      select: { idIncidencia: true },
    });

    if (incidencia) return incidencia.idIncidencia;
  }

  return null;
}

async function resolveSeguimientoId(body: ObservacionMovilPayload): Promise<string | null> {
  const idSeguimiento =
    texto(body.idSeguimientoRemoto) ||
    texto(body.idSeguimiento);

  if (idSeguimiento) {
    const seguimiento = await prisma.seguimientoIncidencia.findUnique({
      where: { idSeguimiento },
      select: { idSeguimiento: true },
    });

    if (seguimiento) return seguimiento.idSeguimiento;
  }

  const uuidSeguimiento =
    texto(body.uuidSeguimiento) ||
    texto(body.uuidReferencia);

  if (uuidSeguimiento) {
    const seguimiento = await prisma.seguimientoIncidencia.findUnique({
      where: { uuidMovil: uuidSeguimiento },
      select: { idSeguimiento: true },
    });

    if (seguimiento) return seguimiento.idSeguimiento;
  }

  return null;
}

async function resolveAvisoId(body: ObservacionMovilPayload): Promise<string | null> {
  const idAviso = texto(body.idAvisoRemoto) || texto(body.idAviso);

  if (idAviso) {
    const aviso = await prisma.avisoEmergencia.findUnique({
      where: { idAviso },
      select: { idAviso: true },
    });

    if (aviso) return aviso.idAviso;
  }

  const uuidAviso = texto(body.uuidAviso) || texto(body.uuidReferencia);

  if (uuidAviso) {
    const aviso = await prisma.avisoEmergencia.findUnique({
      where: { uuidMovil: uuidAviso },
      select: { idAviso: true },
    });

    if (aviso) return aviso.idAviso;
  }

  const codigoAviso = texto(body.codigoAviso);

  if (codigoAviso) {
    const aviso = await prisma.avisoEmergencia.findUnique({
      where: { codigoAviso },
      select: { idAviso: true },
    });

    if (aviso) return aviso.idAviso;
  }

  return null;
}

async function resolveIdReferencia(
  body: ObservacionMovilPayload,
  codigoEntidad: string
): Promise<string> {
  const idReferencia = texto(body.idReferenciaRemota) || texto(body.idReferencia);

  if (idReferencia) return idReferencia;

  const codigo = codigoEntidad.toUpperCase();

  if (codigo.includes("INCIDENCIA")) {
    const id = await resolveIncidenciaId(body);

    if (id) return id;

    throw new MobileSyncError(
      "No se encontró la incidencia asociada. Envía idIncidenciaRemota, uuidIncidencia o codigoCaso."
    );
  }

  if (codigo.includes("SEGUIMIENTO")) {
    const id = await resolveSeguimientoId(body);

    if (id) return id;

    throw new MobileSyncError(
      "No se encontró el seguimiento asociado. Envía idSeguimientoRemoto o uuidSeguimiento."
    );
  }

  if (codigo.includes("AVISO")) {
    const id = await resolveAvisoId(body);

    if (id) return id;

    throw new MobileSyncError(
      "No se encontró el aviso asociado. Envía idAvisoRemoto, uuidAviso o codigoAviso."
    );
  }

  throw new MobileSyncError(
    "Para este tipoReferencia debes enviar idReferenciaRemota o idReferencia."
  );
}

function validarPayload(body: ObservacionMovilPayload): string {
  const uuidMovil = texto(body.uuidObservacion);

  if (!uuidMovil) {
    throw new MobileSyncError("uuidObservacion es obligatorio.");
  }

  const observacion = getTextoObservacion(body);

  if (!observacion) {
    throw new MobileSyncError("textoObservacion es obligatorio.");
  }

  if (observacion.length < 5) {
    throw new MobileSyncError("textoObservacion debe tener al menos 5 caracteres.");
  }

  return uuidMovil;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/mobile/sync/observaciones",
    method: "POST",
    message: "Endpoint de sincronización móvil de observaciones activo.",
  });
}

export async function POST(request: Request) {
  const unauthorized = requireMobileSyncKey(request);
  if (unauthorized) return unauthorized;

  let body: ObservacionMovilPayload;

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

    return jsonError("Payload de observación inválido.");
  }

  try {
    const existente = await prisma.observacionGRD.findUnique({
      where: { uuidMovil },
      select: {
        idObservacionGRD: true,
        idTipoReferencia: true,
        idReferencia: true,
        textoObservacion: true,
        estado: true,
        syncEstado: true,
        fechaSincronizacion: true,
      },
    });

    if (existente) {
      return NextResponse.json({
        ok: true,
        duplicated: true,
        uuidObservacion: uuidMovil,
        idObservacionRemota: existente.idObservacionGRD,
        idServidor: existente.idObservacionGRD,
        idTipoReferencia: existente.idTipoReferencia,
        idReferenciaRemota: existente.idReferencia,
        textoObservacion: existente.textoObservacion,
        estado: existente.estado,
        syncEstado: existente.syncEstado ?? "SINCRONIZADO",
        fechaSincronizacion: existente.fechaSincronizacion,
      });
    }

    const tipoReferencia = await resolveTipoReferencia(body);
    const idReferencia = await resolveIdReferencia(
      body,
      tipoReferencia.codigoEntidad
    );
    const idUsuarioGRD = await resolveUsuarioGRD(body);
    const fechaSincronizacion = new Date();

    const observacion = await prisma.observacionGRD.create({
      data: {
        idTipoReferencia: tipoReferencia.idTipoReferencia,
        idReferencia,
        idUsuarioGRD,
        textoObservacion: getTextoObservacion(body),
        fechaRegistro: parseFecha(body.fechaRegistro),
        estado: texto(body.estado) || "ACTIVO",
        uuidMovil,
        syncEstado: "SINCRONIZADO",
        fechaSincronizacion,
      },
      select: {
        idObservacionGRD: true,
        idTipoReferencia: true,
        idReferencia: true,
        textoObservacion: true,
        estado: true,
        syncEstado: true,
        fechaSincronizacion: true,
      },
    });

    return NextResponse.json({
      ok: true,
      duplicated: false,
      uuidObservacion: uuidMovil,
      idObservacionRemota: observacion.idObservacionGRD,
      idServidor: observacion.idObservacionGRD,
      idTipoReferencia: observacion.idTipoReferencia,
      idReferenciaRemota: observacion.idReferencia,
      textoObservacion: observacion.textoObservacion,
      estado: observacion.estado,
      syncEstado: observacion.syncEstado,
      fechaSincronizacion: observacion.fechaSincronizacion,
    });
  } catch (err) {
    if (err instanceof MobileSyncError) {
      return jsonError(err.message, err.status);
    }

    console.error("[Mobile Sync][Observaciones]", err);

    return jsonError("No se pudo sincronizar la observación móvil.", 500);
  }
}