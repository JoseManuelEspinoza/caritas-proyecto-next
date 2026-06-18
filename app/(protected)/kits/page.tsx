import { prisma } from "@/app/lib/prisma";
import { makeKitUseCases } from "@/core/infrastructure/factories/makeKitUseCases";
import { KitsModule } from "@/app/ui/kits/kits-module";

export default async function KitsPage() {
  const [kits, parroquias, fechas] = await Promise.all([
    makeKitUseCases().listar.execute(),
    prisma.parroquia.findMany({
      where: { estado: "ACTIVO" },
      orderBy: { nombre: "asc" },
      select: { idParroquia: true, nombre: true },
    }),
    // Metadatos para ordenar la lista: fecha de creación y fecha del último movimiento por kit.
    prisma.kitEmergencia.findMany({
      select: {
        idKitEmergencia: true,
        fechaRegistro: true,
        movimientos: {
          orderBy: { fechaMovimiento: "desc" },
          take: 1,
          select: { fechaMovimiento: true },
        },
      },
    }),
  ]);

  const meta = new Map(
    fechas.map((f) => [
      f.idKitEmergencia,
      {
        fechaRegistro: f.fechaRegistro.toISOString(),
        ultimoMovimiento: f.movimientos[0]?.fechaMovimiento.toISOString() ?? null,
      },
    ])
  );

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
        fechaRegistro: meta.get(k.id)?.fechaRegistro ?? null,
        ultimoMovimiento: meta.get(k.id)?.ultimoMovimiento ?? null,
      }))}
      parroquias={parroquias.map((p) => ({ id: p.idParroquia, nombre: p.nombre }))}
    />
  );
}
