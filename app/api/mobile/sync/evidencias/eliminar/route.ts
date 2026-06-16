import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { isS3Configured } from "@/app/lib/s3";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function deleteFromS3(key: string): Promise<void> {
  if (!isS3Configured()) return;
  if (!key || /^https?:\/\//i.test(key)) return; // URL absoluta o vacía, no es un key

  const client = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      ...(process.env.AWS_SESSION_TOKEN ? { sessionToken: process.env.AWS_SESSION_TOKEN } : {}),
    },
  });

  await client.send(new DeleteObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET!,
    Key: key,
  }));
}

export async function POST(request: Request) {
  let body: { uuidEvidencia?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Body JSON inválido." }, { status: 400 });
  }

  const uuidMovil = body.uuidEvidencia?.trim();
  if (!uuidMovil) {
    return NextResponse.json({ ok: false, message: "uuidEvidencia es obligatorio." }, { status: 400 });
  }

  try {
    // Buscar por uuidMovil primero, luego por idEvidenciaGRD (evidencias subidas desde web)
    const evidencia =
      await prisma.evidenciaGRD.findUnique({
        where: { uuidMovil },
        select: { idEvidenciaGRD: true, urlArchivo: true },
      }) ??
      await prisma.evidenciaGRD.findUnique({
        where: { idEvidenciaGRD: uuidMovil },
        select: { idEvidenciaGRD: true, urlArchivo: true },
      });

    if (!evidencia) {
      return NextResponse.json({ ok: true, message: "Evidencia no encontrada (ya eliminada)." });
    }

    // Borrar archivo de S3
    if (evidencia.urlArchivo) {
      try {
        await deleteFromS3(evidencia.urlArchivo);
      } catch (s3Err) {
        console.warn("[Mobile Sync][Evidencias Eliminar] No se pudo borrar S3:", s3Err);
        // Continúa aunque S3 falle — al menos borramos de la BD
      }
    }

    await prisma.evidenciaGRD.update({
      where: { idEvidenciaGRD: evidencia.idEvidenciaGRD },
      data: { estado: "INACTIVO", deletedAt: new Date() },
    });

    return NextResponse.json({ ok: true, idEvidenciaGRD: evidencia.idEvidenciaGRD });
  } catch (err) {
    console.error("[Mobile Sync][Evidencias Eliminar]", err);
    return NextResponse.json({ ok: false, message: "No se pudo eliminar la evidencia." }, { status: 500 });
  }
}
