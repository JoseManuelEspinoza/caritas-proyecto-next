"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Users,
  ShieldCheck,
  Clock,
  CheckCircle,
  ArrowRight,
  MapPin,
  Flame,
  Waves,
  Mountain,
  Zap,
  TrendingDown,
  CircleDot,
  Package,
} from "lucide-react";
import type { IncidenteResumen } from "./admin-dashboard";

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  ABIERTO: { label: "Abierto", color: "text-yellow-700", bg: "bg-yellow-50", dot: "bg-yellow-500" },
  ASIGNADO: { label: "Asignado", color: "text-blue-700", bg: "bg-blue-50", dot: "bg-blue-500" },
  "DATA RECOPILADA": {
    label: "Data Recopilada",
    color: "text-orange-700",
    bg: "bg-orange-50",
    dot: "bg-orange-500",
  },
  "EN EVALUACION": {
    label: "En Evaluación",
    color: "text-purple-700",
    bg: "bg-purple-50",
    dot: "bg-purple-500",
  },
  OBSERVADO: {
    label: "Observado",
    color: "text-amber-700",
    bg: "bg-amber-50",
    dot: "bg-amber-500",
  },
  APROBADO: { label: "Aprobado", color: "text-[#009850]", bg: "bg-green-50", dot: "bg-[#009850]" },
  ATENDIDO: { label: "Atendido", color: "text-[#00C8B4]", bg: "bg-cyan-50", dot: "bg-[#00C8B4]" },
  "SEGUIMIENTO ABIERTO": {
    label: "Seguimiento",
    color: "text-[#91D723]",
    bg: "bg-lime-50",
    dot: "bg-[#91D723]",
  },
  CERRADO: { label: "Cerrado", color: "text-gray-600", bg: "bg-gray-50", dot: "bg-gray-400" },
  RECHAZADO: { label: "Rechazado", color: "text-red-700", bg: "bg-red-50", dot: "bg-red-500" },
};

const CAT_ICONS: Record<string, any> = {
  Incendios: Flame,
  Inundaciones: Waves,
  Derrumbes: Mountain,
  Sismos: Zap,
  Deslizamientos: TrendingDown,
};

export type BrigadistaDisp = {
  id: string;
  nombres: string;
  apellidos: string | null;
  parroquia: string | null;
};

export type SimulacroActivo = {
  id: string;
  nombreActividad: string;
  parroquia: string | null;
  estadoActividad: string;
};

export type EspecialistaDashboardProps = {
  userName: string;
  anio: number;
  incidentesActivos: number;
  incidentes2026: number;
  familias2026: number;
  personas2026: number;
  familias: number;
  personas: number;
  brigDisp: number;
  totalBrigActivos: number;
  pipelineCounts: Record<string, number>;
  urgentes: { inc: IncidenteResumen; label: string; color: string }[];
  brigadistasDisponibles: BrigadistaDisp[];
  incidentesRecientes: IncidenteResumen[];
  simulacrosActivos: SimulacroActivo[];
};

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  to,
}: {
  label: string;
  value: number | string;
  sub?: string;
  icon: any;
  color: string;
  to?: string;
}) {
  const inner = (
    <div
      className={`bg-white border border-[#DDDDDD] rounded-xl p-4 hover:shadow-md transition-shadow flex items-start gap-3 h-full ${to ? "cursor-pointer" : ""}`}
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}
      >
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
        {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {to && <ArrowRight className="w-4 h-4 text-gray-300 self-center flex-shrink-0" />}
    </div>
  );
  return to ? (
    <Link href={to} className="h-full">
      {inner}
    </Link>
  ) : (
    inner
  );
}

