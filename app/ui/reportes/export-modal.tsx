"use client";

import { useState, useRef, useEffect } from "react";
import {
  ChevronDown, Check, X, Filter, Download,
  FileText, FileSpreadsheet,
} from "lucide-react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import {
  type ExportRow, type Conteo, type IncidenciasData,
  type BrigadistasData, type KitsData, type ActividadesData, type ParroquiaRiesgoData,
  unique,
} from "./types";

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

// ─── Helpers de previsualización ─────────────────────────────────────────────

function PreviewHeader({ title, subtitle, periodo }: { title: string; subtitle: string; periodo: string }) {
  return (
    <div className="bg-[#009850] text-white px-4 py-3">
      <p className="text-[11px] font-bold tracking-tight leading-tight">{title}</p>
      <p className="text-[9px] text-green-100 mt-0.5">{subtitle}</p>
      <p className="text-[9px] text-green-200 mt-0.5">Período: {periodo}</p>
    </div>
  );
}

function PreviewKpi({ val, label, color }: { val: string; label: string; color: string }) {
  return (
    <div className="flex-1 border border-gray-100 rounded p-1.5 text-center bg-gray-50/60">
      <div className="text-sm font-bold" style={{ color }}>{val}</div>
      <div className="text-[8px] text-gray-500 leading-tight mt-0.5">{label}</div>
    </div>
  );
}

function PreviewSectionTitle({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-1.5">
      <div className="w-1.5 h-3 bg-[#009850] rounded-sm" />
      <span className="text-[8px] font-bold text-gray-700 uppercase tracking-wide">{title}</span>
    </div>
  );
}

function PreviewBarRow({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <tr>
      <td className="text-[8px] text-gray-700 py-0.5 pr-1 max-w-[80px] truncate">{label}</td>
      <td className="py-0.5 w-20">
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
        </div>
      </td>
      <td className="text-[8px] font-bold text-gray-700 text-right pr-1 w-5">{count}</td>
      <td className="text-[8px] text-gray-400 w-10">{pct.toFixed(1)}%</td>
    </tr>
  );
}

function PreviewFooter() {
  return (
    <div className="flex justify-between text-[7px] text-gray-400 border-t border-gray-100 pt-1 mt-auto">
      <span>Cáritas Lima — Sistema GRD</span>
      <span>Página 1 de 2</span>
    </div>
  );
}

