import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const candidatas = await prisma.incidencia.findMany({
    where: {
      estadoActual: "EN EVALUACION",
      rondasVotacionComite: { none: {} },
    },
    select: { idIncidencia: true },
  });

  for (const inc of candidatas) {
    await prisma.rondaVotacionComite.create({
      data: { idIncidencia: inc.idIncidencia, numeroRonda: 1, estado: "ABIERTA" },
    });
    console.log("Ronda 1 abierta para", inc.idIncidencia);
  }
  console.log(`Total: ${candidatas.length} rondas creadas.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
