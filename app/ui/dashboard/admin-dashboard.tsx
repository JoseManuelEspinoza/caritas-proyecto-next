'use client'

import Link from 'next/link'
import {
  AlertTriangle, Users, ShieldCheck, UserCheck, ArrowRight,
  FileText, MapPin, Activity, Flame, Waves, Mountain, Zap, TrendingDown,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts'
import { ROLE_COLORS, ROLE_DISPLAY_NAMES } from '@/app/lib/roles'

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  'ABIERTO':             { label: 'Abierto',        color: 'text-yellow-700',  bg: 'bg-yellow-50',   dot: 'bg-yellow-500'  },
  'ASIGNADO':            { label: 'Asignado',        color: 'text-blue-700',    bg: 'bg-blue-50',     dot: 'bg-blue-500'    },
  'DATA RECOPILADA':     { label: 'Data Recopilada', color: 'text-orange-700',  bg: 'bg-orange-50',   dot: 'bg-orange-500'  },
  'EN EVALUACION':       { label: 'En Evaluación',   color: 'text-purple-700',  bg: 'bg-purple-50',   dot: 'bg-purple-500'  },
  'OBSERVADO':           { label: 'Observado',       color: 'text-amber-700',   bg: 'bg-amber-50',    dot: 'bg-amber-500'   },
  'APROBADO':            { label: 'Aprobado',        color: 'text-[#009850]',   bg: 'bg-green-50',    dot: 'bg-[#009850]'   },
  'ATENDIDO':            { label: 'Atendido',        color: 'text-[#00C8B4]',   bg: 'bg-cyan-50',     dot: 'bg-[#00C8B4]'   },
  'SEGUIMIENTO ABIERTO': { label: 'Seguimiento',     color: 'text-[#91D723]',   bg: 'bg-lime-50',     dot: 'bg-[#91D723]'   },
  'CERRADO':             { label: 'Cerrado',         color: 'text-gray-600',    bg: 'bg-gray-50',     dot: 'bg-gray-400'    },
  'RECHAZADO':           { label: 'Rechazado',       color: 'text-red-700',     bg: 'bg-red-50',      dot: 'bg-red-500'     },
}

const CAT_ICONS: Record<string, any> = {
  Incendios: Flame, Inundaciones: Waves, Derrumbes: Mountain,
  Sismos: Zap, Deslizamientos: TrendingDown,
}
function CatIcon({ cat }: { cat: string | null }) {
  const Icon = (cat && CAT_ICONS[cat]) ? CAT_ICONS[cat] : MapPin
  return <Icon className="w-4 h-4 text-gray-500" />
}

const PIPELINE = [
  { status: 'ABIERTO',             label: 'Abierto',     color: '#EAB308' },
  { status: 'ASIGNADO',            label: 'Asignado',    color: '#3B82F6' },
  { status: 'DATA RECOPILADA',     label: 'Data',        color: '#F97316' },
  { status: 'EN EVALUACION',       label: 'Evaluación',  color: '#9155A8' },
  { status: 'APROBADO',            label: 'Aprobado',    color: '#009850' },
  { status: 'ATENDIDO',            label: 'Atendido',    color: '#00C8B4' },
  { status: 'SEGUIMIENTO ABIERTO', label: 'Seguimiento', color: '#91D723' },
]

export type IncidenteResumen = {
  id: string
  codigoCaso: string | null
  tituloIncidencia: string | null
  tipoEvento: string | null
  estadoActual: string
  parroquia: string | null
}

export type AdminDashboardProps = {
  incidentesActivos: number
  incidentesCerrados: number
  totalIncidentes: number
  familias: number
  personas: number
  usersActivos: number
  totalUsers: number
  brigDisp: number
  totalBrig: number
  simPendientes: number
  pipelineCounts: Record<string, number>
  incidentesRecientes: IncidenteResumen[]
  catData: { name: string; count: number }[]
  roleData: { name: string; value: number; fill: string }[]
}

