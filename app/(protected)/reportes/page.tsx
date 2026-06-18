import { unstable_cache } from "next/cache";
import { verifySession } from "@/app/lib/dal";
import { toFrontendRole } from "@/app/lib/roles";
import { redirect } from "next/navigation";
import { prisma } from "@/app/lib/prisma";
import { ReportesModule } from "@/app/ui/reportes/reportes-module";
import type {
  BrigadistasData, KitsData, ActividadesData, IncidenciasData,
  ParroquiaRiesgoData, RiesgoNivel,
} from "@/app/ui/reportes/types";

// force-dynamic evita pre-render estático; unstable_cache cachea solo las queries DB
export const dynamic = "force-dynamic";

// ── Cache 1: datos base (no filtrados por fecha) — TTL 1 hora ────────────────
const fetchBaseData = unstable_cache(
  async () => {
    const [
      totalBrigadistas,
      brigadistasCapacitadosTotal,
      totalParroquias,
      parroquiasConPlanAprobado,
      brigadistasTotalGrp,
      brigadistasCapGrp,
      kitsPorTipoGrp,
      parroquiasData,
      parroquiasList,
    ] = await Promise.all([
      prisma.brigadistaParroquial.count({ where: { estado: "ACTIVO" } }),
      prisma.brigadistaParroquial.count({ where: { estado: "ACTIVO", idCertificacionCurso: { not: null } } }),
      prisma.parroquia.count({ where: { estado: "ACTIVO" } }),
      prisma.parroquia.count({ where: { planesTrabajo: { some: { estadoAprobacion: "APROBADO" } } } }),
      prisma.brigadistaParroquial.groupBy({
        by: ["idParroquia"],
        where: { estado: "ACTIVO" },
        _count: { _all: true },
      }),
      prisma.brigadistaParroquial.groupBy({
        by: ["idParroquia"],
        where: { estado: "ACTIVO", idCertificacionCurso: { not: null } },
        _count: { _all: true },
      }),
      prisma.kitEmergencia.groupBy({
        by: ["tipoKit"],
        where: { estadoKit: "ACTIVO" },
        _sum: { stockActual: true },
        _count: { _all: true },
      }),
      prisma.parroquia.findMany({
        where: { estado: "ACTIVO" },
        select: {
          idParroquia: true,
          nombre: true,
          latitud: true,
          longitud: true,
          planesTrabajo: { where: { estadoAprobacion: "APROBADO" }, select: { idPlanTrabajoGRD: true } },
        },
        orderBy: { nombre: "asc" },
      }),
      prisma.parroquia.findMany({
        where: { estado: "ACTIVO" },
        select: { idParroquia: true, nombre: true },
        orderBy: { nombre: "asc" },
      }),
    ]);

    return {
      totalBrigadistas,
      brigadistasCapacitadosTotal,
      totalParroquias,
      parroquiasConPlanAprobado,
      brigadistasTotalGrp: brigadistasTotalGrp.map(g => ({ idParroquia: g.idParroquia, count: g._count._all })),
      brigadistasCapGrp: brigadistasCapGrp.map(g => ({ idParroquia: g.idParroquia, count: g._count._all })),
      kitsPorTipo: kitsPorTipoGrp.map(g => ({ tipoKit: g.tipoKit, stockActual: g._sum.stockActual ?? 0, total: g._count._all })),
      parroquiasData: parroquiasData.map(p => ({
        idParroquia: p.idParroquia,
        nombre: p.nombre,
        tienePlan: p.planesTrabajo.length > 0,
        latitud: p.latitud ? Number(p.latitud) : null,
        longitud: p.longitud ? Number(p.longitud) : null,
      })),
      parroquiasList: parroquiasList.map(p => ({ id: p.idParroquia, nombre: p.nombre })),
    };
  },
  ["reportes-base"],
  { revalidate: 3600 }
);

