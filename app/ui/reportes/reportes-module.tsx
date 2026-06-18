"use client";

import React, { useState, useRef, Suspense } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  FileText, AlertTriangle, Users, Package, Activity,
  Download, Calendar, Clock, X,
  CheckCircle, MapPin, LayoutDashboard,
  TrendingUp, ShieldAlert, ShieldCheck,
  AlertCircle, Info,
} from "lucide-react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend, Area, AreaChart, LabelList,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";

import {
  type ReportesProps, type RiesgoNivel,
  COLORS, GREEN, fmtLabel,
} from "./types";
import { KpiCard } from "./kpi-card";
import { ParroquiaMultiSelect } from "./parroquia-multiselect";
import { ExportModal } from "./export-modal";

const MapaRiesgoParroquial = dynamic(
  () => import("./mapa-riesgo").then(m => m.MapaRiesgoParroquial).catch(() => {
    const Fallback = () => <div className="h-[520px] rounded-xl border border-red-200 bg-red-50 flex items-center justify-center text-sm text-red-500">No se pudo cargar el mapa. Recarga la página.</div>;
    Fallback.displayName = "MapaFallback";
    return Fallback;
  }),
  { ssr: false, loading: () => <div className="h-[520px] rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center text-sm text-gray-400">Cargando mapa de Lima y Callao...</div> }
);

// ── Constants ─────────────────────────────────────────────────────────────────

const PALETTE = ["#009850", "#3B82F6", "#F59E0B", "#EF4444", "#9155A8", "#F97316", "#00C8B4", "#EC4899"];
const ESTADO_ACT_COLORS: Record<string, string> = {
  EJECUTADA: "#009850",
  PROGRAMADA: "#3B82F6",
  ASIGNADA: "#00C8B4",   // con personal asignado, pendiente de ejecución
  EN_PROCESO: "#F59E0B",
  CANCELADA: "#EF4444",
  POSTERGADA: "#9155A8",
};
const RIESGO_CONFIG: Record<RiesgoNivel, { color: string; bgClass: string; textClass: string; borderClass: string }> = {
  CRÍTICO: { color: "#EF4444", bgClass: "bg-red-50", textClass: "text-red-700", borderClass: "border-red-200" },
  ALTO:    { color: "#F97316", bgClass: "bg-orange-50", textClass: "text-orange-700", borderClass: "border-orange-200" },
  MEDIO:   { color: "#F59E0B", bgClass: "bg-amber-50", textClass: "text-amber-700", borderClass: "border-amber-200" },
  BAJO:    { color: "#009850", bgClass: "bg-green-50", textClass: "text-green-700", borderClass: "border-green-200" },
};

type TabId = "resumen" | "casos" | "brigadistas" | "prevencion" | "kits" | "riesgo";

const TABS: { id: TabId; label: string; sublabel: string; icon: React.ReactNode }[] = [
  { id: "resumen",      label: "Resumen",       sublabel: "General del sistema",       icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: "casos",        label: "Casos",         sublabel: "Atendidos mensual",         icon: <AlertTriangle className="w-4 h-4" /> },
  { id: "brigadistas",  label: "Brigadistas",   sublabel: "Capacitados",               icon: <Users className="w-4 h-4" /> },
  { id: "prevencion",   label: "Prevención",    sublabel: "Acciones por parroquia",    icon: <Activity className="w-4 h-4" /> },
  { id: "kits",         label: "Kits",          sublabel: "Entregados",                icon: <Package className="w-4 h-4" /> },
  { id: "riesgo",       label: "Afectación",     sublabel: "Mapa de parroquias por riesgo", icon: <MapPin className="w-4 h-4" /> },
];

// ── Shared UI helpers ─────────────────────────────────────────────────────────

