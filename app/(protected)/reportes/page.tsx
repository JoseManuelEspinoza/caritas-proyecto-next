import { verifySession } from "@/app/lib/dal";
import { toFrontendRole } from "@/app/lib/roles";
import { redirect } from "next/navigation";
import { prisma } from "@/app/lib/prisma";
import { ReportesModule } from "@/app/ui/reportes/reportes-module";

export const dynamic = "force-dynamic";

export default async function ReportesPage({
  searchParams,
}: {
  searchParams?: Promise<{ desde?: string; hasta?: string }>;
}) {
  const session = await verifySession();
  const role = toFrontendRole(session.role);
  if (!["admin", "especialistaGRD", "comite", "jefaOGP"].includes(role)) redirect("/dashboard");

  const hoy = new Date();
  const haceUnMes = new Date();
  haceUnMes.setMonth(hoy.getMonth() - 1);

  const params = await searchParams;
  const desde = params?.desde ? new Date(params.desde) : haceUnMes;
  const hasta = params?.hasta ? new Date(params.hasta) : hoy;
  hasta.setHours(23, 59, 59, 999);
  const filtroFecha = { gte: desde, lte: hasta };

  const [
    totalIncidencias,
    incidenciasList,
    estadoGroups,
    tipoGroups,
    totalBrigadistas,
    brigadistasCapacitados,
    totalParroquias,
    parroquiasConPlanAprobado,
    totalActividades,
    actividadesEjecutadas,
    movimientosKitsEntregados,
  ] = await Promise.all([
    prisma.incidencia.count({ where: { fechaRegistro: filtroFecha } }),
    prisma.incidencia.findMany({
      where: { fechaRegistro: filtroFecha },
      include: { parroquia: true, usuarioResponsable: true },
      orderBy: { fechaRegistro: "asc" },
    }),
    prisma.incidencia.groupBy({
      by: ["estadoActual"],
      where: { fechaRegistro: filtroFecha },
      _count: { _all: true },
    }),
    prisma.incidencia.groupBy({
      by: ["tipoEvento"],
      where: { fechaRegistro: filtroFecha },
      _count: { _all: true },
    }),
    prisma.brigadistaParroquial.count(),
    prisma.brigadistaParroquial.count({ where: { idCertificacionCurso: { not: null } } }),
    prisma.parroquia.count(),
    prisma.parroquia.count({
      where: { planesTrabajo: { some: { estadoAprobacion: "APROBADO" } } },
    }),
    prisma.actividadPreventiva.count(),
    prisma.actividadPreventiva.count({ where: { estadoActividad: "EJECUTADA" } }),
    prisma.movimientoKit.aggregate({
      where: { tipoMovimiento: "SALIDA" },
      _sum: { cantidad: true },
    }),
  ]);

  // Derived data from incidenciasList (no extra DB round-trips)
  const tendenciaMap = new Map<string, number>();
  for (const inc of incidenciasList) {
    const day = inc.fechaRegistro.toISOString().split("T")[0];
    tendenciaMap.set(day, (tendenciaMap.get(day) ?? 0) + 1);
  }
  const porDia = Array.from(tendenciaMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([d, v]) => ({ label: d.slice(5), value: v }));

  const parroquiaMap = new Map<string, number>();
  for (const inc of incidenciasList) {
    if (!inc.parroquia) continue;
    parroquiaMap.set(inc.parroquia.nombre, (parroquiaMap.get(inc.parroquia.nombre) ?? 0) + 1);
  }
  const topParroquias = Array.from(parroquiaMap.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([label, value]) => ({ label, value }));

  const gravedadMap = new Map<string, number>();
  for (const inc of incidenciasList) {
    const g = inc.gravedad ?? "Sin definir";
    gravedadMap.set(g, (gravedadMap.get(g) ?? 0) + 1);
  }
  const porGravedad = Array.from(gravedadMap.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  // Normalize underscore variants (e.g. DATA_RECOPILADA → DATA RECOPILADA) and merge duplicate groups
  const estadoMerged = new Map<string, number>();
  for (const g of estadoGroups) {
    const label = (g.estadoActual || "Sin estado").replace(/_/g, " ");
    estadoMerged.set(label, (estadoMerged.get(label) ?? 0) + g._count._all);
  }
  const porEstado = Array.from(estadoMerged.entries()).map(([label, value]) => ({ label, value }));
  const porTipo = tipoGroups
    .filter((g) => g.tipoEvento)
    .map((g) => ({ label: g.tipoEvento as string, value: g._count._all }));

  const dataExportacion = incidenciasList.map((inc) => ({
    Codigo: inc.codigoCaso || "-",
    Fecha: inc.fechaRegistro.toLocaleDateString("es-PE"),
    Tipo: inc.tipoEvento || "-",
    Gravedad: inc.gravedad || "-",
    Estado: inc.estadoActual,
    Parroquia: inc.parroquia?.nombre || "No asignada",
    Ubicacion: inc.direccionEvento || "-",
  }));

  return (
    <ReportesModule
      filtros={{
        desde: desde.toISOString().split("T")[0],
        hasta: hasta.toISOString().split("T")[0],
      }}
      totales={{
        incidencias: totalIncidencias,
        pctBrigadistasCapacitados:
          totalBrigadistas > 0
            ? Math.round((brigadistasCapacitados / totalBrigadistas) * 100)
            : 0,
        pctParroquiasPlan:
          totalParroquias > 0
            ? Math.round((parroquiasConPlanAprobado / totalParroquias) * 100)
            : 0,
        pctActividadesEjecutadas:
          totalActividades > 0
            ? Math.round((actividadesEjecutadas / totalActividades) * 100)
            : 0,
        kitsEntregados: movimientosKitsEntregados._sum.cantidad || 0,
        totalBrigadistas,
        totalParroquias,
        totalActividades,
      }}
      porEstado={porEstado}
      porTipo={porTipo}
      porDia={porDia}
      topParroquias={topParroquias}
      porGravedad={porGravedad}
      dataExportacion={dataExportacion}
    />
  );
}