function IncidentRow({ inc }: { inc: IncidenteResumen }) {
  const cfg = STATUS_CFG[inc.estadoActual] ?? STATUS_CFG["ABIERTO"];
  const Icon = inc.tipoEvento && CAT_ICONS[inc.tipoEvento] ? CAT_ICONS[inc.tipoEvento] : MapPin;
  return (
    <Link
      href={`/grd/${inc.id}`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
    >
      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-gray-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-800 truncate">
          {inc.tituloIncidencia ?? "Sin título"}
        </p>
        <p className="text-[10px] text-gray-500">
          {inc.codigoCaso ?? "—"} · {inc.parroquia ?? "—"}
        </p>
      </div>
      <span
        className={`flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.color} ${cfg.bg}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
        {cfg.label}
      </span>
    </Link>
  );
}

const PIPELINE = [
  { label: "Por asignar", status: "ABIERTO", color: "#EAB308" },
  { label: "En campo", status: "ASIGNADO", color: "#3B82F6" },
  { label: "Por evaluar", status: "DATA RECOPILADA", color: "#F97316" },
  { label: "En revisión", status: "EN EVALUACION", color: "#9155A8" },
  { label: "Por atender", status: "APROBADO", color: "#009850" },
  { label: "Seguimiento", status: "SEGUIMIENTO ABIERTO", color: "#91D723" },
];

export function EspecialistaDashboard({
  userName,
  anio,
  incidentesActivos,
  incidentes2026,
  familias2026,
  personas2026,
  brigDisp,
  totalBrigActivos,
  pipelineCounts,
  urgentes,
  brigadistasDisponibles,
  incidentesRecientes,
  simulacrosActivos,
}: EspecialistaDashboardProps) {
  const pipeline = PIPELINE.map((p) => ({ ...p, count: pipelineCounts[p.status] ?? 0 }));
  const primerNombre = userName.split(" ")[0];

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Hola, {primerNombre} 👋</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Panel del Especialista GRD —{" "}
          {new Date().toLocaleDateString("es-PE", {
            weekday: "long",
            day: "numeric",
            month: "long",
            timeZone: "America/Lima",
          })}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Incidentes activos"
          value={incidentesActivos}
          icon={AlertTriangle}
          color="bg-[#009850]"
          to="/grd"
        />
        <StatCard
          label="Acciones urgentes"
          value={urgentes.length}
          icon={Clock}
          color="bg-[#FF823C]"
          sub={urgentes.length > 0 ? "Requieren tu atención" : "Sin pendientes"}
        />
        <StatCard
          label={`Familias afectadas (${anio})`}
          value={familias2026}
          icon={Users}
          color="bg-[#9155A8]"
          sub={`${personas2026} personas · ${incidentes2026} incidentes este año`}
        />
        <StatCard
          label="Brigadistas disponibles"
          value={brigDisp}
          icon={ShieldCheck}
          color="bg-[#00C8B4]"
          to="/brigadistas"
        />
      </div>

      {/* Pipeline */}
      <div className="bg-white border border-[#DDDDDD] rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">Estado del flujo GRD</h2>
          <Link
            href="/grd"
            className="text-xs text-[#009850] hover:underline flex items-center gap-1"
          >
            Ver todo <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {pipeline.map((p) => (
            <Link
              key={p.status}
              href="/grd"
              className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-gray-50 transition-colors text-center border border-transparent hover:border-gray-100"
            >
              <span className="text-3xl font-bold" style={{ color: p.color }}>
                {p.count}
              </span>
              <span className="text-[10px] text-gray-500 leading-tight">{p.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Acciones urgentes - ancho completo */}
      <div className="bg-white border border-[#DDDDDD] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#DDDDDD] flex items-center gap-2">
          <CircleDot className="w-4 h-4 text-[#FF823C]" />
          <h2 className="text-sm font-semibold text-gray-700">Acciones urgentes</h2>
          {urgentes.length > 0 && (
            <span className="ml-auto px-2 py-0.5 bg-[#FF823C]/10 text-[#FF823C] text-[10px] font-bold rounded-full">
              {urgentes.length}
            </span>
          )}
        </div>
        {urgentes.length === 0 ? (
          <div className="flex items-center gap-3 px-4 py-5 text-center justify-center">
            <CheckCircle className="w-5 h-5 text-[#009850]" />
            <p className="text-sm text-gray-500">Sin acciones pendientes</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 p-3">
            {urgentes.slice(0, 6).map(({ inc, label, color }) => (
              <Link
                key={inc.id}
                href={`/grd/${inc.id}`}
                className={`flex items-center gap-3 p-3 rounded-xl border ${color} hover:opacity-90 transition-opacity`}
              >
                <div className="w-8 h-8 rounded-lg bg-white/60 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">
                    {inc.tituloIncidencia ?? "Sin título"}
                  </p>
                  <p className="text-[10px] opacity-70">{inc.codigoCaso ?? "—"}</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-white/40 rounded-full flex-shrink-0">
                  {label}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Incidentes + Simulacros */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border border-[#DDDDDD] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#DDDDDD] flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Incidentes activos</h2>
            <Link
              href="/grd"
              className="text-xs text-[#009850] hover:underline flex items-center gap-1"
            >
              Ver todos <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="p-3">
            {incidentesRecientes.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-4">Sin incidentes activos</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {incidentesRecientes.map((inc) => {
                  const cfg = STATUS_CFG[inc.estadoActual] ?? STATUS_CFG["ABIERTO"];
                  const Icon = inc.tipoEvento && CAT_ICONS[inc.tipoEvento] ? CAT_ICONS[inc.tipoEvento] : MapPin;
                  return (
                    <Link
                      key={inc.id}
                      href={`/grd/${inc.id}`}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-200 hover:shadow-sm hover:border-gray-300 transition-all"
                    >
                      <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-gray-200 shrink-0">
                        <Icon className="w-4 h-4 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold text-gray-800 truncate">
                          {inc.tituloIncidencia ?? "Sin título"}
                        </p>
                        <p className="text-[10px] text-gray-500 truncate">{inc.codigoCaso ?? "—"}</p>
                      </div>
                      <span className={`shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold border ${cfg.color} ${cfg.bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border border-[#DDDDDD] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#DDDDDD] flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Simulacros</h2>
            <Link href="/simulacros" className="text-xs text-[#009850] hover:underline">
              Ver todos
            </Link>
          </div>
          <div className="p-3">
            {simulacrosActivos.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-4">Sin simulacros activos</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {simulacrosActivos.slice(0, 4).map((s) => (
                  <div key={s.id} className="flex flex-col gap-2 p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="w-8 h-8 rounded-lg bg-[#009850]/10 flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4 text-[#009850]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-gray-800 leading-tight line-clamp-2">
                        {s.nombreActividad}
                      </p>
                      <p className="text-[10px] text-gray-500 truncate mt-0.5">{s.parroquia ?? "—"}</p>
                    </div>
                    <span
                      className={`self-start text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                        s.estadoActividad === "PROGRAMADA"
                          ? "bg-blue-50 text-blue-700"
                          : s.estadoActividad === "EN_EJECUCION"
                            ? "bg-indigo-50 text-indigo-700"
                            : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {s.estadoActividad}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <Link
              href="/simulacros"
              className="flex items-center justify-center gap-1 py-2 mt-2 text-xs text-[#009850] hover:underline w-full"
            >
              <Package className="w-3 h-3" /> Ir a Simulacros
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
