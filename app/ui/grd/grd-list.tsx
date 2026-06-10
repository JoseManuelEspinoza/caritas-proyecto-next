"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Filter,
  Search,
  Download,
  MapPin,
  Users,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  FileCheck,
  ClipboardList,
  HandHeart,
  Flame,
  Waves,
  Mountain,
  Zap,
  TrendingDown,
} from "lucide-react";
import type { FrontendRole } from "@/app/lib/roles";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type IncidenteItem = {
  idIncidencia: string;
  codigoCaso: string | null;
  tituloIncidencia: string | null;
  tipoEvento: string | null;
  estadoActual: string;
  direccionEvento: string | null;
  fechaRegistro: string; // serialized ISO string
  parroquia: string | null;
  totalFamilias: number;
  totalPersonas: number;
  brigadistas: string[]; // nombres de brigadistas asignados
};

// ─── Configuración de estados ─────────────────────────────────────────────────

type StatusCfg = {
  label: string;
  badge: string;
  card: string;
  ring: string;
  icon: any;
  iconBg: string;
};

const STATUS: Record<string, StatusCfg> = {
  ABIERTO: {
    label: "Abierto",
    badge: "bg-yellow-100 text-yellow-800",
    card: "from-yellow-50 to-yellow-100 border-yellow-200",
    ring: "ring-yellow-500",
    icon: Clock,
    iconBg: "bg-yellow-600",
  },
  ASIGNADO: {
    label: "Asignado",
    badge: "bg-blue-100 text-blue-800",
    card: "from-blue-50 to-blue-100 border-blue-200",
    ring: "ring-blue-500",
    icon: CheckCircle,
    iconBg: "bg-blue-600",
  },
  "DATA RECOPILADA": {
    label: "Data Recopilada",
    badge: "bg-orange-100 text-orange-800",
    card: "from-orange-50 to-orange-100 border-orange-200",
    ring: "ring-orange-500",
    icon: ClipboardList,
    iconBg: "bg-orange-500",
  },
  "EN EVALUACION": {
    label: "En Evaluación",
    badge: "bg-purple-100 text-purple-800",
    card: "from-purple-50 to-purple-100 border-purple-200",
    ring: "ring-purple-500",
    icon: FileCheck,
    iconBg: "bg-purple-600",
  },
  OBSERVADO: {
    label: "Observado",
    badge: "bg-amber-100 text-amber-800",
    card: "from-amber-50 to-amber-100 border-amber-200",
    ring: "ring-amber-500",
    icon: FileCheck,
    iconBg: "bg-amber-500",
  },
  APROBADO: {
    label: "Aprobado",
    badge: "bg-green-100 text-green-800",
    card: "from-green-50 to-green-100 border-green-200",
    ring: "ring-green-500",
    icon: CheckCircle,
    iconBg: "bg-green-600",
  },
  ATENDIDO: {
    label: "Atendido",
    badge: "bg-cyan-100 text-cyan-800",
    card: "from-cyan-50 to-cyan-100 border-cyan-200",
    ring: "ring-cyan-500",
    icon: HandHeart,
    iconBg: "bg-cyan-600",
  },
  "SEGUIMIENTO ABIERTO": {
    label: "Seguimiento",
    badge: "bg-teal-100 text-teal-800",
    card: "from-teal-50 to-teal-100 border-teal-200",
    ring: "ring-teal-500",
    icon: FileCheck,
    iconBg: "bg-teal-600",
  },
  CERRADO: {
    label: "Cerrado",
    badge: "bg-gray-100 text-gray-700",
    card: "from-gray-50 to-gray-100 border-gray-200",
    ring: "ring-gray-500",
    icon: XCircle,
    iconBg: "bg-gray-600",
  },
  RECHAZADO: {
    label: "Rechazado",
    badge: "bg-red-100 text-red-700",
    card: "from-red-50 to-red-100 border-red-200",
    ring: "ring-red-500",
    icon: XCircle,
    iconBg: "bg-red-600",
  },
};

const CATEGORY_ICONS: Record<string, any> = {
  Incendios: Flame,
  Inundaciones: Waves,
  Derrumbes: Mountain,
  Tsunamis: Waves,
  Sismos: Zap,
  Deslizamientos: TrendingDown,
};

function CatIcon({ cat, className = "w-4 h-4" }: { cat: string | null; className?: string }) {
  const Icon = cat && CATEGORY_ICONS[cat] ? CATEGORY_ICONS[cat] : MapPin;
  return <Icon className={className} />;
}

