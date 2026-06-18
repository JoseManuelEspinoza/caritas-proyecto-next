import { config } from "dotenv";
config();

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const rows = await prisma.actividadPreventiva.findMany({
  select: {
    idTipoActividadPreventiva: true,
    nombreActividad: true,
    estadoActividad: true,
    fechaRegistro: true,
    parroquia: { select: { nombre: true } },
  },
  orderBy: [{ parroquia: { nombre: "asc" } }, { fechaRegistro: "desc" }],
});

console.log(`\nTOTAL ACTIVIDADES EN BD: ${rows.length}\n`);

const porParroquia: Record<string, typeof rows> = {};
for (const r of rows) {
  const key = r.parroquia?.nombre ?? "(sin parroquia)";
  if (!porParroquia[key]) porParroquia[key] = [];
  porParroquia[key].push(r);
}

for (const [parroquia, acts] of Object.entries(porParroquia)) {
  console.log(`\n${parroquia} [${acts.length}]:`);
  for (const a of acts) {
    console.log(`  ${a.fechaRegistro?.toISOString()?.slice(0,10)} | ${a.idTipoActividadPreventiva} | ${a.estadoActividad} | ${a.nombreActividad}`);
  }
}

await prisma.$disconnect();
