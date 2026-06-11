import { presignEvidencia } from "@/app/actions/evidencias";

/**
 * Sube un archivo de evidencia a S3 (presign + PUT) y devuelve el object key.
 * Lanza Error si el presign falla o el PUT no es 2xx.
 * Centraliza el patrón que antes estaba duplicado en varios paneles.
 */
export async function subirEvidencia(file: File, incidenciaId: string): Promise<string> {
  const contentType = file.type || "application/octet-stream";
  const res = await presignEvidencia({
    nombreArchivo: file.name,
    contentType,
    incidenciaId,
  });
  if (!res.ok) throw new Error(res.message);
  const put = await fetch(res.uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": contentType },
  });
  if (!put.ok) throw new Error(`Error al subir (${put.status})`);
  return res.key;
}
