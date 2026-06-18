import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const BRIG_ID = "66ced6fe-4837-4566-b990-eaa71088da14";
  const USU_GRD = "11520fd8-08e3-4a42-a925-8e74faa0af05";

  // Asignaciones del brigadista
  const asig = await prisma.asignacionBrigadistaIncidencia.findMany({
    where: { idBrigadistaParroquial: BRIG_ID },
    select: {
      estadoAsignacion: true,
      incidencia: { select: { codigoCaso: true, estadoActual: true } },
    },
  });
  console.log("Asignaciones:", JSON.stringify(asig, null, 2));

  // Incidencias como responsable
  const incs = await prisma.incidencia.findMany({
    where: { idUsuarioResponsableGRD: USU_GRD, deletedAt: null },
    select: { codigoCaso: true, estadoActual: true },
  });
  console.log("Inc como responsable:", JSON.stringify(incs));
}

main().catch(console.error).finally(() => prisma.$disconnect());
