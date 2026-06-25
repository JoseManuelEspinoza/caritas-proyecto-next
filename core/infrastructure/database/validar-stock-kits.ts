import { prisma } from "@/app/lib/prisma";

/**
 * Valida la disponibilidad de stock para los kits asignados en un informe.
 * Cuenta cuántas veces se asigna cada kit DEL SISTEMA (con `idKit`; los "Otros"
 * sin inventario se omiten), calcula lo requerido por elemento (cantidad × veces)
 * y lo compara contra el stock actual de cada elemento.
 *
 * Devuelve la lista de faltantes (vacía si alcanza). NO modifica el stock — es
 * solo lectura, pensada para validar al generar/enviar el informe al Comité,
 * antes del descuento real que ocurre al aprobar.
 */
export async function faltantesStockAsignacion(asignaciones: unknown[]): Promise<string[]> {
  const kitCount = new Map<string, number>();
  for (const af of asignaciones) {
    const kits = (af as { kits?: unknown[] })?.kits;
    if (!Array.isArray(kits)) continue;
    for (const k of kits) {
      const idKit = (k as { idKit?: unknown })?.idKit;
      if (typeof idKit === "string" && idKit) {
        kitCount.set(idKit, (kitCount.get(idKit) ?? 0) + 1);
      }
    }
  }
  if (kitCount.size === 0) return [];

  const kits = await prisma.kitEmergencia.findMany({
    where: { idKitEmergencia: { in: [...kitCount.keys()] } },
    select: {
      idKitEmergencia: true,
      tipoKit: true,
      articulos: { select: { descripcion: true, cantidad: true, stock: true } },
    },
  });

  const faltantes: string[] = [];
  for (const kit of kits) {
    const instancias = kitCount.get(kit.idKitEmergencia) ?? 0;
    for (const art of kit.articulos) {
      const requerido = art.cantidad * instancias;
      if (requerido > art.stock) {
        faltantes.push(
          `${kit.tipoKit} · ${art.descripcion}: faltan ${requerido - art.stock} (disponible ${art.stock})`
        );
      }
    }
  }
  return faltantes;
}
