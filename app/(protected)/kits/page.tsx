import { prisma } from "@/app/lib/prisma";
import { makeKitUseCases } from "@/core/infrastructure/factories/makeKitUseCases";
import { KitsModule } from "@/app/ui/kits/kits-module";

export default async function KitsPage() {
  const [kits, parroquias] = await Promise.all([
    makeKitUseCases().listar.execute(),
    prisma.parroquia.findMany({
      where: { estado: "ACTIVO" },
      orderBy: { nombre: "asc" },
      select: { idParroquia: true, nombre: true },
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
      }))}
      parroquias={parroquias.map((p) => ({ id: p.idParroquia, nombre: p.nombre }))}
    />
  );
}
