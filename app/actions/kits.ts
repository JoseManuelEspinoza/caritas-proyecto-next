"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/app/lib/dal";
import { getUsuarioGRDId } from "@/app/lib/usuario-grd";
import { makeKitUseCases } from "@/core/infrastructure/factories/makeKitUseCases";
import { DomainError, NotFoundError, BusinessRuleError } from "@/core/domain/errors/DomainError";
import { logGRDAction } from "@/app/lib/audit";
import { recomputarStockKit } from "@/core/infrastructure/database/kit-stock";
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

/**
 * Edita la composición de un kit existente: renombra elementos, ajusta su
 * "cantidad por kit", quita elementos y agrega nuevos. PRESERVA el stock de los
 * elementos que se mantienen (el stock solo cambia por movimientos); los nuevos
 * entran con stock 0. Al final recalcula los kits completos. No es un movimiento
 * de inventario, así que queda solo en la auditoría.
 */
export async function actualizarComposicionKit(
  idKit: string,
  items: { idKitArticulo?: string; descripcion: string; cantidad: number }[]
) {
  const session = await verifySession();
  if (!["ESPECIALISTAGRD", "ADMINISTRADOR"].includes(session.role)) {
    return { message: "No tienes permisos para esta acción." };
  }

  const limpios = items
    .map((it) => ({
      idKitArticulo: it.idKitArticulo,
      descripcion: it.descripcion.trim(),
      cantidad: Math.max(1, Math.floor(Number(it.cantidad) || 1)),
    }))
    .filter((it) => it.descripcion);
  if (limpios.length === 0) {
    return { message: "El kit debe tener al menos un elemento." };
  }

  const { prisma } = await import("@/app/lib/prisma");
  const kit = await prisma.kitEmergencia.findUnique({
    where: { idKitEmergencia: idKit },
    select: { tipoKit: true, estadoKit: true, articulos: { select: { idKitArticulo: true } } },
  });
  if (!kit) return { message: "Kit no encontrado." };
  if (kit.estadoKit === "ARCHIVADO") {
    return { message: "No se puede editar la composición de un kit archivado." };
  }

  const idsActuales = new Set(kit.articulos.map((a) => a.idKitArticulo));
  const idsConservados = new Set(limpios.filter((it) => it.idKitArticulo).map((it) => it.idKitArticulo!));
  const aEliminar = [...idsActuales].filter((id) => !idsConservados.has(id));
  const prefijo = prefijoCodigoKit(kit.tipoKit);
  let orden = 0;
  let siguienteNum = kit.articulos.length + 1;

  try {
    await prisma.$transaction(async (tx) => {
      if (aEliminar.length > 0) {
        await tx.kitArticulo.deleteMany({ where: { idKitArticulo: { in: aEliminar } } });
      }
      for (const it of limpios) {
        if (it.idKitArticulo && idsActuales.has(it.idKitArticulo)) {
          // Elemento existente: actualiza descripción/cantidad, conserva su stock.
          await tx.kitArticulo.update({
            where: { idKitArticulo: it.idKitArticulo },
            data: { descripcion: it.descripcion, cantidad: it.cantidad, orden: orden++ },
          });
        } else {
          // Elemento nuevo: entra con stock 0 (se carga luego por "Ingresar productos").
          await tx.kitArticulo.create({
            data: {
              idKitEmergencia: idKit,
              codigo: `${prefijo}-${String(siguienteNum++).padStart(3, "0")}`,
              descripcion: it.descripcion,
              cantidad: it.cantidad,
              stock: 0,
              orden: orden++,
            },
          });
        }
      }
      await recomputarStockKit(tx, idKit);
    });
  } catch (err) {
    return fail(err, "No se pudo actualizar la composición.");
  }

  await logGRDAction({
    userId: session.userId,
    action: "EDITAR",
    entity: "Kit",
    entityId: idKit,
    entityName: kit.tipoKit,
    module: "Kits",
    field: "Composición",
    newValue: `${limpios.length} elemento(s)`,
  });
  revalidatePath(REVALIDATE);
}

/**
 * Ingreso de productos al inventario de un kit. Suma stock a los elementos
 * existentes, permite agregar elementos nuevos a la composición, y registra UN
 * `MovimientoKit` de tipo INGRESO con el detalle. Al final recalcula los kits
 * completos disponibles. Es flexible: no obliga a ingresar todos los elementos.
 */
