"use server";

import { randomUUID } from "crypto";
import { verifySession } from "@/app/lib/dal";
import { getUsuarioGRDId } from "@/app/lib/usuario-grd";
import { isS3Configured, presignPut, safeFilename } from "@/app/lib/s3";
import { prisma } from "@/app/lib/prisma";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

const CODIGO_TIPO_KIT = "KIT_EMERGENCIA";
const CODIGOS_TIPO_INCIDENCIA = ["INCIDENCIA", "INCIDENCIA_GRD"];

async function getIdTipoReferencia(codigoEntidad: string): Promise<string> {
  const tipo = await prisma.tipoReferencia.findFirst({
    where: { codigoEntidad: { equals: codigoEntidad, mode: "insensitive" }, estado: "ACTIVO" },
    select: { idTipoReferencia: true },
  });
  if (!tipo) throw new Error(`TipoReferencia '${codigoEntidad}' no encontrado.`);
  return tipo.idTipoReferencia;
}

/**
 * Genera una URL prefirmada para que el navegador suba una evidencia DIRECTO a S3.
 * Devuelve tambien el `key` que luego se persiste en EvidenciaGRD.
 */
export async function presignEvidencia(input: {
  nombreArchivo: string;
  contentType: string;
  incidenciaId?: string | null;
}): Promise<{ ok: true; uploadUrl: string; key: string } | { ok: false; message: string }> {
  await verifySession();

  if (!isS3Configured()) {
    return { ok: false, message: "El almacenamiento de archivos (S3) aun no esta configurado. Avisa al administrador." };
  }

  const ct = input.contentType || "application/octet-stream";
  const carpeta = input.incidenciaId?.trim() || "pendientes";
  const key = `evidencias/incidencias/${carpeta}/${randomUUID()}-${safeFilename(input.nombreArchivo || "archivo")}`;

  try {
    const uploadUrl = await presignPut(key, ct);
    return { ok: true, uploadUrl, key };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "No se pudo preparar la subida." };
  }
}

/** Indica al cliente si el modulo de archivos esta disponible (para la UI). */
export async function s3Disponible(): Promise<boolean> {
  await verifySession();
  return isS3Configured();
}

// ─── Registro en BD tras subida client-side (kits y entregas) ────────────────

export async function registrarEvidenciaKit(
  idKit: string,
  archivo: { key: string; nombre: string; formato: string | null; tamano: number | null }
) {
  await verifySession();
  const idUsuarioCargaGRD = await getUsuarioGRDId();
  if (!idUsuarioCargaGRD) return { message: "Sin perfil GRD asociado." };

  const idTipoReferencia = await getIdTipoReferencia(CODIGO_TIPO_KIT);

  await prisma.evidenciaGRD.create({
    data: {
      idTipoReferencia,
      idReferencia: idKit,
      idUsuarioCargaGRD,
      nombreArchivo: archivo.nombre,
      urlArchivo: archivo.key,
      formatoArchivo: archivo.formato,
      tamanoArchivo: archivo.tamano,
    },
  });
}

export async function registrarEvidenciaEntrega(
  idIncidencia: string,
  archivo: { key: string; nombre: string; formato: string | null; tamano: number | null }
) {
  await verifySession();
  const idUsuarioCargaGRD = await getUsuarioGRDId();
  if (!idUsuarioCargaGRD) return { message: "Sin perfil GRD asociado." };

  const idTipoReferencia = await getIdTipoReferencia("INCIDENCIA");

  await prisma.evidenciaGRD.create({
    data: {
      idTipoReferencia,
      idReferencia: idIncidencia,
      idUsuarioCargaGRD,
      nombreArchivo: archivo.nombre,
      urlArchivo: archivo.key,
      formatoArchivo: archivo.formato,
      tamanoArchivo: archivo.tamano,
    },
  });
}

export async function listarEvidenciasKit(idKit: string) {
  await verifySession();
  const rows = await prisma.evidenciaGRD.findMany({
    where: {
      idReferencia: idKit,
      estado: "ACTIVO",
      tipoReferencia: { codigoEntidad: { equals: CODIGO_TIPO_KIT, mode: "insensitive" } },
    },
    orderBy: { fechaCarga: "desc" },
    select: { idEvidenciaGRD: true, nombreArchivo: true, urlArchivo: true, fechaCarga: true },
  });
  return rows.map((r) => ({ ...r, fechaCarga: r.fechaCarga.toISOString() }));
}

export async function listarEvidenciasEntrega(idIncidencia: string) {
  await verifySession();
  const rows = await prisma.evidenciaGRD.findMany({
    where: {
      idReferencia: idIncidencia,
      estado: "ACTIVO",
      tipoReferencia: { codigoEntidad: { in: CODIGOS_TIPO_INCIDENCIA, mode: "insensitive" } },
    },
    orderBy: { fechaCarga: "desc" },
    select: { idEvidenciaGRD: true, nombreArchivo: true, urlArchivo: true, fechaCarga: true },
  });
  return rows.map((r) => ({ ...r, fechaCarga: r.fechaCarga.toISOString() }));
}

export async function eliminarEvidencia(idEvidenciaGRD: string) {
  await verifySession();

  const evidencia = await prisma.evidenciaGRD.findUnique({
    where: { idEvidenciaGRD },
    select: { idEvidenciaGRD: true, urlArchivo: true },
  });

  if (!evidencia) return { message: "Evidencia no encontrada." };

  if (evidencia.urlArchivo && isS3Configured() && !/^https?:\/\//i.test(evidencia.urlArchivo)) {
    try {
      const s3 = new S3Client({
        region: process.env.AWS_REGION!,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
          ...(process.env.AWS_SESSION_TOKEN ? { sessionToken: process.env.AWS_SESSION_TOKEN } : {}),
        },
      });
      await s3.send(new DeleteObjectCommand({ Bucket: process.env.AWS_S3_BUCKET!, Key: evidencia.urlArchivo }));
    } catch (e) {
      console.warn("[eliminarEvidencia] S3 delete falló:", e);
    }
  }

  await prisma.evidenciaGRD.update({
    where: { idEvidenciaGRD },
    data: { estado: "INACTIVO", deletedAt: new Date() },
  });
}