// ── Cache 2: datos filtrados por fecha — TTL 30 minutos ──────────────────────
const fetchFilteredData = unstable_cache(
  async (desdeISO: string, hastaISO: string, parroquiasStr: string) => {
    const desde = new Date(desdeISO);
    const hasta = new Date(hastaISO);
    const parroquiasFiltro = parroquiasStr ? parroquiasStr.split(",").filter(Boolean) : [];
    const filtroFecha = { gte: desde, lte: hasta };
    const whereInc = {
      fechaRegistro: filtroFecha,
      ...(parroquiasFiltro.length > 0 ? { idParroquia: { in: parroquiasFiltro } } : {}),
    };

    const [
      totalIncidencias,
      incidenciasList,
      estadoGroups,
      tipoGroups,
      gravedadGroups,
      totalActividades,
      actividadesEjecutadas,
      actividadesEstadoGrp,
      actividadesTipoGrp,
      actividadesParticipantes,
      actividadesPorParroquiaTotal,
      actividadesPorParroquiaEjec,
      movimientosKitsTotal,
      movimientosSalida,
      catalogoTipos,
    ] = await Promise.all([
      prisma.incidencia.count({ where: whereInc }),
      prisma.incidencia.findMany({
        where: whereInc,
        include: { parroquia: { select: { nombre: true } }, usuarioResponsable: { select: { nombres: true, apellidos: true } } },
        orderBy: { fechaRegistro: "desc" },
      }),
      prisma.incidencia.groupBy({ by: ["estadoActual"], where: whereInc, _count: { _all: true } }),
      prisma.incidencia.groupBy({ by: ["tipoEvento"], where: whereInc, _count: { _all: true } }),
      prisma.incidencia.groupBy({ by: ["gravedad"], where: whereInc, _count: { _all: true } }),
      prisma.actividadPreventiva.count(),
      prisma.actividadPreventiva.count({ where: { estadoActividad: "EJECUTADA" } }),
      prisma.actividadPreventiva.groupBy({ by: ["estadoActividad"], _count: { _all: true } }),
      prisma.actividadPreventiva.groupBy({ by: ["idTipoActividadPreventiva"], _count: { _all: true } }),
      prisma.actividadPreventiva.aggregate({ _sum: { numeroParticipantesReal: true } }),
      prisma.actividadPreventiva.groupBy({ by: ["idParroquia"], _count: { _all: true } }),
      prisma.actividadPreventiva.groupBy({ by: ["idParroquia"], where: { estadoActividad: "EJECUTADA" }, _count: { _all: true } }),
      prisma.movimientoKit.aggregate({ where: { tipoMovimiento: "SALIDA" }, _sum: { cantidad: true } }),
      prisma.movimientoKit.findMany({
        where: { tipoMovimiento: "SALIDA" },
        select: { cantidad: true, idParroquiaDestino: true, kitEmergencia: { select: { tipoKit: true } } },
      }),
      prisma.catalogoDetalleGRD.findMany({ select: { idCatalogoDetalleGRD: true, valor: true } }),
    ]);

    // Pre-compute aggregations while raw dates are available
    const rangeDays = (hasta.getTime() - desde.getTime()) / (1000 * 60 * 60 * 24);
    const byWeek = rangeDays > 14;
    const timelineMap: Record<string, number> = {};
    const parroquiaIdMap: Record<string, number> = {};
    const parroquiaNameMap: Record<string, number> = {};
    let tiempoSuma = 0;

    for (const inc of incidenciasList) {
      // Timeline
      const d = new Date(inc.fechaRegistro);
      let key: string;
      if (byWeek) {
        const dow = d.getUTCDay() || 7;
        const ws = new Date(d);
        ws.setUTCDate(d.getUTCDate() - dow + 1);
        key = ws.toISOString().slice(0, 10);
      } else {
        key = d.toISOString().slice(0, 10);
      }
      timelineMap[key] = (timelineMap[key] || 0) + 1;

      // Por parroquia ID (for risk)
      if (inc.idParroquia) {
        parroquiaIdMap[inc.idParroquia] = (parroquiaIdMap[inc.idParroquia] || 0) + 1;
      }
      // Por parroquia nombre (for chart)
      const nombre = inc.parroquia?.nombre ?? "Sin parroquia";
      parroquiaNameMap[nombre] = (parroquiaNameMap[nombre] || 0) + 1;

      // Tiempo promedio
      tiempoSuma += (inc.updatedAt.getTime() - inc.fechaRegistro.getTime()) / (1000 * 60 * 60 * 24);
    }

    const timeline = Object.entries(timelineMap)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => a.label.localeCompare(b.label));

    const porParroquia = Object.entries(parroquiaNameMap)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const tiempoPromedio = incidenciasList.length > 0 ? Math.round(tiempoSuma / incidenciasList.length) : 0;

    const estadoCount = (estado: string) => estadoGroups.find(g => g.estadoActual === estado)?._count._all ?? 0;

    const tipoLabelMap = new Map(catalogoTipos.map(c => [c.idCatalogoDetalleGRD, c.valor]));

    // Serialize incidencias list (remove Date objects)
    const incidenciasRows = incidenciasList.map(inc => ({
      id: inc.idIncidencia,
      Codigo: inc.codigoCaso || "-",
      Fecha: inc.fechaRegistro.toLocaleDateString("es-PE", { timeZone: "UTC" }),
      Tipo: inc.tipoEvento || "-",
      Gravedad: inc.gravedad || "-",
      Estado: inc.estadoActual,
      Parroquia: inc.parroquia?.nombre || "No asignada",
      Ubicacion: inc.direccionEvento || "-",
      Responsable: inc.usuarioResponsable
        ? `${inc.usuarioResponsable.nombres} ${inc.usuarioResponsable.apellidos ?? ""}`.trim()
        : "-",
    }));

    // Kit aggregations
    const kitsPorParroquia: Record<string, number> = {};
    const kitsPorTipo: Record<string, number> = {};
    for (const m of movimientosSalida) {
      const parroquiaId = m.idParroquiaDestino ?? "sin-parroquia";
      kitsPorParroquia[parroquiaId] = (kitsPorParroquia[parroquiaId] || 0) + (m.cantidad ?? 0);
      const tipo = m.kitEmergencia?.tipoKit ?? "Sin tipo";
      kitsPorTipo[tipo] = (kitsPorTipo[tipo] || 0) + (m.cantidad ?? 0);
    }

    return {
      totalIncidencias,
      incidenciasPorParroquiaId: parroquiaIdMap,
      incidenciasRows,
      timeline,
      byWeek,
      porEstado: estadoGroups.map(g => ({ label: g.estadoActual || "Sin estado", value: g._count._all })),
      porTipo: tipoGroups.filter(g => g.tipoEvento).map(g => ({ label: g.tipoEvento as string, value: g._count._all })),
      porParroquia,
      porGravedad: gravedadGroups.filter(g => g.gravedad).map(g => ({ label: g.gravedad as string, value: g._count._all })).sort((a, b) => b.value - a.value),
      incidenciasCerradas: estadoCount("CERRADO"),
      incidenciasEnSeguimiento: estadoCount("SEGUIMIENTO ABIERTO"),
      incidenciasActivas: ["EN EVALUACION", "ASIGNADO", "DATA RECOPILADA", "APROBADO", "ATENDIDO"].reduce((s, e) => s + estadoCount(e), 0),
      tiempoPromedio,
      totalActividades,
      actividadesEjecutadas,
      actividadesEstado: actividadesEstadoGrp.map(g => ({ label: g.estadoActividad, value: g._count._all })),
      // Deduplica etiquetas "sin catálogo" para que no aparezcan N veces como "Otro"
      actividadesTipo: (() => {
        const sinCatalogo: { label: string; value: number }[] = [];
        const conCatalogo: { label: string; value: number }[] = [];
        actividadesTipoGrp.forEach(g => {
          const lbl = tipoLabelMap.get(g.idTipoActividadPreventiva);
          if (lbl) { conCatalogo.push({ label: lbl, value: g._count._all }); }
          else { sinCatalogo.push({ label: `Tipo ${sinCatalogo.length + 1}`, value: g._count._all }); }
        });
        // Si TODOS los tipos son desconocidos, agrúpalos en "Sin clasificar"
        if (conCatalogo.length === 0 && sinCatalogo.length > 0) {
          return [{ label: "Sin clasificar", value: sinCatalogo.reduce((s, x) => s + x.value, 0) }];
        }
        return [...conCatalogo, ...sinCatalogo];
      })(),
      actividadesParticipantes: actividadesParticipantes._sum.numeroParticipantesReal ?? 0,
      actividadesPorParroquiaTotal: actividadesPorParroquiaTotal.map(g => ({ idParroquia: g.idParroquia, count: g._count._all })),
      actividadesPorParroquiaEjec: actividadesPorParroquiaEjec.map(g => ({ idParroquia: g.idParroquia, count: g._count._all })),
      kitsEntregadosTotal: movimientosKitsTotal._sum.cantidad ?? 0,
      kitsPorParroquiaId: kitsPorParroquia,
      kitsPorTipo: Object.entries(kitsPorTipo).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value),
    };
  },
  ["reportes-filtered"],
  { revalidate: 1800 }
);

