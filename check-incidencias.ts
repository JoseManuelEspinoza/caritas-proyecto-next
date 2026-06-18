import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const OLD_ID = "d635589f-364b-49db-b0b3-2f1f411bae9b";
const NEW_ID = "1ad59ec3-5b50-4e5f-b7d1-f93ff7ddf9c5";

async function main() {
  // Incidencias activas en el sistema
  const todas = await prisma.incidencia.findMany({
    where: { deletedAt: null },
    select: { codigoCaso: true, estadoActual: true, idUsuarioResponsableGRD: true, tituloIncidencia: true },
    orderBy: { fechaRegistro: "desc" },
    take: 10,
  });
  console.log("Últimas incidencias:", JSON.stringify(todas, null, 2));

  // BrigadistaParroquial del ID viejo
  const brigViejo = await prisma.brigadistaParroquial.findFirst({
    where: { idUsuarioGRD: OLD_ID },
    select: { idBrigadistaParroquial: true, nombres: true, estado: true },
  });
  console.log("Brigadista OLD_ID:", JSON.stringify(brigViejo));

  // Usuario GRD del nuevo ID
  const usuGRD = await prisma.usuarioGRD.findUnique({
    where: { idUsuarioGRD: NEW_ID },
    select: { idUsuarioGRD: true, nombres: true, apellidos: true, correoReferencia: true },
  });
  console.log("UsuarioGRD NEW_ID:", JSON.stringify(usuGRD));
}

main().catch(console.error).finally(() => prisma.$disconnect());
