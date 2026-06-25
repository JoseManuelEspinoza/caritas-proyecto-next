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
  /** Stock disponible de ESTE elemento (el kit solo lo agrupa). */
  stock: number;
};

export type ArticuloKitDetalle = ArticuloKit & { idKitArticulo: string };

export async function listarArticulosKit(idKit: string): Promise<ArticuloKitDetalle[]> {
  await verifySession();
  const { prisma } = await import("@/app/lib/prisma");
  const rows = await prisma.kitArticulo.findMany({
    where: { idKitEmergencia: idKit },
    orderBy: { orden: "asc" },
    select: { idKitArticulo: true, codigo: true, descripcion: true, cantidad: true, stock: true },
  });
  return rows;
}

/** Actualiza (repone) el stock de un elemento del kit. */
export async function reponerStockArticulo(idKitArticulo: string, stock: number) {
  const session = await verifySession();
  if (!["ESPECIALISTAGRD", "ADMINISTRADOR"].includes(session.role)) {
    return { message: "No tienes permisos para esta acción." };
  }
  const s = Math.max(0, Math.floor(Number(stock) || 0));
  const { prisma } = await import("@/app/lib/prisma");
  await prisma.kitArticulo.update({ where: { idKitArticulo }, data: { stock: s } });
  revalidatePath(REVALIDATE);
}

/** Prefijo de código a partir del nombre del kit: "Kit de Alimentos Prueba" → "AP". */
function prefijoCodigoKit(tipoKit: string): string {
  const iniciales = tipoKit
    .replace(/^kits?\s+de\s+/i, "")
    .normalize("NFKD")
    .replace(/[^a-zA-Z\s]/g, "")
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 3);
  return iniciales || "KIT";
}

/** Normaliza la lista: trim, cantidad ≥1 y descarta los artículos sin descripción. */
function limpiarArticulos(articulos: ArticuloKit[]): ArticuloKit[] {
  return articulos
    .map((a) => ({
      codigo: a.codigo?.trim() || null,
      descripcion: a.descripcion.trim(),
      cantidad: Math.max(1, Math.floor(Number(a.cantidad) || 1)),
      stock: Math.max(0, Math.floor(Number(a.stock) || 0)),
    }))
    .filter((a) => a.descripcion);
}

/**
 * Reemplaza la composición de un kit (borrar + crear, transaccional). Auto-asigna
 * código <INICIALES>-<nn> a los artículos que no lo traigan. Recibe la lista YA
 * limpia (ver `limpiarArticulos`). Se escribe una sola vez, al crear el kit (`crearKit`),
 * porque la composición es inmutable después de la creación.
 */
async function persistirArticulos(
  idKit: string,
  limpios: ArticuloKit[],
  tipoKit: string
): Promise<void> {
  const prefijo = prefijoCodigoKit(tipoKit);
  const conCodigo = limpios.map((a, i) => ({
    ...a,
    codigo: a.codigo ?? `${prefijo}-${String(i + 1).padStart(3, "0")}`,
  }));
  const { prisma } = await import("@/app/lib/prisma");
  await prisma.$transaction([
    prisma.kitArticulo.deleteMany({ where: { idKitEmergencia: idKit } }),
    prisma.kitArticulo.createMany({
      data: conCodigo.map((a, i) => ({ idKitEmergencia: idKit, ...a, orden: i })),
    }),
  ]);
}

export async function crearKit(input: {
  tipoKit: string;
  descripcion?: string;
  stockInicial?: number;
  codigoAlmacen?: string;
  ubicacionAlmacen?: string;
  articulos: ArticuloKit[];
}) {
  const session = await verifySession();
  if (!["ESPECIALISTAGRD", "ADMINISTRADOR"].includes(session.role)) {
    return { message: "No tienes permisos para esta acción." };
  }
  // Regla de negocio: un kit NO puede crearse sin contenido definido.
  const limpios = limpiarArticulos(input.articulos ?? []);
  if (limpios.length === 0) {
    return { message: "Define al menos un artículo en el contenido del kit." };
  }
  try {
    const kit = await makeKitUseCases().crear.execute({
      tipoKit: input.tipoKit,
      descripcion: input.descripcion,
      stockInicial: input.stockInicial,
      codigoAlmacen: input.codigoAlmacen,
      ubicacionAlmacen: input.ubicacionAlmacen,
    });
    await persistirArticulos(kit.id, limpios, kit.tipoKit);
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
    field: "Composición",
    newValue: `${limpios.length} artículo(s)`,
  });
  revalidatePath(REVALIDATE);
}

export async function archivarKit(idKit: string) {
  const session = await verifySession();
  if (!["ESPECIALISTAGRD", "ADMINISTRADOR"].includes(session.role)) {
    return { message: "No tienes permisos para esta acción." };
  }
  try {
    await makeKitUseCases().archivar.execute(idKit);
  } catch (err) {
    return fail(err, "No se pudo archivar el kit.");
  }
  await logGRDAction({
    userId: session.userId,
    action: "EDITAR",
    entity: "Kit",
    entityId: idKit,
    entityName: idKit,
    module: "Kits",
    field: "Estado",
    newValue: "ARCHIVADO",
  });
  revalidatePath(REVALIDATE);
}

export async function eliminarKit(idKit: string) {
  const session = await verifySession();
  if (!["ESPECIALISTAGRD", "ADMINISTRADOR"].includes(session.role)) {
    return { message: "No tienes permisos para esta acción." };
  }
  try {
    await makeKitUseCases().eliminar.execute(idKit);
  } catch (err) {
    return fail(err, "No se pudo eliminar el kit.");
  }
  await logGRDAction({
    userId: session.userId,
    action: "EDITAR",
    entity: "Kit",
    entityId: idKit,
    entityName: idKit,
    module: "Kits",
    field: "Estado",
    newValue: "ELIMINADO",
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
  if (!["ESPECIALISTAGRD", "ADMINISTRADOR"].includes(session.role)) {
    return { message: "No tienes permisos para esta acción." };
  }
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