export async function ingresarProductosKit(
  idKit: string,
  input: {
    ingresos: { idKitArticulo: string; cantidadIngresar: number }[];
    nuevos: { descripcion: string; cantidad: number; cantidadIngresar: number }[];
    motivo?: string;
  }
) {
  const session = await verifySession();
  if (!["ESPECIALISTAGRD", "ADMINISTRADOR"].includes(session.role)) {
    return { message: "No tienes permisos para esta acción." };
  }
  const idUsuarioResponsableGRD = await getUsuarioGRDId();
  if (!idUsuarioResponsableGRD) return { message: "Tu usuario no tiene perfil GRD asociado." };

  const ingresos = (input.ingresos ?? [])
    .map((i) => ({
      idKitArticulo: i.idKitArticulo,
      cantidadIngresar: Math.max(0, Math.floor(Number(i.cantidadIngresar) || 0)),
    }))
    .filter((i) => i.idKitArticulo && i.cantidadIngresar > 0);
  const nuevos = (input.nuevos ?? [])
    .map((n) => ({
      descripcion: n.descripcion.trim(),
      cantidad: Math.max(1, Math.floor(Number(n.cantidad) || 1)),
      cantidadIngresar: Math.max(0, Math.floor(Number(n.cantidadIngresar) || 0)),
    }))
    .filter((n) => n.descripcion);

  if (ingresos.length === 0 && nuevos.length === 0) {
    return { message: "Indica al menos una cantidad a ingresar o un elemento nuevo." };
  }

  const { prisma } = await import("@/app/lib/prisma");
  const kit = await prisma.kitEmergencia.findUnique({
    where: { idKitEmergencia: idKit },
    select: {
      tipoKit: true,
      estadoKit: true,
      articulos: { select: { idKitArticulo: true, descripcion: true } },
    },
  });
  if (!kit) return { message: "Kit no encontrado." };
  if (kit.estadoKit === "ARCHIVADO") {
    return { message: "No se pueden ingresar productos a un kit archivado." };
  }

  const descPorId = new Map(kit.articulos.map((a) => [a.idKitArticulo, a.descripcion]));
  const prefijo = prefijoCodigoKit(kit.tipoKit);
  let orden = kit.articulos.length;
  let siguienteNum = kit.articulos.length + 1;
  let totalUnidades = 0;
  const detalle: string[] = [];

  try {
    await prisma.$transaction(async (tx) => {
      for (const ing of ingresos) {
        await tx.kitArticulo.update({
          where: { idKitArticulo: ing.idKitArticulo },
          data: { stock: { increment: ing.cantidadIngresar } },
        });
        totalUnidades += ing.cantidadIngresar;
        detalle.push(`${descPorId.get(ing.idKitArticulo) ?? "Elemento"} +${ing.cantidadIngresar}`);
      }
      for (const n of nuevos) {
        await tx.kitArticulo.create({
          data: {
            idKitEmergencia: idKit,
            codigo: `${prefijo}-${String(siguienteNum++).padStart(3, "0")}`,
            descripcion: n.descripcion,
            cantidad: n.cantidad,
            stock: n.cantidadIngresar,
            orden: orden++,
          },
        });
        totalUnidades += n.cantidadIngresar;
        detalle.push(`${n.descripcion} (nuevo) +${n.cantidadIngresar}`);
      }
      const kitsCompletos = await recomputarStockKit(tx, idKit);
      // Solo registramos movimiento si hubo unidades; agregar un elemento vacío
      // (solo composición) no genera un ingreso de inventario.
      if (totalUnidades > 0) {
        await tx.movimientoKit.create({
          data: {
            idKitEmergencia: idKit,
            idUsuarioResponsableGRD,
            tipoMovimiento: "INGRESO",
            cantidad: totalUnidades,
            motivoMovimiento: input.motivo?.trim() || "Ingreso de productos al inventario",
            observaciones: `${detalle.join(" · ")} | Kits completos: ${kitsCompletos}`,
          },
        });
      }
    });
  } catch (err) {
    return fail(err, "No se pudo registrar el ingreso de productos.");
  }

  await logGRDAction({
    userId: session.userId,
    action: "EDITAR",
    entity: "Kit",
    entityId: idKit,
    entityName: kit.tipoKit,
    module: "Kits",
    field: "Ingreso de productos",
    newValue: detalle.join(" · "),
  });
  revalidatePath(REVALIDATE);
  return {
    message:
      totalUnidades > 0
        ? `Ingreso registrado: ${totalUnidades} unidad(es).`
        : "Elemento(s) agregado(s) a la composición.",
  };
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
  await prisma.$transaction(async (tx) => {
    await tx.kitArticulo.deleteMany({ where: { idKitEmergencia: idKit } });
    await tx.kitArticulo.createMany({
      data: conCodigo.map((a, i) => ({ idKitEmergencia: idKit, ...a, orden: i })),
    });
    // Los "kits completos" se derivan del stock por elemento, no del stock inicial.
    await recomputarStockKit(tx, idKit);
  });
}

