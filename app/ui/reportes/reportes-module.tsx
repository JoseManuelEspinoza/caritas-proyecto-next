"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle, Users, Package,
  Calendar, FileDown,
  Shield, Target, BarChart2,
} from "lucide-react";
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
  AreaChart, Area, LabelList,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────
type Conteo = { label: string; value: number };

interface Props {
  filtros: { desde: string; hasta: string };
  totales: {
    incidencias: number;
    pctBrigadistasCapacitados: number;
    pctParroquiasPlan: number;
    pctActividadesEjecutadas: number;
    kitsEntregados: number;
    totalBrigadistas: number;
    totalParroquias: number;
    totalActividades: number;
  };
  porEstado: Conteo[];
  porTipo: Conteo[];
  porDia: Conteo[];
  topParroquias: Conteo[];
  porGravedad: Conteo[];
  dataExportacion: any[];
}

// ─── Palettes ─────────────────────────────────────────────────────────────────
const PALETTE = [
  "#009850", "#3B82F6", "#F59E0B", "#EF4444",
  "#9155A8", "#EC4899", "#00C8B4", "#F97316",
  "#6366F1", "#91D723",
];

const ESTADO_COLORS: Record<string, string> = {
  ABIERTO: "#EF4444",
  ASIGNADO: "#3B82F6",
  "DATA RECOPILADA": "#00C8B4",
  "EN EVALUACION": "#F59E0B",
  APROBADO: "#009850",
  ATENDIDO: "#91D723",
  "SEGUIMIENTO ABIERTO": "#F97316",
  CERRADO: "#6B7280",
  RECHAZADO: "#DC2626",
};

const GRAVEDAD_COLORS: Record<string, string> = {
  ALTA: "#EF4444",
  MEDIA: "#F59E0B",
  BAJA: "#009850",
  "Sin definir": "#6B7280",
};

// ─── Sub-components ───────────────────────────────────────────────────────────
function KPICard({
  icon, label, value, sub, color, pct,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  pct?: number;
}) {
  return (
    <div className="bg-white rounded-xl border border-[#DDDDDD] overflow-hidden">
      <div className="h-1" style={{ backgroundColor: color }} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-3xl font-bold text-gray-800 leading-none">{value}</div>
            <div className="text-xs font-semibold text-gray-600 mt-1.5 leading-tight">{label}</div>
            {sub && <div className="text-[11px] text-gray-400 mt-0.5">{sub}</div>}
          </div>
          <div
            className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${color}18` }}
          >
            {icon}
          </div>
        </div>
        {pct !== undefined && (
          <div className="mt-3">
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ChartCard({
  title, subtitle, children, className = "",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white rounded-xl border border-[#DDDDDD] p-5 ${className}`}>
      <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      {subtitle && <p className="text-[11px] text-gray-400 mt-0.5 mb-4">{subtitle}</p>}
      {!subtitle && <div className="mb-4" />}
      {children}
    </div>
  );
}

function CircularKPI({ pct, label, color }: { pct: number; label: string; color: string }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(pct, 100) / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={r} fill="none" stroke="#F1F5F9" strokeWidth="8" />
          <circle
            cx="50" cy="50" r={r}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-base font-bold" style={{ color }}>{pct}%</span>
        </div>
      </div>
      <div className="text-[11px] text-gray-500 text-center leading-tight max-w-22">{label}</div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white shadow-lg rounded-lg border border-[#DDDDDD] px-3 py-2 text-xs">
      {label && <div className="font-semibold text-gray-700 mb-1">{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="text-gray-600">{p.value} incidencias</span>
        </div>
      ))}
    </div>
  );
}