function StatCard({ label, value, sub, icon: Icon, color, to }: {
  label: string; value: number | string; sub?: string
  icon: any; color: string; to?: string
}) {
  const inner = (
    <div className={`bg-white border border-[#DDDDDD] rounded-xl p-4 hover:shadow-md transition-shadow flex items-start gap-3 h-full ${to ? 'cursor-pointer' : ''}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
        {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {to && <ArrowRight className="w-4 h-4 text-gray-300 self-center flex-shrink-0" />}
    </div>
  )
  return to ? <Link href={to} className="h-full">{inner}</Link> : inner
}

function SectionTitle({ title, to }: { title: string; to?: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
      {to && (
        <Link href={to} className="text-xs text-[#009850] hover:underline flex items-center gap-1">
          Ver todo <ArrowRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  )
}

function IncidentRow({ inc }: { inc: IncidenteResumen }) {
  const cfg = STATUS_CFG[inc.estadoActual] ?? STATUS_CFG['ABIERTO']
  return (
    <Link href={`/grd/${inc.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
        <CatIcon cat={inc.tipoEvento} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-800 truncate">{inc.tituloIncidencia ?? 'Sin título'}</p>
        <p className="text-[10px] text-gray-500">{inc.codigoCaso ?? '—'} · {inc.parroquia ?? '—'}</p>
      </div>
      <span className={`flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.color} ${cfg.bg}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
        {cfg.label}
      </span>
    </Link>
  )
}

export function AdminDashboard({
  incidentesActivos, incidentesCerrados, totalIncidentes,
  familias, personas, usersActivos, totalUsers,
  brigDisp, totalBrig, simPendientes,
  pipelineCounts, incidentesRecientes, catData, roleData,
}: AdminDashboardProps) {
  const pipeline = PIPELINE.map((p) => ({ ...p, count: pipelineCounts[p.status] ?? 0 }))

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Panel de Administración</h1>
        <p className="text-sm text-gray-500 mt-0.5">Visión general del sistema GRD — Cáritas Lima</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Incidentes activos"      value={incidentesActivos} icon={AlertTriangle} color="bg-[#009850]" to="/grd" />
        <StatCard label="Familias afectadas"       value={familias}          icon={Users}         color="bg-[#9155A8]" sub={`${personas} personas empadronadas`} />
        <StatCard label="Usuarios activos"         value={usersActivos}      icon={UserCheck}     color="bg-[#00C8B4]" to="/usuarios" />
        <StatCard label="Brigadistas disponibles"  value={brigDisp}          icon={ShieldCheck}   color="bg-[#FF823C]" to="/brigadistas" />
      </div>

      {/* Pipeline */}
      <div className="bg-white border border-[#DDDDDD] rounded-xl p-4">
        <SectionTitle title="Pipeline GRD — Incidentes por estado" to="/grd" />
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {pipeline.map((p) => (
            <Link key={p.status} href="/grd"
              className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-gray-50 transition-colors text-center">
              <span className="text-2xl font-bold" style={{ color: p.color }}>{p.count}</span>
              <span className="text-[10px] text-gray-500 leading-tight">{p.label}</span>
            </Link>
          ))}
        </div>
        <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden flex">
          {pipeline.map((p) => p.count > 0 && (
            <div key={p.status}
              style={{ width: `${(p.count / (incidentesActivos || 1)) * 100}%`, backgroundColor: p.color }}
              className="transition-all" title={`${p.label}: ${p.count}`} />
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-gray-400 mt-1">
          <span>{incidentesActivos} activos</span>
          <span>{incidentesCerrados} cerrados/rechazados</span>
          <span>{totalIncidentes} total histórico</span>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-[#DDDDDD] rounded-xl p-4">
          <SectionTitle title="Incidentes por categoría" />
          {catData.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-sm text-gray-400">Sin datos</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={catData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Bar dataKey="count" name="Incidentes" radius={[4, 4, 0, 0]}>
                  {catData.map((_, i) => (
                    <Cell key={i} fill={['#009850','#9155A8','#00C8B4','#FF823C','#FFC300','#3B82F6'][i % 6]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white border border-[#DDDDDD] rounded-xl p-4">
          <SectionTitle title="Distribución de usuarios por rol" to="/usuarios" />
          {roleData.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-sm text-gray-400">Sin datos</div>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="55%" height={200}>
                <PieChart>
                  <Pie data={roleData} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {roleData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {roleData.map((r) => (
                  <div key={r.name} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: r.fill }} />
                      <span className="text-xs text-gray-600">{r.name}</span>
                    </div>
                    <span className="text-xs font-bold text-gray-800">{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Incidentes recientes + Módulos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border border-[#DDDDDD] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#DDDDDD] flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Incidentes activos recientes</h2>
            <Link href="/grd" className="text-xs text-[#009850] hover:underline flex items-center gap-1">
              Ver todos <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-[#DDDDDD]">
            {incidentesRecientes.length === 0 ? (
              <p className="text-xs text-gray-500 p-4 text-center">Sin incidentes activos</p>
            ) : incidentesRecientes.map((i) => <IncidentRow key={i.id} inc={i} />)}
          </div>
        </div>

        <div className="space-y-3">
          <div className="bg-white border border-[#DDDDDD] rounded-xl p-4">
            <SectionTitle title="Módulos del sistema" />
            <div className="space-y-2">
              {[
                { icon: ShieldCheck, label: 'Brigadistas', sub: `${totalBrig} registrados`, color: 'text-blue-600 bg-blue-50', to: '/brigadistas' },
                { icon: Activity,    label: 'Simulacros',  sub: `${simPendientes} activos`, color: 'text-[#009850] bg-[#009850]/10', to: '/simulacros' },
                { icon: FileText,    label: 'Planes GRD',  sub: 'Ver planes',               color: 'text-purple-600 bg-purple-50',  to: '/planes' },
                { icon: Users,       label: 'Usuarios',    sub: `${usersActivos}/${totalUsers} activos`, color: 'text-[#00C8B4] bg-cyan-50', to: '/usuarios' },
              ].map((m) => (
                <Link key={m.label} href={m.to}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${m.color}`}>
                    <m.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-800">{m.label}</p>
                    <p className="text-[10px] text-gray-500">{m.sub}</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-300 ml-auto" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
