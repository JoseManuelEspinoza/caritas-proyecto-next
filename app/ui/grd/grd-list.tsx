"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
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
  SendHorizonal,
  Loader2,
  AlertTriangle,
  Download,
  X,
  Check,
  ChevronDown,
} from "lucide-react";
import React from "react";
import type { FrontendRole } from "@/app/lib/roles";
import { PaginationControls } from "@/app/ui/shared/pagination-controls";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type GlobalCounts = Record<string, number>;

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
  /** True cuando el estado es DATA RECOPILADA y ya hay un borrador de informe guardado */
  tieneBorradorInforme?: boolean;
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
  Incendio: Flame,
  Inundación: Waves,
  Derrumbe: Mountain,
  Sismo: Zap,
  Deslizamiento: TrendingDown,
  Vendaval: Zap,
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  Incendio:     { bg: "bg-red-100",    text: "text-red-700" },
  Inundación:   { bg: "bg-blue-100",   text: "text-blue-700" },
  Sismo:        { bg: "bg-orange-100", text: "text-orange-700" },
  Derrumbe:     { bg: "bg-stone-100",  text: "text-stone-700" },
  Deslizamiento:{ bg: "bg-amber-100",  text: "text-amber-700" },
  Vendaval:     { bg: "bg-teal-100",   text: "text-teal-700" },
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

// ─── MultiSelect ──────────────────────────────────────────────────────────────

