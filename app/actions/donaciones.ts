"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/app/lib/prisma";
import { verifySession } from "@/app/lib/dal";
import { getUsuarioGRDId } from "@/app/lib/usuario-grd";
import { logGRDAction } from "@/app/lib/audit";

function generarCodigoEntrega(): string {
  const now = new Date();
  const fecha = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `ENT-${fecha}-${rand}`;
}

export async function registrarEntregaAyuda(input: {
  idIncidencia: string;
  idSolicitud?: string;
  fechaEntrega: string;
  lugarEntrega: string;
  tipoAyuda: string;
  cantidadEntregada?: number;
  descripcionAyuda: string;
  actorParroquial: string;
  observaciones?: string;
}) {
  const session = await verifySession();
  if (!["ESPECIALISTAGRD", "ADMINISTRADOR"].includes(session.role)) {
    return { message: "No tienes permisos para esta acción." };
  }
  const idUsuarioResponsableGRD = await getUsuarioGRDId();
  if (!idUsuarioResponsableGRD)
    return { message: "Tu usuario no tiene perfil GRD asociado." };

  const codigoEntrega = generarCodigoEntrega();

  try {
    await prisma.entregaAyudaHumanitaria.create({
      data: {
        idIncidencia: input.idIncidencia,
        idSolicitud: input.idSolicitud ?? null,
        idUsuarioResponsableGRD,
        codigoEntrega,
        fechaEntrega: new Date(input.fechaEntrega),
        lugarEntrega: input.lugarEntrega,
        tipoAyuda: input.tipoAyuda,
        cantidadEntregada: input.cantidadEntregada ?? null,
        descripcionAyuda: input.descripcionAyuda,
        observaciones: input.actorParroquial
          ? `Actor parroquial: ${input.actorParroquial}${input.observaciones ? ` | ${input.observaciones}` : ""}`
          : input.observaciones,
      },
    });
  } catch (err) {
    console.error("[Donaciones] registrarEntregaAyuda:", err);
    return { message: "No se pudo registrar la entrega." };
  }

  await logGRDAction({
    userId: session.userId,
    action: "CREAR",
    entity: "EntregaAyuda",
    entityId: codigoEntrega,
    entityName: codigoEntrega,
    module: "Donaciones",
    notes: `Incidencia: ${input.idIncidencia}`,
  });

  revalidatePath("/donaciones");
}

export async function listarEntregasAyuda(idIncidencia: string) {
  await verifySession();

  const entregas = await prisma.entregaAyudaHumanitaria.findMany({
    where: { idIncidencia, deletedAt: null },
    orderBy: { fechaEntrega: "desc" },
    select: {
      idEntrega: true,
      codigoEntrega: true,
      fechaEntrega: true,
      lugarEntrega: true,
      tipoAyuda: true,
      cantidadEntregada: true,
      descripcionAyuda: true,
      observaciones: true,
      createdAt: true,
    },
  });

  return entregas.map((e) => ({
    ...e,
    fechaEntrega: e.fechaEntrega?.toISOString() ?? null,
    createdAt: e.createdAt.toISOString(),
  }));
}
