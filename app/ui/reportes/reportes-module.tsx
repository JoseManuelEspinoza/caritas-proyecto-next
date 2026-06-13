"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle, Users, Package,
  Calendar, FileDown,
  Shield, Target, BarChart2,
  GraduationCap, Activity, CheckCircle, UserCheck,
} from "lucide-react";
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
  AreaChart, Area, LabelList,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────
type Conteo = { label: string; value: number };
type TabId = "general" | "incidencias" | "brigadistas" | "actividades" | "kits";

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
  brigadistasData: {
    total: number;
    certificados: number;
    sinCertificar: number;
    porDisponibilidad: Conteo[];
    porParroquia: Conteo[];
  };
  actividadesData: {
    total: number;
    ejecutadas: number;
    porEstado: Conteo[];
    porTipo: Conteo[];
    porParroquia: Conteo[];
    totalParticipantes: number;
  };
  incidenciasData: {
    cerradas: number;
    enSeguimiento: number;
    activas: number;
  };
  kitsData: {
    totalSalidas: number;
    totalEntradas: number;
    parroquiasBeneficiadas: number;
    porTipoKit: Conteo[];
    porParroquia: Conteo[];
    porFecha: Conteo[];
  };
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

const DISP_COLORS: Record<string, string> = {
  DISPONIBLE: "#009850",
  "EN CAMPO": "#3B82F6",
  "NO DISPONIBLE": "#6B7280",
};

const DISP_LABELS: Record<string, string> = {
  DISPONIBLE: "Disponible",
  "EN CAMPO": "En campo",
  "NO DISPONIBLE": "No disponible",
};

