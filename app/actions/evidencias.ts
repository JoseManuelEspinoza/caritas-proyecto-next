"use server";

import { randomUUID } from "crypto";
import { verifySession } from "@/app/lib/dal";
import { getUsuarioGRDId } from "@/app/lib/usuario-grd";
import { isS3Configured, presignPut, presignGet, safeFilename, uploadBuffer } from "@/app/lib/s3";
import { prisma } from "@/app/lib/prisma";

const ID_TIPO_KIT = "bfbdd552-22f3-48be-81db-c82b6e01ddb5";
const ID_TIPO_INCIDENCIA = "bd9d943b-60a0-4a69-96f2-2c3b5eb95d26";

/**
 * Genera una URL prefirmada para que el navegador suba una evidencia DIRECTO a S3.
 * Devuelve también el `key` (puntero canónico) que luego se persiste en EvidenciaGRD.
 */
export async function presignEvidencia(input: {
  nombreArchivo: string;
  contentType: string;
  incidenciaId?: string | null;
}): Promise<
  { ok: true; uploadUrl: string; key: string } | { ok: false; message: string }
> {
  await verifySession();

  if (!isS3Configured()) {
    return {
      ok: false,
      message:
        "El almacenamiento de archivos (S3) aún no está configurado. Avisa al administrador.",
    };
  }

  const ct = input.contentType || "application/octet-stream";
  const carpeta = input.incidenciaId?.trim() || "pendientes";
  const key = `evidencias/incidencias/${carpeta}/${randomUUID()}-${safeFilename(
    input.nombreArchivo || "archivo"
  )}`;

  try {
    const uploadUrl = await presignPut(key, ct);
    return { ok: true, uploadUrl, key };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "No se pudo preparar la subida.",
    };
  }
}

/** Indica al cliente si el módulo de archivos está disponible (para la UI). */
export async function s3Disponible(): Promise<boolean> {
  await verifySession();
  return isS3Configured();
}

// ─── Subida server-side (kits y entregas) ─────────────────────────────────────

export async function subirEvidenciaKit(idKit: string, formData: FormData) {
  await verifySession();
  const idUsuarioCargaGRD = await getUsuarioGRDId();
  if (!idUsuarioCargaGRD) return { message: "Sin perfil GRD asociado." };
  if (!isS3Configured()) return { message: "S3 no está configurado." };

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { message: "Sin archivo." };

  const key = `kits/${idKit}/${Date.now()}_${safeFilename(file.name)}`;
  try {
    await uploadBuffer(key, Buffer.from(await file.arrayBuffer()), file.type || "application/octet-stream");
  } catch (err) {
    console.error("[Evidencias] subirEvidenciaKit:", err);
    return { message: "No se pudo subir el archivo." };
  }

  await prisma.evidenciaGRD.create({
    data: {
      idTipoReferencia: ID_TIPO_KIT,
      idReferencia: idKit,
      idUsuarioCargaGRD,
      nombreArchivo: file.name,
      urlArchivo: key,
      formatoArchivo: file.type || null,
      tamanoArchivo: file.size,
    },
  });

  return { key };
}

export async function subirEvidenciaEntrega(idIncidencia: string, formData: FormData) {
  await verifySession();
  const idUsuarioCargaGRD = await getUsuarioGRDId();
  if (!idUsuarioCargaGRD) return { message: "Sin perfil GRD asociado." };
  if (!isS3Configured()) return { message: "S3 no está configurado." };

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { message: "Sin archivo." };

  const key = `entregas/${idIncidencia}/${Date.now()}_${safeFilename(file.name)}`;
  try {
    await uploadBuffer(key, Buffer.from(await file.arrayBuffer()), file.type || "application/octet-stream");
  } catch (err) {
    console.error("[Evidencias] subirEvidenciaEntrega:", err);
    return { message: "No se pudo subir el archivo." };
  }

  await prisma.evidenciaGRD.create({
    data: {
      idTipoReferencia: ID_TIPO_INCIDENCIA,
      idReferencia: idIncidencia,
      idUsuarioCargaGRD,
      nombreArchivo: file.name,
      urlArchivo: key,
      formatoArchivo: file.type || null,
      tamanoArchivo: file.size,
    },
  });

  return { key };
}

export async function listarEvidenciasKit(idKit: string) {
  await verifySession();
  const rows = await prisma.evidenciaGRD.findMany({
    where: { idTipoReferencia: ID_TIPO_KIT, idReferencia: idKit, estado: "ACTIVO" },
    orderBy: { fechaCarga: "desc" },
    select: { idEvidenciaGRD: true, nombreArchivo: true, urlArchivo: true, fechaCarga: true },
  });
  return rows.map((r) => ({ ...r, fechaCarga: r.fechaCarga.toISOString() }));
}

export async function listarEvidenciasEntrega(idIncidencia: string) {
  await verifySession();
  const rows = await prisma.evidenciaGRD.findMany({
    where: { idTipoReferencia: ID_TIPO_INCIDENCIA, idReferencia: idIncidencia, estado: "ACTIVO" },
    orderBy: { fechaCarga: "desc" },
    select: { idEvidenciaGRD: true, nombreArchivo: true, urlArchivo: true, fechaCarga: true },
  });
  return rows.map((r) => ({ ...r, fechaCarga: r.fechaCarga.toISOString() }));
}

export async function obtenerUrlDescarga(key: string) {
  await verifySession();
  return presignGet(key, 900);
}
