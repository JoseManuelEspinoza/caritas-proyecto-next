import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Buscar incidencias con "null" en el título (creadas por duplicación móvil)
  const duplicadas = await prisma.incidencia.findMany({
    where: {
      deletedAt: null,
      tituloIncidencia: { contains: "null" },
    },
    select: {
      idIncidencia: true,
      codigoCaso: true,
      tituloIncidencia: true,
      estadoActual: true,
      uuidMovil: true,
      fechaRegistro: true,
    },
    orderBy: { fechaRegistro: "desc" },
  });

  console.log(`\nEncontradas ${duplicadas.length} incidencias con "null" en el título:\n`);
  duplicadas.forEach((i) => {
    console.log(`  ${i.codigoCaso} | ${i.tituloIncidencia} | ${i.estadoActual} | uuid=${i.uuidMovil}`);
  });

  if (duplicadas.length === 0) {
    console.log("Nada que eliminar.");
    return;
  }

  const ids = duplicadas.map((i) => i.idIncidencia);
  const result = await prisma.incidencia.updateMany({
    where: { idIncidencia: { in: ids } },
    data: { deletedAt: new Date() },
  });

  console.log(`\n✓ Eliminadas (soft-delete) ${result.count} incidencias duplicadas.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
