import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { isS3Configured, presignPut, presignGet, safeFilename } from "@/app/lib/s3";
import { TIPOS_UPLOAD } from "@/app/lib/upload-config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type EvidenciaMovilPayload = {
  uuidEvidencia: string;

  // Referencia local o remota de la incidencia.
  uuidReferencia?: string | null;
  idReferenciaRemota?: string | null;
  idIncidenciaRemota?: string | null;
  uuidEntrega?: string | null;
  idEntrega?: string | null;
  idEntregaRemota?: string | null;

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
  if (codigoEntidad === "INCIDENCIA") {
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

  if (codigoEntidad === "ENTREGA_AYUDA_HUMANITARIA") {
    return prisma.tipoReferencia.upsert({
      where: { codigoEntidad },
      update: {},
      create: {
        codigoEntidad,
        nombreEntidad: "Entrega de ayuda humanitaria",
        descripcion: "Referencia transversal para entrega de ayuda humanitaria",
        estado: "ACTIVO",
      },
    });
  }

  throw new Error("Tipo de referencia no soportado desde móvil.");
}

async function resolveIdReferencia(body: EvidenciaMovilPayload, tipoCodigo: string): Promise<string> {
  if (tipoCodigo === "ENTREGA_AYUDA_HUMANITARIA") {
    const entregaCandidates = [
      body.idReferenciaRemota,
      body.idEntregaRemota,
      body.idEntrega,
      body.uuidEntrega,
      body.uuidReferencia,
    ]
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value));

    for (const candidate of entregaCandidates) {
      const entrega =
        candidate === body.uuidEntrega?.trim() || candidate === body.uuidReferencia?.trim()
          ? await prisma.entregaAyudaHumanitaria.findUnique({
              where: { uuidMovil: candidate },
              select: { idEntrega: true },
            })
          : await prisma.entregaAyudaHumanitaria.findUnique({
              where: { idEntrega: candidate },
              select: { idEntrega: true },
            });

      if (entrega) {
        return entrega.idEntrega;
      }
    }

    throw new Error(
      "No se pudo resolver la entrega asociada. Envía idReferenciaRemota, idEntregaRemota, idEntrega, uuidEntrega o uuidReferencia."
    );
  }

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
  // H3 — Anti-suplantación: si el servidor fija la identidad mediante
  // MOBILE_SYNC_USUARIO_GRD_ID (recomendado en producción), se IGNORA cualquier
  // id enviado en el body. Así un llamante no puede atribuir la evidencia a un
  // usuario arbitrario. Si la variable no está definida, se mantiene el
  // comportamiento previo (id desde el body) para no romper el cliente móvil
  // actual, que aún no envía un token por usuario.
  const idFijadoServidor = process.env.MOBILE_SYNC_USUARIO_GRD_ID?.trim();

  const candidates = idFijadoServidor
    ? [idFijadoServidor]
    : ([body.idUsuarioCargaGRD?.trim(), body.idUsuarioRemoto?.trim()].filter(
        Boolean
      ) as string[]);

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

// H4 — Prefijos S3 permitidos: se derivan de la MISMA configuración que usa el
// proxy web (TIPOS_UPLOAD), no de nombres hardcodeados. Así la lista no depende
// de que el archivo se llame "evidencia" y queda consistente con todo el sistema
// (evidencias/, kits/, entregas/, capacitaciones/materiales/...).
const ALLOWED_S3_PREFIXES = Object.values(TIPOS_UPLOAD).map((t) => `${t.prefijo}/`);

/**
 * H4 — ¿El valor apunta al almacén S3 propio del sistema?
 * Acepta URLs http(s) que correspondan al bucket configurado (virtual-hosted o
 * path-style), al endpoint S3-compatible (MinIO/R2) o a la base pública. Así se
 * deja pasar la URL legítima que envía el móvil y se rechaza cualquier URL
 * externa (p. ej. de phishing).
 */
function esUrlDelAlmacenPropio(valor: string): boolean {
  if (!/^https?:\/\//i.test(valor)) return false;

  const v = valor.toLowerCase();

  const publicBase = process.env.AWS_S3_PUBLIC_BASE_URL?.trim().toLowerCase();
  if (publicBase && v.startsWith(publicBase.replace(/\/$/, ""))) return true;

  try {
    const url = new URL(valor);
    const host = url.host.toLowerCase();
    const path = url.pathname.toLowerCase();

    const endpoint = process.env.AWS_S3_ENDPOINT?.trim().toLowerCase();
    if (endpoint) {
      try {
        if (host === new URL(endpoint).host.toLowerCase()) return true;
      } catch {
        /* endpoint mal formado: se ignora */
      }
    }

    const bucket = process.env.AWS_S3_BUCKET?.trim().toLowerCase();
    if (bucket) {
      // virtual-hosted: <bucket>.s3.<region>.amazonaws.com
      // path-style:     s3.<region>.amazonaws.com/<bucket>/...
      if (host.startsWith(`${bucket}.`)) return true;
      if (host.includes(".amazonaws.com") && path.startsWith(`/${bucket}/`)) return true;
    }
  } catch {
    return false;
  }

  return false;
}

/**
 * H4 — Solo se aceptan (a) keys relativos con prefijo conocido o (b) URLs del
 * almacén propio. Se rechazan URLs externas y URIs locales de Android
 * (content://, file://), que no son válidas en el servidor.
 */
function resolveUrlArchivo(body: EvidenciaMovilPayload): string | null {
  const candidates = [body.urlArchivo, body.urlS3, body.key]
    .map((v) => v?.trim())
    .filter((v): v is string => Boolean(v));

  const valido = candidates.find(
    (v) => ALLOWED_S3_PREFIXES.some((p) => v.startsWith(p)) || esUrlDelAlmacenPropio(v)
  );

  return valido ?? null;
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
    const idReferencia = await resolveIdReferencia(body, tipoCodigo);
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
