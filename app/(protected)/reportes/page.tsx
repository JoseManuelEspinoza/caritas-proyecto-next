import { verifySession } from "@/app/lib/dal";
import { toFrontendRole } from "@/app/lib/roles";
import { redirect } from "next/navigation";
import { prisma } from "@/app/lib/prisma";
import { ReportesModule } from "@/app/ui/reportes/reportes-module";

export const dynamic = "force-dynamic";

export default async function ReportesPage({
  searchParams,
}: {
  searchParams?: Promise<{ desde?: string; hasta?: string; parroquias?: string }>;
}) {
  const session = await verifySession();
  const role = toFrontendRole(session.role);
  if (!["admin", "especialistaGRD", "comite", "jefaOGP"].includes(role)) redirect("/dashboard");

  // ── Filtros de fecha ──────────────────────────────────────────────────────
  const hoy = new Date();
  const haceUnMes = new Date();
  haceUnMes.setMonth(hoy.getMonth() - 1);

  const params = await searchParams;
  const desde = params?.desde ? new Date(params.desde) : haceUnMes;
  const hasta = params?.hasta ? new Date(params.hasta) : hoy;
  hasta.setHours(23, 59, 59, 999);

  const parroquiasParam = params?.parroquias ?? "";
  const parroquiasFiltro = parroquiasParam ? parroquiasParam.split(",").filter(Boolean) : [];
  const filtroFecha = { gte: desde, lte: hasta };
  const whereInc = {
    fechaRegistro: filtroFecha,
    ...(parroquiasFiltro.length > 0 ? { idParroquia: { in: parroquiasFiltro } } : {}),
  };

  // ── Consultas paralelizadas ───────────────────────────────────────────────
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
    parroquiasList,
  ] = await Promise.all([
    prisma.incidencia.count({ where: whereInc }),

    prisma.incidencia.findMany({
      where: whereInc,
      include: { parroquia: true, usuarioResponsable: true },
      orderBy: { fechaRegistro: "desc" },
    }),

    prisma.incidencia.groupBy({
      by: ["estadoActual"],
      where: whereInc,
      _count: { _all: true },
    }),

    prisma.incidencia.groupBy({
      by: ["tipoEvento"],
      where: whereInc,
      _count: { _all: true },
    }),

    prisma.brigadistaParroquial.count(),
    prisma.brigadistaParroquial.count({ where: { idCertificacionCurso: { not: null } } }),

    prisma.parroquia.count(),
    prisma.parroquia.count({ where: { planesTrabajo: { some: { estadoAprobacion: "APROBADO" } } } }),

    prisma.actividadPreventiva.count(),
    prisma.actividadPreventiva.count({ where: { estadoActividad: "EJECUTADA" } }),

    prisma.movimientoKit.aggregate({
      where: { tipoMovimiento: "SALIDA" },
      _sum: { cantidad: true },
    }),

    prisma.parroquia.findMany({
      where: { estado: "ACTIVO" },
      select: { idParroquia: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
  ]);

  // ── Timeline: agrupar por día o semana según rango ────────────────────────
  const rangeDays = (hasta.getTime() - desde.getTime()) / (1000 * 60 * 60 * 24);
  const byWeek = rangeDays > 14;
  const timelineMap: Record<string, number> = {};
  for (const inc of incidenciasList) {
    const d = new Date(inc.fechaRegistro);
    let key: string;
    if (byWeek) {
      const dow = d.getUTCDay() || 7;
      const weekStart = new Date(d);
      weekStart.setUTCDate(d.getUTCDate() - dow + 1);
      key = weekStart.toISOString().slice(0, 10);
    } else {
      key = d.toISOString().slice(0, 10);
    }
    timelineMap[key] = (timelineMap[key] || 0) + 1;
  }
  const timeline = Object.entries(timelineMap)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => a.label.localeCompare(b.label));

  // ── Por parroquia ─────────────────────────────────────────────────────────
  const parroquiaMap: Record<string, number> = {};
  for (const inc of incidenciasList) {
    const nombre = inc.parroquia?.nombre ?? "Sin parroquia";
    parroquiaMap[nombre] = (parroquiaMap[nombre] || 0) + 1;
  }
  const porParroquia = Object.entries(parroquiaMap)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  // ── Tiempo promedio activo (días entre registro y última actualización) ────
  const tiempoPromedio =
    incidenciasList.length > 0
      ? Math.round(
          incidenciasList.reduce((sum, inc) => {
            const days =
              (inc.updatedAt.getTime() - inc.fechaRegistro.getTime()) /
              (1000 * 60 * 60 * 24);
            return sum + days;
          }, 0) / incidenciasList.length
        )
      : 0;

  // ── Formateo para gráficos ────────────────────────────────────────────────
  const porEstado = estadoGroups.map((g) => ({
    label: g.estadoActual || "Sin estado",
    value: g._count._all,
  }));
  const porTipo = tipoGroups
    .filter((g) => g.tipoEvento)
    .map((g) => ({ label: g.tipoEvento as string, value: g._count._all }));

  // ── Filas con ID (para navegación en tabla) y sin ID (para exportación) ──
  const allRows = incidenciasList.map((inc) => ({
    id: inc.idIncidencia,
    Codigo: inc.codigoCaso || "-",
    Fecha: inc.fechaRegistro.toLocaleDateString("es-PE"),
    Tipo: inc.tipoEvento || "-",
    Gravedad: inc.gravedad || "-",
    Estado: inc.estadoActual,
    Parroquia: inc.parroquia?.nombre || "No asignada",
    Ubicacion: inc.direccionEvento || "-",
    Responsable: inc.usuarioResponsable
      ? `${inc.usuarioResponsable.nombres} ${inc.usuarioResponsable.apellidos ?? ""}`.trim()
      : "-",
  }));

  const dataExportacion = allRows.map(({ id: _id, ...rest }: typeof allRows[number]) => rest);
  const topIncidencias = allRows.slice(0, 10);

  return (
    <ReportesModule
      filtros={{
        desde: desde.toISOString().split("T")[0],
        hasta: hasta.toISOString().split("T")[0],
        parroquias: parroquiasFiltro,
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
        tiempoPromedio,
      }}
      porEstado={porEstado}
      porTipo={porTipo}
      porParroquia={porParroquia}
      timeline={timeline}
      byWeek={byWeek}
      parroquias={parroquiasList.map((p) => ({ id: p.idParroquia, nombre: p.nombre }))}
      topIncidencias={topIncidencias}
      dataExportacion={dataExportacion}
      brigadistasData={brigadistasData}
      actividadesData={actividadesData}
      incidenciasData={incidenciasData}
      kitsData={kitsData}
    />
  );
}
