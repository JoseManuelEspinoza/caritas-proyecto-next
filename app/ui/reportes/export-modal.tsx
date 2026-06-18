"use client";

import { useState, useRef, useEffect } from "react";
import {
  ChevronDown, Check, X, Filter, Download,
  FileText, FileSpreadsheet, Sheet,
} from "lucide-react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import { type ExportRow, unique } from "./types";

// ─── FilterDropdown ───────────────────────────────────────────────────────────
function FilterDropdown({
  label, options, selected, onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const toggle = (v: string) =>
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);

  const labelText =
    selected.length === 0 ? "Todos" : selected.length === 1 ? selected[0] : `${selected.length} sel.`;

  return (
    <div ref={ref} className="relative flex-1 min-w-0">
      <p className="text-[11px] font-semibold text-gray-500 mb-1">{label}</p>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`cursor-pointer flex items-center justify-between w-full px-2.5 py-1.5 text-xs border rounded-lg bg-white transition-colors ${
          open ? "border-[#009850]" : "border-gray-200"
        }`}
      >
        <span className={selected.length === 0 ? "text-gray-400" : "text-gray-700 font-medium truncate mr-1"}>
          {labelText}
        </span>
        <ChevronDown className={`w-3 h-3 text-gray-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1 max-h-44 overflow-y-auto">
          {options.map((opt) => {
            const sel = selected.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => toggle(opt)}
                className={`cursor-pointer w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors ${
                  sel ? "bg-[#009850]/8 text-[#009850] font-medium" : "text-gray-700 hover:bg-[#009850]/5"
                }`}
              >
                <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 ${
                  sel ? "bg-[#009850] border-[#009850]" : "border-gray-300"
                }`}>
                  {sel && <Check className="w-2.5 h-2.5 text-white" />}
                </span>
                {opt}
              </button>
            );
          })}
          {selected.length > 0 && (
            <>
              <div className="mx-3 my-1 border-t border-gray-100" />
              <button
                type="button"
                onClick={() => onChange([])}
                className="cursor-pointer w-full flex items-center gap-1 px-3 py-1 text-[10px] text-gray-400 hover:text-[#009850]"
              >
                <X className="w-2.5 h-2.5" /> Limpiar
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── ExportPreview ────────────────────────────────────────────────────────────
function ExportPreview({
  format, data, desde, hasta,
}: {
  format: "excel" | "csv" | "pdf";
  data: ExportRow[];
  desde: string;
  hasta: string;
}) {
  const preview = data.slice(0, 6);
  const cols = ["Codigo", "Fecha", "Tipo", "Gravedad", "Estado", "Parroquia"];
  const headers = ["Código", "Fecha", "Tipo", "Gravedad", "Estado", "Parroquia"];

  if (format === "pdf") {
    return (
      <div className="bg-white shadow-xl w-full" style={{ minHeight: 480 }}>
        <div className="bg-[#009850] text-white px-6 py-5">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-base font-bold tracking-tight">Reporte de Incidencias</h2>
              <p className="text-xs text-green-100 mt-0.5">Cáritas Lima — Sistema GRD</p>
            </div>
            <div className="text-right text-[11px] text-green-100 space-y-0.5">
              <div className="font-semibold text-white">{data.length} registros</div>
              <div>{desde} — {hasta}</div>
            </div>
          </div>
        </div>

        <div className="px-4 pt-4 pb-3">
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="bg-[#009850]">
                {headers.map((h) => (
                  <th key={h} className="px-2 py-2 text-left text-white font-semibold text-[9px] uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-[#F8FAF9]"}>
                  {cols.map((c) => (
                    <td key={c} className="px-2 py-1.5 text-gray-700 border-b border-gray-100">
                      {String(row[c] ?? "-")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {data.length > 6 && (
            <div className="text-[10px] text-gray-400 text-center py-2 border-b border-gray-100">
              ··· y {data.length - 6} registros más
            </div>
          )}
        </div>

        <div className="px-4 pb-4">
          <div className="border border-dashed border-[#009850]/30 rounded-lg p-4 flex flex-col items-center gap-2.5 bg-[#009850]/3">
            <div className="flex items-end gap-4 opacity-70">
              <div className="flex items-end gap-0.5 h-10">
                {[40, 70, 50, 90, 60, 35].map((h, i) => (
                  <div key={i} className="w-2.5 rounded-sm bg-[#009850]" style={{ height: `${h}%` }} />
                ))}
              </div>
              <svg width="40" height="40" viewBox="0 0 40 40">
                <circle cx="20" cy="20" r="16" fill="none" stroke="#009850" strokeWidth="8" strokeDasharray="50 50" />
                <circle cx="20" cy="20" r="16" fill="none" stroke="#FFC300" strokeWidth="8" strokeDasharray="25 75" strokeDashoffset="-50" />
                <circle cx="20" cy="20" r="16" fill="none" stroke="#FF823C" strokeWidth="8" strokeDasharray="25 75" strokeDashoffset="-75" />
              </svg>
              <div className="flex items-end gap-0.5 h-10 opacity-70">
                {[20, 45, 30, 65, 50, 80, 55].map((h, i) => (
                  <div key={i} className="w-2 rounded-sm bg-[#009850]/60" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
            <p className="text-[10px] text-gray-500 text-center leading-snug">
              Los gráficos del dashboard se incluyen en el PDF exportado
            </p>
          </div>
        </div>

        <div className="px-4 pb-3 pt-1 text-[9px] text-gray-400 flex justify-between border-t border-gray-100">
          <span>Generado el {new Date().toLocaleDateString("es-PE")}</span>
          <span>Cáritas Lima — GRD</span>
        </div>
      </div>
    );
  }

  if (format === "excel") {
    const sheets = ["Incidencias", "Por Estado", "Por Tipo", "Por Parroquia"];
    return (
      <div className="bg-white shadow-xl w-full flex flex-col" style={{ minHeight: 480 }}>
        <div className="bg-[#1f3864] px-3 py-1 flex items-center gap-2 select-none">
          <FileSpreadsheet className="w-3.5 h-3.5 text-white flex-shrink-0" />
          <span className="text-white text-[11px] flex-1">ReporteGeneral_Caritas.xlsx — Excel</span>
          <div className="flex gap-2.5 text-white/70 text-[11px]">
            <span className="hover:text-white cursor-default">─</span>
            <span className="hover:text-white cursor-default">□</span>
            <span className="hover:text-white cursor-default">✕</span>
          </div>
        </div>

        <div className="flex border-b border-gray-300 bg-[#f3f3f3] px-1 select-none">
          {["Inicio", "Insertar", "Diseño de página", "Fórmulas", "Datos", "Revisar"].map((tab, i) => (
            <div key={tab} className={`px-3 py-1.5 text-[10px] cursor-default ${
              i === 0 ? "bg-white border-t-2 border-t-[#217346] font-semibold text-gray-800" : "text-gray-600 hover:bg-[#e8e8e8]"
            }`}>
              {tab}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-0 border-b border-gray-300 bg-white select-none">
          <div className="w-16 border-r border-gray-300 px-2 py-1 text-[10px] text-gray-600 text-center font-medium">A1</div>
          <div className="px-2 border-r border-gray-300 py-1 text-[11px] italic text-gray-500 font-serif">fx</div>
          <div className="flex-1 px-3 py-1 text-[10px] text-gray-800">Código</div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="border-collapse text-[10px] w-full">
            <thead className="sticky top-0 z-10">
              <tr>
                <th className="w-8 bg-[#f2f2f2] border border-gray-300 text-gray-500 font-normal text-center py-0.5 text-[9px]" />
                {headers.map((h, i) => (
                  <th key={h} className="bg-[#f2f2f2] border border-gray-300 text-gray-600 font-normal px-2 py-0.5 text-center text-[10px] min-w-[80px]">
                    {String.fromCharCode(65 + i)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="w-8 bg-[#f2f2f2] border border-gray-300 text-gray-500 text-center text-[9px] py-1.5 font-medium">1</td>
                {headers.map((h) => (
                  <td key={h} className="border border-gray-300 px-2 py-1.5 font-bold text-[#107C41] bg-[#e2efda]">{h}</td>
                ))}
              </tr>
              {preview.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-[#f9f9f9]"}>
                  <td className="w-8 bg-[#f2f2f2] border border-gray-300 text-gray-500 text-center text-[9px] py-1.5">{i + 2}</td>
                  {cols.map((c) => (
                    <td key={c} className="border border-[#d0d0d0] px-2 py-1.5 text-gray-800 whitespace-nowrap">
                      {String(row[c] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
              {data.length > 6 && (
                <tr>
                  <td className="w-8 bg-[#f2f2f2] border border-gray-300 text-gray-400 text-center text-[9px] py-1">···</td>
                  <td colSpan={headers.length} className="border border-[#d0d0d0] px-2 py-1.5 text-gray-400 italic">
                    ··· y {data.length - 6} filas más en esta hoja
                  </td>
                </tr>
              )}
              {Array.from({ length: Math.max(0, 4 - preview.length) }).map((_, i) => (
                <tr key={`empty-${i}`}>
                  <td className="w-8 bg-[#f2f2f2] border border-gray-300 text-gray-400 text-center text-[9px] py-1.5">
                    {preview.length + i + 2}
                  </td>
                  {cols.map((c) => (
                    <td key={c} className="border border-[#d0d0d0] px-2 py-1.5" />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex-shrink-0 border-t border-gray-300 bg-[#f2f2f2]">
          <div className="flex items-end px-1 pt-1 gap-0 overflow-x-auto">
            <div className="flex gap-0.5 mr-1 self-center">
              {["◄◄", "◄", "►", "►►"].map((arrow) => (
                <button key={arrow} className="w-5 h-5 text-[9px] text-gray-500 border border-gray-300 bg-white hover:bg-gray-100 cursor-default flex items-center justify-center">
                  {arrow}
                </button>
              ))}
            </div>
            {sheets.map((sheet, i) => (
              <div
                key={sheet}
                className={`cursor-default flex-shrink-0 px-3 py-1 text-[10px] border-t border-l border-r select-none ${
                  i === 0
                    ? "bg-white border-gray-300 text-[#107C41] font-bold relative top-px"
                    : "bg-[#dce6f1]/50 border-gray-300 text-gray-500 hover:bg-[#e8e8e8] mt-0.5"
                }`}
              >
                {sheet}
              </div>
            ))}
            <div className="flex-1 border-b border-gray-300" />
          </div>
          <div className="border-t border-gray-300 px-3 py-0.5 flex justify-between items-center bg-[#217346]">
            <span className="text-[9px] text-white/80">Listo</span>
            <div className="flex items-center gap-4 text-[9px] text-white/80">
              <span>Registros: {data.length}</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // CSV — estilo editor de código
  const csvLines = [
    cols.join(","),
    ...preview.map((row) => cols.map((c) => `"${row[c] ?? ""}"`).join(",")),
  ];
  if (data.length > 6) csvLines.push(`# ··· y ${data.length - 6} registros más`);

  return (
    <div className="bg-[#1e1e2e] shadow-xl w-full font-mono" style={{ minHeight: 480 }}>
      <div className="bg-[#2d2d2d] px-3 py-2 flex items-center gap-2 border-b border-[#404040]">
        <Sheet className="w-3.5 h-3.5 text-[#4ec9b0] flex-shrink-0" />
        <span className="text-[#cccccc] text-[11px]">Reporte_Incidencias.csv</span>
        <span className="ml-auto text-[#888] text-[10px]">UTF-8 · CSV</span>
      </div>
      <div className="flex">
        <div className="text-[#585858] text-[10px] py-3 px-2 text-right select-none border-r border-[#333] leading-5">
          {csvLines.map((_, i) => <div key={i}>{i + 1}</div>)}
        </div>
        <div className="flex-1 py-3 px-4 text-[10px] leading-5 overflow-x-auto">
          {csvLines.map((line, i) => {
            if (line.startsWith("#")) return <div key={i} className="text-[#6a9955]">{line}</div>;
            if (i === 0) return <div key={i} className="text-[#ce9178]">{line}</div>;
            const parts = line.split(",");
            return (
              <div key={i}>
                <span className="text-[#9cdcfe]">{parts[0]}</span>
                {parts.slice(1).map((p, j) => (
                  <span key={j}>
                    <span className="text-[#808080]">,</span>
                    <span className="text-[#ce9178]">{p}</span>
                  </span>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── ExportModal ──────────────────────────────────────────────────────────────
interface ExportModalProps {
  data: ExportRow[];
  parroquias: { id: string; nombre: string }[];
  onClose: () => void;
  desde: string;
  hasta: string;
}

export function ExportModal({ data, parroquias, onClose, desde, hasta }: ExportModalProps) {
  const tipos = unique(data, "Tipo");
  const estados = unique(data, "Estado");
  const gravedades = unique(data, "Gravedad");
  const parroquiasNombres = [...new Set(data.map((r) => String(r.Parroquia)).filter(Boolean))].sort();

  const [format, setFormat] = useState<"excel" | "csv" | "pdf">("pdf");
  const [selTipo, setSelTipo] = useState<string[]>([]);
  const [selEstado, setSelEstado] = useState<string[]>([]);
  const [selGravedad, setSelGravedad] = useState<string[]>([]);
  const [selParroquia, setSelParroquia] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);

  // Suppress unused variable warning — parroquias kept in props for future use
  void parroquias;

  const filteredData = data.filter((row) => {
    if (selTipo.length > 0 && !selTipo.includes(String(row.Tipo))) return false;
    if (selEstado.length > 0 && !selEstado.includes(String(row.Estado))) return false;
    if (selGravedad.length > 0 && !selGravedad.includes(String(row.Gravedad))) return false;
    if (selParroquia.length > 0 && !selParroquia.includes(String(row.Parroquia))) return false;
    return true;
  });

  async function svgToDataUrl(svgEl: SVGSVGElement): Promise<string | null> {
    try {
      const serialized = new XMLSerializer().serializeToString(svgEl);
      const b64 = btoa(unescape(encodeURIComponent(serialized)));
      const dataUrl = `data:image/svg+xml;base64,${b64}`;
      const rect = svgEl.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;
      return await new Promise<string | null>((resolve) => {
        const canvas = document.createElement("canvas");
        const scale = 2;
        canvas.width = rect.width * scale;
        canvas.height = rect.height * scale;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);
        const img = new Image();
        img.onload = () => {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/png", 0.92));
        };
        img.onerror = () => resolve(null);
        img.src = dataUrl;
      });
    } catch {
      return null;
    }
  }

  async function exportar() {
    setExporting(true);
    const fmtDate = (iso: string) => { const [y, m, d] = iso.split("-"); return `${d}-${m}-${y}`; };
    const nombre = `ReporteGeneral_Caritas_${fmtDate(desde)}_${fmtDate(hasta)}`;

    if (format === "csv") {
      const cols = Object.keys(filteredData[0] ?? {});
      const rows = [
        cols.join(","),
        ...filteredData.map((r) => cols.map((c) => `"${r[c] ?? ""}"`).join(",")),
      ];
      const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `${nombre}.csv`; a.click();
      URL.revokeObjectURL(url);
    } else if (format === "excel") {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filteredData), "Incidencias");
      const byEstado = [...new Set(filteredData.map((r) => String(r.Estado)))].map((e) => ({
        Estado: e, Cantidad: filteredData.filter((r) => r.Estado === e).length,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(byEstado), "Por Estado");
      const byTipo = [...new Set(filteredData.map((r) => String(r.Tipo)))].map((t) => ({
        Tipo: t, Cantidad: filteredData.filter((r) => r.Tipo === t).length,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(byTipo), "Por Tipo");
      const byParr = [...new Set(filteredData.map((r) => String(r.Parroquia)))].map((p) => ({
        Parroquia: p, Cantidad: filteredData.filter((r) => r.Parroquia === p).length,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(byParr), "Por Parroquia");
      XLSX.writeFile(wb, `${nombre}.xlsx`);
    } else {
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageW = 297; const pageH = 210; const margin = 14;

      doc.setFillColor(0, 152, 80);
      doc.rect(0, 0, pageW, 18, "F");
      doc.setFontSize(13); doc.setFont("helvetica", "bold"); doc.setTextColor(255, 255, 255);
      doc.text("Reporte de Incidencias — Cáritas GRD", margin, 12);
      doc.setFontSize(8); doc.setFont("helvetica", "normal");
      doc.text(`${filteredData.length} registros · ${desde} — ${hasta}`, pageW - margin, 12, { align: "right" });

      const pdfCols = ["Código", "Fecha", "Tipo", "Gravedad", "Estado", "Parroquia", "Ubicación"];
      const pdfKeys = ["Codigo", "Fecha", "Tipo", "Gravedad", "Estado", "Parroquia", "Ubicacion"];
      const colW = [25, 22, 35, 22, 25, 45, 60];
      const rowH = 6.5;
      let y = 26;

      const drawHeader = () => {
        doc.setFillColor(0, 152, 80);
        doc.rect(margin, y - 4.5, colW.reduce((a, b) => a + b, 0), rowH, "F");
        doc.setFontSize(7.5); doc.setFont("helvetica", "bold"); doc.setTextColor(255, 255, 255);
        let x = margin;
        pdfCols.forEach((c, i) => { doc.text(c, x + 2, y); x += colW[i]; });
        y += rowH;
      };
      drawHeader();

      filteredData.forEach((row, ri) => {
        if (y > pageH - 15) { doc.addPage(); y = 15; drawHeader(); }
        if (ri % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, y - 4.5, colW.reduce((a, b) => a + b, 0), rowH, "F");
        }
        doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(31, 41, 55);
        let x = margin;
        pdfKeys.forEach((k, i) => {
          const txt = String(row[k] ?? "-");
          const maxChars = Math.floor(colW[i] / 1.8);
          doc.text(txt.length > maxChars ? txt.slice(0, maxChars - 1) + "…" : txt, x + 2, y);
          x += colW[i];
        });
        y += rowH;
      });

      doc.setFontSize(7); doc.setTextColor(150, 150, 150); doc.setFont("helvetica", "italic");
      doc.text(`Generado el ${new Date().toLocaleDateString("es-PE")} — Cáritas Lima`, margin, pageH - 5);

      const chartWrappers = document.querySelectorAll<HTMLElement>(".recharts-wrapper");
      for (const wrapper of chartWrappers) {
        const svg = wrapper.querySelector("svg");
        if (!svg) continue;
        const imgData = await svgToDataUrl(svg);
        if (!imgData) continue;
        const rect = wrapper.getBoundingClientRect();
        const aspect = rect.height / Math.max(rect.width, 1);
        doc.addPage();
        doc.setFillColor(0, 152, 80);
        doc.rect(0, 0, pageW, 12, "F");
        doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(255, 255, 255);
        doc.text("Gráfico del Dashboard — Cáritas GRD", margin, 8);
        const imgW = pageW - margin * 2;
        const imgH = Math.min(imgW * aspect, pageH - 30);
        doc.addImage(imgData, "PNG", margin, 18, imgW, imgH);
      }

      doc.save(`${nombre}.pdf`);
    }

    setExporting(false);
    onClose();
  }

  const formatMeta = {
    excel: { label: "Excel", icon: <FileSpreadsheet className="w-4 h-4" /> },
    csv: { label: "CSV", icon: <Sheet className="w-4 h-4" /> },
    pdf: { label: "PDF", icon: <FileText className="w-4 h-4" /> },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full flex flex-col"
        style={{ maxWidth: "min(1100px, 95vw)", maxHeight: "93vh" }}
      >
        {/* Header fijo */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-3.5 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#009850]/10 rounded-lg flex items-center justify-center">
              <Download className="w-4 h-4 text-[#009850]" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">Exportar Reporte</p>
              <p className="text-[11px] text-gray-400">{filteredData.length} registros · {desde} — {hasta}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body: dos paneles */}
        <div className="flex-1 flex overflow-hidden">
          {/* Panel izquierdo — opciones */}
          <div className="w-80 flex-shrink-0 border-r border-gray-100 flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* Formato — chips en fila */}
              <div>
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Formato</p>
                <div className="flex gap-1.5">
                  {(["pdf", "excel", "csv"] as const).map((f) => {
                    const m = formatMeta[f];
                    return (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setFormat(f)}
                        className={`cursor-pointer flex items-center justify-center gap-1.5 flex-1 px-2 py-2 rounded-xl border-2 text-xs font-semibold transition-colors ${
                          format === f
                            ? "border-[#009850] bg-[#009850]/8 text-[#009850]"
                            : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <span className={format === f ? "text-[#009850]" : "text-gray-400"}>{m.icon}</span>
                        {m.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5">
                  {format === "excel" && "4 hojas: Incidencias · Estado · Tipo · Parroquia"}
                  {format === "pdf" && "Incluye tabla de datos y gráficos del dashboard"}
                  {format === "csv" && "Archivo de texto separado por comas (UTF-8)"}
                </p>
              </div>

              {/* Filtros */}
              <div>
                <div className="flex items-center gap-1.5 mb-3">
                  <Filter className="w-3 h-3 text-gray-400" />
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Filtros</p>
                </div>
                <div className="space-y-3">
                  {tipos.length > 0 && (
                    <FilterDropdown label="Tipo de Evento" options={tipos} selected={selTipo} onChange={setSelTipo} />
                  )}
                  {estados.length > 0 && (
                    <FilterDropdown label="Estado" options={estados} selected={selEstado} onChange={setSelEstado} />
                  )}
                  {parroquiasNombres.length > 0 && (
                    <FilterDropdown label="Parroquia" options={parroquiasNombres} selected={selParroquia} onChange={setSelParroquia} />
                  )}

                  {gravedades.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold text-gray-500 mb-1.5">Gravedad</p>
                      <div className="flex flex-wrap gap-1">
                        {gravedades.map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() =>
                              setSelGravedad((prev) =>
                                prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
                              )
                            }
                            className={`cursor-pointer text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                              selGravedad.includes(g)
                                ? "bg-[#009850] border-[#009850] text-white font-medium"
                                : "border-gray-200 text-gray-600 hover:border-[#009850]/50"
                            }`}
                          >
                            {g}
                          </button>
                        ))}
                        {selGravedad.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setSelGravedad([])}
                            className="cursor-pointer text-[11px] px-1.5 py-1 text-gray-400 hover:text-[#009850]"
                          >
                            × Limpiar
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer fijo — siempre visible */}
            <div className="flex-shrink-0 border-t border-gray-100 px-4 py-3 bg-white">
              <p className="text-[11px] text-gray-400 text-center mb-2.5">
                {filteredData.length === data.length
                  ? `${data.length} registros`
                  : `${filteredData.length} de ${data.length} registros`}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="cursor-pointer flex-1 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors border border-gray-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={exportar}
                  disabled={filteredData.length === 0 || exporting}
                  className="cursor-pointer flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#009850] hover:bg-[#007a40] disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  {exporting ? "Generando…" : "Exportar"}
                </button>
              </div>
            </div>
          </div>

          {/* Panel derecho — vista previa */}
          <div className="flex-1 bg-gray-300 overflow-y-auto flex flex-col items-center p-6 gap-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide self-start">
              Vista previa · {format.toUpperCase()}
            </p>
            {filteredData.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-sm text-gray-500 bg-white rounded-xl px-8 py-12 shadow text-center">
                  <X className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                  Sin registros con los filtros seleccionados
                </div>
              </div>
            ) : (
              <div className="w-full max-w-2xl">
                <ExportPreview format={format} data={filteredData} desde={desde} hasta={hasta} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
