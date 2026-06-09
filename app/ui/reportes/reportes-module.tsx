"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText, AlertTriangle, Users, Package,
  ClipboardList, Download, Calendar, Activity, Map
} from "lucide-react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from "recharts";
import * as XLSX from "xlsx"; // Librería de tu equipo para Excel

type Conteo = { label: string; value: number };

interface Props {
  filtros: { desde: string; hasta: string };
  totales: {
    incidencias: number;
    pctBrigadistasCapacitados: number;
    pctParroquiasPlan: number;
    pctActividadesEjecutadas: number;
    kitsEntregados: number;
  };
  porEstado: Conteo[];
  porTipo: Conteo[];
  dataExportacion: any[];
}

const COLORS = ["#009850", "#FFC300", "#FF823C", "#EF4444", "#3B82F6", "#9155A8", "#00C8B4"];

function Card({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: number | string; sub?: string }) {
  return (
    <div className="bg-white border border-[var(--caritas-border)] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-[var(--caritas-green)]/10 rounded-xl flex items-center justify-center">
          {icon}
        </div>
        <div>
          <div className="text-3xl font-bold text-[var(--caritas-text)]">{value}</div>
          <div className="text-sm font-medium text-gray-600">{label}</div>
          {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
        </div>
      </div>
    </div>
  );
}

export function ReportesModule({ filtros, totales, porEstado, porTipo, dataExportacion }: Props) {
  const router = useRouter();
  const [desde, setDesde] = useState(filtros.desde);
  const [hasta, setHasta] = useState(filtros.hasta);

  const aplicarFiltros = () => {
    router.push(`/reportes?desde=${desde}&hasta=${hasta}`);
  };

  // RF35: Exportación a Excel
  const exportarExcel = () => {
    const ws = XLSX.utils.json_to_sheet(dataExportacion);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Incidencias");
    XLSX.writeFile(wb, `Reporte_Incidencias_Caritas_${desde}_al_${hasta}.xlsx`);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      
      {/* 1. Encabezado y Acciones */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[var(--caritas-green)]/10 rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6 text-[var(--caritas-green)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--caritas-text)]">Reportes y Estadísticas</h1>
            <p className="text-sm text-gray-500">Indicadores clave y exportación de datos</p>
          </div>
        </div>

        <button 
          onClick={exportarExcel}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#107C41] hover:bg-[#0b5e31] text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" /> Exportar a Excel
        </button>
      </div>

      {/* 2. Barra de Filtros (RF100) */}
      <div className="bg-white border border-[var(--caritas-border)] rounded-xl p-4 flex flex-wrap items-end gap-4 shadow-sm">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha Desde</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input 
              type="date" 
              value={desde} 
              onChange={(e) => setDesde(e.target.value)}
              className="pl-9 pr-3 py-2 border border-[var(--caritas-border)] rounded-lg text-sm outline-none focus:border-[var(--caritas-green)]" 
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha Hasta</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input 
              type="date" 
              value={hasta} 
              onChange={(e) => setHasta(e.target.value)}
              className="pl-9 pr-3 py-2 border border-[var(--caritas-border)] rounded-lg text-sm outline-none focus:border-[var(--caritas-green)]" 
            />
          </div>
        </div>
        <button 
          onClick={aplicarFiltros}
          className="px-5 py-2 bg-[var(--caritas-green)] text-white font-medium rounded-lg text-sm hover:bg-green-800 transition-colors shadow-sm"
        >
          Aplicar Filtro
        </button>
      </div>

      {/* 3. Tarjetas de KPI (RF98, RF99, RF102, RF103) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card
          icon={<AlertTriangle className="w-6 h-6 text-[var(--caritas-green)]" />}
          label="Incidencias"
          value={totales.incidencias}
          sub="En el periodo seleccionado"
        />
        <Card
          icon={<Users className="w-6 h-6 text-[var(--caritas-green)]" />}
          label="Brigadistas"
          value={`${totales.pctBrigadistasCapacitados}%`}
          sub="Brigadistas con certificación"
        />
        <Card
          icon={<Map className="w-6 h-6 text-[var(--caritas-green)]" />}
          label="Planes GRD"
          value={`${totales.pctParroquiasPlan}%`}
          sub="Parroquias con plan aprobado"
        />
        <Card
          icon={<Activity className="w-6 h-6 text-[var(--caritas-green)]" />}
          label="Prevención"
          value={`${totales.pctActividadesEjecutadas}%`}
          sub="Actividades ejecutadas"
        />
        <Card
          icon={<Package className="w-6 h-6 text-[var(--caritas-green)]" />}
          label="Kits Entregados"
          value={totales.kitsEntregados}
          sub="Total unidades distribuidas"
        />
      </div>

      {/* 4. Gráficos Interactivos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        <div className="bg-white border border-[var(--caritas-border)] rounded-xl p-5 shadow-sm">
          <h2 className="text-base font-bold text-[var(--caritas-text)] mb-1">Incidencias por Estado</h2>
          <p className="text-xs text-gray-500 mb-4">Distribución del ciclo de vida de los casos reportados.</p>
          
          {porEstado.length === 0 ? (
            <div className="flex h-[280px] items-center justify-center text-sm text-gray-500">No hay datos en este periodo.</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={porEstado}
                  dataKey="value"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={50}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {porEstado.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} incidencias`, "Total"]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white border border-[var(--caritas-border)] rounded-xl p-5 shadow-sm">
          <h2 className="text-base font-bold text-[var(--caritas-text)] mb-1">Incidencias por Tipo de Evento</h2>
          <p className="text-xs text-gray-500 mb-4">Clasificación de emergencias reportadas.</p>
          
          {porTipo.length === 0 ? (
            <div className="flex h-[280px] items-center justify-center text-sm text-gray-500">No hay datos en este periodo.</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={porTipo} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: '#F3F4F6' }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                />
                <Bar dataKey="value" fill="var(--caritas-green)" radius={[6, 6, 0, 0]} maxBarSize={60} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}