'use client'

import { FileText, AlertTriangle, Users, Package, GraduationCap, ClipboardList } from 'lucide-react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

type Conteo = { label: string; value: number }
interface Props {
  totales: { incidencias: number; brigadistas: number; brigadistasActivos: number; kits: number; stockTotal: number; cursos: number; planes: number; actividades: number }
  porEstado: Conteo[]
  porTipo: Conteo[]
}

const COLORS = ['#009850', '#9155A8', '#00C8B4', '#FF823C', '#FFC300', '#3B82F6', '#EF4444', '#91D723', '#6B7280', '#0EA5E9']

function Card({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: number | string; sub?: string }) {
  return (
    <div className="bg-white border border-[var(--caritas-border)] rounded-xl p-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[var(--caritas-green)]/10 rounded-lg flex items-center justify-center">{icon}</div>
        <div>
          <div className="text-2xl font-bold text-[var(--caritas-text)]">{value}</div>
          <div className="text-xs text-gray-600">{label}</div>
          {sub && <div className="text-[11px] text-gray-400">{sub}</div>}
        </div>
      </div>
    </div>
  )
}

export function ReportesModule({ totales, porEstado, porTipo }: Props) {
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-[var(--caritas-green)]/10 rounded-lg flex items-center justify-center">
          <FileText className="w-5 h-5 text-[var(--caritas-green)]" />
        </div>
        <div>
          <h1 className="text-[var(--caritas-text)]">Reportes y Estadísticas</h1>
          <p className="text-sm text-gray-600">Indicadores generales del sistema GRD</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        <Card icon={<AlertTriangle className="w-5 h-5 text-[var(--caritas-green)]" />} label="Incidencias" value={totales.incidencias} />
        <Card icon={<Users className="w-5 h-5 text-[var(--caritas-green)]" />} label="Brigadistas" value={totales.brigadistas} sub={`${totales.brigadistasActivos} activos`} />
        <Card icon={<Package className="w-5 h-5 text-[var(--caritas-green)]" />} label="Kits" value={totales.kits} sub={`stock total ${totales.stockTotal}`} />
        <Card icon={<GraduationCap className="w-5 h-5 text-[var(--caritas-green)]" />} label="Cursos" value={totales.cursos} />
        <Card icon={<ClipboardList className="w-5 h-5 text-[var(--caritas-green)]" />} label="Planes GRD" value={totales.planes} />
        <Card icon={<ClipboardList className="w-5 h-5 text-[var(--caritas-green)]" />} label="Actividades preventivas" value={totales.actividades} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border border-[var(--caritas-border)] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[var(--caritas-text)] mb-4">Incidencias por estado</h2>
          {porEstado.length === 0 ? (
            <p className="text-sm text-gray-500">Sin datos.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={porEstado} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={100} label={({ name, value }: { name?: string; value?: number }) => `${name}: ${value}`}>
                  {porEstado.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white border border-[var(--caritas-border)] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[var(--caritas-text)] mb-4">Incidencias por tipo de evento</h2>
          {porTipo.length === 0 ? (
            <p className="text-sm text-gray-500">Sin datos.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={porTipo}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#009850" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
