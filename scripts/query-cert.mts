import { config } from "dotenv";
config();
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

// Total brigadistas activos
const totalBrig = await prisma.brigadistaParroquial.count({ where: { estado: "ACTIVO" } });

// Brigadistas con idCertificacionCurso != null
const conCertId = await prisma.brigadistaParroquial.count({ where: { estado: "ACTIVO", idCertificacionCurso: { not: null } } });

// Participantes con certificación emitida
const participantesCert = await prisma.participante.findMany({
  where: { inscripciones: { some: { certificacion: { isNot: null } } } },
  select: { numeroDocumento: true },
});
const dnisCert = participantesCert.map(p => p.numeroDocumento).filter(Boolean) as string[];

// Brigadistas cuyo DNI está en la lista de certificados
const conDniCert = dnisCert.length > 0
  ? await prisma.brigadistaParroquial.count({ where: { estado: "ACTIVO", dni: { in: dnisCert } } })
  : 0;

// Total certificados (union)
const certTotal = dnisCert.length > 0
  ? await prisma.brigadistaParroquial.count({ where: { estado: "ACTIVO", OR: [{ idCertificacionCurso: { not: null } }, { dni: { in: dnisCert } }] } })
  : conCertId;

console.log(`\nTotal brigadistas ACTIVO: ${totalBrig}`);
console.log(`Con idCertificacionCurso != null: ${conCertId}`);
console.log(`DNIs de participantes con cert: ${dnisCert.length}  →  ${dnisCert.slice(0,5).join(', ')}...`);
console.log(`Brigadistas cuyo DNI matchea: ${conDniCert}`);
console.log(`Total certificados (union): ${certTotal}`);

// Por parroquia
const brigPorParr = await prisma.brigadistaParroquial.groupBy({
  by: ["idParroquia"], where: { estado: "ACTIVO" }, _count: { _all: true },
});
const certPorParr = dnisCert.length > 0
  ? await prisma.brigadistaParroquial.groupBy({
      by: ["idParroquia"],
      where: { estado: "ACTIVO", OR: [{ idCertificacionCurso: { not: null } }, { dni: { in: dnisCert } }] },
      _count: { _all: true },
    })
  : await prisma.brigadistaParroquial.groupBy({
      by: ["idParroquia"], where: { estado: "ACTIVO", idCertificacionCurso: { not: null } }, _count: { _all: true },
    });

const parroquias = await prisma.parroquia.findMany({ where: { estado: "ACTIVO" }, select: { idParroquia: true, nombre: true } });
const nameMap = new Map(parroquias.map(p => [p.idParroquia, p.nombre]));
const certMap = new Map(certPorParr.map(g => [g.idParroquia, g._count._all]));

console.log(`\nPor parroquia:`);
for (const g of brigPorParr) {
  const nombre = nameMap.get(g.idParroquia) ?? `(sin parroquia: ${g.idParroquia})`;
  const cert = certMap.get(g.idParroquia) ?? 0;
  const pct = Math.round((cert / g._count._all) * 100);
  console.log(`  ${nombre}: ${cert}/${g._count._all} cert = ${pct}%`);
}

await prisma.$disconnect();
