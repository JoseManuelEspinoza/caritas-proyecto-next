import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { isS3Configured, presignPut, presignGet, safeFilename } from "@/app/lib/s3";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type EvidenciaMovilPayload = {
  uuidEvidencia: string;

  // Referencia local o remota de la incidencia.
  uuidReferencia?: string | null;
  idReferenciaRemota?: string | null;
  idIncidenciaRemota?: string | null;

  tipoReferencia?: string | null;

  // Usuario que carga. Para producción debería venir desde login/sesión móvil.
  idUsuarioCargaGRD?: string | null;
  idUsuarioRemoto?: string | null;

  // Archivo / metadata.
  nombreArchivo?: string | null;
  contentType?: string | null;
  formatoArchivo?: string | null;
  tamanoArchivo?: number | null;
  descripcion?: string | null;

  // Opción A: archivo como Base64.
  base64?: string | null;

  // Opción B: archivo ya subido o key remota.
  urlArchivo?: string | null;
  urlS3?: string | null;
  key?: string | null;

  latitud?: number | null;
  longitud?: number | null;
  lat?: number | null;
  lng?: number | null;
};

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

  const provided = request.headers.get("x-mobile-sync-key")?.trim() ?? "";

  if (provided !== expected) {
    return NextResponse.json(
      { ok: false, message: "No autorizado." },
      { status: 401 }
    );
  }

  return null;
}

function cleanBase64(input: string): string {
  const commaIndex = input.indexOf(",");
  if (input.startsWith("data:") && commaIndex >= 0) {
    return input.slice(commaIndex + 1);
  }

  return input;
}

function normalizeTipoReferencia(value?: string | null): string {
  return value?.trim().toUpperCase() || "INCIDENCIA";
}

async function resolveTipoReferencia(codigoEntidad: string) {
  if (codigoEntidad !== "INCIDENCIA") {
    throw new Error("Por ahora solo se soportan evidencias de INCIDENCIA desde móvil.");
  }

  return prisma.tipoReferencia.upsert({
    where: { codigoEntidad },
    update: {},
    create: {
      codigoEntidad,
      nombreEntidad: "Incidencia",
      descripcion: "Referencia transversal para Incidencia",
      estado: "ACTIVO",
    },
  });
}

async function resolveIdReferencia(body: EvidenciaMovilPayload): Promise<string> {
  const idRemoto = body.idReferenciaRemota?.trim() || body.idIncidenciaRemota?.trim();

  if (idRemoto) {
    const incidencia = await prisma.incidencia.findUnique({
      where: { idIncidencia: idRemoto },
      select: { idIncidencia: true },
    });

    if (!incidencia) {
      throw new Error("La incidencia remota indicada no existe.");
    }

    return incidencia.idIncidencia;
  }

  const uuidReferencia = body.uuidReferencia?.trim();

  if (uuidReferencia) {
    const incidencia = await prisma.incidencia.findUnique({
      where: { uuidMovil: uuidReferencia },
      select: { idIncidencia: true },
    });

    if (incidencia) return incidencia.idIncidencia;
  }

  throw new Error(
    "No se pudo resolver la incidencia asociada. Envía idReferenciaRemota/idIncidenciaRemota o uuidReferencia sincronizado."
  );
}

async function resolveUsuarioCarga(body: EvidenciaMovilPayload): Promise<string> {
  const candidates = [
    body.idUsuarioCargaGRD?.trim(),
    body.idUsuarioRemoto?.trim(),
    process.env.MOBILE_SYNC_USUARIO_GRD_ID?.trim(),
  ].filter(Boolean) as string[];

  for (const id of candidates) {
    const usuario = await prisma.usuarioGRD.findUnique({
      where: { idUsuarioGRD: id },
      select: { idUsuarioGRD: true },
    });
    if (usuario) return usuario.idUsuarioGRD;
  }

  throw new Error(
    "No se puede identificar al usuario para registrar la evidencia."
  );
}

async function uploadBase64ToS3(
  body: EvidenciaMovilPayload,
  idReferencia: string
): Promise<{ urlArchivo: string; tamanoArchivo: number } | null> {
  if (!body.base64?.trim()) return null;

  if (!isS3Configured()) {
    throw new Error(
      "S3 no está configurado. No se puede subir evidencia Base64 desde móvil."
    );
  }

  const contentType =
    body.contentType?.trim() ||
    body.formatoArchivo?.trim() ||
    "application/octet-stream";

  const nombreArchivo = safeFilename(body.nombreArchivo?.trim() || "evidencia-movil");
  const key = `evidencias/incidencias/${idReferencia}/${randomUUID()}-${nombreArchivo}`;

  const buffer = Buffer.from(cleanBase64(body.base64.trim()), "base64");

  if (buffer.byteLength <= 0) {
    throw new Error("El archivo Base64 está vacío o no es válido.");
  }

  const uploadUrl = await presignPut(key, contentType);

  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
    },
    body: new Uint8Array(buffer),
  });

  if (!uploadResponse.ok) {
    throw new Error(
      `No se pudo subir la evidencia a S3. HTTP ${uploadResponse.status}`
    );
  }

  return {
    urlArchivo: key,
    tamanoArchivo: buffer.byteLength,
  };
}

const ALLOWED_S3_PREFIXES = [
  "evidencias/",
  "evidencia-kit/",
  "evidencia-grd/",
];