// ─── ExportPreview ────────────────────────────────────────────────────────────
function ExportPreview({
  format, data, desde, hasta, activeTab,
  totales, porEstado, porTipo, porParroquia, incidenciasData,
  brigadistasData, kitsData, actividadesData, parroquiasRiesgo,
}: {
  format: "excel" | "pdf";
  data: ExportRow[];
  desde: string;
  hasta: string;
  activeTab: TabId;
  totales?: ExportModalProps["totales"];
  porEstado?: Conteo[];
  porTipo?: Conteo[];
  porParroquia?: Conteo[];
  incidenciasData?: IncidenciasData;
  brigadistasData?: BrigadistasData;
  kitsData?: KitsData;
  actividadesData?: ActividadesData;
  parroquiasRiesgo?: ParroquiaRiesgoData[];
}) {
  const preview = data.slice(0, 5);
  const cols = ["Codigo", "Fecha", "Tipo", "Gravedad", "Estado", "Parroquia"];
  const headers = ["Código", "Fecha", "Tipo", "Gravedad", "Estado", "Parroquia"];
  const periodo = `${desde} — ${hasta}`;

  if (format === "pdf") {
    const wrap = (children: React.ReactNode) => (
      <div className="bg-white shadow-xl w-full flex flex-col gap-0" style={{ minHeight: 480 }}>
        {children}
      </div>
    );

    // ── Brigadistas ───────────────────────────────────────────────────────
    if (activeTab === "brigadistas" && brigadistasData) {
      const pct = totales?.pctBrigadistasCapacitados ?? 0;
      return wrap(<>
        <PreviewHeader title="REPORTE DE BRIGADISTAS CAPACITADOS" subtitle="Cáritas Lima — Sistema GRD" periodo={periodo} />
        <div className="p-3 space-y-3 flex-1">
          <div className="flex gap-1.5">
            <PreviewKpi val={String(brigadistasData.total)} label="Total Brigadistas" color="#009850" />
            <PreviewKpi val={String(brigadistasData.capacitados)} label="Certificados" color="#009850" />
            <PreviewKpi val={String(brigadistasData.total - brigadistasData.capacitados)} label="Sin Certif." color="#F59E0B" />
            <PreviewKpi val={`${pct}%`} label="% Capacitación" color={pct >= 70 ? "#009850" : "#EF4444"} />
          </div>
          <div>
            <PreviewSectionTitle title="Brigadistas por Parroquia" />
            <table className="w-full">
              <thead><tr className="bg-[#009850]">
                {["Parroquia","Total","Certif.","%","Brecha"].map(h => <th key={h} className="text-[8px] text-white font-semibold px-1.5 py-1 text-left">{h}</th>)}
              </tr></thead>
              <tbody>
                {brigadistasData.porParroquia.slice(0,6).map((p,i) => (
                  <tr key={i} className={i%2===0?"bg-white":"bg-gray-50"}>
                    <td className="text-[8px] text-gray-700 px-1.5 py-0.5 truncate max-w-[100px]">{p.parroquia}</td>
                    <td className="text-[8px] text-gray-700 px-1.5 py-0.5 text-center">{p.total}</td>
                    <td className="text-[8px] text-[#009850] font-bold px-1.5 py-0.5 text-center">{p.capacitados}</td>
                    <td className="text-[8px] font-bold px-1.5 py-0.5 text-center" style={{color: p.pct>=70?"#009850":p.pct>0?"#F59E0B":"#EF4444"}}>{p.pct}%</td>
                    <td className="text-[8px] text-gray-500 px-1.5 py-0.5 text-center">{p.total-p.capacitados}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {brigadistasData.porParroquia.length > 6 && <p className="text-[8px] text-gray-400 text-center mt-1">··· {brigadistasData.porParroquia.length - 6} parroquias más</p>}
          </div>
        </div>
        <div className="px-3 pb-2"><PreviewFooter /></div>
      </>);
    }

    // ── Prevención ────────────────────────────────────────────────────────
    if (activeTab === "prevencion" && actividadesData) {
      const pct = actividadesData.total > 0 ? Math.round((actividadesData.ejecutadas/actividadesData.total)*100) : 0;
      return wrap(<>
        <PreviewHeader title="REPORTE DE ACCIONES PREVENTIVAS" subtitle="Cáritas Lima — Sistema GRD" periodo={periodo} />
        <div className="p-3 space-y-3 flex-1">
          <div className="flex gap-1.5">
            <PreviewKpi val={String(actividadesData.total)} label="Total Actividades" color="#3B82F6" />
            <PreviewKpi val={String(actividadesData.ejecutadas)} label="Ejecutadas" color="#009850" />
            <PreviewKpi val={`${pct}%`} label="Tasa Ejecución" color={pct>=70?"#009850":"#F59E0B"} />
            <PreviewKpi val={String(actividadesData.totalParticipantes)} label="Participantes" color="#9155A8" />
          </div>
          <div>
            <PreviewSectionTitle title="Por Estado" />
            <table className="w-full">
              <tbody>{actividadesData.porEstado.slice(0,5).map((e,i) => <PreviewBarRow key={i} label={e.label} count={e.value} total={actividadesData.total} color="#3B82F6" />)}</tbody>
            </table>
          </div>
          {actividadesData.porParroquia.length > 0 && <div>
            <PreviewSectionTitle title="Top Parroquias" />
            <table className="w-full">
              <tbody>{actividadesData.porParroquia.slice(0,4).map((p,i) => <PreviewBarRow key={i} label={p.label} count={p.value} total={actividadesData.total} color="#9155A8" />)}</tbody>
            </table>
          </div>}
        </div>
        <div className="px-3 pb-2"><PreviewFooter /></div>
      </>);
    }

    // ── Kits ──────────────────────────────────────────────────────────────
    if (activeTab === "kits" && kitsData) {
      const stock = kitsData.stockActual.reduce((s,k) => s+k.stockActual, 0);
      return wrap(<>
        <PreviewHeader title="REPORTE DE KITS ENTREGADOS" subtitle="Cáritas Lima — Sistema GRD" periodo={periodo} />
        <div className="p-3 space-y-3 flex-1">
          <div className="flex gap-1.5">
            <PreviewKpi val={String(kitsData.totalEntregados)} label="Distribuidas" color="#9155A8" />
            <PreviewKpi val={String(kitsData.porParroquia.length)} label="Parroquias" color="#3B82F6" />
            <PreviewKpi val={String(kitsData.porTipo.length)} label="Tipos" color="#F59E0B" />
            <PreviewKpi val={String(stock)} label="Stock" color="#009850" />
          </div>
          {kitsData.porParroquia.length > 0 && <div>
            <PreviewSectionTitle title="Por Parroquia" />
            <table className="w-full">
              <tbody>{kitsData.porParroquia.slice(0,5).map((p,i) => <PreviewBarRow key={i} label={p.label} count={p.value} total={kitsData.totalEntregados} color="#9155A8" />)}</tbody>
            </table>
          </div>}
          {kitsData.porTipo.length > 0 && <div>
            <PreviewSectionTitle title="Por Tipo de Kit" />
            <table className="w-full">
              <tbody>{kitsData.porTipo.slice(0,4).map((t,i) => <PreviewBarRow key={i} label={t.label} count={t.value} total={kitsData.totalEntregados} color="#F59E0B" />)}</tbody>
            </table>
          </div>}
        </div>
        <div className="px-3 pb-2"><PreviewFooter /></div>
      </>);
    }

    // ── Afectación ────────────────────────────────────────────────────────
    if (activeTab === "riesgo" && parroquiasRiesgo) {
      const counts = {CRÍTICO:0,ALTO:0,MEDIO:0,BAJO:0} as Record<string,number>;
      parroquiasRiesgo.forEach(p => counts[p.riesgoNivel]++);
      const nivelColors: Record<string,string> = {CRÍTICO:"#EF4444",ALTO:"#F97316",MEDIO:"#F59E0B",BAJO:"#009850"};
      return wrap(<>
        <PreviewHeader title="REPORTE DE AFECTACIÓN PARROQUIAL" subtitle="Nivel de afectación estimado" periodo={periodo} />
        <div className="p-3 space-y-3 flex-1">
          <div className="flex gap-1.5">
            {(["CRÍTICO","ALTO","MEDIO","BAJO"] as const).map(n => <PreviewKpi key={n} val={String(counts[n])} label={`Riesgo ${n}`} color={nivelColors[n]} />)}
          </div>
          <div>
            <PreviewSectionTitle title="Ranking de Parroquias por Nivel de Afectación Estimada" />
            <table className="w-full">
              <thead><tr className="bg-[#009850]">
                {["#","Parroquia","Nivel","Casos","Brigadistas","%Cert.","Plan"].map(h => <th key={h} className="text-[7px] text-white font-semibold px-1 py-1 text-left">{h}</th>)}
              </tr></thead>
              <tbody>
                {parroquiasRiesgo.slice(0,7).map((p,i) => (
                  <tr key={i} className={i%2===0?"bg-white":"bg-gray-50"}>
                    <td className="text-[7px] text-gray-400 px-1 py-0.5">{i+1}</td>
                    <td className="text-[7px] text-gray-700 px-1 py-0.5 truncate max-w-[80px]">{p.nombre}</td>
                    <td className="text-[7px] font-bold px-1 py-0.5" style={{color:nivelColors[p.riesgoNivel]}}>{p.riesgoNivel}</td>
                    <td className="text-[7px] text-gray-700 px-1 py-0.5 text-center">{p.incidencias}</td>
                    <td className="text-[7px] text-gray-700 px-1 py-0.5 text-center">{p.brigadistas}</td>
                    <td className="text-[7px] text-gray-700 px-1 py-0.5 text-center">{p.pctCapacitados}%</td>
                    <td className="text-[7px] px-1 py-0.5" style={{color:p.tienePlan?"#009850":"#EF4444"}}>{p.tienePlan?"Sí":"No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parroquiasRiesgo.length > 7 && <p className="text-[7px] text-gray-400 text-center mt-1">··· {parroquiasRiesgo.length - 7} parroquias más</p>}
          </div>
        </div>
        <div className="px-3 pb-2"><PreviewFooter /></div>
      </>);
    }

    // ── Resumen General / Casos ───────────────────────────────────────────
    const titulo = activeTab === "casos" ? "REPORTE MENSUAL DE CASOS ATENDIDOS" : "REPORTE GENERAL DEL SISTEMA GRD";
    return wrap(<>
      <PreviewHeader title={titulo} subtitle="Cáritas Lima — Sistema GRD" periodo={periodo} />
      <div className="p-3 space-y-3 flex-1">
        <div className="flex gap-1">
          <PreviewKpi val={String(totales?.incidencias ?? data.length)} label="Incidencias" color="#EF4444" />
          <PreviewKpi val={`${totales?.pctBrigadistasCapacitados ?? 0}%`} label="Brig. Certif." color="#009850" />
          <PreviewKpi val={`${totales?.pctParroquiasPlan ?? 0}%`} label="Con Plan GRD" color="#3B82F6" />
          <PreviewKpi val={`${totales?.pctActividadesEjecutadas ?? 0}%`} label="Actividades" color="#F59E0B" />
          <PreviewKpi val={String(totales?.kitsEntregados ?? 0)} label="Kits" color="#9155A8" />
        </div>
        {[
          { label: "Brigadistas Certificados", pct: totales?.pctBrigadistasCapacitados ?? 0, color: "#009850" },
          { label: "Parroquias con Plan GRD",  pct: totales?.pctParroquiasPlan ?? 0,            color: "#009850" },
          { label: "Actividades Ejecutadas",   pct: totales?.pctActividadesEjecutadas ?? 0,     color: "#F59E0B" },
        ].map(op => (
          <div key={op.label} className="space-y-0.5">
            <div className="flex justify-between text-[8px]">
              <span className="font-semibold text-gray-700">{op.label}</span>
              <span className="font-bold" style={{ color: op.color }}>{op.pct}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${op.pct}%`, background: op.color }} />
            </div>
          </div>
        ))}
        {porEstado && porEstado.length > 0 && <div>
          <PreviewSectionTitle title="Distribución por Estado" />
          <table className="w-full">
            <tbody>{porEstado.slice(0,5).map((e,i) => <PreviewBarRow key={i} label={e.label} count={e.value} total={data.length || 1} color="#009850" />)}</tbody>
          </table>
        </div>}
        {incidenciasData?.porGravedad && incidenciasData.porGravedad.length > 0 && <div>
          <PreviewSectionTitle title="Por Gravedad" />
          <table className="w-full">
            <tbody>{incidenciasData.porGravedad.slice(0,4).map((g,i) => <PreviewBarRow key={i} label={g.label} count={g.value} total={data.length||1} color="#EF4444" />)}</tbody>
          </table>
        </div>}
      </div>
      <div className="px-3 pb-2"><PreviewFooter /></div>
    </>);
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

  return null;
}

// ─── ExportModal ──────────────────────────────────────────────────────────────
type TabId = "resumen" | "casos" | "brigadistas" | "prevencion" | "kits" | "riesgo";

interface ExportModalProps {
  data: ExportRow[];
  parroquias: { id: string; nombre: string }[];
  onClose: () => void;
  desde: string;
  hasta: string;
  activeTab?: TabId;
  totales?: {
    incidencias: number;
    pctBrigadistasCapacitados: number;
    pctParroquiasPlan: number;
    pctActividadesEjecutadas: number;
    kitsEntregados: number;
    tiempoPromedio: number;
    totalBrigadistas: number;
    brigadistasCapacitados: number;
    totalParroquias: number;
    parroquiasConPlan: number;
  };
  porEstado?: Conteo[];
  porTipo?: Conteo[];
  porParroquia?: Conteo[];
  incidenciasData?: IncidenciasData;
  brigadistasData?: BrigadistasData;
  kitsData?: KitsData;
  actividadesData?: ActividadesData;
  parroquiasRiesgo?: ParroquiaRiesgoData[];
}

export function ExportModal({
  data, parroquias, onClose, desde, hasta,
  activeTab = "resumen",
  totales, porEstado, porTipo, porParroquia, incidenciasData,
  brigadistasData, kitsData, actividadesData, parroquiasRiesgo,
}: ExportModalProps) {
  const tipos = unique(data, "Tipo");
  const estados = unique(data, "Estado");
  const gravedades = unique(data, "Gravedad");
  // Usa el listado completo de parroquias, no solo las que aparecen en los datos
  const parroquiasNombres = parroquias.map(p => p.nombre).sort();

  const [format, setFormat] = useState<"excel" | "pdf">("pdf");
  const [selTipo, setSelTipo] = useState<string[]>([]);
  const [selEstado, setSelEstado] = useState<string[]>([]);
  const [selGravedad, setSelGravedad] = useState<string[]>([]);
  const [selParroquia, setSelParroquia] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);

  const filteredData = data.filter((row) => {
    if (selTipo.length > 0 && !selTipo.includes(String(row.Tipo))) return false;
    if (selEstado.length > 0 && !selEstado.includes(String(row.Estado))) return false;
    if (selGravedad.length > 0 && !selGravedad.includes(String(row.Gravedad))) return false;
    if (selParroquia.length > 0 && !selParroquia.includes(String(row.Parroquia))) return false;
    return true;
  });

  async function exportar() {
    setExporting(true);
    const fmtDate = (iso: string) => { const [y, m, d] = iso.split("-"); return `${d}-${m}-${y}`; };
    const nombre = `ReporteGeneral_Caritas_${fmtDate(desde)}_${fmtDate(hasta)}`;

    // ── Distribuciones efectivas de incidencias (compartidas por Excel y PDF) ──
    // Sin filtros en el modal: se usan los mismos arreglos que pinta la pantalla
    // (mismo orden, valores y colores → el export es idéntico a lo que se ve).
    // Con filtros activos: se recalculan desde las filas ya filtradas para que
    // KPIs, gráficos y tablas del reporte sean coherentes entre sí.
    const filtrosActivos =
      selTipo.length > 0 || selEstado.length > 0 || selGravedad.length > 0 || selParroquia.length > 0;
    const groupCount = (key: string, exclude: string[] = []): Conteo[] => {
      const m: Record<string, number> = {};
      filteredData.forEach((r) => {
        const v = String(r[key] ?? "").trim();
        if (!v || exclude.includes(v)) return;
        m[v] = (m[v] || 0) + 1;
      });
      return Object.entries(m).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
    };
    const effPorEstado: Conteo[] = filtrosActivos ? groupCount("Estado") : (porEstado ?? []);
    const effPorTipo: Conteo[] = filtrosActivos ? groupCount("Tipo", ["-"]) : (porTipo ?? []);
    const effPorParroquia: Conteo[] = filtrosActivos ? groupCount("Parroquia") : (porParroquia ?? []);
    const effGravedad: Conteo[] = filtrosActivos ? groupCount("Gravedad", ["-"]) : (incidenciasData?.porGravedad ?? []);
    const incCount = filtrosActivos ? filteredData.length : (totales?.incidencias ?? filteredData.length);

    if (format === "excel") {
      const wb = XLSX.utils.book_new();
      // Excel limita los nombres de hoja a 31 chars; una hoja vacía usa [{}] como placeholder.
      const addSheet = (rows: Record<string, string | number>[], name: string) =>
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.length ? rows : [{}]), name.slice(0, 31));

      // Cada pestaña exporta los MISMOS datos que muestra en pantalla (espejo del PDF).
      if (activeTab === "brigadistas" && brigadistasData) {
        addSheet([
          { Indicador: "Total brigadistas", Valor: brigadistasData.total },
          { Indicador: "Certificados", Valor: brigadistasData.capacitados },
          { Indicador: "Sin certificación", Valor: brigadistasData.total - brigadistasData.capacitados },
          { Indicador: "% certificación", Valor: `${totales?.pctBrigadistasCapacitados ?? 0}%` },
        ], "Resumen");
        addSheet(brigadistasData.porParroquia.map((p) => ({
          Parroquia: p.parroquia, Total: p.total, Certificados: p.capacitados,
          "% Certificación": p.pct, Brecha: p.total - p.capacitados,
        })), "Brigadistas por Parroquia");
      } else if (activeTab === "prevencion" && actividadesData) {
        const pctEjec = actividadesData.total > 0 ? Math.round((actividadesData.ejecutadas / actividadesData.total) * 100) : 0;
        addSheet([
          { Indicador: "Total actividades", Valor: actividadesData.total },
          { Indicador: "Ejecutadas", Valor: actividadesData.ejecutadas },
          { Indicador: "% ejecución", Valor: `${pctEjec}%` },
          { Indicador: "Participantes", Valor: actividadesData.totalParticipantes },
        ], "Resumen");
        addSheet(actividadesData.porEstado.map((e) => ({ Estado: e.label, Cantidad: e.value })), "Por Estado");
        addSheet(actividadesData.porTipo.map((t) => ({ Tipo: t.label, Cantidad: t.value })), "Por Tipo");
        addSheet(actividadesData.porParroquia.map((p) => ({ Parroquia: p.label, Cantidad: p.value })), "Por Parroquia");
      } else if (activeTab === "kits" && kitsData) {
        addSheet([
          { Indicador: "Unidades distribuidas", Valor: kitsData.totalEntregados },
          { Indicador: "Parroquias beneficiadas", Valor: kitsData.porParroquia.filter((p) => p.value > 0).length },
          { Indicador: "Tipos de kit", Valor: kitsData.porTipo.length },
          { Indicador: "Stock registrado", Valor: kitsData.stockActual.reduce((s, k) => s + k.stockActual, 0) },
        ], "Resumen");
        addSheet(kitsData.porParroquia.map((p) => ({ Parroquia: p.label, Unidades: p.value })), "Por Parroquia");
        addSheet(kitsData.porTipo.map((t) => ({ Tipo: t.label, Unidades: t.value })), "Por Tipo");
        addSheet(kitsData.stockActual.map((k) => ({
          "Tipo de Kit": k.tipoKit, "Stock Actual": k.stockActual, "Nro. Registros": k.total,
        })), "Stock Actual");
      } else if (activeTab === "riesgo" && parroquiasRiesgo) {
        addSheet(parroquiasRiesgo.map((p, i) => ({
          "#": i + 1, Parroquia: p.nombre, Nivel: p.riesgoNivel, Score: p.riesgoScore,
          Incidencias: p.incidencias, Brigadistas: p.brigadistas, "% Certif.": p.pctCapacitados,
          Plan: p.tienePlan ? "Sí" : "No",
          "Act. Ejecutadas": p.actividadesEjecutadas, "Act. Total": p.actividadesTotal,
        })), "Afectación Parroquial");
      } else if (activeTab === "resumen" && totales) {
        addSheet([
          { Indicador: "Incidencias", Valor: incCount },
          { Indicador: "Brigadistas certificados", Valor: `${totales.brigadistasCapacitados}/${totales.totalBrigadistas} (${totales.pctBrigadistasCapacitados}%)` },
          { Indicador: "Parroquias con plan GRD", Valor: `${totales.parroquiasConPlan}/${totales.totalParroquias} (${totales.pctParroquiasPlan}%)` },
          { Indicador: "Actividades ejecutadas", Valor: `${totales.pctActividadesEjecutadas}%` },
          { Indicador: "Kits entregados", Valor: totales.kitsEntregados },
          { Indicador: "Días promedio de atención", Valor: totales.tiempoPromedio },
        ], "Resumen del Sistema");
        if (effPorEstado.length) addSheet(effPorEstado.map((e) => ({ Estado: e.label, Cantidad: e.value })), "Incidencias por Estado");
        if (effGravedad.length) addSheet(effGravedad.map((g) => ({ Gravedad: g.label, Cantidad: g.value })), "Incidencias por Gravedad");
      } else {
        // Casos (y fallback): detalle de incidencias del período + distribuciones.
        addSheet(filteredData, "Incidencias");
        const byEstado = [...new Set(filteredData.map((r) => String(r.Estado)))].map((e) => ({
          Estado: e, Cantidad: filteredData.filter((r) => r.Estado === e).length,
        }));
        addSheet(byEstado, "Por Estado");
        const byTipo = [...new Set(filteredData.map((r) => String(r.Tipo)))].map((t) => ({
          Tipo: t, Cantidad: filteredData.filter((r) => r.Tipo === t).length,
        }));
        addSheet(byTipo, "Por Tipo");
        const byParr = [...new Set(filteredData.map((r) => String(r.Parroquia)))].map((p) => ({
          Parroquia: p, Cantidad: filteredData.filter((r) => r.Parroquia === p).length,
        }));
        addSheet(byParr, "Por Parroquia");
      }
      XLSX.writeFile(wb, `${nombre}_${activeTab}.xlsx`);
    } else {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      // ── Constantes y utilidades ──────────────────────────────────────────
      const pageW = 210; const pageH = 297; const mg = 14;
      const contentW = pageW - mg * 2;
      const G: [number, number, number] = [0, 152, 80];
      const today = new Date().toLocaleDateString("es-PE");
      const periodo = `${desde} a ${hasta}`;

      // Sanitiza texto: jsPDF/helvetica no renderiza bien tildes en mayus ni simbolos especiales
      const s = (t: string) => t
        .replace(/[ÁÀÂÄ]/g,"A").replace(/[ÉÈÊË]/g,"E").replace(/[ÍÌÎÏ]/g,"I")
        .replace(/[ÓÒÔÖ]/g,"O").replace(/[ÚÙÛÜ]/g,"U").replace(/Ñ/g,"N")
        .replace(/[áàâä]/g,"a").replace(/[éèêë]/g,"e").replace(/[íìîï]/g,"i")
        .replace(/[óòôö]/g,"o").replace(/[úùûü]/g,"u").replace(/ñ/g,"n")
        .replace(/[≥]/g,">=").replace(/[≤]/g,"<=").replace(/[–—]/g,"-")
        .replace(/[""]/g,'"').replace(/['']/g,"'");

      // ── Encabezado de página principal ───────────────────────────────────
      const drawCover = (titulo: string, subtitulo: string) => {
        // Fondo verde superior
        doc.setFillColor(...G); doc.rect(0, 0, pageW, 38, "F");
        // Título
        doc.setFontSize(18); doc.setFont("helvetica", "bold"); doc.setTextColor(255, 255, 255);
        doc.text(s(titulo), pageW / 2, 13, { align: "center" });
        // Subtítulo
        doc.setFontSize(8.5); doc.setFont("helvetica", "normal");
        doc.text(s(subtitulo), pageW / 2, 20, { align: "center" });
        // Org
        doc.setFontSize(7.5); doc.setTextColor(200, 255, 220);
        doc.text("Caritas Lima — Sistema GRD", pageW / 2, 26, { align: "center" });
        // Periodo
        doc.text(`Periodo: ${s(periodo)}  ·  Exportado el ${today}`, pageW / 2, 32, { align: "center" });
      };

      const drawBandHeader = (titulo: string) => {
        doc.setFillColor(...G); doc.rect(0, 0, pageW, 10, "F");
        doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(255, 255, 255);
        doc.text(s(`${titulo} — Caritas Lima`), mg, 6.5);
        doc.text(s(periodo), pageW - mg, 6.5, { align: "right" });
      };

      const drawFooter = (pageNum: number, total: number) => {
        doc.setFillColor(245, 247, 250); doc.rect(0, pageH - 10, pageW, 10, "F");
        doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.3);
        doc.line(0, pageH - 10, pageW, pageH - 10);
        doc.setFontSize(7); doc.setFont("helvetica", "italic"); doc.setTextColor(150, 150, 150);
        doc.text(`Caritas Lima — Sistema GRD | Generado el ${today}`, mg, pageH - 4);
        doc.text(`Pagina ${pageNum} de ${total}`, pageW - mg, pageH - 4, { align: "right" });
      };

      // Bloque de firmas: 3 columnas (Elaborado / Revisado / V°B°) ancladas
      // sobre el pie. Si el contenido llega muy abajo, agrega una página.
      const drawFirmas = (yActual: number, banda: string) => {
        const yF = pageH - 42;
        if (yActual > yF) {
          doc.addPage();
          drawBandHeader(banda);
        }
        const roles = ["Elaborado por", "Revisado por", "V° B° Jefatura OGP"];
        const colW = contentW / 3;
        roles.forEach((rol, i) => {
          const cx = mg + colW * i + colW / 2;
          const lineW = colW - 18;
          doc.setDrawColor(120, 120, 120); doc.setLineWidth(0.3);
          doc.line(cx - lineW / 2, yF + 16, cx + lineW / 2, yF + 16);
          doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(31, 41, 55);
          doc.text(s(rol), cx, yF + 21, { align: "center" });
          doc.setFontSize(6.5); doc.setFont("helvetica", "normal"); doc.setTextColor(120, 120, 120);
          doc.text("Nombre / Cargo / Fecha", cx, yF + 25, { align: "center" });
        });
      };

      const sectionTitle = (title: string, y: number): number => {
        doc.setFillColor(...G); doc.rect(mg, y, 3, 5.5, "F");
        doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(31, 41, 55);
        doc.text(s(title), mg + 5, y + 4.5);
        doc.setDrawColor(229, 231, 235); doc.setLineWidth(0.4);
        doc.line(mg, y + 7, pageW - mg, y + 7);
        return y + 11;
      };

      // KPI boxes con fondo de color sólido (ejecutivo)
      const kpiRow = (items: { val: string; lbl: string; color: [number,number,number]; bg?: [number,number,number] }[], y: number): number => {
        const w = contentW / items.length;
        items.forEach((k, i) => {
          const x = mg + i * w;
          const bg = k.bg ?? [k.color[0], k.color[1], k.color[2]] as [number,number,number];
          // Fondo de color con opacidad visual
          doc.setFillColor(bg[0], bg[1], bg[2]);
          doc.roundedRect(x + 1, y, w - 2, 26, 3, 3, "F");
          // Valor grande
          doc.setFontSize(20); doc.setFont("helvetica", "bold"); doc.setTextColor(255, 255, 255);
          doc.text(k.val, x + w / 2, y + 12, { align: "center" });
          // Label — bloque centrado verticalmente (1 o 2 líneas) para alinear todas las cajas
          doc.setFontSize(6.5); doc.setFont("helvetica", "bold"); doc.setTextColor(255, 255, 255);
          const lblLines = k.lbl.split("\n");
          const lblStartY = y + 20 - (lblLines.length - 1) * 2;
          lblLines.forEach((ln, li) => doc.text(s(ln), x + w / 2, lblStartY + li * 4, { align: "center" }));
        });
        return y + 31;
      };

      // Barra horizontal proporcional visual (para distribuciones)
      const drawStackedBar = (
        items: { label: string; value: number; color: [number,number,number] }[],
        x: number, y: number, w: number, h: number
      ) => {
        const total = items.reduce((s, d) => s + d.value, 0);
        if (total === 0) { doc.setFillColor(229,231,235); doc.rect(x,y,w,h,"F"); return; }
        let cx = x;
        items.forEach(d => {
          const dw = (d.value / total) * w;
          if (dw < 0.5) return;
          doc.setFillColor(...d.color); doc.rect(cx, y, dw, h, "F");
          if (dw > 12) {
            doc.setFontSize(7); doc.setFont("helvetica","bold"); doc.setTextColor(255,255,255);
            doc.text(`${Math.round((d.value/total)*100)}%`, cx + dw/2, y + h/2 + 2.5, { align:"center" });
          }
          cx += dw;
        });
      };

      // Barra horizontal individual con bar visual grande
      const distRow = (label: string, count: number, total: number, color: [number,number,number], y: number, rowBg: boolean): number => {
        const rowH = 8;
        if (rowBg) { doc.setFillColor(248,250,249); doc.rect(mg,y,contentW,rowH,"F"); }
        const pct = total > 0 ? (count/total)*100 : 0;
        const barW = 60; const barH = 3.5;
        doc.setFontSize(7.5); doc.setFont("helvetica","normal"); doc.setTextColor(31,41,55);
        doc.text(s(label), mg+2, y+5);
        // Bar track
        doc.setFillColor(229,231,235); doc.rect(mg+72, y+2.2, barW, barH, "F");
        // Bar fill
        if (pct>0) { doc.setFillColor(...color); doc.rect(mg+72, y+2.2, (barW*pct)/100, barH, "F"); }
        doc.setFont("helvetica","bold"); doc.setTextColor(31,41,55);
        doc.text(String(count), mg+136, y+5, { align:"right" });
        doc.setFont("helvetica","normal"); doc.setTextColor(107,114,128);
        doc.text(`${pct.toFixed(1)}%`, mg+152, y+5, { align:"right" });
        return y + rowH;
      };

      // Chart de barras verticales (nativo jsPDF)
      const drawVertBars = (
        data: { label: string; value: number }[],
        x: number, y: number, w: number, h: number,
        color: [number,number,number]
      ) => {
        if (data.length === 0) return;
        const maxVal = Math.max(...data.map(d=>d.value), 1);
        const n = data.length;
        const slotW = w / n;
        const barW = Math.min(slotW * 0.6, 16);
        const chartH = h - 18;
        // Grid lines
        doc.setDrawColor(240,240,240); doc.setLineWidth(0.2);
        [0.25, 0.5, 0.75, 1].forEach(pct => {
          const gy = y + chartH * (1 - pct);
          doc.line(x, gy, x+w, gy);
          doc.setFontSize(5.5); doc.setFont("helvetica","normal"); doc.setTextColor(180,180,180);
          doc.text(String(Math.round(maxVal*pct)), x-1, gy+1, { align:"right" });
        });
        data.forEach((d, i) => {
          const bh = Math.max((d.value/maxVal)*chartH, 0.5);
          const bx = x + i*slotW + (slotW-barW)/2;
          const by = y + chartH - bh;
          // Shadow effect
          doc.setFillColor(color[0]-20<0?0:color[0]-20, color[1]-20<0?0:color[1]-20, color[2]-20<0?0:color[2]-20);
          doc.rect(bx+0.8, by+0.8, barW, bh, "F");
          doc.setFillColor(...color); doc.rect(bx, by, barW, bh, "F");
          // Value label
          doc.setFontSize(6.5); doc.setFont("helvetica","bold"); doc.setTextColor(31,41,55);
          if (bh > 3) doc.text(String(d.value), bx+barW/2, by-2, { align:"center" });
          // X label — 2 líneas si es largo
          doc.setFontSize(6); doc.setFont("helvetica","normal"); doc.setTextColor(107,114,128);
          const lblLines = doc.splitTextToSize(s(d.label), slotW - 1);
          lblLines.slice(0, 2).forEach((ln: string, li: number) => {
            doc.text(ln, bx+barW/2, y+chartH+5+li*4, { align:"center" });
          });
        });
        // Baseline
        doc.setDrawColor(200,200,200); doc.setLineWidth(0.5);
        doc.line(x, y+chartH, x+w, y+chartH);
      };

      // Sector de pie nativo (sin DOM SVG)
      const drawPieSector = (cx: number, cy: number, r: number, startDeg: number, endDeg: number, color: [number,number,number]) => {
        if (endDeg - startDeg < 0.3) return;
        const steps = Math.max(Math.ceil((endDeg - startDeg) / 4), 8);
        const toR = (d: number) => (d - 90) * Math.PI / 180;
        const pts: [number,number][] = [[cx, cy]];
        for (let i = 0; i <= steps; i++) {
          const a = toR(startDeg + (endDeg - startDeg) * i / steps);
          pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
        }
        const linePairs: [number,number][] = pts.slice(1).map((p, i) => [p[0]-pts[i][0], p[1]-pts[i][1]]);
        linePairs.push([cx - pts[pts.length-1][0], cy - pts[pts.length-1][1]]);
        doc.setFillColor(...color); doc.setDrawColor(...color); doc.setLineWidth(0.1);
        doc.lines(linePairs, pts[0][0], pts[0][1], [1,1], "FD", true);
      };

      const drawDonut = (
        items: {label: string; value: number; color: [number,number,number]}[],
        cx: number, cy: number, r: number, innerR: number,
        legendX: number, legendY: number, legendSpacing = 10
      ) => {
        const total = items.reduce((s, d) => s + d.value, 0);
        if (total === 0) return;
        let angle = 0;
        items.forEach(d => {
          const sweep = (d.value / total) * 360;
          if (sweep > 0.3) drawPieSector(cx, cy, r, angle, angle + sweep, d.color);
          angle += sweep;
        });
        // Agujero blanco
        doc.setFillColor(255,255,255); doc.setDrawColor(255,255,255);
        doc.circle(cx, cy, innerR, "F");
        // Texto central
        const pctMain = Math.round((items[0].value / total) * 100);
        doc.setFontSize(9); doc.setFont("helvetica","bold"); doc.setTextColor(31,41,55);
        doc.text(`${pctMain}%`, cx, cy + 2, {align:"center"});
        doc.setFontSize(5.5); doc.setFont("helvetica","normal"); doc.setTextColor(107,114,128);
        doc.text(s(items[0].label.split(" ")[0]), cx, cy + 6.5, {align:"center"});
        // Leyenda
        items.forEach((d, i) => {
          const ly = legendY + i * legendSpacing;
          doc.setFillColor(...d.color); doc.rect(legendX, ly, 4, 4, "F");
          const pct = Math.round((d.value / total) * 100);
          doc.setFontSize(7); doc.setFont("helvetica","normal"); doc.setTextColor(31,41,55);
          doc.text(s(d.label), legendX + 6, ly + 3);
          doc.setFont("helvetica","bold"); doc.setTextColor(...d.color);
          doc.text(`${d.value}  (${pct}%)`, legendX + 6, ly + 7.5);
        });
      };

      // Paleta de colores equivalente a PALETTE del UI (barras por tipo)
      const JSPDF_PALETTE: [number,number,number][] = [
        [0,152,80],[59,130,246],[245,158,11],[239,68,68],
        [145,85,168],[249,115,22],[0,200,180],[236,72,153],
      ];
      // Paleta equivalente a COLORS del UI (pasteles de estado/gravedad) —
      // debe ser idéntica a la de la pantalla para que un mismo estado salga
      // del mismo color en el reporte y en la vista.
      const JSPDF_COLORS: [number,number,number][] = [
        [0,152,80],[255,195,0],[255,130,60],[239,68,68],
        [59,130,246],[145,85,168],[0,200,180],[249,115,22],
      ];

      // Barras verticales con color por barra (igual que el UI)
      const drawVertBarsColored = (
        data: {label: string; value: number}[],
        x: number, y: number, w: number, h: number,
        palette: [number,number,number][]
      ) => {
        if (data.length === 0) return;
        const maxVal = Math.max(...data.map(d=>d.value), 1);
        const n = data.length;
        const slotW = w / n;
        const barW = Math.min(slotW * 0.6, 16);
        const chartH = h - 18;
        doc.setDrawColor(240,240,240); doc.setLineWidth(0.2);
        [0.25,0.5,0.75,1].forEach(pct => {
          const gy = y + chartH*(1-pct);
          doc.line(x,gy,x+w,gy);
          doc.setFontSize(5.5); doc.setFont("helvetica","normal"); doc.setTextColor(180,180,180);
          doc.text(String(Math.round(maxVal*pct)), x-1, gy+1, {align:"right"});
        });
        data.forEach((d,i) => {
          const col = palette[i % palette.length];
          const bh = Math.max((d.value/maxVal)*chartH, 0.5);
          const bx = x + i*slotW + (slotW-barW)/2;
          const by = y + chartH - bh;
          doc.setFillColor(Math.max(0,col[0]-20),Math.max(0,col[1]-20),Math.max(0,col[2]-20));
          doc.rect(bx+0.8,by+0.8,barW,bh,"F");
          doc.setFillColor(...col); doc.rect(bx,by,barW,bh,"F");
          doc.setFontSize(6.5); doc.setFont("helvetica","bold"); doc.setTextColor(31,41,55);
          if (bh > 3) doc.text(String(d.value), bx+barW/2, by-2, {align:"center"});
          doc.setFontSize(6); doc.setFont("helvetica","normal"); doc.setTextColor(107,114,128);
          const lblLines2 = doc.splitTextToSize(s(d.label), slotW - 1);
          lblLines2.slice(0, 2).forEach((ln: string, li: number) => {
            doc.text(ln, bx+barW/2, y+chartH+5+li*4, {align:"center"});
          });
        });
        doc.setDrawColor(200,200,200); doc.setLineWidth(0.5);
        doc.line(x, y+chartH, x+w, y+chartH);
      };

      // Gráfico de línea nativo para tendencia temporal
      const drawLineChart = (
        data: {label: string; value: number}[],
        x: number, y: number, w: number, h: number,
        color: [number,number,number]
      ) => {
        if (data.length < 1) return;
        const chartH = h - 18;
        const maxVal = Math.max(...data.map(d=>d.value), 1);
        doc.setDrawColor(240,240,240); doc.setLineWidth(0.2);
        [0.25,0.5,0.75,1].forEach(pct => {
          const gy = y + chartH*(1-pct);
          doc.line(x,gy,x+w,gy);
          doc.setFontSize(5.5); doc.setFont("helvetica","normal"); doc.setTextColor(180,180,180);
          doc.text(String(Math.round(maxVal*pct)), x-1, gy+1.5, {align:"right"});
        });
        if (data.length === 1) {
          const px2 = x + w/2, py2 = y + chartH - (data[0].value/maxVal)*chartH;
          doc.setFillColor(...color); doc.circle(px2, py2, 2.5, "F");
          doc.setFontSize(7); doc.setFont("helvetica","bold"); doc.setTextColor(31,41,55);
          doc.text(String(data[0].value), px2, py2-4, {align:"center"});
        } else {
          const pts2 = data.map((d,i) => [x + (i/(data.length-1))*w, y + chartH - (d.value/maxVal)*chartH] as [number,number]);
          // Línea de tendencia
          doc.setDrawColor(...color); doc.setLineWidth(1.5);
          for (let i=0; i<pts2.length-1; i++) doc.line(pts2[i][0],pts2[i][1],pts2[i+1][0],pts2[i+1][1]);
          // Puntos
          pts2.forEach((p,i) => {
            doc.setFillColor(255,255,255); doc.circle(p[0],p[1],2,"F");
            doc.setFillColor(...color); doc.circle(p[0],p[1],1.3,"F");
            doc.setFontSize(6); doc.setFont("helvetica","bold"); doc.setTextColor(31,41,55);
            if (data[i].value > 0) doc.text(String(data[i].value), p[0], p[1]-3.5, {align:"center"});
          });
        }
        // Etiquetas X
        doc.setFontSize(6); doc.setFont("helvetica","normal"); doc.setTextColor(107,114,128);
        data.forEach((d,i) => {
          const lx2 = data.length>1 ? x+(i/(data.length-1))*w : x+w/2;
          doc.text(d.label, lx2, y+chartH+8, {align:"center"});
        });
        doc.setDrawColor(200,200,200); doc.setLineWidth(0.5);
        doc.line(x, y+chartH, x+w, y+chartH);
      };

      const totalInc = filteredData.length;
      const nombreArchivo = `Reporte_GRD_${activeTab}_${desde}_al_${hasta}`;

      // ── Switch por sección activa ────────────────────────────────────────
      let totalPages = 2;

      if (activeTab === "brigadistas" && brigadistasData) {
        // ── PDF EJECUTIVO: Brigadistas Capacitados ────────────────────────
        const pctGlobal = totales?.pctBrigadistasCapacitados ?? 0;
        drawCover("BRIGADISTAS CAPACITADOS", "Capacitacion y certificacion del personal de campo");
        let y = 44;

        y = kpiRow([
          { val: String(brigadistasData.total),  lbl: "Total\nBrigadistas",   color: [255,255,255], bg: [59,130,246] },
          { val: String(brigadistasData.capacitados), lbl: "Certificados",    color: [255,255,255], bg: [0,152,80] },
          { val: String(brigadistasData.total - brigadistasData.capacitados), lbl: "Sin\nCertificacion", color: [255,255,255], bg: [245,158,11] },
          { val: `${pctGlobal}%`, lbl: "Nivel de\nCertificacion", color: [255,255,255], bg: pctGlobal >= 70 ? [0,152,80] : pctGlobal >= 40 ? [245,158,11] : [239,68,68] },
        ], y);

        // Barra de progreso visual general
        y += 2;
        doc.setFontSize(8); doc.setFont("helvetica","bold"); doc.setTextColor(31,41,55);
        doc.text("Nivel de certificacion general", mg, y+4);
        doc.setFontSize(8); doc.setFont("helvetica","bold");
        doc.setTextColor(pctGlobal >= 70 ? 0 : 200, pctGlobal >= 70 ? 152 : pctGlobal >= 40 ? 100 : 50, pctGlobal >= 70 ? 80 : 0);
        doc.text(`${pctGlobal}%`, pageW-mg, y+4, { align:"right" });
        doc.setFillColor(229,231,235); doc.rect(mg, y+6, contentW, 5, "F");
        if (pctGlobal > 0) {
          doc.setFillColor(pctGlobal>=70?0:pctGlobal>=40?245:239, pctGlobal>=70?152:pctGlobal>=40?158:68, pctGlobal>=70?80:pctGlobal>=40?11:68);
          doc.rect(mg, y+6, (contentW*pctGlobal)/100, 5, "F");
        }
        // Meta label
        doc.setFontSize(6); doc.setFont("helvetica","normal"); doc.setTextColor(150,150,150);
        doc.text("0%", mg, y+14); doc.text("Meta: 80%", mg+contentW*0.8-5, y+14); doc.text("100%", pageW-mg, y+14, { align:"right" });
        y += 18;

        // Bar chart visual por parroquia (top 10)
        const top10brig = brigadistasData.porParroquia.slice(0, 10);
        if (top10brig.length > 0) {
          y = sectionTitle("CERTIFICACION POR PARROQUIA — TOP 10", y);
          top10brig.forEach((p, i) => {
            y = distRow(p.parroquia, p.capacitados, p.total || 1, [0,152,80], y, i%2===0);
          });
          y += 4;
        }

        drawFooter(1, 2); doc.addPage(); totalPages = 2;
        drawBandHeader("BRIGADISTAS CAPACITADOS"); y = 16;
        y = sectionTitle("DETALLE COMPLETO POR PARROQUIA", y);
        const thC = ["#","Parroquia","Total","Certificados","%","Brecha"];
        const thW2 = [8,72,20,28,18,32];
        doc.setFillColor(...G); doc.rect(mg,y,contentW,8,"F");
        doc.setFontSize(7.5); doc.setFont("helvetica","bold"); doc.setTextColor(255,255,255);
        let bx = mg; thC.forEach((c,i)=>{ doc.text(s(c),bx+2,y+5.5); bx+=thW2[i]; }); y+=8;
        brigadistasData.porParroquia.forEach((p,i)=>{
          if (y>pageH-18){drawFooter(2,2);doc.addPage();drawBandHeader("BRIGADISTAS");y=16;totalPages++;}
          const rowH=8;
          if (i%2===0){doc.setFillColor(248,250,249);doc.rect(mg,y,contentW,rowH,"F");}
          doc.setFontSize(7); doc.setFont("helvetica","normal"); doc.setTextColor(31,41,55);
          bx=mg;
          [String(i+1),s(p.parroquia),String(p.total),String(p.capacitados),`${p.pct}%`,String(p.total-p.capacitados)]
          .forEach((v,vi)=>{
            if(vi===4){doc.setTextColor(p.pct>=70?0:p.pct>0?200:220, p.pct>=70?152:p.pct>0?100:50, p.pct>=70?80:0);doc.setFont("helvetica","bold");}
            else{doc.setTextColor(31,41,55);doc.setFont("helvetica","normal");}
            doc.text(v,bx+2,y+5.5);bx+=thW2[vi];
          });
          y+=rowH;
        });
        // Página de análisis gráfico
        drawFooter(totalPages, totalPages + 1); doc.addPage(); totalPages++;
        drawBandHeader("BRIGADISTAS CAPACITADOS — ANALISIS GRAFICO"); let yG = 14;

        yG = sectionTitle("ESTADO DE CERTIFICACION GENERAL", yG);
        const donutItems: {label: string; value: number; color: [number,number,number]}[] = [
          { label: "Certificados", value: brigadistasData.capacitados, color: [0,152,80] },
          { label: "Sin certificacion", value: Math.max(brigadistasData.total - brigadistasData.capacitados, 0), color: [245,158,11] },
        ];
        const dcx = mg + 30, dcy = yG + 28, dr = 24, dir = 12;
        drawDonut(donutItems, dcx, dcy, dr, dir, dcx + 38, dcy - 8, 12);
        // Stacked bar proporcional
        const sbW2 = contentW - 80;
        doc.setFontSize(7); doc.setFont("helvetica","bold"); doc.setTextColor(107,114,128);
        doc.text("Distribucion proporcional del total:", dcx + 38, yG + 4);
        drawStackedBar(donutItems, dcx + 38, yG + 6, sbW2, 9);
        yG = dcy + dr + 8;

        if (brigadistasData.porParroquia.length > 0) {
          yG = sectionTitle("CERTIFICACION POR PARROQUIA — MAYOR A MENOR (%)", yG);
          const sorted = [...brigadistasData.porParroquia].sort((a, b) => b.pct - a.pct);
          sorted.forEach((p, i) => {
            if (yG > pageH - 20) { drawFooter(totalPages, totalPages+1); doc.addPage(); drawBandHeader("BRIGADISTAS"); yG = 14; totalPages++; }
            const rc: [number,number,number] = p.pct >= 70 ? [0,152,80] : p.pct >= 40 ? [245,158,11] : [239,68,68];
            const lbl = `${s(p.parroquia)}  (${p.capacitados}/${p.total} certif.)`;
            yG = distRow(lbl, p.pct, 100, rc, yG, i%2===0);
          });
        }
        drawFirmas(yG, "BRIGADISTAS");
        drawFooter(totalPages, totalPages);

      } else if (activeTab === "prevencion" && actividadesData) {
        // ── PDF EJECUTIVO: Acciones Preventivas ───────────────────────────
        const pctEjec = actividadesData.total > 0 ? Math.round((actividadesData.ejecutadas/actividadesData.total)*100) : 0;
        drawCover("ACCIONES PREVENTIVAS", "Actividades preventivas por parroquia");
        let y = 44;
        y = kpiRow([
          { val: String(actividadesData.total),         lbl: "Total\nActividades",   color: [255,255,255], bg: [59,130,246] },
          { val: String(actividadesData.ejecutadas),    lbl: "Ejecutadas",            color: [255,255,255], bg: [0,152,80] },
          { val: `${pctEjec}%`,                         lbl: "Tasa de\nEjecucion",   color: [255,255,255], bg: pctEjec>=70?[0,152,80]:pctEjec>=40?[245,158,11]:[239,68,68] },
          { val: String(actividadesData.totalParticipantes), lbl: "Participantes\nAlcanzados", color: [255,255,255], bg: [145,85,168] },
        ], y);

        // Bar chart por tipo de actividad — solo si hay tipos del catálogo
        const tiposValidos = actividadesData.porTipo.filter(t => t.label !== "Sin clasificar");
        if (tiposValidos.length > 0) {
          y = sectionTitle("ACTIVIDADES POR TIPO", y);
          drawVertBars(tiposValidos.slice(0,8), mg, y, contentW, 55, [59,130,246]);
          y += 60;
        }

        y = sectionTitle("DISTRIBUCION POR ESTADO DE EJECUCION", y);
        const stackEstado: {label:string;value:number;color:[number,number,number]}[] = actividadesData.porEstado.map(e => ({
          label: e.label, value: e.value,
          color: (e.label==="EJECUTADA"?[0,152,80]:e.label==="PROGRAMADA"?[59,130,246]:e.label==="EN_PROCESO"||e.label==="EN_EJECUCION"?[245,158,11]:[239,68,68]) as [number,number,number],
        }));
        drawStackedBar(stackEstado, mg, y, contentW, 10); y += 12;
        // Legend
        let lx = mg;
        stackEstado.forEach(e=>{ doc.setFillColor(...e.color);doc.rect(lx,y,4,4,"F");doc.setFontSize(6.5);doc.setFont("helvetica","normal");doc.setTextColor(31,41,55);doc.text(s(`${e.label}: ${e.value}`),lx+5.5,y+3.2);lx+=40; });
        y += 8;

        if (actividadesData.porEstado.length > 0) {
          y += 2;
          actividadesData.porEstado.forEach((e,i)=>{ y=distRow(e.label,e.value,actividadesData.total,[59,130,246],y,i%2===0); });
          y += 4;
        }

        if (actividadesData.porParroquia.length > 0 && y < pageH-50) {
          y = sectionTitle("TOP PARROQUIAS POR ACTIVIDAD PREVENTIVA", y);
          actividadesData.porParroquia.slice(0,8).forEach((p,i)=>{ y=distRow(p.label,p.value,actividadesData.total,[145,85,168],y,i%2===0); });
          y+=4;
        }

        // Donut de estado de ejecución — visual igual que pantalla
        const eDonutItems = stackEstado.filter(e=>e.value>0);
        if (eDonutItems.length > 1 && y < pageH - 58) {
          y = sectionTitle("ESTADO DE EJECUCION — DISTRIBUCION VISUAL", y);
          const eDcx = mg + 20, eDcy = y + 18;
          drawDonut(eDonutItems, eDcx, eDcy, 16, 8, eDcx + 36, y + 2, 11);
          y = eDcy + 22;
        }

        drawFirmas(y, "PREVENCION");
        drawFooter(1, 1);

      } else if (activeTab === "kits" && kitsData) {
        // ── PDF EJECUTIVO: Kits Entregados ────────────────────────────────
        const parroquiasBenef = kitsData.porParroquia.filter(p=>p.value>0).length;
        const stockTotal = kitsData.stockActual.reduce((s,k)=>s+k.stockActual,0);
        drawCover("KITS ENTREGADOS", "Distribucion de materiales de emergencia por parroquia");
        let y = 44;
        y = kpiRow([
          { val: String(kitsData.totalEntregados), lbl: "Unidades\nDistribuidas",   color: [255,255,255], bg: [145,85,168] },
          { val: String(parroquiasBenef),           lbl: "Parroquias\nBeneficiadas", color: [255,255,255], bg: [59,130,246] },
          { val: String(kitsData.porTipo.length),   lbl: "Tipos de\nKit",            color: [255,255,255], bg: [245,158,11] },
          { val: String(stockTotal),                lbl: "Stock\nActual",            color: [255,255,255], bg: [0,152,80] },
        ], y);

        if (kitsData.porTipo.length > 0) {
          y = sectionTitle("DISTRIBUCION POR TIPO DE KIT", y);
          drawVertBars(kitsData.porTipo.slice(0,8), mg, y, contentW, 55, [145,85,168]);
          y += 60;
        }
        if (kitsData.porParroquia.length > 0) {
          y = sectionTitle("DISTRIBUCION POR PARROQUIA", y);
          kitsData.porParroquia.slice(0,10).forEach((p,i)=>{ y=distRow(p.label,p.value,kitsData.totalEntregados||1,[145,85,168],y,i%2===0); });
          y += 4;
        }
        if (kitsData.stockActual.length > 0 && y < pageH-50) {
          y = sectionTitle("STOCK ACTUAL EN ALMACEN", y);
          const sthW=[100,40,42];
          doc.setFillColor(...G); doc.rect(mg,y,contentW,7,"F");
          doc.setFontSize(7.5); doc.setFont("helvetica","bold"); doc.setTextColor(255,255,255);
          let bx=mg; ["Tipo de Kit","Stock Actual","Registros"].forEach((c,i)=>{doc.text(c,bx+2,y+4.5);bx+=sthW[i];}); y+=7;
          kitsData.stockActual.forEach((k,i)=>{
            if(i%2===0){doc.setFillColor(248,250,249);doc.rect(mg,y,contentW,7,"F");}
            doc.setFont("helvetica","normal"); doc.setFontSize(7.5); doc.setTextColor(31,41,55);
            bx=mg;
            [s(k.tipoKit),String(k.stockActual),`${k.total} kit(s)`]
            .forEach((v,vi)=>{doc.text(v,bx+2,y+4.5);bx+=sthW[vi];});
            y+=7;
          });
        }
        drawFirmas(y, "KITS");
        drawFooter(1, 1);

      } else if (activeTab === "riesgo" && parroquiasRiesgo) {
        // ── PDF EJECUTIVO: Afectación Parroquial ──────────────────────────
        const counts = {CRITICO:0,ALTO:0,MEDIO:0,BAJO:0} as Record<string,number>;
        parroquiasRiesgo.forEach(p=>{ const k=p.riesgoNivel.replace("Í","I").replace("Ó","O"); counts[k]=(counts[k]||0)+1; });
        const nC: Record<string,[number,number,number]> = {CRITICO:[239,68,68],ALTO:[249,115,22],MEDIO:[245,158,11],BAJO:[0,152,80]};

        drawCover("REPORTE DE AFECTACION PARROQUIAL", "Nivel de Afectacion Estimada por Parroquia");
        let y = 44;

        y = kpiRow([
          { val: String(counts.CRITICO||0), lbl: "Afectacion\nCRITICA",  color:[255,255,255], bg:[239,68,68] },
          { val: String(counts.ALTO||0),    lbl: "Afectacion\nALTA",     color:[255,255,255], bg:[249,115,22] },
          { val: String(counts.MEDIO||0),   lbl: "Afectacion\nMEDIA",    color:[255,255,255], bg:[245,158,11] },
          { val: String(counts.BAJO||0),    lbl: "Afectacion\nBAJA",     color:[255,255,255], bg:[0,152,80] },
        ], y);

        // Barra de distribución proporcional visual (CHART)
        y = sectionTitle("DISTRIBUCION DE RIESGO POR NIVEL", y);
        const stackRiesgo = (["CRITICO","ALTO","MEDIO","BAJO"] as const).map(n=>({
          label:n, value:counts[n]||0, color:nC[n]
        }));
        drawStackedBar(stackRiesgo, mg, y, contentW, 12); y+=14;
        // Legend
        let lx=mg;
        stackRiesgo.forEach(item=>{
          const total2=parroquiasRiesgo.length;
          doc.setFillColor(...item.color);doc.rect(lx,y,5,5,"F");
          doc.setFontSize(7);doc.setFont("helvetica","bold");doc.setTextColor(31,41,55);
          doc.text(`${item.label}: ${item.value}`,lx+6.5,y+3.8);
          doc.setFont("helvetica","normal");doc.setTextColor(107,114,128);
          doc.text(`(${total2>0?Math.round((item.value/total2)*100):0}%)`,lx+6.5,y+7.8);
          lx+=44;
        });
        y+=12;

        // Donut nativo: distribución por nivel (igual que pantalla)
        const nivelD: {label:string;value:number;color:[number,number,number]}[] = (["CRITICO","ALTO","MEDIO","BAJO"] as const)
          .map(n => ({ label: `${n} (${counts[n]||0})`, value: counts[n]||0, color: nC[n] }))
          .filter(d => d.value > 0);
        if (nivelD.length > 0 && y < pageH - 65) {
          const dCx = mg + 22, dCy = y + 22;
          drawDonut(nivelD, dCx, dCy, 20, 10, dCx + 36, y + 2, 12);
          y = dCy + 26;
        }

        // Tabla: indicadores promedio por nivel
        y = sectionTitle("INDICADORES PROMEDIO POR NIVEL DE AFECTACION", y);
        const nhdr = ["Nivel","Parroquias","% Total","Prom. Incid.","Prom. % Certif.","Con Plan GRD"];
        const nhW  = [28,24,22,32,36,30];
        doc.setFillColor(...G); doc.rect(mg,y,contentW,7,"F");
        doc.setFontSize(7); doc.setFont("helvetica","bold"); doc.setTextColor(255,255,255);
        let nhX=mg; nhdr.forEach((h,i)=>{doc.text(h,nhX+1.5,y+4.5);nhX+=nhW[i];}); y+=7;

        (["CRITICO","ALTO","MEDIO","BAJO"] as const).forEach((n,ri)=>{
          const grp = parroquiasRiesgo.filter(p=>p.riesgoNivel.replace("Í","I").replace("Ó","O")===n);
          if (grp.length===0) return;
          const pctN = Math.round((grp.length/parroquiasRiesgo.length)*100);
          const avgI = (grp.reduce((s,p)=>s+p.incidencias,0)/grp.length).toFixed(1);
          const avgC = Math.round(grp.reduce((s,p)=>s+p.pctCapacitados,0)/grp.length);
          const conP = grp.filter(p=>p.tienePlan).length;
          if (ri%2===0){doc.setFillColor(248,250,249);doc.rect(mg,y,contentW,8,"F");}
          doc.setFillColor(...(nC[n]??[80,80,80]));doc.rect(mg,y,3,8,"F");
          doc.setFontSize(7.5); doc.setFont("helvetica","bold"); doc.setTextColor(31,41,55);
          nhX=mg;
          doc.text(n,nhX+5,y+5.5); nhX+=nhW[0];
          doc.setFont("helvetica","normal");
          doc.text(String(grp.length),nhX+1.5,y+5.5); nhX+=nhW[1];
          doc.text(`${pctN}%`,nhX+1.5,y+5.5); nhX+=nhW[2];
          doc.text(String(avgI),nhX+1.5,y+5.5); nhX+=nhW[3];
          doc.setTextColor(avgC>=60?0:239, avgC>=60?152:68, avgC>=60?80:68); doc.setFont("helvetica","bold");
          doc.text(`${avgC}%`,nhX+1.5,y+5.5); nhX+=nhW[4];
          doc.setTextColor(31,41,55); doc.setFont("helvetica","normal");
          doc.text(`${conP}/${grp.length}`,nhX+1.5,y+5.5);
          y+=8;
        });
        y+=4;

        // Top 5 parroquias de mayor riesgo
        if (parroquiasRiesgo.length > 0 && y < pageH - 65) {
          y = sectionTitle("TOP 5 PARROQUIAS DE MAYOR AFECTACION", y);
          parroquiasRiesgo.slice(0,5).forEach((p,i) => {
            const nKey = p.riesgoNivel.replace("Í","I").replace("Ó","O");
            const col = nC[nKey]??[80,80,80];
            if (i%2===0){doc.setFillColor(248,250,249);doc.rect(mg,y,contentW,9,"F");}
            doc.setFillColor(...col); doc.rect(mg,y,3,9,"F");
            doc.setFontSize(7.5); doc.setFont("helvetica","bold"); doc.setTextColor(31,41,55);
            doc.text(`${i+1}. ${s(p.nombre)}`, mg+5, y+4.5);
            doc.setFont("helvetica","normal"); doc.setTextColor(107,114,128);
            const actP = p.actividadesTotal>0?Math.round((p.actividadesEjecutadas/p.actividadesTotal)*100):0;
            doc.text(`${p.incidencias} incid.  |  ${p.brigadistas} brigad.  |  ${p.pctCapacitados}% certif.  |  ${actP}% activid.  |  Plan: ${p.tienePlan?"Aprobado":"Sin plan"}`, mg+5, y+8);
            y+=10;
          });
        }

        drawFooter(1, 3); doc.addPage(); totalPages=2;

        // ── Página 2: Mapa nativo Lima Metropolitana + Callao ─────────────
        drawBandHeader("AFECTACION PARROQUIAL — MAPA DE RIESGO");

        // Límites geográficos
        const LAT_MAX_M = -11.75, LAT_MIN_M = -12.58;
        const LNG_MIN_M = -77.30, LNG_MAX_M = -76.43;
        const LNG_RNG = LNG_MAX_M - LNG_MIN_M;
        const LAT_RNG = LAT_MAX_M - LAT_MIN_M;

        const MAP_X = mg, MAP_Y_S = 14, MAP_W = contentW, MAP_H = 210;

        const projM = (lat: number, lng: number) => ({
          x: MAP_X + (lng - LNG_MIN_M) / LNG_RNG * MAP_W,
          y: MAP_Y_S + (LAT_MAX_M - lat) / LAT_RNG * MAP_H,
        });

        // Fondo océano Pacífico
        doc.setFillColor(186, 220, 240); doc.rect(MAP_X, MAP_Y_S, MAP_W, MAP_H, "F");

        // Polígono Lima Metropolitana
        const LIMA_GEO: [number,number][] = [
          [-11.770,-77.157],[-11.780,-77.040],[-11.820,-76.980],[-11.860,-76.870],
          [-11.880,-76.750],[-11.910,-76.630],[-11.970,-76.540],[-12.040,-76.560],
          [-12.130,-76.620],[-12.220,-76.720],[-12.320,-76.820],[-12.480,-76.930],
          [-12.540,-77.000],[-12.480,-77.060],[-12.370,-77.060],[-12.250,-77.030],
          [-12.150,-77.010],[-12.000,-77.050],[-11.960,-77.090],[-11.870,-77.080],
          [-11.810,-77.100],[-11.770,-77.157],
        ];
        const limaP = LIMA_GEO.map(([lat,lng])=>projM(lat,lng));
        doc.setFillColor(240, 237, 226); doc.setDrawColor(145, 140, 125); doc.setLineWidth(0.5);
        doc.lines(limaP.slice(1).map((p,i)=>[p.x-limaP[i].x,p.y-limaP[i].y]), limaP[0].x, limaP[0].y, [1,1], "FD", true);

        // Polígono Callao
        const CALLAO_GEO: [number,number][] = [
          [-11.882,-77.175],[-11.882,-77.070],[-11.940,-77.070],[-12.000,-77.085],
          [-12.065,-77.110],[-12.075,-77.155],[-12.060,-77.185],[-11.990,-77.230],
          [-11.920,-77.215],[-11.882,-77.175],
        ];
        const callaoP = CALLAO_GEO.map(([lat,lng])=>projM(lat,lng));
        doc.setFillColor(224, 235, 246); doc.setDrawColor(85, 120, 165); doc.setLineWidth(0.5);
        doc.lines(callaoP.slice(1).map((p,i)=>[p.x-callaoP[i].x,p.y-callaoP[i].y]), callaoP[0].x, callaoP[0].y, [1,1], "FD", true);

        // Etiquetas geográficas
        doc.setFontSize(8); doc.setFont("helvetica","bold");
        doc.setTextColor(110, 100, 82);
        // ── Zonas principales de Lima ─────────────────────────────────────
        // Línea del Río Rímac (corre ~E-O entre lat -11.98 y -12.04)
        const rimacPts: [number,number][] = [
          [-12.04,-77.06],[-12.03,-77.02],[-12.02,-76.98],[-12.00,-76.94],
          [-11.99,-76.90],[-11.98,-76.85],[-11.97,-76.80],[-11.96,-76.75],
        ];
        doc.setDrawColor(130, 180, 210); doc.setLineWidth(0.8);
        for (let ri = 0; ri < rimacPts.length - 1; ri++) {
          const a = projM(rimacPts[ri][0], rimacPts[ri][1]);
          const b = projM(rimacPts[ri+1][0], rimacPts[ri+1][1]);
          doc.line(a.x, a.y, b.x, b.y);
        }

        // Panamericana Norte (costa, de norte a sur hasta Lima Centro)
        const panNortePts: [number,number][] = [
          [-11.78,-77.15],[-11.85,-77.13],[-11.92,-77.10],[-11.97,-77.09],[-12.01,-77.07],
        ];
        doc.setDrawColor(200, 180, 140); doc.setLineWidth(0.5);
        for (let ri = 0; ri < panNortePts.length - 1; ri++) {
          const a = projM(panNortePts[ri][0], panNortePts[ri][1]);
          const b = projM(panNortePts[ri+1][0], panNortePts[ri+1][1]);
          doc.line(a.x, a.y, b.x, b.y);
        }

        // Panamericana Sur (de Lima Centro hacia el sur)
        const panSurPts: [number,number][] = [
          [-12.05,-77.04],[-12.10,-77.01],[-12.18,-76.98],[-12.28,-76.93],[-12.45,-76.89],
        ];
        for (let ri = 0; ri < panSurPts.length - 1; ri++) {
          const a = projM(panSurPts[ri][0], panSurPts[ri][1]);
          const b = projM(panSurPts[ri+1][0], panSurPts[ri+1][1]);
          doc.line(a.x, a.y, b.x, b.y);
        }

        // Río Rímac label (antes de marcadores para que quede debajo)
        const rimacMid = projM(-12.01, -76.88);
        doc.setFontSize(5.5); doc.setFont("helvetica","italic"); doc.setTextColor(100, 160, 200);
        doc.text("Rio Rimac", rimacMid.x, rimacMid.y - 1.5);

        // Labels principales Lima / Callao
        doc.setFontSize(8); doc.setFont("helvetica","bold");
        const limaLbl = projM(-12.18, -76.82); doc.setTextColor(110, 100, 82);
        if (limaLbl.x > MAP_X && limaLbl.x < MAP_X+MAP_W && limaLbl.y > MAP_Y_S && limaLbl.y < MAP_Y_S+MAP_H)
          doc.text("LIMA", limaLbl.x, limaLbl.y, {align:"center"});
        const callaoLbl = projM(-11.97, -77.14); doc.setTextColor(65, 100, 150);
        if (callaoLbl.x > MAP_X && callaoLbl.x < MAP_X+MAP_W && callaoLbl.y > MAP_Y_S && callaoLbl.y < MAP_Y_S+MAP_H)
          doc.text("CALLAO", callaoLbl.x, callaoLbl.y, {align:"center"});

        // Marcadores de parroquias (se dibujan ANTES de las etiquetas de zona)
        parroquiasRiesgo.forEach(p => {
          if (!p.latitud || !p.longitud) return;
          const { x: px, y: py } = projM(p.latitud, p.longitud);
          if (px < MAP_X-2 || px > MAP_X+MAP_W+2 || py < MAP_Y_S-2 || py > MAP_Y_S+MAP_H+2) return;
          const nKey = p.riesgoNivel.replace("Í","I").replace("Ó","O");
          const col = nC[nKey] ?? [80,80,80] as [number,number,number];
          const r = Math.max(1.8, Math.min(5, 1.8 + Math.min(p.incidencias, 6) * 0.45));
          doc.setFillColor(255,255,255); doc.setDrawColor(255,255,255); doc.setLineWidth(0);
          doc.circle(px, py, r + 0.6, "F");
          doc.setFillColor(...col);
          doc.setDrawColor(Math.max(0,col[0]-50), Math.max(0,col[1]-50), Math.max(0,col[2]-50));
          doc.setLineWidth(0.3);
          doc.circle(px, py, r, "FD");
        });

        // Etiquetas de zona dibujadas DESPUÉS de marcadores — con fondo blanco para contraste
        const zonas: { lat: number; lng: number; label: string }[] = [
          { lat:-11.82, lng:-77.00, label:"LIMA NORTE"    },
          { lat:-11.99, lng:-76.72, label:"LIMA ESTE"     },
          { lat:-12.30, lng:-76.90, label:"LIMA SUR"      },
          { lat:-12.06, lng:-77.01, label:"LIMA CENTRO"   },
          { lat:-12.14, lng:-76.81, label:"LIMA ESTE SUR" },
        ];
        doc.setFontSize(6); doc.setFont("helvetica","bold");
        zonas.forEach(z => {
          const zp = projM(z.lat, z.lng);
          if (zp.x < MAP_X+8 || zp.x > MAP_X+MAP_W-8 || zp.y < MAP_Y_S+6 || zp.y > MAP_Y_S+MAP_H-6) return;
          const tw = z.label.length * 2.0;
          // Fondo blanco semitransparente detrás del texto
          doc.setFillColor(255,255,255); doc.setDrawColor(255,255,255);
          doc.rect(zp.x - tw/2 - 1, zp.y - 4, tw + 2, 5, "F");
          doc.setTextColor(80, 70, 55);
          doc.text(z.label, zp.x, zp.y, { align:"center" });
        });

        // Rosa de los vientos (esquina superior derecha)
        const RX = MAP_X + MAP_W - 10, RY = MAP_Y_S + 10;
        doc.setFillColor(255,255,255); doc.circle(RX, RY, 6, "F");
        doc.setDrawColor(100,100,100); doc.setLineWidth(0.3);
        doc.line(RX, RY-5, RX, RY+5); doc.line(RX-5, RY, RX+5, RY);
        doc.setFontSize(6); doc.setFont("helvetica","bold"); doc.setTextColor(31,41,55);
        doc.text("N", RX, RY-7, {align:"center"});

        // Borde del mapa
        doc.setDrawColor(160,160,160); doc.setLineWidth(0.5);
        doc.rect(MAP_X, MAP_Y_S, MAP_W, MAP_H);

        // Leyenda
        const LEG_Y = MAP_Y_S + MAP_H + 5;
        doc.setFontSize(7); doc.setFont("helvetica","bold"); doc.setTextColor(31,41,55);
        doc.text("Nivel de Afectacion:", MAP_X, LEG_Y + 3.5);
        let legX = MAP_X + 46;
        (["CRITICO","ALTO","MEDIO","BAJO"] as const).forEach(n => {
          doc.setFillColor(...nC[n]); doc.circle(legX+3, LEG_Y+1.5, 3, "F");
          doc.setFontSize(6.5); doc.setFont("helvetica","normal"); doc.setTextColor(31,41,55);
          doc.text(n, legX + 8, LEG_Y+3.5); legX += 40;
        });
        doc.setFontSize(6); doc.setFont("helvetica","normal"); doc.setTextColor(150,150,150);
        doc.text("Tamano del marcador proporcional al numero de incidencias  |  Solo parroquias con coordenadas registradas", MAP_X, LEG_Y+9);
        doc.text("Azul = Oceano Pacifico  |  Gris claro = Lima Metropolitana  |  Azul claro = Callao", MAP_X, LEG_Y+13);

        drawFooter(2, 3); doc.addPage(); totalPages=3;
        drawBandHeader("AFECTACION PARROQUIAL"); y=16;
        y=sectionTitle("RANKING COMPLETO — NIVEL DE AFECTACION ESTIMADA", y);

        const rhC=["#","Parroquia","Nivel","Casos","Brigadistas","%Cert.","Plan GRD","Act."];
        const rhW=[7,72,18,12,20,15,20,15];
        doc.setFillColor(...G);doc.rect(mg,y,contentW,8,"F");
        doc.setFontSize(7);doc.setFont("helvetica","bold");doc.setTextColor(255,255,255);
        let bx=mg; rhC.forEach((c,i)=>{doc.text(c,bx+1.5,y+5.5);bx+=rhW[i];}); y+=8;

        parroquiasRiesgo.forEach((p,i)=>{
          if(y>pageH-18){drawFooter(totalPages,totalPages+1);doc.addPage();drawBandHeader("AFECTACION PARROQUIAL");y=16;totalPages++;}
          const nKey=p.riesgoNivel.replace("Í","I").replace("Ó","O");
          const rh=8;
          // Fondo con tinte del color de riesgo
          const bg=nC[nKey]??[31,41,55];
          doc.setFillColor(i%2===0?250:245, i%2===0?250:245, i%2===0?250:245);
          doc.rect(mg,y,contentW,rh,"F");
          // Celda de nivel con color de fondo
          const nivelColIdx=rhW.slice(0,2).reduce((s,v)=>s+v,mg);
          doc.setFillColor(...bg);doc.rect(nivelColIdx,y,rhW[2],rh,"F");

          doc.setFontSize(6.5);doc.setFont("helvetica","normal");
          bx=mg;
          const vals=[String(i+1),s(p.nombre),
            s(nKey),String(p.incidencias),String(p.brigadistas),`${p.pctCapacitados}%`,
            p.tienePlan?"Aprobado":"Sin plan",`${p.actividadesEjecutadas}/${p.actividadesTotal}`];
          vals.forEach((v,vi)=>{
            if(vi===2){doc.setTextColor(255,255,255);doc.setFont("helvetica","bold");}
            else if(vi===3&&p.incidencias>0){doc.setTextColor(239,68,68);doc.setFont("helvetica","bold");}
            else if(vi===6&&!p.tienePlan){doc.setTextColor(239,68,68);doc.setFont("helvetica","normal");}
            else if(vi===6&&p.tienePlan){doc.setTextColor(0,152,80);doc.setFont("helvetica","normal");}
            else{doc.setTextColor(31,41,55);doc.setFont("helvetica","normal");}
            doc.text(v,bx+1.5,y+5.5);bx+=rhW[vi];
          });
          y+=rh;
        });

        y+=6;
        // Metodologia en box
        doc.setFillColor(248,250,249);doc.setDrawColor(220,220,220);doc.rect(mg,y,contentW,16,"FD");
        doc.setFontSize(7);doc.setFont("helvetica","bold");doc.setTextColor(31,41,55);
        doc.text("Metodologia de Puntaje de Afectacion Estimada",mg+3,y+5);
        doc.setFont("helvetica","normal");doc.setFontSize(6.5);doc.setTextColor(107,114,128);
        doc.text("Incidencias: >=5(+3) / >=2(+2) / 1(+1)  |  Brigadistas: <2(+3) / <5(+2) / <10(+1)  |  Certificacion: <30%(+2) / <60%(+1)",mg+3,y+9);
        doc.text("Sin Plan GRD(+2)  |  Actividades <40% ejecutadas(+2)  |  CRITICO>=8 pts  |  ALTO>=5  |  MEDIO>=3  |  BAJO<3",mg+3,y+13.5);
        y+=18;

        drawFirmas(y, "AFECTACION PARROQUIAL");
        drawFooter(totalPages, totalPages);

      } else {
        // ── PDF EJECUTIVO: Resumen General / Casos Atendidos ─────────────
        const isResumen = activeTab !== "casos";
        const tituloPDF = isResumen ? "REPORTE GENERAL DEL SISTEMA GRD" : "REPORTE DE INCIDENCIAS Y CASOS ATENDIDOS";
        const subtituloPDF = isResumen ? "Indicadores operacionales del sistema" : "Incidencias y emergencias registradas en el periodo";
        drawCover(tituloPDF, subtituloPDF);
        let y = 44;

        y = kpiRow([
          { val: String(incCount), lbl: "Incidencias\nRegistradas", color:[255,255,255], bg:[239,68,68] },
          { val: `${totales?.pctBrigadistasCapacitados ?? 0}%`, lbl: "Brigadistas\nCertificados", color:[255,255,255], bg:[0,152,80] },
          { val: `${totales?.pctParroquiasPlan ?? 0}%`, lbl: "Parroquias\ncon Plan GRD", color:[255,255,255], bg:[59,130,246] },
          { val: `${totales?.pctActividadesEjecutadas ?? 0}%`, lbl: "Actividades\nEjecutadas", color:[255,255,255], bg:[245,158,11] },
          { val: String(totales?.kitsEntregados ?? 0), lbl: "Kits\nEntregados", color:[255,255,255], bg:[145,85,168] },
        ], y);

        // Indicadores operacionales (barras grandes)
        y = sectionTitle("INDICADORES OPERACIONALES", y);
        const opInds = [
          { label: "Brigadistas Certificados", sub: `${totales?.totalBrigadistas??0} brigadistas activos`, pct: totales?.pctBrigadistasCapacitados??0, color: G as [number,number,number] },
          { label: "Parroquias con Plan GRD Aprobado", sub: `${totales?.totalParroquias??0} parroquias en total`, pct: totales?.pctParroquiasPlan??0, color: [59,130,246] as [number,number,number] },
          { label: "Actividades Preventivas Ejecutadas", sub: "del total programadas", pct: totales?.pctActividadesEjecutadas??0, color: [245,158,11] as [number,number,number] },
        ];
        opInds.forEach(op=>{
          doc.setFontSize(8.5); doc.setFont("helvetica","bold"); doc.setTextColor(31,41,55); doc.text(s(op.label),mg,y+4.5);
          doc.setFontSize(7); doc.setFont("helvetica","normal"); doc.setTextColor(107,114,128); doc.text(s(op.sub),mg,y+9);
          const barStart=mg+82; const barLen=contentW-82-20;
          doc.setFillColor(229,231,235); doc.rect(barStart,y+1,barLen,5,"F");
          if(op.pct>0){doc.setFillColor(...op.color);doc.rect(barStart,y+1,(barLen*op.pct)/100,5,"F");}
          doc.setFontSize(10); doc.setFont("helvetica","bold"); doc.setTextColor(...op.color);
          doc.text(`${op.pct}%`,pageW-mg,y+6.5,{align:"right"});
          y+=14;
        });
        y+=2;

        // Chart de barras: tipos de evento — con colores distintos por tipo (igual que pantalla)
        if (effPorTipo.length > 0) {
          y = sectionTitle("INCIDENCIAS POR TIPO DE EVENTO", y);
          drawVertBarsColored(effPorTipo.slice(0,10), mg, y, contentW, 55, JSPDF_PALETTE);
          y += 60;
        }

        // Gráfico de tendencia temporal — agrupado por semana (igual que pantalla)
        const tlineMap: Record<string,number> = {};
        filteredData.forEach(row => {
          const ds = String(row.Fecha || "");
          const pts3 = ds.split("/");
          if (pts3.length !== 3) return;
          const [dd2,mm2,yy2] = pts3.map(Number);
          if (isNaN(dd2)||isNaN(mm2)||isNaN(yy2)) return;
          const date = new Date(yy2, mm2-1, dd2);
          const dow = date.getDay() || 7;
          const ws = new Date(date); ws.setDate(date.getDate()-dow+1);
          const key = `${String(ws.getDate()).padStart(2,"0")}/${String(ws.getMonth()+1).padStart(2,"0")}`;
          tlineMap[key] = (tlineMap[key]||0) + 1;
        });
        const tlineData = Object.entries(tlineMap)
          .sort((a,b) => a[0].localeCompare(b[0]))
          .map(([label, value]) => ({label, value}));
        if (tlineData.length >= 1 && y < pageH - 75) {
          y = sectionTitle("TENDENCIA DE INCIDENCIAS POR SEMANA", y);
          drawLineChart(tlineData, mg, y, contentW, 52, G as [number,number,number]);
          y += 57;
        }

        drawFooter(1,2); doc.addPage(); totalPages=2;
        drawBandHeader(tituloPDF); y=16;

        // ── Estado + Gravedad: los dos pasteles lado a lado (2 columnas) ──────
        if (effPorEstado.length>0 || effGravedad.length>0) {
          const colW = contentW/2;
          const leftX = mg;
          const rightX = mg + colW;
          // Mini-título de columna (con la barrita verde, mitad de ancho)
          const miniTitle = (t:string, x:number) => {
            doc.setFillColor(...G); doc.rect(x, y, 3, 5.5, "F");
            doc.setFontSize(8.5); doc.setFont("helvetica","bold"); doc.setTextColor(31,41,55);
            doc.text(s(t), x+5, y+4.5);
          };
          if (effPorEstado.length>0) miniTitle("DISTRIBUCION POR ESTADO", leftX);
          if (effGravedad.length>0)  miniTitle("DISTRIBUCION POR GRAVEDAD", rightX);
          doc.setDrawColor(229,231,235); doc.setLineWidth(0.4);
          doc.line(mg, y+7, pageW-mg, y+7);

          // Altura común del bloque = la leyenda más larga de las dos
          const estItems=effPorEstado.map((e,i)=>({label:e.label,value:e.value,color:JSPDF_COLORS[i%JSPDF_COLORS.length]}));
          const gravItems=effGravedad.map(g=>{
            const c: [number,number,number] = (g.label==="Alto"||g.label==="Critico"||g.label==="Crítico"||g.label==="Severo")
              ? [239,68,68] : g.label==="Moderado" ? [245,158,11] : [0,152,80];
            return {label:g.label,value:g.value,color:c};
          });
          const blockH = Math.max(38, estItems.length*9+6, gravItems.length*9+6);
          const donutTop = y + 11;
          const donutCy = donutTop + blockH/2;

          if (estItems.length>0) {
            const lY = donutCy - ((estItems.length-1)*9)/2 - 1.5;
            drawDonut(estItems, leftX+16, donutCy, 15, 8, leftX+34, lY, 9);
          }
          if (gravItems.length>0) {
            const lY = donutCy - ((gravItems.length-1)*9)/2 - 1.5;
            drawDonut(gravItems, rightX+16, donutCy, 15, 8, rightX+34, lY, 9);
          }
          y = donutTop + blockH + 6;
        }

        // Top parroquias — a todo el ancho, debajo de los pasteles
        if (effPorParroquia.length>0) {
          y=sectionTitle(`TOP ${Math.min(effPorParroquia.length,5)} PARROQUIAS CON MAS INCIDENCIAS`,y);
          effPorParroquia.slice(0,5).forEach((p,i)=>{y=distRow(p.label,p.value,incCount,[249,115,22],y,i%2===0);});
          y+=4;
        }

        drawFirmas(y, tituloPDF);
        drawFooter(2,2);
      }

      doc.save(`${nombreArchivo}.pdf`);
    }

    setExporting(false);
    onClose();
  }

  const formatMeta: Record<"excel" | "pdf", { label: string; icon: React.ReactNode; desc: string }> = {
    pdf: { label: "PDF", icon: <FileText className="w-4 h-4" />, desc: "Reporte ejecutivo con KPIs y gráficos" },
    excel: { label: "Excel", icon: <FileSpreadsheet className="w-4 h-4" />, desc: "Datos tabulares con múltiples hojas" },
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
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
                <div className="flex gap-2">
                  {(["pdf", "excel"] as const).map((f) => {
                    const m = formatMeta[f];
                    return (
                      <button key={f} type="button" onClick={() => setFormat(f)}
                        className={`cursor-pointer flex flex-col items-center gap-1 flex-1 px-3 py-3 rounded-xl border-2 text-xs font-semibold transition-colors ${
                          format === f ? "border-[#009850] bg-[#009850]/8 text-[#009850]" : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                        }`}>
                        <span className={format === f ? "text-[#009850]" : "text-gray-400"}>{m.icon}</span>
                        <span>{m.label}</span>
                        <span className="text-[9px] font-normal text-gray-400">{m.desc}</span>
                      </button>
                    );
                  })}
                </div>
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
                <ExportPreview
                  format={format} data={filteredData} desde={desde} hasta={hasta}
                  activeTab={activeTab}
                  totales={totales} porEstado={porEstado} porTipo={porTipo}
                  porParroquia={porParroquia} incidenciasData={incidenciasData}
                  brigadistasData={brigadistasData} kitsData={kitsData}
                  actividadesData={actividadesData} parroquiasRiesgo={parroquiasRiesgo}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
