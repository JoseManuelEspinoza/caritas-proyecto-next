import { verifySession } from "@/app/lib/dal";
import { toFrontendRole } from "@/app/lib/roles";
import { redirect } from "next/navigation";
import { prisma } from "@/app/lib/prisma";
import { ReportesModule } from "@/app/ui/reportes/reportes-module";

export default async function ReportesPage() {
  const session = await verifySession();
  const role = toFrontendRole(session.role);
  if (!["admin", "comite", "jefaOGP"].includes(role)) redirect("/dashboard");

  // Agregaciones read-only para los indicadores.
  const [
    incidencias,
    brigadistas,
    brigadistasActivos,
    kits,
    kitAgg,
    cursos,
    planes,
    actividades,
    estadoGroups,
    tipoGroups,
  ] = await Promise.all([
    prisma.incidencia.count(),
    prisma.brigadistaParroquial.count(),
    prisma.brigadistaParroquial.count({ where: { estado: "ACTIVO" } }),
    prisma.kitEmergencia.count(),
    prisma.kitEmergencia.aggregate({ _sum: { stockActual: true } }),
    prisma.cursoCapacitacion.count(),
    prisma.planTrabajoGRD.count(),
    prisma.actividadPreventiva.count(),
    prisma.incidencia.groupBy({ by: ["estadoActual"], _count: { _all: true } }),
    prisma.incidencia.groupBy({ by: ["tipoEvento"], _count: { _all: true } }),
  ]);

  const porEstado = estadoGroups.map((g) => ({ label: g.estadoActual, value: g._count._all }));
  const porTipo = tipoGroups
    .filter((g) => g.tipoEvento)
    .map((g) => ({ label: g.tipoEvento as string, value: g._count._all }));

  return (
    <ReportesModule
      totales={{
        incidencias,
        brigadistas,
        brigadistasActivos,
        kits,
        stockTotal: kitAgg._sum.stockActual ?? 0,
        cursos,
        planes,
        actividades,
      }}
      porEstado={porEstado}
      porTipo={porTipo}
    />
  );
}
