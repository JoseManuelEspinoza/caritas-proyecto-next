import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { verifySession } from "@/app/lib/dal";

export const runtime = "nodejs";

function safeFilename(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 120);
}

export async function POST(req: NextRequest) {
  try {
    await verifySession();
  } catch {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
  }

  const REGION = process.env.AWS_REGION;
  const BUCKET = process.env.AWS_S3_BUCKET;
  const ACCESS_KEY = process.env.AWS_ACCESS_KEY_ID;
  const SECRET_KEY = process.env.AWS_SECRET_ACCESS_KEY;

  if (!REGION || !BUCKET || !ACCESS_KEY || !SECRET_KEY) {
    return NextResponse.json({ ok: false, message: "S3 no configurado en el servidor." });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, message: "No se pudo leer el archivo enviado." });
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ ok: false, message: "No se recibió ningún archivo." });
  }

  const key = `capacitaciones/materiales/${randomUUID()}-${safeFilename(file.name)}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const s3 = new S3Client({
    region: REGION,
    credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
  });

  try {
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: file.type || "application/octet-stream",
    }));
  } catch (err) {
    console.error("[upload-material] S3 error:", err);
    return NextResponse.json({ ok: false, message: "No se pudo subir el archivo a S3." });
  }

  const publicBase = process.env.AWS_S3_PUBLIC_BASE_URL;
  let publicUrl: string;
  if (publicBase) {
    publicUrl = `${publicBase.replace(/\/$/, "")}/${key}`;
  } else {
    // Presigned GET URL — máximo 7 días permitido por AWS para credenciales IAM
    const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
    publicUrl = await getSignedUrl(s3, cmd, { expiresIn: 60 * 60 * 24 * 7 });
  }

  return NextResponse.json({ ok: true, publicUrl });
}
