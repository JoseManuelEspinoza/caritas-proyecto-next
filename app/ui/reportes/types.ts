// ─── Shared types, constants and pure helpers for the Reportes module ───────

export type Conteo = { label: string; value: number };
export type ExportRow = Record<string, string | number>;
export type IncidenciaRow = { id: string } & Record<string, string | number>;

export interface BrigadistaParroquiaData {
  parroquia: string;
  total: number;
  capacitados: number;
  pct: number;
}

export interface KitStockData {
  tipoKit: string;
  stockActual: number;
  total: number;
}

export type RiesgoNivel = "CRÍTICO" | "ALTO" | "MEDIO" | "BAJO";

export interface ParroquiaRiesgoData {
  nombre: string;
  latitud?: number | null;
  longitud?: number | null;
  incidencias: number;
  brigadistas: number;
  pctCapacitados: number;
  tienePlan: boolean;
  actividadesEjecutadas: number;
  actividadesTotal: number;
  riesgoNivel: RiesgoNivel;
  riesgoScore: number;
}

export interface ActividadesData {
  total: number;
  ejecutadas: number;
  totalParticipantes: number;
  porEstado: Conteo[];
  porTipo: Conteo[];
  porParroquia: Conteo[];
}

export interface IncidenciasData {
  cerradas: number;
  enSeguimiento: number;
  activas: number;
  porGravedad: Conteo[];
}

export interface KitsData {
  totalEntregados: number;
  porTipo: Conteo[];
  porParroquia: Conteo[];
  stockActual: KitStockData[];
}

export interface BrigadistasData {
  total: number;
  capacitados: number;
  porParroquia: BrigadistaParroquiaData[];
}

export interface ReportesProps {
  filtros: { desde: string; hasta: string; parroquias: string[] };
  totales: {
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
  porEstado: Conteo[];
  porTipo: Conteo[];
  porParroquia: Conteo[];
  timeline: Conteo[];
  byWeek: boolean;
  parroquias: { id: string; nombre: string }[];
  topIncidencias: IncidenciaRow[];
  dataExportacion: ExportRow[];
  actividadesData: ActividadesData;
  incidenciasData: IncidenciasData;
  brigadistasData: BrigadistasData;
  kitsData: KitsData;
  parroquiasRiesgo: ParroquiaRiesgoData[];
}

export const COLORS = [
  "#009850", "#FFC300", "#FF823C", "#EF4444",
  "#3B82F6", "#9155A8", "#00C8B4", "#F97316",
];
export const GREEN = "#009850";

export function fmtLabel(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
}

export function unique(arr: ExportRow[], key: string): string[] {
  return [...new Set(arr.map((r) => String(r[key])).filter((v) => v && v !== "-"))].sort();
}