function ChartCard({ title, subtitle, children, action }: { title: string; subtitle: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-gray-900">{title}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function NoData({ height = 200 }: { height?: number }) {
  return (
    <div className="flex items-center justify-center text-sm text-gray-400 gap-2" style={{ height }}>
      <Info className="w-4 h-4" /> Sin datos para el período seleccionado
    </div>
  );
}



function RiesgoNivelBadge({ nivel }: { nivel: RiesgoNivel }) {
  const cfg = RIESGO_CONFIG[nivel];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${cfg.bgClass} ${cfg.textClass}`}>
      {nivel === "CRÍTICO" || nivel === "ALTO" ? <ShieldAlert className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
      {nivel}
    </span>
  );
}

function ProgressBar({ pct, color = GREEN }: { pct: number; color?: string }) {
  return (
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
    </div>
  );
}

// ── Tab: Resumen General ──────────────────────────────────────────────────────

function TabResumen({ totales, parroquiasRiesgo, actividadesData, kitsData, brigadistasData, filtros, porEstado, porParroquia, incidenciasData }: ReportesProps) {
  const criticoCount = parroquiasRiesgo.filter(p => p.riesgoNivel === "CRÍTICO").length;
  const altoCount    = parroquiasRiesgo.filter(p => p.riesgoNivel === "ALTO").length;
  const resolRate    = totales.incidencias > 0 ? Math.round((incidenciasData.cerradas / totales.incidencias) * 100) : 0;
  const parroquiasSinPlan = totales.totalParroquias - totales.parroquiasConPlan;
  const brigSinCert  = totales.totalBrigadistas - totales.brigadistasCapacitados;

  // ── Análisis ejecutivo generado automáticamente ───────────────────────────
  type Hallazgo = { tipo: "logro" | "alerta" | "critico"; texto: string };
  const hallazgos: Hallazgo[] = [];

  // Incidencias
  if (totales.incidencias === 0) hallazgos.push({ tipo:"logro", texto:"Sin incidencias registradas en el período — situación bajo control." });
  else if (resolRate >= 70) hallazgos.push({ tipo:"logro", texto:`Alta tasa de resolución: ${resolRate}% de los ${totales.incidencias} casos del período fueron cerrados satisfactoriamente.` });
  else if (resolRate < 40 && totales.incidencias > 0) hallazgos.push({ tipo:"alerta", texto:`Baja tasa de cierre (${resolRate}%): ${incidenciasData.activas + incidenciasData.enSeguimiento} casos aún activos o en seguimiento de ${totales.incidencias} registrados.` });

  // Tiempo de respuesta
  if (totales.tiempoPromedio > 0) {
    if (totales.tiempoPromedio <= 3) hallazgos.push({ tipo:"logro", texto:`Tiempo de atención eficiente: promedio de ${totales.tiempoPromedio} día(s) por incidencia.` });
    else if (totales.tiempoPromedio > 10) hallazgos.push({ tipo:"alerta", texto:`Tiempo de atención elevado: ${totales.tiempoPromedio} días en promedio por caso. Revisar cuellos de botella operativos.` });
  }

  // Brigadistas
  if (brigSinCert > 0) hallazgos.push({ tipo: totales.pctBrigadistasCapacitados < 30 ? "critico" : "alerta", texto:`${brigSinCert} brigadista(s) sin certificación (${100 - totales.pctBrigadistasCapacitados}%). Priorizar plan de capacitación.` });
  else if (totales.totalBrigadistas > 0) hallazgos.push({ tipo:"logro", texto:`100% de brigadistas activos cuentan con certificación vigente.` });

  // Planes GRD
  if (parroquiasSinPlan > 0) hallazgos.push({ tipo: totales.pctParroquiasPlan < 40 ? "critico" : "alerta", texto:`${parroquiasSinPlan} parroquia(s) sin plan GRD aprobado (${100 - totales.pctParroquiasPlan}% del total). Exposición al riesgo sin protocolo formal.` });
  else hallazgos.push({ tipo:"logro", texto:`Todas las parroquias activas cuentan con plan GRD aprobado.` });

  // Actividades preventivas
  if (actividadesData.total > 0) {
    const pctEjec = Math.round((actividadesData.ejecutadas / actividadesData.total) * 100);
    if (pctEjec < 40) hallazgos.push({ tipo:"alerta", texto:`Solo ${pctEjec}% de actividades preventivas ejecutadas. ${actividadesData.total - actividadesData.ejecutadas} actividades pendientes comprometen la preparación comunitaria.` });
    else if (pctEjec >= 80) hallazgos.push({ tipo:"logro", texto:`Alta ejecución preventiva: ${pctEjec}% de actividades completadas, alcanzando ${actividadesData.totalParticipantes} participantes.` });
  }

  // Riesgo parroquial
  if (criticoCount > 0) hallazgos.push({ tipo:"critico", texto:`${criticoCount} parroquia(s) en nivel CRÍTICO de afectación. Requieren intervención inmediata y asignación prioritaria de recursos.` });
  if (altoCount > 0 && criticoCount === 0) hallazgos.push({ tipo:"alerta", texto:`${altoCount} parroquia(s) con nivel ALTO de afectación. Monitoreo continuo recomendado.` });

  // Parroquia más afectada
  if (porParroquia.length > 0) hallazgos.push({ tipo:"alerta", texto:`Parroquia con mayor concentración de casos: "${porParroquia[0].label}" con ${porParroquia[0].value} incidencia(s) en el período.` });

  // Kits
  if (kitsData.totalEntregados > 0) hallazgos.push({ tipo:"logro", texto:`${kitsData.totalEntregados} unidades de kits de emergencia distribuidas a ${kitsData.porParroquia.length} parroquia(s) beneficiadas.` });

  const nivelSistema = criticoCount > 0 ? "CRÍTICO" : altoCount > 2 ? "ALTO" : totales.pctBrigadistasCapacitados < 30 ? "ALTO" : totales.pctParroquiasPlan < 40 ? "MEDIO" : "NORMAL";
  const nivelColor: Record<string, string> = { CRÍTICO:"#EF4444", ALTO:"#F97316", MEDIO:"#F59E0B", NORMAL:"#009850" };

  return (
    <div className="space-y-5">
      {/* Estado global del sistema */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900">Estado del Sistema de Gestión de Riesgos y Desastres</h3>
            <p className="text-xs text-gray-400 mt-0.5">Período analizado: {filtros.desde} → {filtros.hasta}</p>
          </div>
          <div className="text-right">
            <div className="text-xs font-semibold text-gray-500 mb-1">Nivel operativo</div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold text-white" style={{ background: nivelColor[nivelSistema] }}>
              <div className="w-2 h-2 rounded-full bg-white/70" /> {nivelSistema}
            </span>
          </div>
        </div>

        {/* KPI scorecards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Incidencias", value: totales.incidencias, sub: `${resolRate}% resueltas`, icon: <AlertTriangle className="w-4 h-4" style={{ color: "#EF4444" }} />, color: "#EF4444" },
            { label: "Brigadistas Certificados", value: `${totales.pctBrigadistasCapacitados}%`, sub: `${totales.brigadistasCapacitados}/${totales.totalBrigadistas}`, icon: <Users className="w-4 h-4 text-[#009850]" />, color: totales.pctBrigadistasCapacitados>=70?GREEN:"#F59E0B" },
            { label: "Planes Gestion de Riesgos y desastres", value: `${totales.pctParroquiasPlan}%`, sub: `${totales.parroquiasConPlan}/${totales.totalParroquias}`, icon: <FileText className="w-4 h-4" style={{ color: "#3B82F6" }} />, color: "#3B82F6" },
            { label: "Prevención", value: `${totales.pctActividadesEjecutadas}%`, sub: `${actividadesData.ejecutadas}/${actividadesData.total} actividades`, icon: <Activity className="w-4 h-4" style={{ color: "#F59E0B" }} />, color: "#F59E0B" },
            { label: "Kits distribuidos", value: totales.kitsEntregados, sub: `${kitsData.porParroquia.length} parroquias`, icon: <Package className="w-4 h-4" style={{ color: "#9155A8" }} />, color: "#9155A8" },
            { label: "Días/caso", value: totales.tiempoPromedio, sub: "promedio atención", icon: <Clock className="w-4 h-4" style={{ color: "#F97316" }} />, color: totales.tiempoPromedio<=3?GREEN:totales.tiempoPromedio<=7?"#F59E0B":"#EF4444" },
          ].map(m => (
            <KpiCard key={m.label} icon={m.icon} label={m.label} value={m.value} sub={m.sub} />
          ))}
        </div>
      </div>

      {/* Indicadores de preparación */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Indicadores de Preparación del Sistema</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: "Capacitación de Brigadistas", sub: `${brigSinCert} de ${totales.totalBrigadistas} sin certificación`, pct: totales.pctBrigadistasCapacitados, meta: 80 },
            { label: "Cobertura de Planes de Gestión de Riesgos y Desastres", sub: `${parroquiasSinPlan} parroquias sin plan aprobado`, pct: totales.pctParroquiasPlan, meta: 100 },
            { label: "Ejecución Actividades Preventivas", sub: `${actividadesData.totalParticipantes} personas alcanzadas`, pct: totales.pctActividadesEjecutadas, meta: 70 },
            { label: "Tasa de Resolución de Casos", sub: `${incidenciasData.cerradas} casos cerrados de ${totales.incidencias}`, pct: resolRate, meta: 80 },
          ].map(h => {
            const color = h.pct >= h.meta ? GREEN : h.pct >= h.meta * 0.6 ? "#F59E0B" : "#EF4444";
            return (
              <div key={h.label} className="space-y-1.5">
                <div className="flex justify-between items-baseline">
                  <div>
                    <span className="text-sm font-semibold text-gray-800">{h.label}</span>
                    <p className="text-xs text-gray-400">{h.sub}</p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <span className="text-lg font-bold" style={{ color }}>{h.pct}%</span>
                    <p className="text-[10px] text-gray-400">Meta: {h.meta}%</p>
                  </div>
                </div>
                <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(h.pct, 100)}%`, background: color }} />
                  {/* Meta indicator */}
                  <div className="absolute top-0 bottom-0 w-0.5 bg-gray-400/50" style={{ left: `${h.meta}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Análisis ejecutivo */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 mb-3">Análisis Ejecutivo del Período</h3>
        <div className="space-y-2">
          {hallazgos.map((h, i) => (
            <div key={i} className={`flex items-start gap-3 px-4 py-3 rounded-lg text-sm border ${
              h.tipo === "critico" ? "bg-red-50 border-red-200 text-red-800" :
              h.tipo === "alerta"  ? "bg-amber-50 border-amber-200 text-amber-800" :
                                     "bg-green-50 border-green-200 text-green-800"
            }`}>
              {h.tipo === "critico" ? <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> :
               h.tipo === "alerta"  ? <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> :
                                      <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />}
              {h.texto}
            </div>
          ))}
          {hallazgos.length === 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm bg-green-50 border border-green-200 text-green-800">
              <CheckCircle className="w-4 h-4 shrink-0" /> Todos los indicadores dentro de rangos óptimos.
            </div>
          )}
        </div>
      </div>

      {/* Visual rápido: top parroquias afectadas */}
      {porParroquia.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Parroquias con Mayor Concentración de Casos</h3>
          <div className="space-y-2">
            {porParroquia.slice(0, 5).map((p, i) => {
              const maxVal = porParroquia[0].value;
              const pct = (p.value / maxVal) * 100;
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400 w-4">{i+1}</span>
                  <span className="text-sm text-gray-700 w-44 truncate">{p.label}</span>
                  <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-[#F97316]" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-sm font-bold text-[#F97316] w-16 text-right">{p.value} caso{p.value !== 1 ? "s" : ""}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab: Casos Atendidos ──────────────────────────────────────────────────────

function TabCasos({ totales, porEstado, porTipo, porParroquia, timeline, byWeek, incidenciasData }: ReportesProps) {
  const timelineLabeled = timeline.map(t => ({ ...t, label: fmtLabel(t.label) }));
  const resolRate = totales.incidencias > 0 ? Math.round((incidenciasData.cerradas / totales.incidencias) * 100) : 0;
  const enGestion = incidenciasData.activas + incidenciasData.enSeguimiento;

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard icon={<AlertTriangle className="w-5 h-5" style={{ color: "#EF4444" }} />} label="Total Casos" value={totales.incidencias} sub="Registrados en el período" />
        <KpiCard icon={<CheckCircle className="w-5 h-5 text-[#009850]" />} label="Resueltos" value={incidenciasData.cerradas} sub={`${resolRate}% tasa de resolución`} accent />
        <KpiCard icon={<TrendingUp className="w-5 h-5" style={{ color: "#F97316" }} />} label="En Gestión" value={enGestion} sub="Activos + seguimiento" />
        <KpiCard icon={<Clock className="w-5 h-5" style={{ color: "#3B82F6" }} />} label="Días Promedio" value={totales.tiempoPromedio} sub="Tiempo de atención" />
      </div>

      {/* Tendencia temporal — gráfico principal */}
      <ChartCard
        title={byWeek ? "Tendencia Semanal de Incidencias" : "Evolución Diaria de Incidencias"}
        subtitle={byWeek ? "Casos agrupados por semana — identifica picos y tendencias del período" : "Casos reportados por día — ideal para períodos cortos"}
      >
        {timelineLabeled.length === 0 ? <NoData /> : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={timelineLabeled} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={GREEN} stopOpacity={0.18} />
                  <stop offset="95%" stopColor={GREEN} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: "10px", border: "1px solid #E5E7EB", fontSize: 12 }} formatter={(v) => [`${v} casos`, ""]} />
              <Area type="monotone" dataKey="value" stroke={GREEN} strokeWidth={2.5} fill="url(#gGrad)" dot={{ r: 3, fill: GREEN }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Estado + Tipo — 2 columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title="Distribución por Estado" subtitle="Ciclo de vida de los casos registrados">
          {porEstado.length === 0 ? <NoData height={190} /> : (
            <ResponsiveContainer width="100%" height={190}>
              <PieChart>
                <Pie data={porEstado} dataKey="value" nameKey="label" cx="45%" cy="50%" outerRadius={72} innerRadius={38} strokeWidth={0}>
                  {porEstado.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => [`${v}`, "Casos"]} />
                <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" iconSize={7} formatter={v => <span style={{ fontSize: 10, color: "#4B5563" }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Por Tipo de Evento" subtitle="Clasificación de las emergencias registradas">
          {porTipo.length === 0 ? <NoData height={190} /> : (
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={porTipo.slice(0, 6)} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} tickFormatter={(v: string) => v.length > 8 ? v.slice(0, 7) + "…" : v} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: "10px", border: "1px solid #E5E7EB", fontSize: 12 }} formatter={(v) => [`${v}`, "Casos"]} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={44}>
                  {porTipo.slice(0, 6).map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                  <LabelList dataKey="value" position="top" style={{ fontSize: 10, fill: "#6B7280" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Gravedad + Parroquia — 2 columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title="Por Nivel de Gravedad" subtitle="Urgencia registrada de los casos atendidos">
          {incidenciasData.porGravedad.length === 0 ? <NoData height={180} /> : (
            <div className="space-y-3 pt-2">
              {incidenciasData.porGravedad.map((g, i) => {
                const total = incidenciasData.porGravedad.reduce((s, x) => s + x.value, 0);
                const pct = total > 0 ? Math.round((g.value / total) * 100) : 0;
                const color = g.label === "Alto" || g.label === "Crítico" || g.label === "Severo" ? "#EF4444" : g.label === "Moderado" ? "#F59E0B" : "#009850";
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-600 font-medium">{g.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold" style={{ color }}>{g.value}</span>
                        <span className="text-gray-400">({pct}%)</span>
                      </div>
                    </div>
                    <ProgressBar pct={pct} color={color} />
                  </div>
                );
              })}
            </div>
          )}
        </ChartCard>

        <ChartCard title="Incidencias por Parroquia" subtitle="Top parroquias con más casos en el período">
          {porParroquia.length === 0 ? <NoData height={180} /> : (
            <ResponsiveContainer width="100%" height={Math.max(180, Math.min(porParroquia.slice(0, 7).length * 28 + 10, 220))}>
              <BarChart data={porParroquia.slice(0, 7)} layout="vertical" margin={{ top: 0, right: 24, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="label" width={92} tick={{ fontSize: 10, fill: "#6B7280" }} axisLine={false} tickLine={false} tickFormatter={(v: string) => v.length > 14 ? v.slice(0, 13) + "…" : v} />
                <Tooltip contentStyle={{ borderRadius: "10px", border: "1px solid #E5E7EB", fontSize: 12 }} formatter={(v) => [`${v}`, "Casos"]} />
                <Bar dataKey="value" fill="#F97316" radius={[0, 6, 6, 0]} maxBarSize={16}>
                  <LabelList dataKey="value" position="right" style={{ fontSize: 10, fill: "#6B7280" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

// ── Tab: Brigadistas Capacitados ──────────────────────────────────────────────

function TabBrigadistas({ totales, brigadistasData }: ReportesProps) {
  const pct = totales.pctBrigadistasCapacitados;
  const sinCert = totales.totalBrigadistas - totales.brigadistasCapacitados;
  const donutData = [
    { label: "Certificados", value: totales.brigadistasCapacitados },
    { label: "Sin certificación", value: Math.max(sinCert, 0) },
  ];
  const sorted = [...brigadistasData.porParroquia];
  const top3 = sorted.slice(0, 3);
  const bottom3 = [...sorted].sort((a, b) => a.pct - b.pct).filter(p => p.pct < 100).slice(0, 3);
  const pctColor = pct >= 80 ? GREEN : pct >= 50 ? "#F59E0B" : "#EF4444";

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard icon={<Users className="w-5 h-5 text-[#009850]" />} label="Total Brigadistas" value={totales.totalBrigadistas} sub="Activos en el sistema" accent />
        <KpiCard icon={<CheckCircle className="w-5 h-5" style={{ color: GREEN }} />} label="Certificados" value={totales.brigadistasCapacitados} sub={`${pct}% del total`} />
        <KpiCard icon={<AlertTriangle className="w-5 h-5" style={{ color: "#F59E0B" }} />} label="Sin Certificación" value={sinCert} sub="Requieren capacitación" />
        <KpiCard icon={<TrendingUp className="w-5 h-5" style={{ color: "#3B82F6" }} />} label="Meta 80%" value={`${pct}%`} sub={pct >= 80 ? "Meta alcanzada ✓" : `Faltan ${80 - pct}%`} />
      </div>

      {/* Donut + Parroquias destacadas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title="Estado de Certificación General" subtitle="Brigadistas certificados vs. pendientes de capacitación">
          {totales.totalBrigadistas === 0 ? <NoData height={200} /> : (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="52%" height={190}>
                <PieChart>
                  <Pie data={donutData} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={76} innerRadius={46} strokeWidth={0}>
                    <Cell fill={GREEN} />
                    <Cell fill={sinCert === 0 ? "#E5E7EB" : "#F59E0B"} />
                  </Pie>
                  <Tooltip formatter={(v) => [`${v} brigadistas`, ""]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-3">
                <div className="text-center">
                  <div className="text-3xl font-bold" style={{ color: pctColor }}>{pct}%</div>
                  <div className="text-xs text-gray-500 mt-0.5">tasa de certificación</div>
                </div>
                {donutData.map((d, i) => (
                  <div key={d.label} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: i === 0 ? GREEN : sinCert === 0 ? "#E5E7EB" : "#F59E0B" }} />
                    <span className="text-gray-600 flex-1">{d.label}</span>
                    <span className="font-bold text-gray-800">{d.value}</span>
                  </div>
                ))}
                <div className="pt-1">
                  <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                    <span>0%</span><span className="font-semibold">Meta: 80%</span><span>100%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden relative">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: pctColor }} />
                    <div className="absolute top-0 bottom-0 w-0.5 bg-gray-400/50" style={{ left: "80%" }} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Parroquias Destacadas" subtitle="Mayor y menor tasa de certificación por parroquia">
          <div className="space-y-4 pt-1">
            {top3.length > 0 && (
              <div>
                <div className="text-[11px] font-semibold text-gray-400 mb-2 uppercase tracking-wide">Mayor certificación</div>
                {top3.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold text-gray-400 w-4">{i + 1}</span>
                    <span className="text-xs text-gray-700 flex-1 truncate">{p.parroquia}</span>
                    <span className="text-xs font-bold text-[#009850] w-8 text-right">{p.pct}%</span>
                    <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-[#009850]" style={{ width: `${p.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {bottom3.length > 0 && (
              <div>
                <div className="text-[11px] font-semibold text-gray-400 mb-2 uppercase tracking-wide">Requieren atención urgente</div>
                {bottom3.map((p, i) => {
                  const c = p.pct < 30 ? "#EF4444" : "#F59E0B";
                  return (
                    <div key={i} className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-bold text-gray-400 w-4">{i + 1}</span>
                      <span className="text-xs text-gray-700 flex-1 truncate">{p.parroquia}</span>
                      <span className="text-xs font-bold w-8 text-right" style={{ color: c }}>{p.pct}%</span>
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${p.pct}%`, background: c }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </ChartCard>
      </div>

      {/* Radar de parroquias top */}
      {brigadistasData.porParroquia.length >= 3 && (
        <ChartCard title="Comparativa de Certificación por Parroquia" subtitle="% de brigadistas certificados — top 8 parroquias por tamaño">
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={brigadistasData.porParroquia.slice(0, 8).map(p => ({ parroquia: p.parroquia.length > 12 ? p.parroquia.slice(0, 11) + "…" : p.parroquia, pct: p.pct, meta: 80 }))}>
              <PolarGrid stroke="#E5E7EB" />
              <PolarAngleAxis dataKey="parroquia" tick={{ fontSize: 9, fill: "#6B7280" }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8, fill: "#9CA3AF" }} tickCount={5} />
              <Radar name="% Certificados" dataKey="pct" stroke={GREEN} fill={GREEN} fillOpacity={0.2} />
              <Radar name="Meta (80%)" dataKey="meta" stroke="#E5E7EB" fill="transparent" strokeDasharray="4 2" />
              <Legend iconType="circle" iconSize={8} formatter={v => <span style={{ fontSize: 10, color: "#4B5563" }}>{v}</span>} />
              <Tooltip formatter={(v) => [`${v}%`, ""]} />
            </RadarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Grouped bar — total vs certificados */}
      <ChartCard title="Brigadistas por Parroquia" subtitle="Total activos vs. certificados — brecha de capacitación">
        {brigadistasData.porParroquia.length === 0 ? <NoData height={240} /> : (
          <ResponsiveContainer width="100%" height={Math.max(240, brigadistasData.porParroquia.length * 22)}>
            <BarChart data={brigadistasData.porParroquia} layout="vertical" margin={{ top: 0, right: 40, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="parroquia" tick={{ fontSize: 9, fill: "#6B7280" }} axisLine={false} tickLine={false} width={100} tickFormatter={(v: string) => v.length > 16 ? v.slice(0, 15) + "…" : v} />
              <Tooltip contentStyle={{ borderRadius: "10px", border: "1px solid #E5E7EB", fontSize: 12 }} />
              <Legend iconType="circle" iconSize={8} formatter={v => <span style={{ fontSize: 11, color: "#4B5563" }}>{v}</span>} />
              <Bar dataKey="total" name="Total" fill="#E5E7EB" radius={[0, 4, 4, 0]} maxBarSize={10} />
              <Bar dataKey="capacitados" name="Certificados" fill={GREEN} radius={[0, 4, 4, 0]} maxBarSize={10}>
                <LabelList dataKey="capacitados" position="right" style={{ fontSize: 9, fill: "#6B7280" }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Tabla detalle */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900">Detalle por Parroquia</h3>
          <p className="text-xs text-gray-400">Ordenado por mayor cantidad de brigadistas · incluye brecha y estado de avance</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {["Parroquia","Total","Certificados","% Cert.","Brecha","Estado"].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {brigadistasData.porParroquia.map((p, i) => {
                const brecha = p.total - p.capacitados;
                const sc = p.pct >= 80 ? GREEN : p.pct >= 50 ? "#F59E0B" : "#EF4444";
                const sl = p.pct >= 80 ? "Óptimo" : p.pct >= 50 ? "En proceso" : "Crítico";
                return (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-800">{p.parroquia}</td>
                    <td className="px-4 py-2.5 text-gray-700">{p.total}</td>
                    <td className="px-4 py-2.5 text-[#009850] font-semibold">{p.capacitados}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold" style={{ color: sc }}>{p.pct}%</span>
                        <div className="w-10 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${p.pct}%`, background: sc }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">{brecha > 0 ? `${brecha} sin certif.` : "—"}</td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: `${sc}18`, color: sc }}>{sl}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Acciones Preventivas ─────────────────────────────────────────────────

function TabPrevencion({ actividadesData }: ReportesProps) {
  const pct = actividadesData.total > 0 ? Math.round((actividadesData.ejecutadas / actividadesData.total) * 100) : 0;
  const pendientes = actividadesData.total - actividadesData.ejecutadas;
  const promPart = actividadesData.ejecutadas > 0 ? Math.round(actividadesData.totalParticipantes / actividadesData.ejecutadas) : 0;

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard icon={<Activity className="w-5 h-5" style={{ color: "#3B82F6" }} />} label="Total Actividades" value={actividadesData.total} sub="Registradas en el sistema" />
        <KpiCard icon={<CheckCircle className="w-5 h-5 text-[#009850]" />} label="Ejecutadas" value={actividadesData.ejecutadas} sub={`${pct}% del total`} accent />
        <KpiCard icon={<Users className="w-5 h-5" style={{ color: "#9155A8" }} />} label="Participantes" value={actividadesData.totalParticipantes} sub="Personas alcanzadas" />
        <KpiCard icon={<TrendingUp className="w-5 h-5" style={{ color: "#F59E0B" }} />} label="Prom./Actividad" value={promPart} sub="Participantes por actividad" />
      </div>

      {/* Barra de ejecución */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Tasa de Ejecución</h3>
            <p className="text-xs text-gray-400">{actividadesData.ejecutadas} ejecutadas · {pendientes} pendientes · meta: 70%</p>
          </div>
          <span className="text-2xl font-bold" style={{ color: pct >= 70 ? GREEN : pct >= 40 ? "#F59E0B" : "#EF4444" }}>{pct}%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden relative">
          <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: pct >= 70 ? GREEN : pct >= 40 ? "#F59E0B" : "#EF4444" }} />
          <div className="absolute top-0 bottom-0 w-0.5 bg-gray-400/60" style={{ left: "70%" }} />
        </div>
        <div className="flex justify-between text-[10px] text-gray-400 mt-1.5">
          <span>0%</span><span className="font-semibold">Meta: 70%</span><span>100%</span>
        </div>
      </div>

      {/* 3 gráficos en fila */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Estado donut */}
        <ChartCard title="Por Estado" subtitle="Ciclo de ejecución de actividades">
          {actividadesData.porEstado.length === 0 ? <NoData height={195} /> : (
            <ResponsiveContainer width="100%" height={195}>
              <PieChart>
                <Pie data={actividadesData.porEstado} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={70} innerRadius={38} strokeWidth={0}>
                  {actividadesData.porEstado.map((e, i) => <Cell key={i} fill={ESTADO_ACT_COLORS[e.label] ?? PALETTE[i % PALETTE.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => [`${v}`, "Actividades"]} />
                <Legend layout="vertical" align="right" verticalAlign="middle" iconType="circle" iconSize={7} formatter={v => <span style={{ fontSize: 9, color: "#4B5563" }}>{String(v).replace(/_/g, " ")}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Tipo de actividad */}
        <ChartCard title="Por Tipo de Actividad" subtitle="Distribución por modalidad o simulacro">
          {actividadesData.porTipo.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-center">
              <Info className="w-5 h-5 text-gray-300" />
              <p className="text-xs text-gray-400 max-w-40 leading-snug">Los tipos de actividad no están vinculados al catálogo del sistema</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={195}>
              <BarChart data={actividadesData.porTipo.slice(0, 6)} layout="vertical" margin={{ top: 2, right: 28, left: 4, bottom: 2 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                <XAxis type="number" tick={{ fontSize: 9, fill: "#9CA3AF" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 9, fill: "#6B7280" }} axisLine={false} tickLine={false} width={88} tickFormatter={(v: string) => v.length > 13 ? v.slice(0, 12) + "…" : v} />
                <Tooltip contentStyle={{ borderRadius: "10px", border: "1px solid #E5E7EB", fontSize: 12 }} formatter={(v) => [`${v}`, "Actividades"]} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={16}>
                  {actividadesData.porTipo.slice(0, 6).map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                  <LabelList dataKey="value" position="right" style={{ fontSize: 9, fill: "#6B7280" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Top parroquias */}
        <ChartCard title="Top Parroquias" subtitle="Actividades por parroquia">
          {actividadesData.porParroquia.length === 0 ? <NoData height={195} /> : (
            <ResponsiveContainer width="100%" height={195}>
              <BarChart data={actividadesData.porParroquia.slice(0, 6)} layout="vertical" margin={{ top: 0, right: 24, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 9, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="label" width={84} tick={{ fontSize: 9, fill: "#6B7280" }} axisLine={false} tickLine={false} tickFormatter={(v: string) => v.length > 12 ? v.slice(0, 11) + "…" : v} />
                <Tooltip contentStyle={{ borderRadius: "10px", border: "1px solid #E5E7EB", fontSize: 12 }} formatter={(v) => [`${v}`, "Actividades"]} />
                <Bar dataKey="value" fill="#3B82F6" radius={[0, 6, 6, 0]} maxBarSize={14}>
                  <LabelList dataKey="value" position="right" style={{ fontSize: 9, fill: "#6B7280" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Radar por parroquia si hay datos suficientes */}
      {actividadesData.porParroquia.length >= 4 && (
        <ChartCard title="Radar de Actividad por Parroquia" subtitle="Distribución relativa de actividades preventivas — top 8 parroquias">
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={actividadesData.porParroquia.slice(0, 8).map(p => ({ parroquia: p.label.length > 12 ? p.label.slice(0, 11) + "…" : p.label, actividades: p.value }))}>
              <PolarGrid stroke="#E5E7EB" />
              <PolarAngleAxis dataKey="parroquia" tick={{ fontSize: 9, fill: "#6B7280" }} />
              <PolarRadiusAxis tick={{ fontSize: 8, fill: "#9CA3AF" }} tickCount={4} />
              <Radar name="Actividades" dataKey="actividades" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.2} />
              <Tooltip formatter={(v) => [`${v}`, "Actividades"]} />
            </RadarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  );
}

// ── Tab: Kits Entregados ──────────────────────────────────────────────────────

function TabKits({ kitsData, totales }: ReportesProps) {
  const parroquiasBenef = kitsData.porParroquia.filter(p => p.value > 0).length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard icon={<Package className="w-5 h-5" style={{ color: "#9155A8" }} />} label="Unidades Distribuidas" value={totales.kitsEntregados} sub="Total salidas registradas" accent />
        <KpiCard icon={<MapPin className="w-5 h-5" style={{ color: "#3B82F6" }} />} label="Parroquias" value={parroquiasBenef} sub="Beneficiadas con kits" />
        <KpiCard icon={<Activity className="w-5 h-5" style={{ color: "#F59E0B" }} />} label="Tipos de Kit" value={kitsData.porTipo.length} sub="Categorías disponibles" />
        <KpiCard icon={<Package className="w-5 h-5 text-[#009850]" />} label="Stock Registrado" value={kitsData.stockActual.reduce((s, k) => s + k.stockActual, 0)} sub="En almacén actualmente" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title="Distribución por Parroquia" subtitle="Unidades entregadas por parroquia destino">
          {kitsData.porParroquia.length === 0 ? <NoData height={240} /> : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={kitsData.porParroquia} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="label" width={95} tick={{ fontSize: 9, fill: "#6B7280" }} axisLine={false} tickLine={false} tickFormatter={(v: string) => v.length > 15 ? v.slice(0, 14) + "…" : v} />
                <Tooltip contentStyle={{ borderRadius: "10px", border: "1px solid #E5E7EB", fontSize: 12 }} formatter={(v) => [`${v}`, "Unidades"]} />
                <Bar dataKey="value" fill="#9155A8" radius={[0, 6, 6, 0]} maxBarSize={16}>
                  <LabelList dataKey="value" position="right" style={{ fontSize: 9, fill: "#6B7280" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Distribución por Tipo" subtitle="Unidades entregadas por categoría de kit">
          {kitsData.porTipo.length === 0 ? <NoData height={240} /> : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={kitsData.porTipo} dataKey="value" nameKey="label" cx="45%" cy="50%" outerRadius={90} innerRadius={48} strokeWidth={0}>
                  {kitsData.porTipo.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => [`${v} unidades`, ""]} />
                <Legend iconType="circle" iconSize={8} formatter={v => <span style={{ fontSize: 10, color: "#4B5563" }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Stock table */}
      {kitsData.stockActual.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">Stock Actual de Kits</h3>
            <p className="text-xs text-gray-400">Inventario en almacén por tipo de kit</p>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {["Tipo de Kit","Stock Actual","Nro. Registros"].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {kitsData.stockActual.map((k, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-800">{k.tipoKit}</td>
                  <td className="px-4 py-2.5">
                    <span className={`font-bold ${k.stockActual > 10 ? "text-[#009850]" : k.stockActual > 0 ? "text-amber-600" : "text-red-600"}`}>{k.stockActual}</span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">{k.total} kit(s)</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Tab: Mapa de Riesgo Parroquial ────────────────────────────────────────────

function TabRiesgo({ parroquiasRiesgo }: ReportesProps) {
  const [filtroNivel, setFiltroNivel] = useState<RiesgoNivel | "TODOS">("TODOS");

  const counts = { CRÍTICO: 0, ALTO: 0, MEDIO: 0, BAJO: 0 };
  for (const p of parroquiasRiesgo) counts[p.riesgoNivel]++;

  const filtered = filtroNivel === "TODOS" ? parroquiasRiesgo : parroquiasRiesgo.filter(p => p.riesgoNivel === filtroNivel);
  const total = parroquiasRiesgo.length;

  const nivelPie = (["CRÍTICO","ALTO","MEDIO","BAJO"] as RiesgoNivel[]).map(n => ({
    label: n, value: counts[n], color: RIESGO_CONFIG[n].color,
  })).filter(d => d.value > 0);

  const avgByNivel = (["CRÍTICO","ALTO","MEDIO","BAJO"] as RiesgoNivel[]).map(n => {
    const grp = parroquiasRiesgo.filter(p => p.riesgoNivel === n);
    if (grp.length === 0) return { nivel: n, incidencias: 0, pctCapacitados: 0, actPct: 0 };
    return {
      nivel: n,
      incidencias: Math.round(grp.reduce((s, p) => s + p.incidencias, 0) / grp.length * 10) / 10,
      pctCapacitados: Math.round(grp.reduce((s, p) => s + p.pctCapacitados, 0) / grp.length),
      actPct: Math.round(grp.reduce((s, p) => s + (p.actividadesTotal > 0 ? (p.actividadesEjecutadas / p.actividadesTotal) * 100 : 0), 0) / grp.length),
    };
  });

  return (
    <div className="space-y-5">
      {/* Descripción */}
      <div className="bg-[#009850]/5 border border-[#009850]/20 rounded-xl px-4 py-3 text-xs text-gray-700">
        <span className="font-semibold">Nivel de afectación estimado</span> — score multifactorial: incidencias registradas, brigadistas disponibles, % certificación, plan GRD aprobado y ejecución de actividades preventivas.
      </div>

      {/* Filtros por nivel */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["CRÍTICO","ALTO","MEDIO","BAJO"] as RiesgoNivel[]).map(n => {
          const cfg = RIESGO_CONFIG[n];
          const pct = total > 0 ? Math.round((counts[n] / total) * 100) : 0;
          return (
            <button key={n} suppressHydrationWarning onClick={() => setFiltroNivel(filtroNivel === n ? "TODOS" : n)}
              className={`cursor-pointer rounded-xl p-4 border text-left transition-all shadow-sm ${filtroNivel === n ? `${cfg.bgClass} ${cfg.borderClass}` : "bg-white border-gray-200 hover:border-gray-300"}`}>
              <div className="text-2xl font-bold mb-0.5" style={{ color: cfg.color }}>{counts[n]}</div>
              <div className={`text-xs font-semibold ${filtroNivel === n ? cfg.textClass : "text-gray-500"}`}>Afectación {n}</div>
              <div className="text-[11px] text-gray-400">{pct}% del total</div>
            </button>
          );
        })}
      </div>

      {/* Gráficos estadísticos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Donut distribución */}
        <ChartCard title="Distribución por Nivel" subtitle="Proporción de parroquias según nivel de afectación estimado">
          {total === 0 ? <NoData height={190} /> : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="52%" height={190}>
                <PieChart>
                  <Pie data={nivelPie} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={74} innerRadius={42} strokeWidth={0}>
                    {nivelPie.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v} parroquias`, ""]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {(["CRÍTICO","ALTO","MEDIO","BAJO"] as RiesgoNivel[]).map(n => {
                  const pct = total > 0 ? Math.round((counts[n] / total) * 100) : 0;
                  return (
                    <div key={n} className="space-y-0.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-gray-600">{n}</span>
                        <span className="font-bold" style={{ color: RIESGO_CONFIG[n].color }}>{counts[n]} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: RIESGO_CONFIG[n].color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </ChartCard>

        {/* Promedio incidencias por nivel */}
        <ChartCard title="Promedio de Incidencias por Nivel" subtitle="Carga promedio de casos en parroquias según su nivel de afectación">
          {total === 0 ? <NoData height={190} /> : (
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={avgByNivel} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="nivel" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: "10px", border: "1px solid #E5E7EB", fontSize: 12 }} formatter={(v) => [`${v}`, "Prom. incidencias"]} />
                <Bar dataKey="incidencias" radius={[4, 4, 0, 0]} maxBarSize={44}>
                  {avgByNivel.map((d, i) => <Cell key={i} fill={RIESGO_CONFIG[d.nivel as RiesgoNivel]?.color ?? "#9CA3AF"} />)}
                  <LabelList dataKey="incidencias" position="top" style={{ fontSize: 10, fill: "#6B7280" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Indicadores promedio por nivel */}
      {total > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-1">Indicadores Promedio por Nivel de Afectación</h3>
          <p className="text-xs text-gray-400 mb-4">Certificación y ejecución de actividades entre los grupos de parroquias</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            {avgByNivel.map(n => (
              <div key={n.nivel} className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wide" style={{ color: RIESGO_CONFIG[n.nivel as RiesgoNivel]?.color ?? "#666" }}>{n.nivel}</div>
                {[
                  { label: "% certif.", value: n.pctCapacitados, color: n.pctCapacitados >= 60 ? GREEN : "#EF4444" },
                  { label: "% act. ejec.", value: n.actPct, color: n.actPct >= 60 ? GREEN : "#F59E0B" },
                ].map(m => (
                  <div key={m.label} className="space-y-0.5">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-gray-500">{m.label}</span>
                      <span className="font-bold" style={{ color: m.color }}>{m.value}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${m.value}%`, background: m.color }} />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mapa Leaflet */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Mapa de Afectación — Lima Metropolitana y Callao</h3>
            <p className="text-xs text-gray-400">Tamaño del marcador proporcional al número de incidencias</p>
          </div>
          {filtroNivel !== "TODOS" && (
            <button onClick={() => setFiltroNivel("TODOS")} suppressHydrationWarning className="cursor-pointer text-xs text-gray-400 hover:text-[#009850] flex items-center gap-1">
              <X className="w-3.5 h-3.5" /> Ver todas
            </button>
          )}
        </div>
        <Suspense fallback={<div className="h-115 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center text-sm text-gray-400">Cargando mapa de Lima y Callao...</div>}>
          <MapaRiesgoParroquial parroquias={parroquiasRiesgo} filtroNivel={filtroNivel} />
        </Suspense>
      </div>

      {/* Ranking table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Ranking de Afectación por Parroquia</h3>
            <p className="text-xs text-gray-400">
              {filtroNivel === "TODOS" ? `${parroquiasRiesgo.length} parroquias` : `${filtered.length} de ${parroquiasRiesgo.length} — nivel: ${filtroNivel}`}
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {["#","Parroquia","Nivel","Incidencias","Brigadistas","% Cert.","Plan GRD","Actividades"].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((p, i) => {
                const actPct = p.actividadesTotal > 0 ? Math.round((p.actividadesEjecutadas / p.actividadesTotal) * 100) : 0;
                return (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-400 font-mono">{i + 1}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{p.nombre}</td>
                    <td className="px-4 py-3"><RiesgoNivelBadge nivel={p.riesgoNivel} /></td>
                    <td className="px-4 py-3"><span className={`font-bold ${p.incidencias > 0 ? "text-red-600" : "text-gray-400"}`}>{p.incidencias}</span></td>
                    <td className="px-4 py-3"><span className={`font-bold ${p.brigadistas >= 5 ? "text-[#009850]" : p.brigadistas > 0 ? "text-amber-600" : "text-red-600"}`}>{p.brigadistas}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${p.pctCapacitados >= 60 ? "text-[#009850]" : p.pctCapacitados > 0 ? "text-amber-600" : "text-red-600"}`}>{p.pctCapacitados}%</span>
                        <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${p.pctCapacitados}%`, background: p.pctCapacitados >= 60 ? GREEN : p.pctCapacitados > 0 ? "#F59E0B" : "#EF4444" }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {p.tienePlan
                        ? <span className="flex items-center gap-1 text-[#009850]"><CheckCircle className="w-3.5 h-3.5" /> Aprobado</span>
                        : <span className="flex items-center gap-1 text-red-500"><X className="w-3.5 h-3.5" /> Sin plan</span>}
                    </td>
                    <td className="px-4 py-3">
                      {p.actividadesTotal > 0
                        ? <span className={`font-semibold ${actPct >= 60 ? "text-[#009850]" : "text-amber-600"}`}>{p.actividadesEjecutadas}/{p.actividadesTotal} ({actPct}%)</span>
                        : <span className="text-gray-400">Sin actividades</span>}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No hay parroquias con este nivel de afectación.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Metodología */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-500">
        <p className="font-semibold text-gray-700 mb-2">Metodología de puntaje de afectación estimada</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <span>Incidencias: ≥5 (+3) / ≥2 (+2) / 1 (+1)</span>
          <span>Brigadistas: &lt;2 (+3) / &lt;5 (+2) / &lt;10 (+1)</span>
          <span>Certificación: &lt;30% (+2) / &lt;60% (+1)</span>
          <span>Sin plan (+2) / Actividades &lt;40% (+2)</span>
        </div>
        <div className="flex gap-4 mt-2 flex-wrap">
          {(["BAJO","MEDIO","ALTO","CRÍTICO"] as RiesgoNivel[]).map(n => (
            <span key={n} className={`${RIESGO_CONFIG[n].textClass} font-semibold`}>
              {n}: {n === "BAJO" ? "0-2" : n === "MEDIO" ? "3-4" : n === "ALTO" ? "5-7" : "8+"} pts
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Module ───────────────────────────────────────────────────────────────

export function ReportesModule(props: ReportesProps) {
  const { filtros, parroquias } = props;
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("resumen");
  const [desde, setDesde] = useState(filtros.desde);
  const [hasta, setHasta] = useState(filtros.hasta);
  const [parroquiasFiltro, setParroquiasFiltro] = useState<string[]>(filtros.parroquias ?? []);
  const [showModal, setShowModal] = useState(false);
  const tabRef = useRef<HTMLDivElement>(null);

  const aplicarFiltros = () => {
    const qs = new URLSearchParams({ desde, hasta });
    if (parroquiasFiltro.length > 0) qs.set("parroquias", parroquiasFiltro.join(","));
    router.push(`/reportes?${qs.toString()}`);
  };

  const limpiarFiltros = () => {
    const hoy = new Date();
    const hace = new Date();
    hace.setMonth(hoy.getMonth() - 1);
    setDesde(hace.toISOString().split("T")[0]);
    setHasta(hoy.toISOString().split("T")[0]);
    setParroquiasFiltro([]);
    router.push("/reportes");
  };

  const hayFiltros = parroquiasFiltro.length > 0;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      {showModal && (
        <ExportModal
          data={props.dataExportacion}
          parroquias={parroquias}
          onClose={() => setShowModal(false)}
          desde={desde}
          hasta={hasta}
          activeTab={activeTab}
          totales={props.totales}
          porEstado={props.porEstado}
          porTipo={props.porTipo}
          porParroquia={props.porParroquia}
          incidenciasData={props.incidenciasData}
          brigadistasData={props.brigadistasData}
          kitsData={props.kitsData}
          actividadesData={props.actividadesData}
          parroquiasRiesgo={props.parroquiasRiesgo}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-[#009850]/10 rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-[#009850]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Reportes Gestion de Riesgos y Desastres</h1>
            <p className="text-xs text-gray-500">Período: {desde} — {hasta}</p>
          </div>
        </div>
        <button onClick={() => setShowModal(true)} suppressHydrationWarning
          className="cursor-pointer flex items-center gap-2 px-4 py-2.5 bg-[#009850] hover:bg-[#007a40] text-white rounded-lg text-sm font-semibold transition-colors shadow-sm">
          <Download className="w-4 h-4" />
          Exportar {TABS.find(t => t.id === activeTab)?.label ?? "Reporte"}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Desde</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
              <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
                className="cursor-pointer pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#009850] focus:ring-2 focus:ring-[#009850]/20" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Hasta</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
              <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
                className="cursor-pointer pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#009850] focus:ring-2 focus:ring-[#009850]/20" />
            </div>
          </div>
          {parroquias.length > 0 && (
            <ParroquiaMultiSelect parroquias={parroquias} selected={parroquiasFiltro} onChange={setParroquiasFiltro} />
          )}
          <button onClick={aplicarFiltros} suppressHydrationWarning
            className="cursor-pointer px-5 py-2 bg-[#009850] text-white font-semibold rounded-lg text-sm hover:bg-[#007a40] transition-colors shadow-sm">
            Aplicar
          </button>
          {hayFiltros && (
            <button onClick={limpiarFiltros} suppressHydrationWarning
              className="cursor-pointer text-xs text-gray-400 hover:text-[#009850] flex items-center gap-1 transition-colors">
              <X className="w-3.5 h-3.5" /> Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div ref={tabRef} className="flex gap-1 overflow-x-auto bg-white border border-gray-200 rounded-xl p-1.5 shadow-sm" style={{ scrollbarWidth: "none" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} suppressHydrationWarning
            className={`cursor-pointer flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap shrink-0 ${
              activeTab === t.id
                ? "bg-[#009850] text-white shadow-sm"
                : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
            }`}>
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
            <span className="sm:hidden">{t.label.split(" ")[0]}</span>
          </button>
        ))}
      </div>

      {/* Report subtitle */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <span className="font-semibold text-gray-600 text-sm">{TABS.find(t => t.id === activeTab)?.label}</span>
        <span>—</span>
        <span>{TABS.find(t => t.id === activeTab)?.sublabel}</span>
      </div>

      {/* Tab content */}
      {activeTab === "resumen"     && <TabResumen      {...props} />}
      {activeTab === "casos"       && <TabCasos        {...props} />}
      {activeTab === "brigadistas" && <TabBrigadistas  {...props} />}
      {activeTab === "prevencion"  && <TabPrevencion   {...props} />}
      {activeTab === "kits"        && <TabKits         {...props} />}
      {activeTab === "riesgo"      && <TabRiesgo       {...props} />}
    </div>
  );
}
