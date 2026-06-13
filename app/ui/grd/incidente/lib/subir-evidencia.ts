import { subirArchivoS3 } from "@/app/ui/shared/file-upload";

/**
 * Sube un archivo de evidencia a S3 y devuelve el object key.
 * Lanza Error con mensaje legible si el archivo no es válido o la subida falla.
 * Usa el flujo estándar del sistema (upload-config + presign + PUT directo),
 * que valida tipo y tamaño igual en cliente y servidor.
 */
export async function subirEvidencia(file: File, incidenciaId: string): Promise<string> {
  const subido = await subirArchivoS3(file, {
    tipo: "evidencia-incidencia",
    entidadId: incidenciaId,
  });
  return subido.key;
}