function resolveUrlArchivo(body: EvidenciaMovilPayload): string | null {
  const candidates = [body.urlArchivo, body.urlS3, body.key].map((v) => v?.trim()).filter(Boolean);
  // Rechazar URIs locales de Android (content://, file://) — no son válidas en el servidor
  const valid = candidates.find((v) => v && /^https?:\/\//i.test(v));
  return valid ?? null;
}

export async function GET(request: Request) {
  const unauthorized = requireMobileSyncKey(request);
  if (unauthorized) return unauthorized;
  return NextResponse.json({
    ok: true,
    endpoint: "/api/mobile/sync/evidencias",
    method: "POST",
    message: "Endpoint de sincronización móvil de evidencias activo.",
  });
}

export async function POST(request: Request) {
  const unauthorized = requireMobileSyncKey(request);
  if (unauthorized) return unauthorized;

  let body: EvidenciaMovilPayload;

  try {
    body = await request.json();
  } catch {
    return jsonError("Body JSON inválido.");
  }

  const uuidMovil = body.uuidEvidencia?.trim();

  if (!uuidMovil) {
    return jsonError("uuidEvidencia es obligatorio.");
  }

  try {
    const existente = await prisma.evidenciaGRD.findUnique({
      where: { uuidMovil },
      select: {
        idEvidenciaGRD: true,
        uuidMovil: true,
        idReferencia: true,
        nombreArchivo: true,
        urlArchivo: true,
        syncEstado: true,
        fechaSincronizacion: true,
      },
    });

    if (existente) {
      let urlFirmada: string | null = null;
      if (existente.urlArchivo && isS3Configured() && !/^https?:\/\//i.test(existente.urlArchivo)) {
        try { urlFirmada = await presignGet(existente.urlArchivo); } catch { /* ignora */ }
      }
      return NextResponse.json({
        ok: true,
        duplicated: true,
        uuidEvidencia: uuidMovil,
        idEvidenciaRemota: existente.idEvidenciaGRD,
        idServidor: existente.idEvidenciaGRD,
        idReferenciaRemota: existente.idReferencia,
        nombreArchivo: existente.nombreArchivo,
        urlArchivo: existente.urlArchivo,
        urlFirmada: urlFirmada ?? existente.urlArchivo,
        syncEstado: existente.syncEstado ?? "SINCRONIZADO",
        fechaSincronizacion: existente.fechaSincronizacion,
      });
    }

    const tipoCodigo = normalizeTipoReferencia(body.tipoReferencia);
    const tipoReferencia = await resolveTipoReferencia(tipoCodigo);
    const idReferencia = await resolveIdReferencia(body);
    const idUsuarioCargaGRD = await resolveUsuarioCarga(body);

    const subidaS3 = await uploadBase64ToS3(body, idReferencia);
    const urlArchivo = subidaS3?.urlArchivo || resolveUrlArchivo(body);

    if (!urlArchivo) {
      return jsonError(
        "No se recibió archivo para registrar. Envía base64 o urlArchivo/urlS3/key."
      );
    }

    const contentType =
      body.contentType?.trim() ||
      body.formatoArchivo?.trim() ||
      "application/octet-stream";

    const fechaSincronizacion = new Date();

    const evidencia = await prisma.evidenciaGRD.create({
      data: {
        idTipoReferencia: tipoReferencia.idTipoReferencia,
        idReferencia,
        idUsuarioCargaGRD,
        nombreArchivo: body.nombreArchivo?.trim() || "evidencia-movil",
        urlArchivo,
        formatoArchivo: contentType,
        descripcion: body.descripcion?.trim() || "Evidencia de campo",
        tamanoArchivo: subidaS3?.tamanoArchivo ?? body.tamanoArchivo ?? null,
        latitud: body.lat ?? body.latitud ?? null,
        longitud: body.lng ?? body.longitud ?? null,
        estado: "ACTIVO",
        uuidMovil,
        syncEstado: "SINCRONIZADO",
        fechaSincronizacion,
      },
      select: {
        idEvidenciaGRD: true,
        idReferencia: true,
        nombreArchivo: true,
        urlArchivo: true,
        syncEstado: true,
        fechaSincronizacion: true,
      },
    });

    let urlFirmada: string | null = null;
    if (evidencia.urlArchivo && isS3Configured() && !/^https?:\/\//i.test(evidencia.urlArchivo)) {
      try { urlFirmada = await presignGet(evidencia.urlArchivo); } catch { /* ignora */ }
    }

    return NextResponse.json({
      ok: true,
      duplicated: false,
      uuidEvidencia: uuidMovil,
      idEvidenciaRemota: evidencia.idEvidenciaGRD,
      idServidor: evidencia.idEvidenciaGRD,
      idReferenciaRemota: evidencia.idReferencia,
      nombreArchivo: evidencia.nombreArchivo,
      urlArchivo: evidencia.urlArchivo,
      urlFirmada: urlFirmada ?? evidencia.urlArchivo,
      syncEstado: evidencia.syncEstado,
      fechaSincronizacion: evidencia.fechaSincronizacion,
    });
  } catch (err) {
    console.error("[Mobile Sync][Evidencias]", err);

    return jsonError(
      err instanceof Error
        ? err.message
        : "No se pudo sincronizar la evidencia móvil.",
      500
    );
  }
}
