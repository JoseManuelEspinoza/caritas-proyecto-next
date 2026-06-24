import { prisma } from "@/app/lib/prisma";
import type { Role } from "@prisma/client";

export type TipoNotificacion =
  | "INCIDENCIA_NUEVA"
  | "RESPONSABLE_ASIGNADO"
  | "BRIGADISTA_ASIGNADO"
  | "INFORME_ENVIADO_COMITE"
  | "DECISION_APROBADO"
  | "DECISION_OBSERVADO"
  | "DECISION_RECHAZADO"
  | "CAPACITACION_PUBLICADA"
  | "CAPACITACION_INSCRIPCION"
  | "CAPACITACION_CERTIFICADO";

async function crearNotificacion(
  userId: string,
  tipo: TipoNotificacion,
  titulo: string,
  mensaje: string,
  enlace?: string
) {
  await prisma.notificacion.create({
    data: { userId, tipo, titulo, mensaje, enlace: enlace ?? null },
  });
}

async function crearNotificacionParaRoles(
  roles: Role[],
  tipo: TipoNotificacion,
  titulo: string,
  mensaje: string,
  enlace?: string
) {
  const usuarios = await prisma.user.findMany({
    where: { role: { in: roles }, estado: "ACTIVO" },
    select: { id: true },
  });
  if (usuarios.length === 0) return;
  await prisma.notificacion.createMany({
    data: usuarios.map((u) => ({
      userId: u.id,
      tipo,
      titulo,
      mensaje,
      enlace: enlace ?? null,
    })),
  });
}

async function crearNotificacionParaBrigadistas(
  brigadistaIds: string[],
  tipo: TipoNotificacion,
  titulo: string,
  mensaje: string,
  enlace?: string
) {
  const brigadistas = await prisma.brigadistaParroquial.findMany({
    where: { idBrigadistaParroquial: { in: brigadistaIds } },
    select: { idUsuarioGRD: true, correo: true },
  });

  const userIds = new Set<string>();

  // Path 1: via idUsuarioGRD link
  const usuarioGRDIds = brigadistas.filter((b) => b.idUsuarioGRD).map((b) => b.idUsuarioGRD!);
  if (usuarioGRDIds.length > 0) {
    const usuarios = await prisma.usuarioGRD.findMany({
      where: { idUsuarioGRD: { in: usuarioGRDIds } },
      select: { idCredencial: true },
    });
    usuarios.forEach((u) => userIds.add(u.idCredencial));
  }

  // Path 2: fallback via email match for brigadistas without idUsuarioGRD
  const correosSinLink = brigadistas
    .filter((b) => !b.idUsuarioGRD && b.correo)
    .map((b) => b.correo!);
  if (correosSinLink.length > 0) {
    const usuariosPorCorreo = await prisma.user.findMany({
      where: { email: { in: correosSinLink } },
      select: { id: true },
    });
    usuariosPorCorreo.forEach((u) => userIds.add(u.id));
  }

  if (userIds.size === 0) return;

  await prisma.notificacion.createMany({
    data: [...userIds].map((userId) => ({
      userId,
      tipo,
      titulo,
      mensaje,
      enlace: enlace ?? null,
    })),
  });
}

/** Fire-and-forget: notifica a un usuario específico por su userId. */
export function notificarUsuario(
  userId: string,
  tipo: TipoNotificacion,
  titulo: string,
  mensaje: string,
  enlace?: string
) {
  crearNotificacion(userId, tipo, titulo, mensaje, enlace).catch((e) =>
    console.error("[Notif] Error creando notificación:", e)
  );
}

/** Fire-and-forget: notifica a todos los usuarios activos de los roles indicados. */
export function notificarRoles(
  roles: Role[],
  tipo: TipoNotificacion,
  titulo: string,
  mensaje: string,
  enlace?: string
) {
  crearNotificacionParaRoles(roles, tipo, titulo, mensaje, enlace).catch((e) =>
    console.error("[Notif] Error creando notificaciones por rol:", e)
  );
}

/** Fire-and-forget: notifica a un usuario buscándolo por su email. */
export function notificarPorEmail(
  email: string,
  tipo: TipoNotificacion,
  titulo: string,
  mensaje: string,
  enlace?: string
) {
  prisma.user
    .findUnique({ where: { email }, select: { id: true } })
    .then((u) => {
      if (!u) return;
      return crearNotificacion(u.id, tipo, titulo, mensaje, enlace);
    })
    .catch((e) => console.error("[Notif] Error notificando por email:", e));
}

/** Fire-and-forget: notifica a brigadistas que tienen cuenta en el sistema. */
export function notificarBrigadistas(
  brigadistaIds: string[],
  tipo: TipoNotificacion,
  titulo: string,
  mensaje: string,
  enlace?: string
) {
  crearNotificacionParaBrigadistas(brigadistaIds, tipo, titulo, mensaje, enlace).catch((e) =>
    console.error("[Notif] Error creando notificaciones a brigadistas:", e)
  );
}