// ── Page ─────────────────────────────────────────────────────────────────────
export default async function ReportesPage({
  searchParams,
}: {
  searchParams?: Promise<{ desde?: string; hasta?: string; parroquias?: string }>;
}) {
  const session = await verifySession();
  const role = toFrontendRole(session.role);
  if (!["admin", "especialistaGRD", "comite", "jefaOGP"].includes(role)) redirect("/dashboard");

  const hoy = new Date();
  const haceUnMes = new Date();
  haceUnMes.setMonth(hoy.getMonth() - 1);

  const params = await searchParams;
  const desdeISO = params?.desde ?? haceUnMes.toISOString().split("T")[0];
  const hastaISO = params?.hasta ?? hoy.toISOString().split("T")[0];
  const parroquiasParam = params?.parroquias ?? "";
  const parroquiasFiltro = parroquiasParam ? parroquiasParam.split(",").filter(Boolean) : [];

  const [base, filtered] = await Promise.all([
    fetchBaseData(),
    fetchFilteredData(desdeISO, hastaISO, parroquiasParam),
  ]);

  // ── Lookup maps ────────────────────────────────────────────────────────────
  const parroquiaNameMap = new Map(base.parroquiasData.map(p => [p.idParroquia, p.nombre]));
  const brigadistasTotalMap = new Map(base.brigadistasTotalGrp.map(b => [b.idParroquia, b.count]));
  const brigadistasCapMap = new Map(base.brigadistasCapGrp.map(b => [b.idParroquia, b.count]));
  const actividadesTotalMap = new Map(filtered.actividadesPorParroquiaTotal.map(g => [g.idParroquia, g.count]));
  const actividadesEjecMap = new Map(filtered.actividadesPorParroquiaEjec.map(g => [g.idParroquia, g.count]));

  // ── Brigadistas data ───────────────────────────────────────────────────────
  const brigadistasData: BrigadistasData = {
    total: base.totalBrigadistas,
    capacitados: base.brigadistasCapacitadosTotal,
    porParroquia: base.parroquiasData
      .map(p => {
        const total = brigadistasTotalMap.get(p.idParroquia) ?? 0;
        const capacitados = brigadistasCapMap.get(p.idParroquia) ?? 0;
        return { parroquia: p.nombre, total, capacitados, pct: total > 0 ? Math.round((capacitados / total) * 100) : 0 };
      })
      .filter(p => p.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 12),
  };

  // ── Kits data ──────────────────────────────────────────────────────────────
  const kitsPorParroquia = Object.entries(filtered.kitsPorParroquiaId)
    .map(([id, value]) => ({ label: parroquiaNameMap.get(id) ?? "Sin asignar", value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const kitsData: KitsData = {
    totalEntregados: filtered.kitsEntregadosTotal,
    porTipo: filtered.kitsPorTipo,
    porParroquia: kitsPorParroquia,
    stockActual: base.kitsPorTipo,
  };

  // ── Actividades por parroquia ─────────────────────────────────────────────
  const actividadesPorParroquia = base.parroquiasData
    .filter(p => actividadesTotalMap.has(p.idParroquia))
    .map(p => ({ label: p.nombre, value: actividadesTotalMap.get(p.idParroquia) ?? 0 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const actividadesData: ActividadesData = {
    total: filtered.totalActividades,
    ejecutadas: filtered.actividadesEjecutadas,
    totalParticipantes: filtered.actividadesParticipantes,
    porEstado: filtered.actividadesEstado,
    porTipo: filtered.actividadesTipo,
    porParroquia: actividadesPorParroquia,
  };

  // ── Incidencias data ───────────────────────────────────────────────────────
  // Siempre incluye los 4 niveles de gravedad estándar, incluso si tienen 0 casos en el período
  const GRAVEDAD_STANDARD = ["Alto", "Severo", "Moderado", "Leve"];
  const gravedadConZeros = GRAVEDAD_STANDARD.map(g => ({
    label: g,
    value: filtered.porGravedad.find(x => x.label.toLowerCase() === g.toLowerCase())?.value ?? 0,
  }));
  // Añadir niveles no estándar que puedan existir en la BD (ej. "ALTA")
  const gravedadExtras = filtered.porGravedad.filter(
    g => !GRAVEDAD_STANDARD.some(s => s.toLowerCase() === g.label.toLowerCase())
  );
  const porGravedadCompleta = [...gravedadConZeros, ...gravedadExtras].filter(g => g.value > 0 || GRAVEDAD_STANDARD.some(s => s.toLowerCase() === g.label.toLowerCase()));

  const incidenciasData: IncidenciasData = {
    cerradas: filtered.incidenciasCerradas,
    enSeguimiento: filtered.incidenciasEnSeguimiento,
    activas: filtered.incidenciasActivas,
    porGravedad: porGravedadCompleta,
  };

  // ── Parroquias riesgo ──────────────────────────────────────────────────────
  const parroquiasRiesgo: ParroquiaRiesgoData[] = base.parroquiasData.map(p => {
    const brigadistasTotal = brigadistasTotalMap.get(p.idParroquia) ?? 0;
    const brigadistasCapacitados = brigadistasCapMap.get(p.idParroquia) ?? 0;
    const pctCapacitados = brigadistasTotal > 0 ? Math.round((brigadistasCapacitados / brigadistasTotal) * 100) : 0;
    const incidencias = filtered.incidenciasPorParroquiaId[p.idParroquia] ?? 0;
    const actividadesTotal = actividadesTotalMap.get(p.idParroquia) ?? 0;
    const actividadesEjecutadas = actividadesEjecMap.get(p.idParroquia) ?? 0;

    let score = 0;
    if (incidencias >= 5) score += 3; else if (incidencias >= 2) score += 2; else if (incidencias >= 1) score += 1;
    if (brigadistasTotal < 2) score += 3; else if (brigadistasTotal < 5) score += 2; else if (brigadistasTotal < 10) score += 1;
    if (pctCapacitados < 30) score += 2; else if (pctCapacitados < 60) score += 1;
    if (!p.tienePlan) score += 2;
    if (actividadesTotal === 0 || (actividadesTotal > 0 && actividadesEjecutadas / actividadesTotal < 0.4)) score += 2;

    const riesgoNivel: RiesgoNivel = score >= 8 ? "CRÍTICO" : score >= 5 ? "ALTO" : score >= 3 ? "MEDIO" : "BAJO";

    return { nombre: p.nombre, latitud: p.latitud, longitud: p.longitud, incidencias, brigadistas: brigadistasTotal, pctCapacitados, tienePlan: p.tienePlan, actividadesEjecutadas, actividadesTotal, riesgoNivel, riesgoScore: score };
  }).sort((a, b) => b.riesgoScore - a.riesgoScore);

  // ── Totales ────────────────────────────────────────────────────────────────
  const totales = {
    incidencias: filtered.totalIncidencias,
    pctBrigadistasCapacitados: base.totalBrigadistas > 0 ? Math.round((base.brigadistasCapacitadosTotal / base.totalBrigadistas) * 100) : 0,
    pctParroquiasPlan: base.totalParroquias > 0 ? Math.round((base.parroquiasConPlanAprobado / base.totalParroquias) * 100) : 0,
    pctActividadesEjecutadas: filtered.totalActividades > 0 ? Math.round((filtered.actividadesEjecutadas / filtered.totalActividades) * 100) : 0,
    kitsEntregados: filtered.kitsEntregadosTotal,
    tiempoPromedio: filtered.tiempoPromedio,
    totalBrigadistas: base.totalBrigadistas,
    brigadistasCapacitados: base.brigadistasCapacitadosTotal,
    totalParroquias: base.totalParroquias,
    parroquiasConPlan: base.parroquiasConPlanAprobado,
  };

  const dataExportacion = filtered.incidenciasRows.map(({ id: _id, ...rest }) => rest);
  const topIncidencias = filtered.incidenciasRows.slice(0, 10);

  return (
    <ReportesModule
      filtros={{ desde: desdeISO, hasta: hastaISO, parroquias: parroquiasFiltro }}
      totales={totales}
      porEstado={filtered.porEstado}
      porTipo={filtered.porTipo}
      porParroquia={filtered.porParroquia}
      timeline={filtered.timeline}
      byWeek={filtered.byWeek}
      parroquias={base.parroquiasList}
      topIncidencias={topIncidencias}
      dataExportacion={dataExportacion}
      actividadesData={actividadesData}
      incidenciasData={incidenciasData}
      brigadistasData={brigadistasData}
      kitsData={kitsData}
      parroquiasRiesgo={parroquiasRiesgo}
    />
  );
}
