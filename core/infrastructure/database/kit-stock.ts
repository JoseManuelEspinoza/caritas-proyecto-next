import type { Prisma } from "@prisma/client";

/**
 * Recalcula los "kits completos" (`KitEmergencia.stockActual`) a partir del stock
 * por elemento. Un kit es una agrupación de elementos, así que la cantidad de kits
 * completos disponibles es el mínimo de `floor(stock / cantidadPorKit)` sobre todos
 * sus elementos (si falta uno, no se puede armar un kit completo).
 *
 * Debe ejecutarse DENTRO de una transacción, tras cualquier cambio en el stock de
 * los elementos (ingreso de productos, entrega manual o descuento por aprobación).
 */
export async function recomputarStockKit(
  tx: Prisma.TransactionClient,
  idKitEmergencia: string
): Promise<number> {
  const arts = await tx.kitArticulo.findMany({
    where: { idKitEmergencia },
    select: { stock: true, cantidad: true },
  });
  const kitsCompletos =
    arts.length === 0
      ? 0
      : Math.min(...arts.map((a) => Math.floor(a.stock / Math.max(1, a.cantidad))));
  await tx.kitEmergencia.update({
    where: { idKitEmergencia },
    data: { stockActual: kitsCompletos },
  });
  return kitsCompletos;
}