function MultiSelect({
  options, value, onChange, placeholder, icon: Icon,
}: {
  options: { value: string; label: string }[];
  value: string[]; onChange: (v: string[]) => void;
  placeholder: string; icon: React.ComponentType<{ className?: string }>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const toggle = (v: string) => onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v]);
  const label = value.length === 0 ? placeholder
    : value.length === 1 ? (options.find(o => o.value === value[0])?.label ?? value[0])
    : `${value.length} seleccionados`;
  return (
    <div ref={ref} className="relative flex-1 min-w-0">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
      <button type="button" onClick={() => setOpen(v => !v)} suppressHydrationWarning
        className={`w-full flex items-center justify-between pl-9 pr-3 py-2 border rounded-lg text-sm bg-white cursor-pointer transition-colors focus:outline-none
          ${open ? "border-[var(--caritas-green)] ring-2 ring-[var(--caritas-green)]/20" : "border-[#DDDDDD] hover:border-gray-300 bg-[#F5F5F5]"}`}>
        <span className={`truncate ${value.length === 0 ? "text-gray-400" : "text-gray-700 font-medium"}`}>{label}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ml-1 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1 overflow-hidden min-w-[180px]">
          {options.map(opt => {
            const sel = value.includes(opt.value);
            return (
              <button key={opt.value} type="button" onClick={() => toggle(opt.value)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors text-left
                  ${sel ? "bg-[var(--caritas-green)]/5 text-[var(--caritas-green)] font-medium" : "text-gray-700 hover:bg-[var(--caritas-green)]/5 hover:text-[var(--caritas-green)]"}`}>
                <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors
                  ${sel ? "bg-[var(--caritas-green)] border-[var(--caritas-green)]" : "border-gray-300"}`}>
                  {sel && <Check className="w-3 h-3 text-white" />}
                </span>
                {opt.label}
              </button>
            );
          })}
          {value.length > 0 && (
            <><div className="mx-3 my-1 border-t border-gray-100" />
              <button type="button" onClick={() => onChange([])}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:text-[var(--caritas-green)]">
                <X className="w-3 h-3" /> Limpiar
              </button></>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface GrdListProps {
  items: IncidenteItem[];
  role: FrontendRole;
  globalCounts?: GlobalCounts;
}

export function GrdList({ items, role, globalCounts }: GrdListProps) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [parroquiaFilter, setParroquiaFilter] = useState<string[]>([]);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(6);
  const [exportando, setExportando] = useState(false);

  // Parroquias y categorías únicas derivadas de los items reales
  const parroquias = Array.from(new Set(items.map((i) => i.parroquia).filter(Boolean))) as string[];
  const categorias = Array.from(new Set(items.map((i) => i.tipoEvento).filter(Boolean))) as string[];

  const canCreate = role === "admin" || role === "especialistaGRD";

  // Datos a exportar. Familias/Personas como números reales para filtrar/ordenar.
  const buildExportData = () => {
    const headers = [
      "Código",
      "Incidente",
      "Categoría",
      "Estado",
      "Ubicación",
      "Parroquia",
      "Familias",
      "Personas",
      "Brigadistas",
      "Fecha",
    ];
    const rows: (string | number)[][] = filtered.map((i) => [
      i.codigoCaso ?? "",
      i.tituloIncidencia ?? "",
      i.tipoEvento ?? "",
      i.estadoActual,
      i.direccionEvento ?? "",
      i.parroquia ?? "",
      i.totalFamilias,
      i.totalPersonas,
      i.brigadistas.join("; "),
      new Date(i.fechaRegistro).toLocaleDateString("es-PE", { timeZone: "America/Lima" }),
    ]);
    return { headers, rows };
  };

  // Color por estado para la columna "Estado" (fondo claro + texto oscuro), ARGB.
  const ESTADO_XLSX: Record<string, { bg: string; fg: string }> = {
    ABIERTO: { bg: "FFFEF3C7", fg: "FF92400E" },
    ASIGNADO: { bg: "FFDBEAFE", fg: "FF1E40AF" },
    "DATA RECOPILADA": { bg: "FFFFEDD5", fg: "FF9A3412" },
    "EN EVALUACION": { bg: "FFEDE9FE", fg: "FF5B21B6" },
    APROBADO: { bg: "FFD1FAE5", fg: "FF065F46" },
    ATENDIDO: { bg: "FFCFFAFE", fg: "FF155E75" },
    OBSERVADO: { bg: "FFFEF3C7", fg: "FF92400E" },
    RECHAZADO: { bg: "FFFEE2E2", fg: "FF991B1B" },
    "SEGUIMIENTO ABIERTO": { bg: "FFCCFBF1", fg: "FF115E59" },
    CERRADO: { bg: "FFF3F4F6", fg: "FF374151" },
  };

  // ExcelJS se carga dinámicamente para no inflar el bundle inicial.
  const handleExportExcel = async () => {
    setExportando(true);
    try {
      const ExcelJSmod = await import("exceljs");
      const ExcelJS = (ExcelJSmod as unknown as { default?: typeof ExcelJSmod }).default ?? ExcelJSmod;
      const { headers, rows } = buildExportData();

      const wb = new ExcelJS.Workbook();
      wb.creator = "Cáritas Lima — GRD";
      wb.created = new Date();
      const ws = wb.addWorksheet("Incidencias", {
        views: [{ state: "frozen", ySplit: 3 }],
      });

      const nCols = headers.length;
      const colLetter = (n: number) => {
        let s = "";
        while (n > 0) {
          const m = (n - 1) % 26;
          s = String.fromCharCode(65 + m) + s;
          n = Math.floor((n - 1) / 26);
        }
        return s;
      };
      const last = colLetter(nCols);
      const thin = { style: "thin" as const, color: { argb: "FFE5E7EB" } };
      const borderAll = { top: thin, bottom: thin, left: thin, right: thin };

      // Fila 1: título de marca.
      ws.mergeCells(`A1:${last}1`);
      const t = ws.getCell("A1");
      t.value = "Gestión de Riesgo de Desastres — Cáritas Lima";
      t.font = { bold: true, size: 14, color: { argb: "FF009850" } };
      t.alignment = { vertical: "middle" };
      ws.getRow(1).height = 26;

      // Fila 2: metadatos del export.
      ws.mergeCells(`A2:${last}2`);
      const sub = ws.getCell("A2");
      sub.value = `Exportado el ${new Date().toLocaleString("es-PE", { timeZone: "America/Lima" })} · ${rows.length} incidencia(s)`;
      sub.font = { size: 10, italic: true, color: { argb: "FF6B7280" } };

      // Fila 3: encabezados con color de marca.
      const headerRow = ws.getRow(3);
      headers.forEach((h, i) => {
        const c = headerRow.getCell(i + 1);
        c.value = h;
        c.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF009850" } };
        c.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        c.border = borderAll;
      });
      headerRow.height = 22;

      // Filas de datos: bordes, filas alternas y la columna Estado coloreada.
      const estadoIdx = headers.indexOf("Estado");
      rows.forEach((r, idx) => {
        const row = ws.getRow(4 + idx);
        r.forEach((val, ci) => {
          const c = row.getCell(ci + 1);
          c.value = val;
          c.border = borderAll;
          c.alignment = { vertical: "middle", wrapText: ci === 1 || ci === 4 };
          if (idx % 2 === 1) {
            c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9FAFB" } };
          }
        });
        if (estadoIdx >= 0) {
          const ec = row.getCell(estadoIdx + 1);
          const col = ESTADO_XLSX[String(r[estadoIdx]).toUpperCase()];
          if (col) {
            ec.fill = { type: "pattern", pattern: "solid", fgColor: { argb: col.bg } };
            ec.font = { bold: true, color: { argb: col.fg } };
            ec.alignment = { vertical: "middle", horizontal: "center" };
          }
        }
      });

      // Autofiltro sobre los encabezados (fila 3) → columnas filtrables en Excel.
      ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: nCols } };

      // Anchos de columna acordes al contenido.
      const widths = [16, 30, 14, 18, 36, 30, 10, 10, 28, 13];
      widths.forEach((w, i) => {
        ws.getColumn(i + 1).width = w;
      });

      // Descarga en el navegador.
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `incidencias_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportando(false);
    }
  };

  // Convierte un ISO UTC a fecha local Lima (YYYY-MM-DD) para comparar igual que el display.
  const limaDate = (iso: string) =>
    new Date(iso).toLocaleDateString("sv", { timeZone: "America/Lima" });

  // Filtros
  const filtered = items.filter((i) => {
    if (statusFilter !== "all" && i.estadoActual !== statusFilter) return false;
    if (categoryFilter.length > 0 && !categoryFilter.includes(i.tipoEvento ?? "")) return false;
    if (parroquiaFilter.length > 0 && !parroquiaFilter.includes(i.parroquia ?? "")) return false;
    const fechaLocal = limaDate(i.fechaRegistro);
    if (fechaDesde && fechaLocal < fechaDesde) return false;
    if (fechaHasta && fechaLocal > fechaHasta) return false;
    if (search) {
      const q = search.toLowerCase();
      const hayMatch = [
        i.idIncidencia,
        i.codigoCaso,
        i.tituloIncidencia,
        i.tipoEvento,
        i.estadoActual,
        i.direccionEvento,
        i.parroquia,
        ...i.brigadistas,
      ]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q));
      if (!hayMatch) return false;
    }
    return true;
  });

  const hasFilters = search || categoryFilter.length > 0 || parroquiaFilter.length > 0 || fechaDesde || fechaHasta;

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * rowsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + rowsPerPage);

  useEffect(() => {
    setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, search, fechaDesde, fechaHasta, categoryFilter.join(), parroquiaFilter.join()]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  // Conteos por estado — usa globalCounts si se pasa (para roles con vista filtrada)
  const counts: Record<string, number> = globalCounts ?? {};
  if (!globalCounts) {
    for (const item of items) {
      counts[item.estadoActual] = (counts[item.estadoActual] ?? 0) + 1;
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-[var(--caritas-green)] flex-shrink-0" />
            <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
              Gestión de Riesgo de Desastres
            </h1>
          </div>
          <p className="text-sm text-gray-500 mt-0.5 ml-7">
            Seguimiento y gestión de incidentes — Cáritas Lima
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            disabled={exportando}
            suppressHydrationWarning
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            {exportando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {exportando ? "Exportando…" : "Exportar a Excel"}
          </button>
          {canCreate && (
            <Link
              href="/grd/nuevo"
              className="flex items-center gap-2 px-4 py-2 text-white text-sm font-medium hover:opacity-90 transition-all"
              style={{ background: "var(--caritas-green)", borderRadius: "8px" }}
            >
              <Plus className="w-4 h-4" />
              Registrar Incidente
            </Link>
          )}
        </div>
      </div>

      {/* Tarjetas de estado */}
      {role !== "jefaOGP" && <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 md:gap-3">
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
      </div>}

      {/* Filtros — una sola línea */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 md:p-4">
        <div className="flex flex-wrap lg:flex-nowrap items-center gap-2">
          {/* Búsqueda */}
          <div className="relative w-44 flex-shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              suppressHydrationWarning
              className="w-full pl-9 pr-3 py-2 text-sm bg-[#F5F5F5] border border-[#DDDDDD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009850]/20 focus:border-[#009850]"
            />
          </div>

          {/* Tipo de incidente */}
          <MultiSelect
            options={categorias.map((c) => ({ value: c, label: c }))}
            value={categoryFilter}
            onChange={setCategoryFilter}
            placeholder="Tipo de incidente"
            icon={AlertTriangle}
          />

          {/* Parroquia */}
          <MultiSelect
            options={parroquias.map((p) => ({ value: p, label: p }))}
            value={parroquiaFilter}
            onChange={setParroquiaFilter}
            placeholder="Parroquia"
            icon={MapPin}
          />

          {/* Fechas compactas */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <input
              type="date"
              value={fechaDesde}
              max={fechaHasta || undefined}
              suppressHydrationWarning
              onChange={(e) => setFechaDesde(e.target.value)}
              className="w-32 px-2 py-2 text-xs bg-[#F5F5F5] border border-[#DDDDDD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009850]/20 focus:border-[#009850]"
            />
            <span className="text-xs text-gray-400">—</span>
            <input
              type="date"
              value={fechaHasta}
              min={fechaDesde || undefined}
              suppressHydrationWarning
              onChange={(e) => setFechaHasta(e.target.value)}
              className="w-32 px-2 py-2 text-xs bg-[#F5F5F5] border border-[#DDDDDD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009850]/20 focus:border-[#009850]"
            />
          </div>

          {/* Limpiar filtros */}
          {hasFilters && (
            <button
              type="button"
              onClick={() => { setSearch(""); setCategoryFilter([]); setParroquiaFilter([]); setFechaDesde(""); setFechaHasta(""); }}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#009850] transition-colors flex-shrink-0 whitespace-nowrap"
            >
              <X className="w-3.5 h-3.5" /> Limpiar
            </button>
          )}

          {statusFilter !== "all" && (
            <button
              onClick={() => setStatusFilter("all")}
              className="px-3 py-1.5 text-xs font-medium text-[#009850] bg-[#009850]/10 hover:bg-[#009850]/20 rounded-lg transition-colors whitespace-nowrap flex-shrink-0"
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
                  {item.tieneBorradorInforme && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700 flex items-center gap-1">
                      <SendHorizonal className="w-3 h-3" />
                      Por enviar
                    </span>
                  )}
                  {item.tipoEvento && (() => {
                    const clr = CATEGORY_COLORS[item.tipoEvento] ?? { bg: "bg-gray-100", text: "text-gray-600" };
                    return (
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${clr.bg} ${clr.text} flex items-center gap-1`}>
                        <CatIcon cat={item.tipoEvento} className="w-3 h-3" />
                        {item.tipoEvento}
                      </span>
                    );
                  })()}
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
                      <td className="px-3 py-4 whitespace-nowrap">
                        <span className="font-mono text-xs text-gray-500">
                          {item.codigoCaso ?? "—"}
                        </span>
                      </td>
                      <td className="px-5 py-4 max-w-xs">
                        <p className="font-medium text-gray-900 truncate">
                          {item.tituloIncidencia ?? "Sin título"}
                        </p>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                          {item.totalFamilias > 0 && (
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {item.totalFamilias} fam · {item.totalPersonas} pers
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
                          (() => {
                            const clr = CATEGORY_COLORS[item.tipoEvento] ?? { bg: "bg-gray-100", text: "text-gray-600" };
                            return (
                              <span className={`flex items-center gap-1.5 px-2.5 py-1 ${clr.bg} ${clr.text} rounded-lg text-xs font-semibold w-fit`}>
                                <CatIcon cat={item.tipoEvento} className="w-3.5 h-3.5" />
                                {item.tipoEvento}
                              </span>
                            );
                          })()
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 max-w-xs">
                        <p className="text-sm text-gray-700 truncate">
                          {item.parroquia ?? item.direccionEvento ?? "—"}
                        </p>
                        {item.parroquia && item.direccionEvento && (
                          <p className="flex items-center gap-1 text-xs text-gray-400 mt-0.5 truncate">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            {item.direccionEvento}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.badge}`}
                          >
                            {cfg.label}
                          </span>
                          {item.tieneBorradorInforme && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700 flex items-center gap-1">
                              <SendHorizonal className="w-3 h-3" />
                              Por enviar
                            </span>
                          )}
                        </div>
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

        <PaginationControls
          total={filtered.length}
          start={filtered.length === 0 ? 0 : startIndex + 1}
          end={Math.min(startIndex + rowsPerPage, filtered.length)}
          page={safePage}
          totalPages={totalPages}
          onPrevious={() => setCurrentPage((p) => Math.max(1, p - 1))}
          onNext={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          pageSize={rowsPerPage}
          onPageSizeChange={(s) => { setRowsPerPage(s); setCurrentPage(1); }}
          className="rounded-t-none border-t border-x-0 border-b-0 rounded-b-xl"
        />
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