// ─── PDF Export helper ────────────────────────────────────────────────────────
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function ReportesModule({
  filtros, totales, porEstado, porTipo, porDia, topParroquias, porGravedad, dataExportacion,
}: Props) {
  const router = useRouter();
  const [desde, setDesde] = useState(filtros.desde);
  const [hasta, setHasta] = useState(filtros.hasta);

  const aplicarFiltros = () => router.push(`/reportes?desde=${desde}&hasta=${hasta}`);

  const exportarPDF = async () => {
    const { jsPDF: JsPDF } = await import("jspdf");
    const doc = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const margin = 14;
    let y = 0;

    const checkPage = (needed: number) => {
      if (y + needed > H - 18) { doc.addPage(); y = 20; }
    };

    // ── Page header ───────────────────────────────────────────────────────
    const drawPageHeader = () => {
      doc.setFillColor(0, 100, 52);
      doc.rect(0, 0, W, 38, "F");
      doc.setFillColor(0, 152, 80);
      doc.rect(0, 0, W, 28, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("REPORTE DE GESTIÓN DE RIESGOS", W / 2, 11, { align: "center" });
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("Cáritas Lima — Sistema GRD", W / 2, 18, { align: "center" });
      doc.text(`Período: ${filtros.desde}  →  ${filtros.hasta}`, W / 2, 24, { align: "center" });
      doc.setFontSize(7);
      doc.setTextColor(190, 240, 215);
      doc.text(
        `Exportado el ${new Date().toLocaleDateString("es-PE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`,
        W / 2, 32, { align: "center" }
      );
    };

    drawPageHeader();
    y = 46;

    // ── KPI cards ─────────────────────────────────────────────────────────
    doc.setTextColor(25, 35, 45);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("INDICADORES CLAVE DE DESEMPEÑO (KPIs)", margin, y);
    doc.setDrawColor(0, 152, 80);
    doc.setLineWidth(0.4);
    doc.line(margin, y + 2, W - margin, y + 2);
    y += 8;

    const kpis = [
      { label: "Incidencias\nRegistradas", value: String(totales.incidencias), color: [239, 68, 68] as [number, number, number] },
      { label: "Brigadistas\nCertificados", value: `${totales.pctBrigadistasCapacitados}%`, color: [59, 130, 246] as [number, number, number] },
      { label: "Parroquias\ncon Plan GRD", value: `${totales.pctParroquiasPlan}%`, color: [0, 152, 80] as [number, number, number] },
      { label: "Actividades\nEjecutadas", value: `${totales.pctActividadesEjecutadas}%`, color: [245, 158, 11] as [number, number, number] },
      { label: "Kits\nEntregados", value: String(totales.kitsEntregados), color: [145, 85, 168] as [number, number, number] },
    ];
    const cardW = (W - 2 * margin - 4 * 4) / 5;
    kpis.forEach((kpi, i) => {
      const x = margin + i * (cardW + 4);
      doc.setFillColor(232, 236, 242);
      doc.roundedRect(x + 0.5, y + 0.5, cardW, 26, 2, 2, "F");
      doc.setFillColor(250, 251, 253);
      doc.roundedRect(x, y, cardW, 26, 2, 2, "F");
      doc.setFillColor(...kpi.color);
      doc.roundedRect(x, y, cardW, 3, 1, 1, "F");
      doc.setTextColor(...kpi.color);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(kpi.value, x + cardW / 2, y + 14, { align: "center" });
      doc.setTextColor(100, 115, 128);
      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      kpi.label.split("\n").forEach((line, li) =>
        doc.text(line, x + cardW / 2, y + 20 + li * 3.5, { align: "center" })
      );
    });
    y += 36;

    // ── Operational KPIs progress bars ─────────────────────────────────
    checkPage(45);
    doc.setTextColor(25, 35, 45);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("INDICADORES OPERACIONALES", margin, y);
    doc.setDrawColor(0, 152, 80);
    doc.line(margin, y + 2, W - margin, y + 2);
    y += 9;

    const opKpis = [
      {
        label: "Brigadistas Certificados",
        pct: totales.pctBrigadistasCapacitados,
        detail: `${totales.totalBrigadistas} brigadistas en total`,
        color: "#3B82F6",
      },
      {
        label: "Parroquias con Plan GRD Aprobado",
        pct: totales.pctParroquiasPlan,
        detail: `${totales.totalParroquias} parroquias en total`,
        color: "#009850",
      },
      {
        label: "Actividades Preventivas Ejecutadas",
        pct: totales.pctActividadesEjecutadas,
        detail: `${totales.totalActividades} actividades programadas`,
        color: "#F59E0B",
      },
    ];
    opKpis.forEach((kpi) => {
      const [r, g, b] = hexToRgb(kpi.color);
      const barX = margin + 72;
      const barMaxW = W - margin - barX - 20;
      doc.setTextColor(50, 65, 80);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(kpi.label, margin + 2, y + 4.5);
      doc.setTextColor(130, 145, 160);
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "normal");
      doc.text(kpi.detail, margin + 2, y + 8.5);
      doc.setFillColor(228, 234, 242);
      doc.roundedRect(barX, y, barMaxW, 6, 1, 1, "F");
      const filled = (kpi.pct / 100) * barMaxW;
      if (filled > 0) {
        doc.setFillColor(r, g, b);
        doc.roundedRect(barX, y, filled, 6, 1, 1, "F");
      }
      doc.setTextColor(r, g, b);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(`${kpi.pct}%`, barX + barMaxW + 2, y + 4.5);
      y += 14;
    });
    y += 4;

    // ── Status distribution ────────────────────────────────────────────
    checkPage(50);
    doc.setTextColor(25, 35, 45);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("DISTRIBUCIÓN DE INCIDENCIAS POR ESTADO", margin, y);
    doc.setDrawColor(0, 152, 80);
    doc.line(margin, y + 2, W - margin, y + 2);
    y += 8;

    if (porEstado.length === 0) {
      doc.setTextColor(160, 170, 180);
      doc.setFontSize(8);
      doc.text("Sin datos para el período seleccionado.", margin, y + 5);
      y += 14;
    } else {
      const total = porEstado.reduce((s, e) => s + e.value, 0);
      const barX = margin + 58;
      const barMaxW = 72;

      porEstado.forEach((item, i) => {
        checkPage(10);
        if (i % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, y - 1, W - 2 * margin, 7, "F");
        }
        doc.setTextColor(50, 65, 80);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        doc.text(item.label, margin + 2, y + 4);
        doc.setFillColor(228, 234, 242);
        doc.roundedRect(barX, y, barMaxW, 5, 1, 1, "F");
        const stColor = ESTADO_COLORS[item.label];
        const [r, g, b] = stColor ? hexToRgb(stColor) : [0, 152, 80];
        doc.setFillColor(r, g, b);
        const bW = total > 0 ? (item.value / total) * barMaxW : 0;
        if (bW > 0) doc.roundedRect(barX, y, bW, 5, 1, 1, "F");
        doc.setTextColor(60, 75, 90);
        doc.setFontSize(7.5);
        doc.text(`${item.value}`, barX + barMaxW + 3, y + 4);
        doc.setTextColor(150, 160, 170);
        doc.setFontSize(7);
        doc.text(
          `${total > 0 ? ((item.value / total) * 100).toFixed(1) : 0}%`,
          barX + barMaxW + 14, y + 4
        );
        y += 7;
      });
      y += 6;
    }

    // ── Event types ────────────────────────────────────────────────────
    checkPage(50);
    doc.setTextColor(25, 35, 45);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("INCIDENCIAS POR TIPO DE EVENTO", margin, y);
    doc.setDrawColor(0, 152, 80);
    doc.line(margin, y + 2, W - margin, y + 2);
    y += 8;

    if (porTipo.length === 0) {
      doc.setTextColor(160, 170, 180);
      doc.setFontSize(8);
      doc.text("Sin datos para el período seleccionado.", margin, y + 5);
      y += 14;
    } else {
      const totalTipo = porTipo.reduce((s, e) => s + e.value, 0);
      const sortedTipo = [...porTipo].sort((a, b) => b.value - a.value);
      const maxTVal = sortedTipo[0]?.value || 1;
      const tBarX = margin + 55;
      const tBarMaxW = 72;

      sortedTipo.forEach((item, i) => {
        checkPage(10);
        if (i % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, y - 1, W - 2 * margin, 7, "F");
        }
        doc.setTextColor(50, 65, 80);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        doc.text(item.label, margin + 2, y + 4);
        doc.setFillColor(228, 234, 242);
        doc.roundedRect(tBarX, y, tBarMaxW, 5, 1, 1, "F");
        doc.setFillColor(0, 152, 80);
        const bW = (item.value / maxTVal) * tBarMaxW;
        if (bW > 0) doc.roundedRect(tBarX, y, bW, 5, 1, 1, "F");
        doc.setTextColor(60, 75, 90);
        doc.setFontSize(7.5);
        doc.text(`${item.value}`, tBarX + tBarMaxW + 3, y + 4);
        doc.setTextColor(150, 160, 170);
        doc.setFontSize(7);
        doc.text(
          `${((item.value / totalTipo) * 100).toFixed(1)}%`,
          tBarX + tBarMaxW + 14, y + 4
        );
        y += 7;
      });
      y += 6;
    }

    // ── Top parroquias ─────────────────────────────────────────────────
    checkPage(55);
    doc.setTextColor(25, 35, 45);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("TOP 5 PARROQUIAS CON MÁS INCIDENCIAS", margin, y);
    doc.setDrawColor(0, 152, 80);
    doc.line(margin, y + 2, W - margin, y + 2);
    y += 8;

    if (topParroquias.length === 0) {
      doc.setTextColor(160, 170, 180);
      doc.setFontSize(8);
      doc.text("Sin datos para el período seleccionado.", margin, y + 5);
      y += 14;
    } else {
      const maxPVal = topParroquias[0]?.value || 1;
      const pBarX = margin + 72;
      const pBarMaxW = 65;

      topParroquias.forEach((item, i) => {
        checkPage(11);
        if (i % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, y - 1, W - 2 * margin, 8, "F");
        }
        doc.setTextColor(50, 65, 80);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        doc.text(item.label.substring(0, 32), margin + 2, y + 5);
        doc.setFillColor(228, 234, 242);
        doc.roundedRect(pBarX, y + 0.5, pBarMaxW, 6, 1, 1, "F");
        doc.setFillColor(245, 158, 11);
        const bW = (item.value / maxPVal) * pBarMaxW;
        if (bW > 0) doc.roundedRect(pBarX, y + 0.5, bW, 6, 1, 1, "F");
        doc.setTextColor(60, 75, 90);
        doc.setFontSize(7.5);
        doc.text(`${item.value} casos`, pBarX + pBarMaxW + 3, y + 5);
        y += 9;
      });
      y += 5;
    }

    // ── Severity ───────────────────────────────────────────────────────
    if (porGravedad.length > 0) {
      checkPage(50);
      doc.setTextColor(25, 35, 45);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("DISTRIBUCIÓN POR GRAVEDAD", margin, y);
      doc.setDrawColor(0, 152, 80);
      doc.line(margin, y + 2, W - margin, y + 2);
      y += 8;

      const gTotal = porGravedad.reduce((s, e) => s + e.value, 0);
      const gMaxVal = porGravedad[0]?.value || 1;
      const gBarX = margin + 42;
      const gBarMaxW = 80;

      porGravedad.forEach((item, i) => {
        checkPage(9);
        if (i % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, y - 1, W - 2 * margin, 7, "F");
        }
        doc.setTextColor(50, 65, 80);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        doc.text(item.label, margin + 2, y + 4);
        doc.setFillColor(228, 234, 242);
        doc.roundedRect(gBarX, y, gBarMaxW, 5, 1, 1, "F");
        const gColor = GRAVEDAD_COLORS[item.label] || "#6B7280";
        const [r, g, b] = hexToRgb(gColor);
        doc.setFillColor(r, g, b);
        const bW = (item.value / gMaxVal) * gBarMaxW;
        if (bW > 0) doc.roundedRect(gBarX, y, bW, 5, 1, 1, "F");
        doc.setTextColor(60, 75, 90);
        doc.setFontSize(7.5);
        doc.text(`${item.value}`, gBarX + gBarMaxW + 3, y + 4);
        doc.setTextColor(150, 160, 170);
        doc.setFontSize(7);
        doc.text(
          `${gTotal > 0 ? ((item.value / gTotal) * 100).toFixed(1) : 0}%`,
          gBarX + gBarMaxW + 14, y + 4
        );
        y += 7;
      });
    }

    // ── Footer on all pages ────────────────────────────────────────────
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFillColor(0, 100, 52);
      doc.rect(0, H - 9, W, 9, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Cáritas Lima — Sistema GRD  |  Generado el ${new Date().toLocaleDateString("es-PE")}`,
        margin, H - 3.5
      );
      doc.text(`Página ${i} de ${totalPages}`, W - margin, H - 3.5, { align: "right" });
    }

    doc.save(`Reporte_GRD_Caritas_${filtros.desde}_al_${filtros.hasta}.pdf`);
  };

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 space-y-5">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: "#009850" }}
          >
            <BarChart2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-gray-900">Reportes y Estadísticas</h1>
            <p className="text-sm text-gray-500 mt-0.5">Panel de indicadores — Cáritas Lima GRD</p>
          </div>
        </div>
        <button
          onClick={exportarPDF}
          className="flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-all"
          style={{ background: "#009850" }}
        >
          <FileDown className="w-4 h-4" /> Exportar PDF
        </button>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-[#DDDDDD] px-4 py-3 flex flex-wrap items-end gap-4">
        <div className="flex items-center gap-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wide self-center">
          <Calendar className="w-3.5 h-3.5" /> Período
        </div>
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Desde</label>
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="px-3 py-1.5 text-sm bg-[#F5F5F5] border border-[#DDDDDD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009850]/20 focus:border-[#009850] transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Hasta</label>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="px-3 py-1.5 text-sm bg-[#F5F5F5] border border-[#DDDDDD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009850]/20 focus:border-[#009850] transition-colors"
            />
          </div>
          <button
            onClick={aplicarFiltros}
            className="px-4 py-1.5 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-all"
            style={{ background: "#009850" }}
          >
            Aplicar
          </button>
        </div>
        <div className="text-[11px] text-gray-400 ml-auto hidden md:block">
          Mostrando: <strong className="text-gray-600">{filtros.desde}</strong> → <strong className="text-gray-600">{filtros.hasta}</strong>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KPICard
          icon={<AlertTriangle className="w-4.5 h-4.5" style={{ color: "#EF4444" }} />}
          label="Incidencias"
          value={totales.incidencias}
          sub="en el período"
          color="#EF4444"
        />
        <KPICard
          icon={<Users className="w-4.5 h-4.5" style={{ color: "#3B82F6" }} />}
          label="Brigadistas Cert."
          value={`${totales.pctBrigadistasCapacitados}%`}
          sub={`${totales.totalBrigadistas} brigadistas total`}
          color="#3B82F6"
          pct={totales.pctBrigadistasCapacitados}
        />
        <KPICard
          icon={<Shield className="w-4.5 h-4.5" style={{ color: "#009850" }} />}
          label="Planes GRD"
          value={`${totales.pctParroquiasPlan}%`}
          sub={`${totales.totalParroquias} parroquias`}
          color="#009850"
          pct={totales.pctParroquiasPlan}
        />
        <KPICard
          icon={<Target className="w-4.5 h-4.5" style={{ color: "#F59E0B" }} />}
          label="Actividades Ejec."
          value={`${totales.pctActividadesEjecutadas}%`}
          sub={`${totales.totalActividades} programadas`}
          color="#F59E0B"
          pct={totales.pctActividadesEjecutadas}
        />
        <KPICard
          icon={<Package className="w-4.5 h-4.5" style={{ color: "#9155A8" }} />}
          label="Kits Entregados"
          value={totales.kitsEntregados}
          sub="unidades distribuidas"
          color="#9155A8"
        />
      </div>

      {/* Trend area chart — full width */}
      <ChartCard
        title="Tendencia Diaria de Incidencias"
        subtitle="Número de casos registrados por día en el período seleccionado"
      >
        {porDia.length === 0 ? (
          <div className="flex h-44 items-center justify-center text-sm text-gray-400">
            Sin datos para el período.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={porDia} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="areaGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#009850" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#009850" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#9CA3AF" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 10, fill: "#9CA3AF" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#009850"
                strokeWidth={2}
                fill="url(#areaGreen)"
                dot={{ r: 3, fill: "#009850", strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "#009850" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Row: Status donut + Top parroquias */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <ChartCard
          title="Incidencias por Estado"
          subtitle="Ciclo de vida de los casos reportados"
        >
          {porEstado.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-gray-400">Sin datos.</div>
          ) : (
            <ResponsiveContainer width="100%" height={264}>
              <PieChart>
                <Pie
                  data={porEstado}
                  dataKey="value"
                  nameKey="label"
                  cx="40%"
                  cy="50%"
                  outerRadius={95}
                  innerRadius={52}
                  strokeWidth={0}
                >
                  {porEstado.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={ESTADO_COLORS[entry.label] || PALETTE[i % PALETTE.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [`${v} casos`, ""]} />
                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  formatter={(v) => (
                    <span style={{ fontSize: 11, color: "#4B5563" }}>{v}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Top 5 Parroquias"
          subtitle="Zonas con mayor concentración de incidencias"
        >
          {topParroquias.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-gray-400">Sin datos.</div>
          ) : (
            <ResponsiveContainer width="100%" height={264}>
              <BarChart
                data={topParroquias}
                layout="vertical"
                margin={{ top: 4, right: 50, left: 4, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: "#9CA3AF" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "#6B7280" }}
                  axisLine={false}
                  tickLine={false}
                  width={95}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F8FAFC" }} />
                <Bar dataKey="value" fill="#F59E0B" radius={[0, 4, 4, 0]} maxBarSize={22}>
                  <LabelList
                    dataKey="value"
                    position="right"
                    style={{ fontSize: 10, fill: "#6B7280" }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

      </div>

      {/* Row: Tipo evento + Gravedad + Circular KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

        <ChartCard
          title="Por Tipo de Evento"
          subtitle="Naturaleza de las emergencias reportadas"
        >
          {porTipo.length === 0 ? (
            <div className="flex h-56 items-center justify-center text-sm text-gray-400">Sin datos.</div>
          ) : (
            <ResponsiveContainer width="100%" height={224}>
              <BarChart
                data={[...porTipo].sort((a, b) => b.value - a.value)}
                margin={{ top: 4, right: 8, left: -20, bottom: 24 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 9, fill: "#9CA3AF" }}
                  axisLine={false}
                  tickLine={false}
                  angle={-30}
                  textAnchor="end"
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 9, fill: "#9CA3AF" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F8FAFC" }} />
                <Bar
                  dataKey="value"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={44}
                >
                  {[...porTipo]
                    .sort((a, b) => b.value - a.value)
                    .map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Por Gravedad"
          subtitle="Nivel de severidad de los casos"
        >
          {porGravedad.length === 0 ? (
            <div className="flex h-56 items-center justify-center text-sm text-gray-400">Sin datos.</div>
          ) : (
            <ResponsiveContainer width="100%" height={224}>
              <BarChart
                data={porGravedad}
                layout="vertical"
                margin={{ top: 4, right: 46, left: 4, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: "#9CA3AF" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "#6B7280" }}
                  axisLine={false}
                  tickLine={false}
                  width={68}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F8FAFC" }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={26}>
                  {porGravedad.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={GRAVEDAD_COLORS[entry.label] || PALETTE[i % PALETTE.length]}
                    />
                  ))}
                  <LabelList
                    dataKey="value"
                    position="right"
                    style={{ fontSize: 10, fill: "#6B7280" }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Indicadores Operacionales"
          subtitle="Nivel de cumplimiento de metas institucionales"
        >
          <div className="flex items-center justify-around h-50">
            <CircularKPI
              pct={totales.pctBrigadistasCapacitados}
              label="Brigadistas Certificados"
              color="#3B82F6"
            />
            <CircularKPI
              pct={totales.pctParroquiasPlan}
              label="Parroquias con Plan GRD"
              color="#009850"
            />
            <CircularKPI
              pct={totales.pctActividadesEjecutadas}
              label="Actividades Preventivas"
              color="#F59E0B"
            />
          </div>
        </ChartCard>

      </div>
    </div>
  );
}
