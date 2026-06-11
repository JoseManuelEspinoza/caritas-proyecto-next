import "server-only";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Integración con Amazon S3 (o cualquier almacén compatible S3) para las
 * evidencias. El navegador sube/descarga DIRECTO contra S3 mediante URLs
 * prefirmadas; las credenciales viven solo en el servidor.
 *
 * Variables de entorno (.env):
 *   AWS_REGION            ej. us-east-1
 *   AWS_S3_BUCKET         nombre del bucket
 *   AWS_ACCESS_KEY_ID     access key del usuario IAM
 *   AWS_SECRET_ACCESS_KEY secret del usuario IAM
 *   AWS_SESSION_TOKEN     (opcional) token de sesión temporal — requerido en AWS Academy
 *   AWS_S3_ENDPOINT       (opcional) endpoint S3-compatible (MinIO/R2). Si se usa,
 *                         conviene AWS_S3_FORCE_PATH_STYLE=true
 *   AWS_S3_PUBLIC_BASE_URL (opcional) base pública si el bucket sirve archivos
 *                         públicamente; si no se define, se usan URLs prefirmadas.
 */

const REGION = process.env.AWS_REGION;
const BUCKET = process.env.AWS_S3_BUCKET;
const ACCESS_KEY = process.env.AWS_ACCESS_KEY_ID;
const SECRET_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const SESSION_TOKEN = process.env.AWS_SESSION_TOKEN || undefined;
const ENDPOINT = process.env.AWS_S3_ENDPOINT || undefined;
const FORCE_PATH_STYLE = process.env.AWS_S3_FORCE_PATH_STYLE === "true";

/** ¿Hay credenciales/configuración suficientes para usar S3? */
export function isS3Configured(): boolean {
  return Boolean(REGION && BUCKET && ACCESS_KEY && SECRET_KEY);
}

let _client: S3Client | null = null;

function client(): S3Client {
  if (!isS3Configured()) {
    throw new Error(
      "S3 no está configurado. Define AWS_REGION, AWS_S3_BUCKET, AWS_ACCESS_KEY_ID y AWS_SECRET_ACCESS_KEY."
    );
  }

  if (!_client) {
    _client = new S3Client({
      region: REGION,
      endpoint: ENDPOINT,
      forcePathStyle: FORCE_PATH_STYLE,
      credentials: {
        accessKeyId: ACCESS_KEY!,
        secretAccessKey: SECRET_KEY!,
        ...(SESSION_TOKEN ? { sessionToken: SESSION_TOKEN } : {}),
      },
    });
  }

  return _client;
}

/** Sanea un nombre de archivo para usarlo dentro de un object key. */
export function safeFilename(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 120);
}

/** URL prefirmada para SUBIR (PUT) un objeto. Expira en `expiresIn` seg. */
export async function presignPut(
  key: string,
  contentType: string,
  expiresIn = 300
): Promise<string> {
  const cmd = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType });
  return getSignedUrl(client(), cmd, { expiresIn });
}

/** URL prefirmada para DESCARGAR/VER (GET) un objeto. Expira en `expiresIn` seg. */
export async function presignGet(key: string, expiresIn = 900): Promise<string> {
  // Si el bucket sirve público, devolvemos la URL pública directa.
  const publicBase = process.env.AWS_S3_PUBLIC_BASE_URL;
  if (publicBase) return `${publicBase.replace(/\/$/, "")}/${key}`;

  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(client(), cmd, { expiresIn });
}