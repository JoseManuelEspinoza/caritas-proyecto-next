"use server";

import { randomUUID } from "crypto";
import { verifySession } from "@/app/lib/dal";
import { isS3Configured, presignPut, safeFilename } from "@/app/lib/s3";

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