export async function crearKit(input: {
  tipoKit: string;
  descripcion?: string;
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
  const idUsuarioResponsableGRD = await getUsuarioGRDId();
  try {
    const kit = await makeKitUseCases().crear.execute({
      tipoKit: input.tipoKit,
      descripcion: input.descripcion,
      codigoAlmacen: input.codigoAlmacen,
      ubicacionAlmacen: input.ubicacionAlmacen,
    });
    // Persiste los elementos con su stock inicial y deriva los kits completos.
    await persistirArticulos(kit.id, limpios, kit.tipoKit);

    // Registro inicial: deja constancia del stock de arranque como un movimiento
    // de ingreso (una "compra"/alta inicial), igual que cualquier otra entrada.
    const totalInicial = limpios.reduce((s, a) => s + a.stock, 0);
    if (totalInicial > 0 && idUsuarioResponsableGRD) {
      const { prisma } = await import("@/app/lib/prisma");
      const detalle = limpios
        .filter((a) => a.stock > 0)
        .map((a) => `${a.descripcion} +${a.stock}`)
        .join(" · ");
      await prisma.movimientoKit.create({
        data: {
          idKitEmergencia: kit.id,
          idUsuarioResponsableGRD,
          tipoMovimiento: "INGRESO",
          cantidad: totalInicial,
          motivoMovimiento: "Registro inicial del kit (alta de inventario)",
          observaciones: detalle,
        },
      });
    }
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
  // Las entradas al inventario se hacen por elemento, vía `ingresarProductosKit`.
  if (mov.tipo !== "ENTREGA") {
    return { message: "Usa 'Ingreso de productos' para registrar entradas al inventario." };
  }
  const idUsuarioResponsableGRD = await getUsuarioGRDId();
  if (!idUsuarioResponsableGRD) return { message: "Tu usuario no tiene perfil GRD asociado." };

  const cantidad = Math.floor(Number(mov.cantidad) || 0);
  if (cantidad <= 0) return { message: "La cantidad de kits a entregar debe ser mayor que cero." };
  if (!mov.idParroquiaDestino?.trim()) {
    return { message: "Selecciona la parroquia destino para la entrega." };
  }

  const { prisma } = await import("@/app/lib/prisma");
  try {
    const kitsCompletos = await prisma.$transaction(async (tx) => {
      const kit = await tx.kitEmergencia.findUnique({
        where: { idKitEmergencia: idKit },
        select: {
          tipoKit: true,
          estadoKit: true,
          articulos: { select: { idKitArticulo: true, descripcion: true, cantidad: true, stock: true } },
        },
      });
      if (!kit) throw new NotFoundError("Kit no encontrado.");
      if (kit.estadoKit === "ARCHIVADO") {
        throw new BusinessRuleError("No se pueden registrar movimientos en un kit archivado.");
      }
      if (kit.articulos.length === 0) {
        throw new BusinessRuleError("El kit no tiene elementos definidos.");
      }
      // Una entrega de N kits descuenta cantidad×N de cada elemento; valida que alcance.
      const faltantes: string[] = [];
      for (const art of kit.articulos) {
        const requerido = art.cantidad * cantidad;
        if (requerido > art.stock) {
          faltantes.push(`${art.descripcion}: faltan ${requerido - art.stock} (disponible ${art.stock})`);
        }
      }
      if (faltantes.length > 0) {
        throw new BusinessRuleError(
          `Stock insuficiente para entregar ${cantidad} kit(s):\n${faltantes.join("\n")}`
        );
      }
      for (const art of kit.articulos) {
        await tx.kitArticulo.update({
          where: { idKitArticulo: art.idKitArticulo },
          data: { stock: { decrement: art.cantidad * cantidad } },
        });
      }
      await tx.movimientoKit.create({
        data: {
          idKitEmergencia: idKit,
          idUsuarioResponsableGRD,
          tipoMovimiento: "ENTREGA",
          cantidad,
          idParroquiaDestino: mov.idParroquiaDestino || null,
          motivoMovimiento: mov.motivoMovimiento?.trim() || null,
          observaciones: mov.observaciones?.trim() || null,
        },
      });
      return recomputarStockKit(tx, idKit);
    });
    await logGRDAction({
      userId: session.userId,
      action: "EDITAR",
      entity: "Kit",
      entityId: idKit,
      entityName: idKit,
      module: "Kits",
      field: "Movimiento",
      newValue: `ENTREGA x${cantidad}`,
      notes: mov.motivoMovimiento ?? mov.observaciones,
    });
    revalidatePath(REVALIDATE);
    return { message: `Entrega registrada. Kits completos disponibles: ${kitsCompletos}.` };
  } catch (err) {
    return fail(err, "No se pudo registrar el movimiento.");
  }
}
