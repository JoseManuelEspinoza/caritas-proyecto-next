"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/app/lib/dal";
import { getUsuarioGRDId } from "@/app/lib/usuario-grd";
import { makeKitUseCases } from "@/core/infrastructure/factories/makeKitUseCases";
import { DomainError } from "@/core/domain/errors/DomainError";
import { logGRDAction } from "@/app/lib/audit";
import type { TipoMovimiento } from "@/core/domain/entities/kit/KitEmergencia";

const REVALIDATE = "/kits";

function fail(err: unknown, fallback: string) {
  if (err instanceof DomainError) return { message: err.message };
  console.error("[Kits] Error inesperado:", err);
  return { message: fallback };
}

export async function listarMovimientosKit(idKit: string) {
  await verifySession();
  return makeKitUseCases().listarMovimientos.execute(idKit);
}

// ── Composición del kit (qué artículos contiene y en qué cantidad) ────────────

export type ArticuloKit = {
  codigo: string | null;
  descripcion: string;
  cantidad: number;
};

export async function listarArticulosKit(idKit: string): Promise<ArticuloKit[]> {
  await verifySession();
  const { prisma } = await import("@/app/lib/prisma");
  const rows = await prisma.kitArticulo.findMany({
    where: { idKitEmergencia: idKit },
    orderBy: { orden: "asc" },
    select: { codigo: true, descripcion: true, cantidad: true },
  });
  return rows;
}

/** Reemplaza la composición completa del kit (borrar + crear, transaccional). */
export async function guardarArticulosKit(
  idKit: string,
  articulos: ArticuloKit[]
): Promise<void | { message: string }> {
  const session = await verifySession();
  const limpios = articulos
    .map((a) => ({
      codigo: a.codigo?.trim() || null,
      descripcion: a.descripcion.trim(),
      cantidad: Math.max(1, Math.floor(Number(a.cantidad) || 1)),
    }))
    .filter((a) => a.descripcion);

  try {
    const { prisma } = await import("@/app/lib/prisma");
    await prisma.$transaction([
      prisma.kitArticulo.deleteMany({ where: { idKitEmergencia: idKit } }),
      prisma.kitArticulo.createMany({
        data: limpios.map((a, i) => ({ idKitEmergencia: idKit, ...a, orden: i })),
      }),
    ]);
  } catch (err) {
    return fail(err, "No se pudo guardar la composición del kit.");
  }
  await logGRDAction({
    userId: session.userId,
    action: "EDITAR",
    entity: "Kit",
    entityId: idKit,
    entityName: idKit,
    module: "Kits",
    field: "Composición",
    newValue: `${limpios.length} artículo(s)`,
  });
  revalidatePath(REVALIDATE);
}

export async function crearKit(input: {
  tipoKit: string;
  descripcion?: string;
  stockInicial?: number;
  codigoAlmacen?: string;
  ubicacionAlmacen?: string;
}) {
  const session = await verifySession();
  try {
    await makeKitUseCases().crear.execute(input);
  } catch (err) {
    return fail(err, "No se pudo crear el kit.");
  }
  await logGRDAction({
    userId: session.userId,
    action: "CREAR",
    entity: "Kit",
    entityId: input.tipoKit,
    entityName: input.tipoKit,
    module: "Kits",
  });
  revalidatePath(REVALIDATE);
}

export async function registrarMovimientoKit(
  idKit: string,
  mov: {
    tipo: TipoMovimiento;
    cantidad: number;
    idParroquiaDestino?: string;
    motivoMovimiento?: string;
    observaciones?: string;
  }
) {
  const session = await verifySession();
  const idUsuarioResponsableGRD = await getUsuarioGRDId();
  if (!idUsuarioResponsableGRD) return { message: "Tu usuario no tiene perfil GRD asociado." };
  try {
    const kit = await makeKitUseCases().registrarMovimiento.execute(idKit, {
      ...mov,
      idUsuarioResponsableGRD,
    });
    await logGRDAction({
      userId: session.userId,
      action: "EDITAR",
      entity: "Kit",
      entityId: idKit,
      entityName: idKit,
      module: "Kits",
      field: "Movimiento",
      newValue: `${mov.tipo} x${mov.cantidad}`,
      notes: mov.motivoMovimiento ?? mov.observaciones,
    });
    revalidatePath(REVALIDATE);
    return { message: `Movimiento registrado. Stock actual: ${kit.stockActual}.` };
  } catch (err) {
    return fail(err, "No se pudo registrar el movimiento.");
  }
}
