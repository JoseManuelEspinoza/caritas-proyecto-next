"use server";

import { randomUUID } from "crypto";
import { verifySession } from "@/app/lib/dal";
import { isS3Configured, presignPut, safeFilename } from "@/app/lib/s3";
import { TIPOS_UPLOAD, validarArchivo, type TipoUpload } from "@/app/lib/upload-config";

/**
 * Punto ÚNICO de prefirmado de subidas a S3.
 *
 * El navegador valida, pide aquí una URL prefirmada y sube DIRECTO a S3 con
 * PUT; en la base de datos se persiste siempre el `key` (nunca URLs, que
 * expiran). La validación de tipo/tamaño se repite aquí en el servidor.
 *
 * Key resultante: <prefijo-del-tipo>/<entidadId|pendientes>/<uuid>-<archivo>
 */
export async function presignUpload(input: {
  tipo: TipoUpload;
  entidadId?: string | null;
  nombreArchivo: string;
  contentType: string;
  tamano: number;
}): Promise<{ ok: true; uploadUrl: string; key: string } | { ok: false; message: string }> {
  await verifySession();

  if (!isS3Configured()) {
    return {
      ok: false,
      message: "El almacenamiento de archivos (S3) aún no está configurado. Avisa al administrador.",
    };
  }

  const destino = TIPOS_UPLOAD[input.tipo];
  if (!destino) return { ok: false, message: "Destino de subida no reconocido." };

  const error = validarArchivo(
    { name: input.nombreArchivo || "archivo", type: input.contentType, size: input.tamano },
    destino.categoria
  );
  if (error) return { ok: false, message: error };

  const carpeta = input.entidadId?.trim() || "pendientes";
  const key = `${destino.prefijo}/${carpeta}/${randomUUID()}-${safeFilename(
    input.nombreArchivo || "archivo"
  )}`;

  try {
    const uploadUrl = await presignPut(key, input.contentType || "application/octet-stream");
    return { ok: true, uploadUrl, key };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "No se pudo preparar la subida.",
    };
  }
}
