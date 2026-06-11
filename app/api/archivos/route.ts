import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/app/lib/dal";
import { isS3Configured, presignGet } from "@/app/lib/s3";
import { TIPOS_UPLOAD } from "@/app/lib/upload-config";

export const runtime = "nodejs";

/**
 * Enlace ESTABLE a un archivo de S3: /api/archivos?key=<object-key>
 *
 * En la base de datos se guarda el key (o esta URL); al abrirla, se genera
 * una URL prefirmada fresca y se redirige. Así los enlaces guardados nunca
 * expiran (a diferencia de guardar URLs prefirmadas, que mueren a los 7 días).
 */
export async function GET(req: NextRequest) {
  try {
    await verifySession();
  } catch {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  if (!isS3Configured()) {
    return NextResponse.json({ message: "S3 no configurado." }, { status: 503 });
  }

  const key = req.nextUrl.searchParams.get("key")?.trim();
  if (!key) return NextResponse.json({ message: "Falta el parámetro key." }, { status: 400 });

  // Solo se sirven archivos de las carpetas conocidas del sistema.
  const prefijos = Object.values(TIPOS_UPLOAD).map((t) => `${t.prefijo}/`);
  if (key.includes("..") || !prefijos.some((p) => key.startsWith(p))) {
    return NextResponse.json({ message: "Archivo no permitido." }, { status: 403 });
  }

  try {
    const url = await presignGet(key);
    return NextResponse.redirect(url, 302);
  } catch {
    return NextResponse.json({ message: "No se pudo generar el enlace." }, { status: 500 });
  }
}
