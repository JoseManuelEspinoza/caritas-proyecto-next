"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  FileText, AlertTriangle, Users, Package,
  Download, Calendar, Activity, Map, Clock, X,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ExternalLink,
} from "lucide-react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend, Area, AreaChart,
} from "recharts";

import { type ReportesProps, type IncidenciaRow, COLORS, GREEN, fmtLabel } from "./types";
import { KpiCard } from "./kpi-card";
import { ParroquiaMultiSelect } from "./parroquia-multiselect";
import { ExportModal } from "./export-modal";

export function ReportesModule({
  filtros, totales, porEstado, porTipo, porParroquia,
  timeline, byWeek, parroquias, topIncidencias, dataExportacion,
}: ReportesProps) {
  const router = useRouter();
  const [desde, setDesde] = useState(filtros.desde);
  const [hasta, setHasta] = useState(filtros.hasta);
  const [parroquiasFiltro, setParroquiasFiltro] = useState<string[]>(filtros.parroquias ?? []);
  const [showModal, setShowModal] = useState(false);
  const [tablaExpanded, setTablaExpanded] = useState(false);
  const [rowTooltip, setRowTooltip] = useState<{ x: number; y: number; codigo: string } | null>(null);
  const kpiRef = useRef<HTMLDivElement>(null);

  const scrollKpi = (dir: "left" | "right") => {
    kpiRef.current?.scrollBy({ left: dir === "left" ? -220 : 220, behavior: "smooth" });
  };

  const aplicarFiltros = () => {
    const qs = new URLSearchParams({ desde, hasta });
    if (parroquiasFiltro.length > 0) qs.set("parroquias", parroquiasFiltro.join(","));
    router.push(`/reportes?${qs.toString()}`);
  };

  const limpiarFiltros = () => {
    const hoy = new Date();
    const haceUnMes = new Date();
    haceUnMes.setMonth(hoy.getMonth() - 1);
    setDesde(haceUnMes.toISOString().split("T")[0]);
    setHasta(hoy.toISOString().split("T")[0]);
    setParroquiasFiltro([]);
    router.push("/reportes");
  };

  const hayFiltrosActivos = parroquiasFiltro.length > 0 || filtros.desde !== desde || filtros.hasta !== hasta;
  const timelineLabeled = timeline.map((t) => ({ ...t, label: fmtLabel(t.label) }));

  const kpiCards = [
    { icon: <AlertTriangle className="w-5 h-5 text-[#009850]" />, label: "Incidencias", value: totales.incidencias, sub: "En el periodo", accent: true },
    { icon: <Users className="w-5 h-5 text-[#009850]" />, label: "Brigadistas", value: `${totales.pctBrigadistasCapacitados}%`, sub: "Con certificación" },
    { icon: <Map className="w-5 h-5 text-[#009850]" />, label: "Planes GRD", value: `${totales.pctParroquiasPlan}%`, sub: "Parroquias con plan" },
    { icon: <Activity className="w-5 h-5 text-[#009850]" />, label: "Prevención", value: `${totales.pctActividadesEjecutadas}%`, sub: "Actividades ejecutadas" },
    { icon: <Package className="w-5 h-5 text-[#009850]" />, label: "Kits", value: totales.kitsEntregados, sub: "Unidades distribuidas" },
    { icon: <Clock className="w-5 h-5 text-[#009850]" />, label: "Días Promedio", value: totales.tiempoPromedio, sub: "Incidencia activa" },
  ];

  const tablaRows = tablaExpanded ? dataExportacion : topIncidencias;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Tooltip de fila — posición fija, escapa cualquier overflow */}
      {rowTooltip && (
        <div
          style={{ position: "fixed", left: rowTooltip.x, top: rowTooltip.y, zIndex: 9999 }}
          className="pointer-events-none -translate-y-full -translate-x-2 mb-2"
        >
          <div className="flex items-center gap-1.5 bg-gray-900 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap">
            <ExternalLink className="w-3 h-3 flex-shrink-0" />
            Ir a Incidencia {rowTooltip.codigo}
          </div>
          <div
            className="mx-4 w-0 h-0"
            style={{
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderTop: "5px solid #111827",
            }}
          />
        </div>
      )}

      {showModal && (
        <ExportModal
          data={dataExportacion}
          parroquias={parroquias}
          onClose={() => setShowModal(false)}
          desde={desde}
          hasta={hasta}
        />
      )}

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-[#009850]/10 rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-[#009850]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Reportes y Estadísticas</h1>
            <p className="text-xs text-gray-500">Indicadores clave del sistema GRD</p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="cursor-pointer flex items-center gap-2 px-4 py-2.5 bg-[#009850] hover:bg-[#007a40] text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" /> Exportar reporte
        </button>
      </div>

      {/* ── Filtros ────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Desde</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                className="cursor-pointer pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#009850] focus:ring-2 focus:ring-[#009850]/20"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Hasta</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                className="cursor-pointer pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#009850] focus:ring-2 focus:ring-[#009850]/20"
              />
            </div>
          </div>
          {parroquias.length > 0 && (
            <ParroquiaMultiSelect
              parroquias={parroquias}
              selected={parroquiasFiltro}
              onChange={setParroquiasFiltro}
            />
          )}
          <button
            onClick={aplicarFiltros}
            className="cursor-pointer px-5 py-2 bg-[#009850] text-white font-semibold rounded-lg text-sm hover:bg-[#007a40] transition-colors shadow-sm"
          >
            Aplicar
          </button>
          {hayFiltrosActivos && (
            <button
              onClick={limpiarFiltros}
              className="cursor-pointer text-xs text-gray-400 hover:text-[#009850] flex items-center gap-1 transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Limpiar
            </button>
          )}
        </div>
      </div>

      {/* ── KPI Carrusel ──────────────────────────────────────────────────── */}
      <div className="relative">
        <button
          onClick={() => scrollKpi("left")}
          aria-label="Anterior"
          className="cursor-pointer absolute left-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-shadow"
        >
          <ChevronLeft className="w-4 h-4 text-gray-500" />
        </button>
        <div
          ref={kpiRef}
          className="flex gap-3 overflow-x-auto px-9 pb-1"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {kpiCards.map((card) => (
            <div key={card.label} className="min-w-[200px] max-w-[220px]">
              <KpiCard {...card} />
            </div>
          ))}
        </div>
        <button
          onClick={() => scrollKpi("right")}
          aria-label="Siguiente"
          className="cursor-pointer absolute right-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-shadow"
        >
          <ChevronRight className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* ── Timeline ──────────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h2 className="text-sm font-bold text-gray-900 mb-0.5">Incidencias en el tiempo</h2>
        <p className="text-xs text-gray-400 mb-4">{byWeek ? "Agrupadas por semana" : "Agrupadas por día"}</p>
        {timelineLabeled.length === 0 ? (
          <div className="flex h-[200px] items-center justify-center text-sm text-gray-400">Sin datos en este periodo.</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={timelineLabeled} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={GREEN} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={GREEN} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: "10px", border: "1px solid #E5E7EB", fontSize: 12 }}
                formatter={(v) => [`${v} incidencias`, ""]} />
              <Area type="monotone" dataKey="value" stroke={GREEN} strokeWidth={2}
                fill="url(#greenGrad)" dot={{ r: 3, fill: GREEN }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Pie + Parroquia ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 mb-0.5">Incidencias por Estado</h2>
          <p className="text-xs text-gray-400 mb-4">Ciclo de vida de los casos.</p>
          {porEstado.length === 0 ? (
            <div className="flex h-[240px] items-center justify-center text-sm text-gray-400">Sin datos.</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={porEstado} dataKey="value" nameKey="label"
                  cx="50%" cy="50%" outerRadius={85} innerRadius={45}
                  label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                  labelLine={false}>
                  {porEstado.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => [`${v}`, "Incidencias"]} />
                <Legend iconType="circle" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </>}

      {/* ── Tab: Actividades Preventivas ──────────────────────────────────────── */}
      {tab === "actividades" && <>

        {/* KPI row */}
        {(() => {
          const pctEjec = actividadesData.total > 0 ? Math.round((actividadesData.ejecutadas / actividadesData.total) * 100) : 0;
          const pendientes = actividadesData.total - actividadesData.ejecutadas;
          return (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KPICard
                icon={<Activity className="w-4.5 h-4.5" style={{ color: "#3B82F6" }} />}
                label="Total Actividades"
                value={actividadesData.total}
                sub="registradas en el sistema"
                color="#3B82F6"
              />
              <KPICard
                icon={<CheckCircle className="w-4.5 h-4.5" style={{ color: "#009850" }} />}
                label="Ejecutadas"
                value={actividadesData.ejecutadas}
                sub={`${pctEjec}% del total`}
                color="#009850"
                pct={pctEjec}
              />
              <KPICard
                icon={<Target className="w-4.5 h-4.5" style={{ color: "#F59E0B" }} />}
                label="Pendientes / Prog."
                value={pendientes}
                sub="aún no ejecutadas"
                color="#F59E0B"
              />
              <KPICard
                icon={<Users className="w-4.5 h-4.5" style={{ color: "#9155A8" }} />}
                label="Participantes"
                value={actividadesData.totalParticipantes}
                sub="personas alcanzadas"
                color="#9155A8"
              />
            </div>
          );
        })()}

        {/* Por estado + Por tipo */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Actividades por Estado" subtitle="Distribución según el estado de ejecución">
            {actividadesData.porEstado.length === 0 ? (
              <div className="flex h-56 items-center justify-center text-sm text-gray-400">Sin datos.</div>
            ) : (
              <ResponsiveContainer width="100%" height={224}>
                <PieChart>
                  <Pie
                    data={actividadesData.porEstado}
                    dataKey="value"
                    nameKey="label"
                    cx="40%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={48}
                    strokeWidth={0}
                  >
                    {actividadesData.porEstado.map((entry, i) => (
                      <Cell key={i} fill={ESTADO_ACT_COLORS[entry.label] || PALETTE[i % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v} actividades`, ""]} />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    formatter={(v) => <span style={{ fontSize: 11, color: "#4B5563" }}>{v}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Actividades por Tipo" subtitle="Distribución por tipo o modalidad de actividad">
            {actividadesData.porTipo.length === 0 ? (
              <div className="flex h-56 items-center justify-center text-sm text-gray-400">Sin datos.</div>
            ) : (
              <ResponsiveContainer width="100%" height={224}>
                <BarChart
                  data={actividadesData.porTipo}
                  layout="vertical"
                  margin={{ top: 4, right: 50, left: 4, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="label" tick={{ fontSize: 9, fill: "#6B7280" }} axisLine={false} tickLine={false} width={105} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F8FAFC" }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20}>
                    {actividadesData.porTipo.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                    <LabelList dataKey="value" position="right" style={{ fontSize: 10, fill: "#6B7280" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 mb-0.5">Incidencias por Parroquia</h2>
          <p className="text-xs text-gray-400 mb-4">Top 10 parroquias con más casos.</p>
          {porParroquia.length === 0 ? (
            <div className="flex h-[240px] items-center justify-center text-sm text-gray-400">Sin datos.</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={porParroquia} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="label" width={90}
                  tick={{ fontSize: 10, fill: "#6B7280" }} axisLine={false} tickLine={false}
                  tickFormatter={(v: string) => v.length > 14 ? v.slice(0, 13) + "…" : v} />
                <Tooltip contentStyle={{ borderRadius: "10px", border: "1px solid #E5E7EB", fontSize: 12 }}
                  formatter={(v) => [`${v}`, "Incidencias"]} />
                <Bar dataKey="value" fill={GREEN} radius={[0, 6, 6, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </>}

      {/* ── Tab: Casos e Incidencias ──────────────────────────────────────────── */}
      {tab === "incidencias" && <>

        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KPICard
            icon={<AlertTriangle className="w-4.5 h-4.5" style={{ color: "#EF4444" }} />}
            label="Total Casos"
            value={totales.incidencias}
            sub="registrados en el período"
            color="#EF4444"
          />
          <KPICard
            icon={<CheckCircle className="w-4.5 h-4.5" style={{ color: "#009850" }} />}
            label="Resueltos"
            value={incidenciasData.cerradas}
            sub={`${totales.incidencias > 0 ? Math.round((incidenciasData.cerradas / totales.incidencias) * 100) : 0}% del total`}
            color="#009850"
            pct={totales.incidencias > 0 ? Math.round((incidenciasData.cerradas / totales.incidencias) * 100) : 0}
          />
          <KPICard
            icon={<Target className="w-4.5 h-4.5" style={{ color: "#F97316" }} />}
            label="En Seguimiento"
            value={incidenciasData.enSeguimiento}
            sub="requieren monitoreo"
            color="#F97316"
          />
          <KPICard
            icon={<Activity className="w-4.5 h-4.5" style={{ color: "#3B82F6" }} />}
            label="En Proceso"
            value={incidenciasData.activas}
            sub="aún en atención"
            color="#3B82F6"
          />
        </div>
      </div>

      {/* ── Bar Tipo ──────────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h2 className="text-sm font-bold text-gray-900 mb-0.5">Incidencias por Tipo de Evento</h2>
        <p className="text-xs text-gray-400 mb-4">Clasificación de emergencias reportadas.</p>
        {porTipo.length === 0 ? (
          <div className="flex h-[200px] items-center justify-center text-sm text-gray-400">Sin datos.</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={porTipo} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: "10px", border: "1px solid #E5E7EB", fontSize: 12 }}
                formatter={(v) => [`${v}`, "Incidencias"]} />
              <Bar dataKey="value" fill={GREEN} radius={[6, 6, 0, 0]} maxBarSize={60} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Tabla de incidencias recientes ────────────────────────────────── */}
      {topIncidencias.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Incidencias recientes</h2>
              <p className="text-xs text-gray-400">
                {tablaExpanded
                  ? `Mostrando ${dataExportacion.length} registros del periodo`
                  : `Últimas ${topIncidencias.length} del periodo seleccionado`}
              </p>
            </div>
            <button
              onClick={() => setTablaExpanded((v) => !v)}
              className="cursor-pointer flex items-center gap-1 text-xs text-[#009850] font-semibold hover:opacity-70 transition-opacity"
            >
              {tablaExpanded ? "Ver menos" : "Ver todas"}
              {tablaExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="overflow-x-auto" onScroll={() => setRowTooltip(null)}>
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["Código", "Fecha", "Tipo", "Gravedad", "Estado", "Parroquia", "Ubicación"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tablaRows.map((row, i) => {
                  const incRow = row as IncidenciaRow;
                  const hasId = !tablaExpanded && typeof incRow.id === "string";
                  return (
                    <tr
                      key={i}
                      onClick={hasId ? () => router.push(`/grd/${incRow.id}`) : undefined}
                      onMouseEnter={
                        hasId
                          ? (e: React.MouseEvent<HTMLTableRowElement>) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setRowTooltip({ x: rect.left + 16, y: rect.top, codigo: String(row.Codigo) });
                            }
                          : undefined
                      }
                      onMouseLeave={hasId ? () => setRowTooltip(null) : undefined}
                      className={`transition-colors ${
                        hasId ? "cursor-pointer hover:bg-[#009850]/5" : "hover:bg-gray-50"
                      }`}
                    >
                      <td className="px-4 py-2.5 font-mono text-[11px] text-gray-500 whitespace-nowrap">
                        {String(row.Codigo)}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-gray-700">{String(row.Fecha)}</td>
                      <td className="px-4 py-2.5 text-gray-700">{String(row.Tipo)}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          row.Gravedad === "Alto" || row.Gravedad === "Crítico"
                            ? "bg-red-50 text-red-700"
                            : row.Gravedad === "Moderado"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-gray-100 text-gray-600"
                        }`}>
                          {String(row.Gravedad)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#009850]/10 text-[#009850]">
                          {String(row.Estado)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-700">{String(row.Parroquia)}</td>
                      <td className="px-4 py-2.5 text-gray-500 max-w-[180px] truncate">{String(row.Ubicacion)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!tablaExpanded && dataExportacion.length > topIncidencias.length && (
            <div className="px-5 py-3 border-t border-gray-50 text-center">
              <button
                onClick={() => setTablaExpanded(true)}
                className="cursor-pointer text-xs text-[#009850] font-semibold hover:opacity-70"
              >
                Ver los {dataExportacion.length} registros del periodo →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
