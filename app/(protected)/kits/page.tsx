import { prisma } from "@/app/lib/prisma";
import { makeKitUseCases } from "@/core/infrastructure/factories/makeKitUseCases";
import { KitsModule } from "@/app/ui/kits/kits-module";

export default async function KitsPage() {
  const [kits, parroquias, catalogoArticulos] = await Promise.all([
    makeKitUseCases().listar.execute(),
    prisma.parroquia.findMany({
      where: { estado: "ACTIVO" },
      orderBy: { nombre: "asc" },
      select: { idParroquia: true, nombre: true },
    }),
    // Maestro de artículos (módulo Catálogos) para autocompletar la composición.
    prisma.catalogoDetalleGRD.findMany({
      where: { estado: "ACTIVO", catalogo: { nombreCatalogo: { startsWith: "Kit de " } } },
      select: { codigo: true, valor: true, catalogo: { select: { nombreCatalogo: true } } },
      orderBy: { codigo: "asc" },
      take: 300,
    }),
  ]);

  return (
    <KitsModule
      kits={kits.map((k) => ({
        id: k.id,
        tipoKit: k.tipoKit,
        descripcion: k.descripcion,
        stockActual: k.stockActual,
        estadoKit: k.estadoKit,
        codigoAlmacen: k.codigoAlmacen,
        ubicacionAlmacen: k.ubicacionAlmacen,
      }))}
      parroquias={parroquias.map((p) => ({ id: p.idParroquia, nombre: p.nombre }))}
      catalogoArticulos={catalogoArticulos.map((c) => ({
        codigo: c.codigo,
        valor: c.valor,
        catalogo: c.catalogo?.nombreCatalogo ?? "",
      }))}
    />
  );
}
