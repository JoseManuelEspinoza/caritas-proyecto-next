import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });
const ID = "1ad59ec3-5b50-4e5f-b7d1-f93ff7ddf9c5";

async function main() {
  const brig = await prisma.brigadistaParroquial.findFirst({
    where: { idUsuarioGRD: ID },
    select: { idBrigadistaParroquial: true, nombres: true, apellidos: true, estado: true },
  });
  console.log("Brigadista:", JSON.stringify(brig, null, 2));

  const incs = await prisma.incidencia.findMany({
    where: { idUsuarioResponsableGRD: ID, deletedAt: null },
    select: { codigoCaso: true, estadoActual: true, tituloIncidencia: true },
  });
  console.log("Inc como responsable:", JSON.stringify(incs, null, 2));

  if (brig) {
    const asig = await prisma.asignacionBrigadista.findMany({
      where: { idBrigadistaParroquial: brig.idBrigadistaParroquial },
      select: {
        estadoAsignacion: true,
        incidencia: { select: { codigoCaso: true, estadoActual: true } },
      },
    });
    console.log("Asignaciones:", JSON.stringify(asig, null, 2));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