const ESTADO_ACT_COLORS: Record<string, string> = {
  PROGRAMADA: "#3B82F6",
  EJECUTADA: "#009850",
  OBSERVADA: "#F97316",
  VALIDADA: "#9155A8",
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
          <span className="text-gray-600">{p.value}</span>
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
  brigadistasData, actividadesData, incidenciasData, kitsData,
}: Props) {
  const router = useRouter();
  const [desde, setDesde] = useState(filtros.desde);
  const [hasta, setHasta] = useState(filtros.hasta);
  const [tab, setTab] = useState<TabId>("general");
  const today = new Date().toISOString().split("T")[0];

  const aplicarFiltros = () => router.push(`/reportes?desde=${desde}&hasta=${hasta}`);

  // ─── PDF: General ─────────────────────────────────────────────────────────
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
      doc.text(`Período: ${filtros.desde} a ${filtros.hasta}`, W / 2, 24, { align: "center" });
      doc.setFontSize(7);
      doc.setTextColor(190, 240, 215);
      doc.text(
        `Exportado el ${new Date().toLocaleDateString("es-PE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`,
        W / 2, 32, { align: "center" }
      );
    };

    drawPageHeader();
    y = 46;

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

    checkPage(45);
    doc.setTextColor(25, 35, 45);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("INDICADORES OPERACIONALES", margin, y);
    doc.setDrawColor(0, 152, 80);
    doc.line(margin, y + 2, W - margin, y + 2);
    y += 9;

    const opKpis = [
      { label: "Brigadistas Certificados", pct: totales.pctBrigadistasCapacitados, detail: `${totales.totalBrigadistas} brigadistas en total`, color: "#3B82F6" },
      { label: "Parroquias con Plan GRD Aprobado", pct: totales.pctParroquiasPlan, detail: `${totales.totalParroquias} parroquias en total`, color: "#009850" },
      { label: "Actividades Preventivas Ejecutadas", pct: totales.pctActividadesEjecutadas, detail: `${totales.totalActividades} actividades programadas`, color: "#F59E0B" },
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
        if (i % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(margin, y - 1, W - 2 * margin, 7, "F"); }
        doc.setTextColor(50, 65, 80); doc.setFontSize(7.5); doc.setFont("helvetica", "normal");
        doc.text(item.label, margin + 2, y + 4);
        doc.setFillColor(228, 234, 242); doc.roundedRect(barX, y, barMaxW, 5, 1, 1, "F");
        const stColor = ESTADO_COLORS[item.label];
        const [r, g, b] = stColor ? hexToRgb(stColor) : [0, 152, 80];
        doc.setFillColor(r, g, b);
        const bW = total > 0 ? (item.value / total) * barMaxW : 0;
        if (bW > 0) doc.roundedRect(barX, y, bW, 5, 1, 1, "F");
        doc.setTextColor(60, 75, 90); doc.setFontSize(7.5);
        doc.text(`${item.value}`, barX + barMaxW + 3, y + 4);
        doc.setTextColor(150, 160, 170); doc.setFontSize(7);
        doc.text(`${total > 0 ? ((item.value / total) * 100).toFixed(1) : 0}%`, barX + barMaxW + 14, y + 4);
        y += 7;
      });
      y += 6;
    }

    checkPage(50);
    doc.setTextColor(25, 35, 45); doc.setFontSize(10); doc.setFont("helvetica", "bold");
    doc.text("INCIDENCIAS POR TIPO DE EVENTO", margin, y);
    doc.setDrawColor(0, 152, 80); doc.line(margin, y + 2, W - margin, y + 2);
    y += 8;

    if (porTipo.length === 0) {
      doc.setTextColor(160, 170, 180); doc.setFontSize(8);
      doc.text("Sin datos para el período seleccionado.", margin, y + 5);
      y += 14;
    } else {
      const totalTipo = porTipo.reduce((s, e) => s + e.value, 0);
      const sortedTipo = [...porTipo].sort((a, b) => b.value - a.value);
      const maxTVal = sortedTipo[0]?.value || 1;
      const tBarX = margin + 55; const tBarMaxW = 72;
      sortedTipo.forEach((item, i) => {
        checkPage(10);
        if (i % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(margin, y - 1, W - 2 * margin, 7, "F"); }
        doc.setTextColor(50, 65, 80); doc.setFontSize(7.5); doc.setFont("helvetica", "normal");
        doc.text(item.label, margin + 2, y + 4);
        doc.setFillColor(228, 234, 242); doc.roundedRect(tBarX, y, tBarMaxW, 5, 1, 1, "F");
        doc.setFillColor(0, 152, 80);
        const bW = (item.value / maxTVal) * tBarMaxW;
        if (bW > 0) doc.roundedRect(tBarX, y, bW, 5, 1, 1, "F");
        doc.setTextColor(60, 75, 90); doc.setFontSize(7.5);
        doc.text(`${item.value}`, tBarX + tBarMaxW + 3, y + 4);
        doc.setTextColor(150, 160, 170); doc.setFontSize(7);
        doc.text(`${((item.value / totalTipo) * 100).toFixed(1)}%`, tBarX + tBarMaxW + 14, y + 4);
        y += 7;
      });
      y += 6;
    }

    checkPage(55);
    doc.setTextColor(25, 35, 45); doc.setFontSize(10); doc.setFont("helvetica", "bold");
    doc.text("TOP 5 PARROQUIAS CON MÁS INCIDENCIAS", margin, y);
    doc.setDrawColor(0, 152, 80); doc.line(margin, y + 2, W - margin, y + 2);
    y += 8;

    if (topParroquias.length === 0) {
      doc.setTextColor(160, 170, 180); doc.setFontSize(8);
      doc.text("Sin datos para el período seleccionado.", margin, y + 5);
      y += 14;
    } else {
      const maxPVal = topParroquias[0]?.value || 1;
      const pBarX = margin + 72; const pBarMaxW = 65;
      topParroquias.forEach((item, i) => {
        checkPage(11);
        if (i % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(margin, y - 1, W - 2 * margin, 8, "F"); }
        doc.setTextColor(50, 65, 80); doc.setFontSize(7.5); doc.setFont("helvetica", "normal");
        doc.text(item.label.substring(0, 32), margin + 2, y + 5);
        doc.setFillColor(228, 234, 242); doc.roundedRect(pBarX, y + 0.5, pBarMaxW, 6, 1, 1, "F");
        doc.setFillColor(245, 158, 11);
        const bW = (item.value / maxPVal) * pBarMaxW;
        if (bW > 0) doc.roundedRect(pBarX, y + 0.5, bW, 6, 1, 1, "F");
        doc.setTextColor(60, 75, 90); doc.setFontSize(7.5);
        doc.text(`${item.value} casos`, pBarX + pBarMaxW + 3, y + 5);
        y += 9;
      });
      y += 5;
    }

    if (porGravedad.length > 0) {
      checkPage(50);
      doc.setTextColor(25, 35, 45); doc.setFontSize(10); doc.setFont("helvetica", "bold");
      doc.text("DISTRIBUCIÓN POR GRAVEDAD", margin, y);
      doc.setDrawColor(0, 152, 80); doc.line(margin, y + 2, W - margin, y + 2);
      y += 8;
      const gTotal = porGravedad.reduce((s, e) => s + e.value, 0);
      const gMaxVal = porGravedad[0]?.value || 1;
      const gBarX = margin + 42; const gBarMaxW = 80;
      porGravedad.forEach((item, i) => {
        checkPage(9);
        if (i % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(margin, y - 1, W - 2 * margin, 7, "F"); }
        doc.setTextColor(50, 65, 80); doc.setFontSize(7.5); doc.setFont("helvetica", "normal");
        doc.text(item.label, margin + 2, y + 4);
        doc.setFillColor(228, 234, 242); doc.roundedRect(gBarX, y, gBarMaxW, 5, 1, 1, "F");
        const gColor = GRAVEDAD_COLORS[item.label] || "#6B7280";
        const [r, g, b] = hexToRgb(gColor);
        doc.setFillColor(r, g, b);
        const bW = (item.value / gMaxVal) * gBarMaxW;
        if (bW > 0) doc.roundedRect(gBarX, y, bW, 5, 1, 1, "F");
        doc.setTextColor(60, 75, 90); doc.setFontSize(7.5);
        doc.text(`${item.value}`, gBarX + gBarMaxW + 3, y + 4);
        doc.setTextColor(150, 160, 170); doc.setFontSize(7);
        doc.text(`${gTotal > 0 ? ((item.value / gTotal) * 100).toFixed(1) : 0}%`, gBarX + gBarMaxW + 14, y + 4);
        y += 7;
      });
    }

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFillColor(0, 100, 52); doc.rect(0, H - 9, W, 9, "F");
      doc.setTextColor(255, 255, 255); doc.setFontSize(6.5); doc.setFont("helvetica", "normal");
      doc.text(`Cáritas Lima — Sistema GRD  |  Generado el ${new Date().toLocaleDateString("es-PE")}`, margin, H - 3.5);
      doc.text(`Página ${i} de ${totalPages}`, W - margin, H - 3.5, { align: "right" });
    }
    doc.save(`Reporte_GRD_Caritas_${filtros.desde}_al_${filtros.hasta}.pdf`);
  };

  // ─── PDF: Brigadistas ─────────────────────────────────────────────────────
  const exportarPDFBrigadistas = async () => {
    const { jsPDF: JsPDF } = await import("jspdf");
    const doc = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const margin = 14;
    let y = 0;

    const checkPage = (needed: number) => {
      if (y + needed > H - 18) { doc.addPage(); y = 20; }
    };

    const drawSection = (titulo: string) => {
      checkPage(18);
      doc.setTextColor(25, 35, 45); doc.setFontSize(10); doc.setFont("helvetica", "bold");
      doc.text(titulo, margin, y);
      doc.setDrawColor(0, 152, 80); doc.setLineWidth(0.4);
      doc.line(margin, y + 2, W - margin, y + 2);
      y += 8;
    };

    const drawBarRow = (label: string, value: number, total: number, maxVal: number, color: string, i: number, barX: number, barMaxW: number) => {
      checkPage(10);
      if (i % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(margin, y - 1, W - 2 * margin, 7, "F"); }
      doc.setTextColor(50, 65, 80); doc.setFontSize(7.5); doc.setFont("helvetica", "normal");
      doc.text(label.substring(0, 30), margin + 2, y + 4);
      doc.setFillColor(228, 234, 242); doc.roundedRect(barX, y, barMaxW, 5, 1, 1, "F");
      const [r, g, b] = hexToRgb(color);
      doc.setFillColor(r, g, b);
      const bW = maxVal > 0 ? (value / maxVal) * barMaxW : 0;
      if (bW > 0) doc.roundedRect(barX, y, bW, 5, 1, 1, "F");
      doc.setTextColor(60, 75, 90); doc.setFontSize(7.5);
      doc.text(`${value}`, barX + barMaxW + 3, y + 4);
      doc.setTextColor(150, 160, 170); doc.setFontSize(7);
      doc.text(`${total > 0 ? ((value / total) * 100).toFixed(1) : 0}%`, barX + barMaxW + 14, y + 4);
      y += 7;
    };

    // Header
    doc.setFillColor(0, 100, 52); doc.rect(0, 0, W, 38, "F");
    doc.setFillColor(0, 152, 80); doc.rect(0, 0, W, 28, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(16); doc.setFont("helvetica", "bold");
    doc.text("REPORTE DE BRIGADISTAS Y CAPACITACIÓN", W / 2, 11, { align: "center" });
    doc.setFontSize(8); doc.setFont("helvetica", "normal");
    doc.text("Cáritas Lima — Sistema GRD", W / 2, 18, { align: "center" });
    doc.text(`Generado el ${new Date().toLocaleDateString("es-PE", { year: "numeric", month: "long", day: "numeric" })}`, W / 2, 24, { align: "center" });
    y = 46;

    // KPI cards
    drawSection("RESUMEN DE BRIGADISTAS");
    const kpisBrig = [
      { label: "Total\nBrigadistas", value: String(brigadistasData.total), color: [59, 130, 246] as [number, number, number] },
      { label: "Certificados", value: String(brigadistasData.certificados), color: [0, 152, 80] as [number, number, number] },
      { label: "Sin Certificar", value: String(brigadistasData.sinCertificar), color: [239, 68, 68] as [number, number, number] },
      { label: "Disponibles", value: String(brigadistasData.porDisponibilidad.find(d => d.label === "DISPONIBLE")?.value ?? 0), color: [245, 158, 11] as [number, number, number] },
    ];
    const cW = (W - 2 * margin - 3 * 4) / 4;
    kpisBrig.forEach((kpi, i) => {
      const x = margin + i * (cW + 4);
      doc.setFillColor(232, 236, 242); doc.roundedRect(x + 0.5, y + 0.5, cW, 26, 2, 2, "F");
      doc.setFillColor(250, 251, 253); doc.roundedRect(x, y, cW, 26, 2, 2, "F");
      doc.setFillColor(...kpi.color); doc.roundedRect(x, y, cW, 3, 1, 1, "F");
      doc.setTextColor(...kpi.color); doc.setFontSize(16); doc.setFont("helvetica", "bold");
      doc.text(kpi.value, x + cW / 2, y + 14, { align: "center" });
      doc.setTextColor(100, 115, 128); doc.setFontSize(6); doc.setFont("helvetica", "normal");
      kpi.label.split("\n").forEach((line, li) => doc.text(line, x + cW / 2, y + 20 + li * 3.5, { align: "center" }));
    });
    y += 36;

    // Certificación
    drawSection("ESTADO DE CERTIFICACIÓN");
    const certItems = [
      { label: "Certificados", value: brigadistasData.certificados, color: "#009850" },
      { label: "Sin certificar", value: brigadistasData.sinCertificar, color: "#EF4444" },
    ];
    certItems.forEach((item, i) => drawBarRow(item.label, item.value, brigadistasData.total, brigadistasData.total, item.color, i, margin + 55, 80));
    y += 6;

    // Disponibilidad
    drawSection("DISPONIBILIDAD DE BRIGADISTAS");
    const dispTotal = brigadistasData.porDisponibilidad.reduce((s, e) => s + e.value, 0);
    const dispMax = Math.max(...brigadistasData.porDisponibilidad.map(d => d.value), 1);
    brigadistasData.porDisponibilidad.forEach((item, i) =>
      drawBarRow(DISP_LABELS[item.label] ?? item.label, item.value, dispTotal, dispMax, DISP_COLORS[item.label] ?? "#6B7280", i, margin + 55, 80)
    );
    y += 6;

    // Top parroquias
    drawSection("TOP 5 PARROQUIAS POR BRIGADISTAS REGISTRADOS");
    if (brigadistasData.porParroquia.length === 0) {
      doc.setTextColor(160, 170, 180); doc.setFontSize(8);
      doc.text("Sin datos disponibles.", margin, y + 5); y += 14;
    } else {
      const maxP = brigadistasData.porParroquia[0]?.value || 1;
      const totP = brigadistasData.porParroquia.reduce((s, e) => s + e.value, 0);
      brigadistasData.porParroquia.forEach((item, i) =>
        drawBarRow(item.label, item.value, totP, maxP, "#3B82F6", i, margin + 72, 65)
      );
    }

    // Footer
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFillColor(0, 100, 52); doc.rect(0, H - 9, W, 9, "F");
      doc.setTextColor(255, 255, 255); doc.setFontSize(6.5); doc.setFont("helvetica", "normal");
      doc.text(`Cáritas Lima — Sistema GRD  |  Generado el ${new Date().toLocaleDateString("es-PE")}`, margin, H - 3.5);
      doc.text(`Página ${i} de ${totalPages}`, W - margin, H - 3.5, { align: "right" });
    }
    doc.save(`Reporte_Brigadistas_Caritas_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  // ─── PDF: Actividades Preventivas ─────────────────────────────────────────
  const exportarPDFActividades = async () => {
    const { jsPDF: JsPDF } = await import("jspdf");
    const doc = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const margin = 14;
    let y = 0;

    const checkPage = (needed: number) => {
      if (y + needed > H - 18) { doc.addPage(); y = 20; }
    };

    const drawSection = (titulo: string) => {
      checkPage(18);
      doc.setTextColor(25, 35, 45); doc.setFontSize(10); doc.setFont("helvetica", "bold");
      doc.text(titulo, margin, y);
      doc.setDrawColor(0, 152, 80); doc.setLineWidth(0.4);
      doc.line(margin, y + 2, W - margin, y + 2);
      y += 8;
    };

    const drawBarRow = (label: string, value: number, total: number, maxVal: number, color: string, i: number, barX: number, barMaxW: number) => {
      checkPage(10);
      if (i % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(margin, y - 1, W - 2 * margin, 7, "F"); }
      doc.setTextColor(50, 65, 80); doc.setFontSize(7.5); doc.setFont("helvetica", "normal");
      doc.text(label.substring(0, 34), margin + 2, y + 4);
      doc.setFillColor(228, 234, 242); doc.roundedRect(barX, y, barMaxW, 5, 1, 1, "F");
      const [r, g, b] = hexToRgb(color);
      doc.setFillColor(r, g, b);
      const bW = maxVal > 0 ? (value / maxVal) * barMaxW : 0;
      if (bW > 0) doc.roundedRect(barX, y, bW, 5, 1, 1, "F");
      doc.setTextColor(60, 75, 90); doc.setFontSize(7.5);
      doc.text(`${value}`, barX + barMaxW + 3, y + 4);
      doc.setTextColor(150, 160, 170); doc.setFontSize(7);
      doc.text(`${total > 0 ? ((value / total) * 100).toFixed(1) : 0}%`, barX + barMaxW + 14, y + 4);
      y += 7;
    };

    // Header
    doc.setFillColor(0, 100, 52); doc.rect(0, 0, W, 38, "F");
    doc.setFillColor(245, 158, 11); doc.rect(0, 0, W, 28, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(15); doc.setFont("helvetica", "bold");
    doc.text("REPORTE DE ACTIVIDADES PREVENTIVAS", W / 2, 11, { align: "center" });
    doc.setFontSize(8); doc.setFont("helvetica", "normal");
    doc.text("Cáritas Lima — Sistema GRD", W / 2, 18, { align: "center" });
    doc.text(`Generado el ${new Date().toLocaleDateString("es-PE", { year: "numeric", month: "long", day: "numeric" })}`, W / 2, 24, { align: "center" });
    y = 46;

    // KPI cards
    drawSection("RESUMEN DE ACTIVIDADES PREVENTIVAS");
    const pctEjec = actividadesData.total > 0 ? Math.round((actividadesData.ejecutadas / actividadesData.total) * 100) : 0;
    const kpisAct = [
      { label: "Total\nActividades", value: String(actividadesData.total), color: [59, 130, 246] as [number, number, number] },
      { label: "Ejecutadas", value: String(actividadesData.ejecutadas), color: [0, 152, 80] as [number, number, number] },
      { label: "% Ejecución", value: `${pctEjec}%`, color: [245, 158, 11] as [number, number, number] },
      { label: "Participantes\nTotal", value: String(actividadesData.totalParticipantes), color: [145, 85, 168] as [number, number, number] },
    ];
    const cW = (W - 2 * margin - 3 * 4) / 4;
    kpisAct.forEach((kpi, i) => {
      const x = margin + i * (cW + 4);
      doc.setFillColor(232, 236, 242); doc.roundedRect(x + 0.5, y + 0.5, cW, 26, 2, 2, "F");
      doc.setFillColor(250, 251, 253); doc.roundedRect(x, y, cW, 26, 2, 2, "F");
      doc.setFillColor(...kpi.color); doc.roundedRect(x, y, cW, 3, 1, 1, "F");
      doc.setTextColor(...kpi.color); doc.setFontSize(16); doc.setFont("helvetica", "bold");
      doc.text(kpi.value, x + cW / 2, y + 14, { align: "center" });
      doc.setTextColor(100, 115, 128); doc.setFontSize(6); doc.setFont("helvetica", "normal");
      kpi.label.split("\n").forEach((line, li) => doc.text(line, x + cW / 2, y + 20 + li * 3.5, { align: "center" }));
    });
    y += 36;

    // Por estado
    drawSection("ACTIVIDADES POR ESTADO");
    if (actividadesData.porEstado.length === 0) {
      doc.setTextColor(160, 170, 180); doc.setFontSize(8); doc.text("Sin datos.", margin, y + 5); y += 14;
    } else {
      const totalEst = actividadesData.porEstado.reduce((s, e) => s + e.value, 0);
      const maxEst = Math.max(...actividadesData.porEstado.map(e => e.value), 1);
      actividadesData.porEstado.forEach((item, i) =>
        drawBarRow(item.label, item.value, totalEst, maxEst, ESTADO_ACT_COLORS[item.label] ?? "#6B7280", i, margin + 48, 85)
      );
      y += 6;
    }

    // Por tipo
    drawSection("ACTIVIDADES POR TIPO");
    if (actividadesData.porTipo.length === 0) {
      doc.setTextColor(160, 170, 180); doc.setFontSize(8); doc.text("Sin datos.", margin, y + 5); y += 14;
    } else {
      const totalTipo = actividadesData.porTipo.reduce((s, e) => s + e.value, 0);
      const maxTipo = actividadesData.porTipo[0]?.value || 1;
      actividadesData.porTipo.forEach((item, i) =>
        drawBarRow(item.label, item.value, totalTipo, maxTipo, PALETTE[i % PALETTE.length], i, margin + 58, 75)
      );
      y += 6;
    }

    // Top parroquias
    drawSection("TOP 5 PARROQUIAS POR ACTIVIDADES");
    if (actividadesData.porParroquia.length === 0) {
      doc.setTextColor(160, 170, 180); doc.setFontSize(8); doc.text("Sin datos.", margin, y + 5); y += 14;
    } else {
      const totP = actividadesData.porParroquia.reduce((s, e) => s + e.value, 0);
      const maxP = actividadesData.porParroquia[0]?.value || 1;
      actividadesData.porParroquia.forEach((item, i) =>
        drawBarRow(item.label, item.value, totP, maxP, "#F59E0B", i, margin + 72, 65)
      );
    }

    // Footer
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFillColor(0, 100, 52); doc.rect(0, H - 9, W, 9, "F");
      doc.setTextColor(255, 255, 255); doc.setFontSize(6.5); doc.setFont("helvetica", "normal");
      doc.text(`Cáritas Lima — Sistema GRD  |  Generado el ${new Date().toLocaleDateString("es-PE")}`, margin, H - 3.5);
      doc.text(`Página ${i} de ${totalPages}`, W - margin, H - 3.5, { align: "right" });
    }
    doc.save(`Reporte_Actividades_Caritas_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  // ─── PDF: Incidencias ────────────────────────────────────────────────────
  const exportarPDFIncidencias = async () => {
    const { jsPDF: JsPDF } = await import("jspdf");
    const doc = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const margin = 14;
    let y = 0;

    const checkPage = (needed: number) => {
      if (y + needed > H - 18) { doc.addPage(); y = 20; }
    };
    const drawSection = (titulo: string) => {
      checkPage(18);
      doc.setTextColor(25, 35, 45); doc.setFontSize(10); doc.setFont("helvetica", "bold");
      doc.text(titulo, margin, y);
      doc.setDrawColor(239, 68, 68); doc.setLineWidth(0.4);
      doc.line(margin, y + 2, W - margin, y + 2);
      y += 8;
    };
    const drawBarRow = (label: string, value: number, total: number, maxVal: number, color: string, i: number, barX: number, barMaxW: number) => {
      checkPage(10);
      if (i % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(margin, y - 1, W - 2 * margin, 7, "F"); }
      doc.setTextColor(50, 65, 80); doc.setFontSize(7.5); doc.setFont("helvetica", "normal");
      doc.text(label.substring(0, 32), margin + 2, y + 4);
      doc.setFillColor(228, 234, 242); doc.roundedRect(barX, y, barMaxW, 5, 1, 1, "F");
      const [r, g, b] = hexToRgb(color);
      doc.setFillColor(r, g, b);
      const bW = maxVal > 0 ? (value / maxVal) * barMaxW : 0;
      if (bW > 0) doc.roundedRect(barX, y, bW, 5, 1, 1, "F");
      doc.setTextColor(60, 75, 90); doc.setFontSize(7.5);
      doc.text(`${value}`, barX + barMaxW + 3, y + 4);
      doc.setTextColor(150, 160, 170); doc.setFontSize(7);
      doc.text(`${total > 0 ? ((value / total) * 100).toFixed(1) : 0}%`, barX + barMaxW + 14, y + 4);
      y += 7;
    };

    doc.setFillColor(120, 20, 20); doc.rect(0, 0, W, 38, "F");
    doc.setFillColor(239, 68, 68); doc.rect(0, 0, W, 28, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(16); doc.setFont("helvetica", "bold");
    doc.text("REPORTE DE CASOS E INCIDENCIAS", W / 2, 11, { align: "center" });
    doc.setFontSize(8); doc.setFont("helvetica", "normal");
    doc.text("Cáritas Lima — Sistema GRD", W / 2, 18, { align: "center" });
    doc.text(`Período: ${filtros.desde} a ${filtros.hasta}`, W / 2, 24, { align: "center" });
    y = 46;

    drawSection("RESUMEN DE CASOS");
    const kpisInc = [
      { label: "Total\nCasos", value: String(totales.incidencias), color: [239, 68, 68] as [number, number, number] },
      { label: "Resueltos\n(Cerr./Atend.)", value: String(incidenciasData.cerradas), color: [0, 152, 80] as [number, number, number] },
      { label: "En\nSeguimiento", value: String(incidenciasData.enSeguimiento), color: [249, 115, 22] as [number, number, number] },
      { label: "En\nProceso", value: String(incidenciasData.activas), color: [59, 130, 246] as [number, number, number] },
    ];
    const cW = (W - 2 * margin - 3 * 4) / 4;
    kpisInc.forEach((kpi, i) => {
      const x = margin + i * (cW + 4);
      doc.setFillColor(232, 236, 242); doc.roundedRect(x + 0.5, y + 0.5, cW, 26, 2, 2, "F");
      doc.setFillColor(250, 251, 253); doc.roundedRect(x, y, cW, 26, 2, 2, "F");
      doc.setFillColor(...kpi.color); doc.roundedRect(x, y, cW, 3, 1, 1, "F");
      doc.setTextColor(...kpi.color); doc.setFontSize(16); doc.setFont("helvetica", "bold");
      doc.text(kpi.value, x + cW / 2, y + 14, { align: "center" });
      doc.setTextColor(100, 115, 128); doc.setFontSize(6); doc.setFont("helvetica", "normal");
      kpi.label.split("\n").forEach((line, li) => doc.text(line, x + cW / 2, y + 20 + li * 3.5, { align: "center" }));
    });
    y += 36;

    if (porEstado.length > 0) {
      drawSection("DISTRIBUCIÓN POR ESTADO");
      const tot = porEstado.reduce((s, e) => s + e.value, 0);
      const mx = Math.max(...porEstado.map(e => e.value), 1);
      porEstado.forEach((item, i) => drawBarRow(item.label, item.value, tot, mx, ESTADO_COLORS[item.label] ?? "#6B7280", i, margin + 58, 78));
      y += 6;
    }
    if (porGravedad.length > 0) {
      drawSection("DISTRIBUCIÓN POR GRAVEDAD");
      const tot = porGravedad.reduce((s, e) => s + e.value, 0);
      const mx = Math.max(...porGravedad.map(e => e.value), 1);
      porGravedad.forEach((item, i) => drawBarRow(item.label, item.value, tot, mx, GRAVEDAD_COLORS[item.label] ?? "#6B7280", i, margin + 42, 85));
      y += 6;
    }
    if (porTipo.length > 0) {
      drawSection("CASOS POR TIPO DE EVENTO");
      const sorted = [...porTipo].sort((a, b) => b.value - a.value);
      const tot = sorted.reduce((s, e) => s + e.value, 0);
      const mx = sorted[0]?.value || 1;
      sorted.forEach((item, i) => drawBarRow(item.label, item.value, tot, mx, "#EF4444", i, margin + 55, 80));
      y += 6;
    }
    if (topParroquias.length > 0) {
      drawSection("TOP PARROQUIAS CON MÁS CASOS");
      const tot = topParroquias.reduce((s, e) => s + e.value, 0);
      const mx = topParroquias[0]?.value || 1;
      topParroquias.forEach((item, i) => drawBarRow(item.label, item.value, tot, mx, "#F59E0B", i, margin + 72, 65));
    }

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFillColor(0, 100, 52); doc.rect(0, H - 9, W, 9, "F");
      doc.setTextColor(255, 255, 255); doc.setFontSize(6.5); doc.setFont("helvetica", "normal");
      doc.text(`Cáritas Lima — Sistema GRD  |  Generado el ${new Date().toLocaleDateString("es-PE")}`, margin, H - 3.5);
      doc.text(`Página ${i} de ${totalPages}`, W - margin, H - 3.5, { align: "right" });
    }
    doc.save(`Reporte_Incidencias_Caritas_${filtros.desde}_al_${filtros.hasta}.pdf`);
  };

  // ─── PDF: Kits / Almacén ────────────────────────────────────────────────
  const exportarPDFKits = async () => {
    const { jsPDF: JsPDF } = await import("jspdf");
    const doc = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const margin = 14;
    let y = 0;

    const checkPage = (needed: number) => {
      if (y + needed > H - 18) { doc.addPage(); y = 20; }
    };
    const drawSection = (titulo: string) => {
      checkPage(18);
      doc.setTextColor(25, 35, 45); doc.setFontSize(10); doc.setFont("helvetica", "bold");
      doc.text(titulo, margin, y);
      doc.setDrawColor(145, 85, 168); doc.setLineWidth(0.4);
      doc.line(margin, y + 2, W - margin, y + 2);
      y += 8;
    };
    const drawBarRow = (label: string, value: number, total: number, maxVal: number, color: string, i: number, barX: number, barMaxW: number) => {
      checkPage(10);
      if (i % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(margin, y - 1, W - 2 * margin, 7, "F"); }
      doc.setTextColor(50, 65, 80); doc.setFontSize(7.5); doc.setFont("helvetica", "normal");
      doc.text(label.substring(0, 34), margin + 2, y + 4);
      doc.setFillColor(228, 234, 242); doc.roundedRect(barX, y, barMaxW, 5, 1, 1, "F");
      const [r, g, b] = hexToRgb(color);
      doc.setFillColor(r, g, b);
      const bW = maxVal > 0 ? (value / maxVal) * barMaxW : 0;
      if (bW > 0) doc.roundedRect(barX, y, bW, 5, 1, 1, "F");
      doc.setTextColor(60, 75, 90); doc.setFontSize(7.5);
      doc.text(`${value}`, barX + barMaxW + 3, y + 4);
      doc.setTextColor(150, 160, 170); doc.setFontSize(7);
      doc.text(`${total > 0 ? ((value / total) * 100).toFixed(1) : 0}%`, barX + barMaxW + 14, y + 4);
      y += 7;
    };

    doc.setFillColor(80, 40, 100); doc.rect(0, 0, W, 38, "F");
    doc.setFillColor(145, 85, 168); doc.rect(0, 0, W, 28, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(16); doc.setFont("helvetica", "bold");
    doc.text("REPORTE DE ALMACÉN Y KITS DE EMERGENCIA", W / 2, 11, { align: "center" });
    doc.setFontSize(8); doc.setFont("helvetica", "normal");
    doc.text("Cáritas Lima — Sistema GRD", W / 2, 18, { align: "center" });
    doc.text(`Período: ${filtros.desde} a ${filtros.hasta}`, W / 2, 24, { align: "center" });
    y = 46;

    drawSection("RESUMEN DE MOVIMIENTOS");
    const kpisKit = [
      { label: "Kits\nEntregados", value: String(kitsData.totalSalidas), color: [145, 85, 168] as [number, number, number] },
      { label: "Kits\nRecibidos", value: String(kitsData.totalEntradas), color: [0, 152, 80] as [number, number, number] },
      { label: "Parroquias\nBeneficiadas", value: String(kitsData.parroquiasBeneficiadas), color: [59, 130, 246] as [number, number, number] },
      { label: "Tipos de\nKit", value: String(kitsData.porTipoKit.length), color: [245, 158, 11] as [number, number, number] },
    ];
    const cW = (W - 2 * margin - 3 * 4) / 4;
    kpisKit.forEach((kpi, i) => {
      const x = margin + i * (cW + 4);
      doc.setFillColor(232, 236, 242); doc.roundedRect(x + 0.5, y + 0.5, cW, 26, 2, 2, "F");
      doc.setFillColor(250, 251, 253); doc.roundedRect(x, y, cW, 26, 2, 2, "F");
      doc.setFillColor(...kpi.color); doc.roundedRect(x, y, cW, 3, 1, 1, "F");
      doc.setTextColor(...kpi.color); doc.setFontSize(16); doc.setFont("helvetica", "bold");
      doc.text(kpi.value, x + cW / 2, y + 14, { align: "center" });
      doc.setTextColor(100, 115, 128); doc.setFontSize(6); doc.setFont("helvetica", "normal");
      kpi.label.split("\n").forEach((line, li) => doc.text(line, x + cW / 2, y + 20 + li * 3.5, { align: "center" }));
    });
    y += 36;

    if (kitsData.porTipoKit.length > 0) {
      drawSection("KITS ENTREGADOS POR TIPO");
      const tot = kitsData.porTipoKit.reduce((s, e) => s + e.value, 0);
      const mx = kitsData.porTipoKit[0]?.value || 1;
      kitsData.porTipoKit.forEach((item, i) => drawBarRow(item.label, item.value, tot, mx, "#9155A8", i, margin + 55, 82));
      y += 6;
    }
    if (kitsData.porParroquia.length > 0) {
      drawSection("TOP 5 PARROQUIAS BENEFICIADAS");
      const tot = kitsData.porParroquia.reduce((s, e) => s + e.value, 0);
      const mx = kitsData.porParroquia[0]?.value || 1;
      kitsData.porParroquia.forEach((item, i) => drawBarRow(item.label, item.value, tot, mx, "#3B82F6", i, margin + 72, 65));
    }

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFillColor(0, 100, 52); doc.rect(0, H - 9, W, 9, "F");
      doc.setTextColor(255, 255, 255); doc.setFontSize(6.5); doc.setFont("helvetica", "normal");
      doc.text(`Cáritas Lima — Sistema GRD  |  Generado el ${new Date().toLocaleDateString("es-PE")}`, margin, H - 3.5);
      doc.text(`Página ${i} de ${totalPages}`, W - margin, H - 3.5, { align: "right" });
    }
    doc.save(`Reporte_Kits_Caritas_${filtros.desde}_al_${filtros.hasta}.pdf`);
  };

  const handleExport = () => {
    if (tab === "general") exportarPDF();
    else if (tab === "incidencias") exportarPDFIncidencias();
    else if (tab === "brigadistas") exportarPDFBrigadistas();
    else if (tab === "actividades") exportarPDFActividades();
    else exportarPDFKits();
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
            <p className="text-sm text-gray-500 mt-0.5">Panel de indicadores — Cáritas Lima Gestión de Riesgos y desastres</p>
          </div>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-all"
          style={{ background: "#009850" }}
          suppressHydrationWarning
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
              max={today}
              onChange={(e) => setHasta(e.target.value)}
              className="px-3 py-1.5 text-sm bg-[#F5F5F5] border border-[#DDDDDD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009850]/20 focus:border-[#009850] transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Reporte</label>
            <select
              value={tab}
              onChange={(e) => setTab(e.target.value as TabId)}
              className="px-3 py-1.5 text-sm bg-[#F5F5F5] border border-[#DDDDDD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009850]/20 focus:border-[#009850] transition-colors"
              suppressHydrationWarning
            >
              <option value="general">Resumen General</option>
              <option value="incidencias">Casos e Incidencias</option>
              <option value="brigadistas">Brigadistas y Capacitación</option>
              <option value="actividades">Actividades Preventivas</option>
              <option value="kits">Almacén y Kits</option>
            </select>
          </div>
          <button
            onClick={aplicarFiltros}
            className="px-4 py-1.5 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-all"
            style={{ background: "#009850" }}
            suppressHydrationWarning
          >
            Aplicar
          </button>
        </div>
        <div className="text-[11px] text-gray-400 ml-auto hidden md:block">
          Mostrando: <strong className="text-gray-600">{filtros.desde}</strong> a <strong className="text-gray-600">{filtros.hasta}</strong>
        </div>
      </div>

      {/* ── Tab: Resumen General ───────────────────────────────────────────── */}
      {tab === "general" && <>

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
            sub={`${totales.totalBrigadistas} ${totales.totalBrigadistas === 1 ? "brigadista" : "brigadistas"} total`}
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
            sub={totales.totalActividades > 0 ? `${totales.totalActividades} programadas` : "sin actividades"}
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

        {/* Trend area chart */}
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
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
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
                      <Cell key={i} fill={ESTADO_COLORS[entry.label] || PALETTE[i % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v} casos`, ""]} />
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

          <ChartCard
            title="Top 5 Parroquias"
            subtitle="Zonas con mayor concentración de incidencias"
          >
            {topParroquias.length === 0 ? (
              <div className="flex h-64 items-center justify-center text-sm text-gray-400">Sin datos.</div>
            ) : (
              <ResponsiveContainer width="100%" height={264}>
                <BarChart data={topParroquias} layout="vertical" margin={{ top: 4, right: 50, left: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="label" tick={{ fontSize: 10, fill: "#6B7280" }} axisLine={false} tickLine={false} width={95} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F8FAFC" }} />
                  <Bar dataKey="value" fill="#F59E0B" radius={[0, 4, 4, 0]} maxBarSize={22}>
                    <LabelList dataKey="value" position="right" style={{ fontSize: 10, fill: "#6B7280" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* Row: Tipo evento + Gravedad + Circular KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <ChartCard title="Por Tipo de Evento" subtitle="Naturaleza de las emergencias reportadas">
            {porTipo.length === 0 ? (
              <div className="flex h-56 items-center justify-center text-sm text-gray-400">Sin datos.</div>
            ) : (
              <ResponsiveContainer width="100%" height={224}>
                <BarChart
                  data={[...porTipo].sort((a, b) => b.value - a.value)}
                  margin={{ top: 4, right: 8, left: -20, bottom: 24 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#9CA3AF" }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 9, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F8FAFC" }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={44}>
                    {[...porTipo].sort((a, b) => b.value - a.value).map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Por Gravedad" subtitle="Nivel de severidad de los casos">
            {porGravedad.length === 0 ? (
              <div className="flex h-56 items-center justify-center text-sm text-gray-400">Sin datos.</div>
            ) : (
              <ResponsiveContainer width="100%" height={224}>
                <BarChart data={porGravedad} layout="vertical" margin={{ top: 4, right: 46, left: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="label" tick={{ fontSize: 10, fill: "#6B7280" }} axisLine={false} tickLine={false} width={68} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F8FAFC" }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={26}>
                    {porGravedad.map((entry, i) => (
                      <Cell key={i} fill={GRAVEDAD_COLORS[entry.label] || PALETTE[i % PALETTE.length]} />
                    ))}
                    <LabelList dataKey="value" position="right" style={{ fontSize: 10, fill: "#6B7280" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Indicadores Operacionales" subtitle="Nivel de cumplimiento de metas institucionales">
            <div className="flex items-center justify-around h-50">
              <CircularKPI pct={totales.pctBrigadistasCapacitados} label="Brigadistas Certificados" color="#3B82F6" />
              <CircularKPI pct={totales.pctParroquiasPlan} label="Parroquias con Plan GRD" color="#009850" />
              <CircularKPI pct={totales.pctActividadesEjecutadas} label="Actividades Preventivas" color="#F59E0B" />
            </div>
          </ChartCard>
        </div>
      </>}

      {/* ── Tab: Brigadistas y Capacitación ──────────────────────────────────── */}
      {tab === "brigadistas" && <>

        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KPICard
            icon={<Users className="w-4.5 h-4.5" style={{ color: "#3B82F6" }} />}
            label="Total Brigadistas"
            value={brigadistasData.total}
            sub="registrados en el sistema"
            color="#3B82F6"
          />
          <KPICard
            icon={<GraduationCap className="w-4.5 h-4.5" style={{ color: "#009850" }} />}
            label="Certificados"
            value={brigadistasData.certificados}
            sub={`${brigadistasData.total > 0 ? Math.round((brigadistasData.certificados / brigadistasData.total) * 100) : 0}% del total`}
            color="#009850"
            pct={brigadistasData.total > 0 ? Math.round((brigadistasData.certificados / brigadistasData.total) * 100) : 0}
          />
          <KPICard
            icon={<UserCheck className="w-4.5 h-4.5" style={{ color: "#EF4444" }} />}
            label="Sin Certificar"
            value={brigadistasData.sinCertificar}
            sub="pendientes de formación"
            color="#EF4444"
          />
          <KPICard
            icon={<CheckCircle className="w-4.5 h-4.5" style={{ color: "#F59E0B" }} />}
            label="Disponibles"
            value={brigadistasData.porDisponibilidad.find(d => d.label === "DISPONIBLE")?.value ?? 0}
            sub="listos para actuar"
            color="#F59E0B"
          />
        </div>

        {/* Certificación + Disponibilidad */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Estado de Certificación" subtitle="Brigadistas certificados vs. sin certificar">
            {brigadistasData.total === 0 ? (
              <div className="flex h-56 items-center justify-center text-sm text-gray-400">Sin datos.</div>
            ) : (
              <ResponsiveContainer width="100%" height={224}>
                <PieChart>
                  <Pie
                    data={[
                      { label: "Certificados", value: brigadistasData.certificados },
                      { label: "Sin certificar", value: brigadistasData.sinCertificar },
                    ]}
                    dataKey="value"
                    nameKey="label"
                    cx="40%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={48}
                    strokeWidth={0}
                  >
                    <Cell fill="#009850" />
                    <Cell fill="#EF4444" />
                  </Pie>
                  <Tooltip formatter={(v) => [`${v} brigadistas`, ""]} />
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

          <ChartCard title="Disponibilidad" subtitle="Estado de disponibilidad operativa actual">
            {brigadistasData.porDisponibilidad.length === 0 ? (
              <div className="flex h-56 items-center justify-center text-sm text-gray-400">Sin datos.</div>
            ) : (
              <ResponsiveContainer width="100%" height={224}>
                <BarChart
                  data={brigadistasData.porDisponibilidad.map(d => ({
                    label: DISP_LABELS[d.label] ?? d.label,
                    value: d.value,
                    fill: DISP_COLORS[d.label] ?? "#6B7280",
                  }))}
                  margin={{ top: 4, right: 40, left: -20, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F8FAFC" }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={52}>
                    {brigadistasData.porDisponibilidad.map((d, i) => (
                      <Cell key={i} fill={DISP_COLORS[d.label] ?? PALETTE[i % PALETTE.length]} />
                    ))}
                    <LabelList dataKey="value" position="top" style={{ fontSize: 11, fill: "#6B7280" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* Top parroquias por brigadistas */}
        <ChartCard
          title="Top 5 Parroquias por Brigadistas Registrados"
          subtitle="Parroquias con mayor número de brigadistas en el sistema"
        >
          {brigadistasData.porParroquia.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-gray-400">Sin datos.</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={brigadistasData.porParroquia} layout="vertical" margin={{ top: 4, right: 55, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 10, fill: "#6B7280" }} axisLine={false} tickLine={false} width={110} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F8FAFC" }} />
                <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]} maxBarSize={22}>
                  <LabelList dataKey="value" position="right" style={{ fontSize: 10, fill: "#6B7280" }} formatter={(v: number) => `${v} brig.`} />
                </Bar>
              </BarChart>
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

        {/* Top parroquias por actividades */}
        <ChartCard
          title="Top 5 Parroquias por Actividades Realizadas"
          subtitle="Parroquias con mayor número de actividades preventivas registradas"
        >
          {actividadesData.porParroquia.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-gray-400">Sin datos.</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={actividadesData.porParroquia} layout="vertical" margin={{ top: 4, right: 60, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 10, fill: "#6B7280" }} axisLine={false} tickLine={false} width={110} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F8FAFC" }} />
                <Bar dataKey="value" fill="#F59E0B" radius={[0, 4, 4, 0]} maxBarSize={22}>
                  <LabelList dataKey="value" position="right" style={{ fontSize: 10, fill: "#6B7280" }} formatter={(v: number) => `${v} act.`} />
                </Bar>
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

        {/* Tendencia */}
        <ChartCard
          title="Evolución Diaria de Casos"
          subtitle="Número de casos registrados por día en el período seleccionado"
        >
          {porDia.length === 0 ? (
            <div className="flex h-44 items-center justify-center text-sm text-gray-400">Sin datos para el período.</div>
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={porDia} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaRed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="value" stroke="#EF4444" strokeWidth={2} fill="url(#areaRed)"
                  dot={{ r: 3, fill: "#EF4444", strokeWidth: 0 }} activeDot={{ r: 5, fill: "#EF4444" }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Estado + Gravedad */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Casos por Estado" subtitle="¿En qué etapa se encuentran los casos registrados?">
            {porEstado.length === 0 ? (
              <div className="flex h-56 items-center justify-center text-sm text-gray-400">Sin datos.</div>
            ) : (
              <ResponsiveContainer width="100%" height={224}>
                <PieChart>
                  <Pie data={porEstado} dataKey="value" nameKey="label" cx="40%" cy="50%"
                    outerRadius={90} innerRadius={48} strokeWidth={0}>
                    {porEstado.map((entry, i) => (
                      <Cell key={i} fill={ESTADO_COLORS[entry.label] || PALETTE[i % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v} casos`, ""]} />
                  <Legend layout="vertical" align="right" verticalAlign="middle"
                    formatter={(v) => <span style={{ fontSize: 11, color: "#4B5563" }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Casos por Gravedad" subtitle="Nivel de severidad de los casos registrados">
            {porGravedad.length === 0 ? (
              <div className="flex h-56 items-center justify-center text-sm text-gray-400">Sin datos.</div>
            ) : (
              <ResponsiveContainer width="100%" height={224}>
                <BarChart data={porGravedad} layout="vertical" margin={{ top: 4, right: 46, left: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="label" tick={{ fontSize: 10, fill: "#6B7280" }} axisLine={false} tickLine={false} width={72} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F8FAFC" }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={28}>
                    {porGravedad.map((entry, i) => (
                      <Cell key={i} fill={GRAVEDAD_COLORS[entry.label] || PALETTE[i % PALETTE.length]} />
                    ))}
                    <LabelList dataKey="value" position="right" style={{ fontSize: 10, fill: "#6B7280" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* Tipo evento + Top parroquias */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Tipo de Evento" subtitle="¿Qué tipo de emergencias se registraron?">
            {porTipo.length === 0 ? (
              <div className="flex h-56 items-center justify-center text-sm text-gray-400">Sin datos.</div>
            ) : (
              <ResponsiveContainer width="100%" height={224}>
                <BarChart data={[...porTipo].sort((a, b) => b.value - a.value)}
                  layout="vertical" margin={{ top: 4, right: 50, left: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="label" tick={{ fontSize: 9, fill: "#6B7280" }} axisLine={false} tickLine={false} width={100} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F8FAFC" }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20}>
                    {[...porTipo].sort((a, b) => b.value - a.value).map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                    <LabelList dataKey="value" position="right" style={{ fontSize: 10, fill: "#6B7280" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Parroquias con más Casos" subtitle="Zonas con mayor concentración de incidencias">
            {topParroquias.length === 0 ? (
              <div className="flex h-56 items-center justify-center text-sm text-gray-400">Sin datos.</div>
            ) : (
              <ResponsiveContainer width="100%" height={224}>
                <BarChart data={topParroquias} layout="vertical" margin={{ top: 4, right: 55, left: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="label" tick={{ fontSize: 10, fill: "#6B7280" }} axisLine={false} tickLine={false} width={100} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F8FAFC" }} />
                  <Bar dataKey="value" fill="#EF4444" radius={[0, 4, 4, 0]} maxBarSize={22}>
                    <LabelList dataKey="value" position="right" style={{ fontSize: 10, fill: "#6B7280" }} formatter={(v: number) => `${v} casos`} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
      </>}

      {/* ── Tab: Almacén y Kits ──────────────────────────────────────────────── */}
      {tab === "kits" && <>

        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KPICard
            icon={<Package className="w-4.5 h-4.5" style={{ color: "#9155A8" }} />}
            label="Kits Entregados"
            value={kitsData.totalSalidas}
            sub="unidades distribuidas"
            color="#9155A8"
          />
          <KPICard
            icon={<Shield className="w-4.5 h-4.5" style={{ color: "#009850" }} />}
            label="Kits Recibidos"
            value={kitsData.totalEntradas}
            sub="ingresos al almacén"
            color="#009850"
          />
          <KPICard
            icon={<Users className="w-4.5 h-4.5" style={{ color: "#3B82F6" }} />}
            label="Parroquias"
            value={kitsData.parroquiasBeneficiadas}
            sub="beneficiadas con kits"
            color="#3B82F6"
          />
          <KPICard
            icon={<BarChart2 className="w-4.5 h-4.5" style={{ color: "#F59E0B" }} />}
            label="Tipos de Kit"
            value={kitsData.porTipoKit.length}
            sub="categorías distintas"
            color="#F59E0B"
          />
        </div>

        {kitsData.totalSalidas === 0 && kitsData.totalEntradas === 0 ? (
          <div className="bg-white rounded-xl border border-[#DDDDDD] p-10 text-center text-gray-400 text-sm">
            No hay movimientos de almacén registrados en el período seleccionado.
          </div>
        ) : <>

          {/* Tendencia de movimientos */}
          {kitsData.porFecha.length > 0 && (
            <ChartCard
              title="Movimientos de Almacén por Día"
              subtitle="Total de unidades movilizadas (entradas + salidas) por fecha"
            >
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={kitsData.porFecha} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="areaPurple" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#9155A8" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#9155A8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="value" stroke="#9155A8" strokeWidth={2} fill="url(#areaPurple)"
                    dot={{ r: 3, fill: "#9155A8", strokeWidth: 0 }} activeDot={{ r: 5, fill: "#9155A8" }} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {/* Por tipo de kit + Por parroquia */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Kits Entregados por Tipo" subtitle="¿Qué categorías de kits se distribuyeron?">
              {kitsData.porTipoKit.length === 0 ? (
                <div className="flex h-48 items-center justify-center text-sm text-gray-400">Sin salidas registradas.</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={kitsData.porTipoKit} layout="vertical" margin={{ top: 4, right: 50, left: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="label" tick={{ fontSize: 9, fill: "#6B7280" }} axisLine={false} tickLine={false} width={100} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F8FAFC" }} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={22}>
                      {kitsData.porTipoKit.map((_, i) => (
                        <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                      ))}
                      <LabelList dataKey="value" position="right" style={{ fontSize: 10, fill: "#6B7280" }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Top 5 Parroquias Beneficiadas" subtitle="Parroquias que recibieron más kits en el período">
              {kitsData.porParroquia.length === 0 ? (
                <div className="flex h-48 items-center justify-center text-sm text-gray-400">Sin datos de destino.</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={kitsData.porParroquia} layout="vertical" margin={{ top: 4, right: 60, left: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="label" tick={{ fontSize: 10, fill: "#6B7280" }} axisLine={false} tickLine={false} width={110} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F8FAFC" }} />
                    <Bar dataKey="value" fill="#9155A8" radius={[0, 4, 4, 0]} maxBarSize={22}>
                      <LabelList dataKey="value" position="right" style={{ fontSize: 10, fill: "#6B7280" }} formatter={(v: number) => `${v} u.`} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>
        </>}
      </>}

    </div>
  );
}