// ─── Cards de resumen ─────────────────────────────────────────────────────────

const SUMMARY_STATES = [
  "ABIERTO",
  "ASIGNADO",
  "DATA RECOPILADA",
  "EN EVALUACION",
  "APROBADO",
  "ATENDIDO",
  "SEGUIMIENTO ABIERTO",
  "CERRADO",
];

// ─── Componente principal ─────────────────────────────────────────────────────

interface GrdListProps {
  items: IncidenteItem[];
  role: FrontendRole;
}

export function GrdList({ items, role }: GrdListProps) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const canCreate = role === "admin" || role === "especialistaGRD";
  const rowsPerPage = 10;

  const handleExport = () => {
    const headers = ["Código", "Incidente", "Categoría", "Estado", "Ubicación", "Parroquia", "Familias", "Personas", "Brigadistas", "Fecha"];
    const rows = filtered.map((i) => [
      i.codigoCaso ?? "",
      i.tituloIncidencia ?? "",
      i.tipoEvento ?? "",
      i.estadoActual,
      i.direccionEvento ?? "",
      i.parroquia ?? "",
      String(i.totalFamilias),
      String(i.totalPersonas),
      i.brigadistas.join("; "),
      new Date(i.fechaRegistro).toLocaleDateString("es-PE", { timeZone: "America/Lima" }),
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((v) => `"${v.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `incidencias_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filtros
  const filtered = items.filter((i) => {
    if (statusFilter !== "all" && i.estadoActual !== statusFilter) return false;
    if (categoryFilter !== "all" && i.tipoEvento !== categoryFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const inTitle = i.tituloIncidencia?.toLowerCase().includes(q) ?? false;
      const inCode = i.codigoCaso?.toLowerCase().includes(q) ?? false;
      if (!inTitle && !inCode) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * rowsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + rowsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, categoryFilter, search]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  // Conteos por estado
  const counts: Record<string, number> = {};
  for (const item of items) {
    counts[item.estadoActual] = (counts[item.estadoActual] ?? 0) + 1;
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
            Gestión de Riesgo de Desastres
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Seguimiento y gestión de incidentes — Cáritas Lima
          </p>
        </div>
        {canCreate && (
          <Link
            href="/grd/nuevo"
            className="hidden sm:flex items-center gap-2 px-4 py-2 text-white text-sm font-medium hover:opacity-90 transition-all"
            style={{ background: "var(--caritas-green)", borderRadius: "8px" }}
          >
            <Plus className="w-4 h-4" />
            Registrar Incidente
          </Link>
        )}
      </div>

      {/* Tarjetas de estado */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 md:gap-3">
        {SUMMARY_STATES.map((s) => {
          const cfg = STATUS[s];
          const Icon = cfg.icon;
          const count = counts[s] ?? 0;
          const active = statusFilter === s;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(active ? "all" : s)}
              suppressHydrationWarning
              className={`bg-gradient-to-br ${cfg.card} border rounded-xl p-3 md:p-4 cursor-pointer transition-all hover:shadow-md hover:scale-105 text-left ${active ? `ring-2 ${cfg.ring}` : ""}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div
                  className={`w-7 h-7 ${cfg.iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}
                >
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900">{count}</span>
              </div>
              <div className="text-xs font-medium text-gray-600 leading-tight">{cfg.label}</div>
            </button>
          );
        })}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 md:p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1 md:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o código..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              suppressHydrationWarning
              className="w-full pl-9 pr-4 py-2 text-sm bg-[#F5F5F5] border border-[#DDDDDD] rounded focus:outline-none focus:ring-2 focus:ring-[#009850]/20 focus:border-[#009850]"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              suppressHydrationWarning
              className="flex-1 px-3 py-2 text-sm bg-[#F5F5F5] border border-[#DDDDDD] rounded focus:outline-none focus:ring-2 focus:ring-[#009850]/20 focus:border-[#009850]"
            >
              <option value="all">Todas las categorías</option>
              <option value="Incendios">Incendios</option>
              <option value="Inundaciones">Inundaciones</option>
              <option value="Derrumbes">Derrumbes</option>
              <option value="Deslizamientos">Deslizamientos</option>
              <option value="Sismos">Sismos</option>
              <option value="Tsunamis">Tsunamis</option>
              <option value="Pérdida parcial de la vivienda">Pérdida parcial de vivienda</option>
              <option value="Colapso de infraestructura">Colapso de infraestructura</option>
            </select>

            <button
              onClick={handleExport}
              suppressHydrationWarning
              className="hidden md:flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 bg-[#F5F5F5] border border-[#DDDDDD] rounded hover:bg-gray-200 transition-colors"
            >
              <Download className="w-4 h-4" />
              Exportar
            </button>
          </div>

          {statusFilter !== "all" && (
            <button
              onClick={() => setStatusFilter("all")}
              className="px-3 py-2 text-xs font-medium text-[#009850] bg-[#009850]/10 hover:bg-[#009850]/20 rounded-lg transition-colors whitespace-nowrap"
            >
              Ver todos ({items.length})
            </button>
          )}
        </div>
      </div>

      {/* Lista mobile */}
      <div className="block lg:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">Sin incidentes que mostrar</div>
        ) : (
          paginated.map((item) => {
            const cfg = STATUS[item.estadoActual] ?? STATUS["ABIERTO"];
            return (
              <Link
                key={item.idIncidencia}
                href={`/grd/${item.idIncidencia}`}
                className="block bg-white rounded-xl border border-gray-200 p-4 space-y-3 hover:shadow-md hover:border-[#009850]/30 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-[#009850]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CatIcon cat={item.tipoEvento} className="w-5 h-5 text-[#009850]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">
                      {item.tituloIncidencia ?? "Sin título"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {item.codigoCaso} ·{" "}
                      {new Date(item.fechaRegistro).toLocaleDateString("es-PE", {
                        timeZone: "America/Lima",
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.badge}`}>
                    {cfg.label}
                  </span>
                  {item.tipoEvento && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 flex items-center gap-1">
                      <CatIcon cat={item.tipoEvento} className="w-3 h-3" />
                      {item.tipoEvento}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  {item.direccionEvento && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {item.direccionEvento}
                    </span>
                  )}
                  {item.totalFamilias > 0 && (
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {item.totalFamilias} familias
                    </span>
                  )}
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* Tabla desktop */}
      <div className="hidden lg:block bg-white border border-[#DDDDDD] rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">Sin incidentes que mostrar</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F5F5F5] border-b border-[#DDDDDD]">
                <tr>
                  {[
                    "Código",
                    "Incidente",
                    "Responsable",
                    "Categoría",
                    "Ubicación",
                    "Estado",
                    "Fecha",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDDDDD]">
                {paginated.map((item) => {
                  const cfg = STATUS[item.estadoActual] ?? STATUS["ABIERTO"];
                  return (
                    <tr
                      key={item.idIncidencia}
                      onClick={() => (window.location.href = `/grd/${item.idIncidencia}`)}
                      className="hover:bg-[#009850]/5 cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="font-mono text-sm text-gray-800">
                          {item.codigoCaso ?? "—"}
                        </span>
                      </td>
                      <td className="px-5 py-4 max-w-xs">
                        <p className="font-medium text-gray-900 truncate">
                          {item.tituloIncidencia ?? "Sin título"}
                        </p>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                          {item.direccionEvento && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {item.direccionEvento}
                            </span>
                          )}
                          {item.totalPersonas > 0 && (
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {item.totalPersonas} personas
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-700">
                          {item.brigadistas.length > 0 ? item.brigadistas[0] : "—"}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        {item.tipoEvento ? (
                          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold w-fit">
                            <CatIcon cat={item.tipoEvento} className="w-3.5 h-3.5" />
                            {item.tipoEvento}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-700">
                          {item.parroquia ?? item.direccionEvento ?? "—"}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.badge}`}
                        >
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="flex items-center gap-1 text-sm text-gray-500">
                          <Calendar className="w-3 h-3" />
                          {new Date(item.fechaRegistro).toLocaleDateString("es-PE", {
                            timeZone: "America/Lima",
                          })}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-t border-[#DDDDDD] bg-[#F5F5F5]">
            <p className="text-xs text-gray-500">
              Mostrando {startIndex + 1}-{Math.min(startIndex + rowsPerPage, filtered.length)} de{" "}
              {filtered.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[#DDDDDD] bg-white text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <span className="text-xs text-gray-600 font-medium">
                Página {safePage} de {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[#DDDDDD] bg-white text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* FAB móvil */}
      {canCreate && (
        <Link
          href="/grd/nuevo"
          className="fixed bottom-6 right-6 lg:hidden w-14 h-14 text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center z-50 rounded-full"
          style={{ background: "var(--caritas-green)" }}
        >
          <Plus className="w-6 h-6" />
        </Link>
      )}
    </div>
  );
}
