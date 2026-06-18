import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const found = await prisma.incidencia.findMany({
    where: { deletedAt: null, codigoCaso: { in: ["GRD-2026-0007", "GRD-2026-0005"] } },
    select: { idIncidencia: true, codigoCaso: true, tituloIncidencia: true },
  });
  console.log("Encontradas:", JSON.stringify(found, null, 2));

  const ids = found.map((i) => i.idIncidencia);
  if (ids.length > 0) {
    const r = await prisma.incidencia.updateMany({
      where: { idIncidencia: { in: ids } },
      data: { deletedAt: new Date() },
    });
    console.log(`✓ Eliminadas: ${r.count}`);
  } else {
    console.log("No se encontraron esas incidencias.");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
