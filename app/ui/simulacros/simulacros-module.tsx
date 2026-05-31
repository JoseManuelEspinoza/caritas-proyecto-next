'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck, Plus, Calendar, MapPin, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { programarSimulacro, ejecutarSimulacro, cancelarSimulacro } from '@/app/actions/simulacros'

type Actividad = {
  id: string
  codigoActividad: string | null
  idParroquia: string
  parroquiaNombre: string
  nombreActividad: string
  estadoActividad: string
  fechaProgramada: string | null
  fechaEjecucion: string | null
  resultadoGeneral: string | null
}
type Parroquia = { id: string; nombre: string }

const TIPOS = ['Simulacro de Sismo', 'Simulacro de Incendio', 'Simulacro de Inundación', 'Charla de Prevención', 'Taller', 'Campaña']

const ESTADO_BADGE: Record<string, { cls: string; icon: React.ReactNode }> = {
  PROGRAMADA: { cls: 'bg-blue-50 text-blue-700', icon: <Clock className="w-3.5 h-3.5" /> },
  EJECUTADA: { cls: 'bg-green-50 text-green-700', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  CANCELADA: { cls: 'bg-gray-100 text-gray-500', icon: <XCircle className="w-3.5 h-3.5" /> },
}

export function SimulacrosModule({ actividades, parroquias }: { actividades: Actividad[]; parroquias: Parroquia[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [ejecutando, setEjecutando] = useState<string | null>(null)
  const [form, setForm] = useState({
    idParroquia: parroquias[0]?.id ?? '',
    idTipoActividadPreventiva: TIPOS[0],
    nombreActividad: '',
    fechaProgramada: new Date().toISOString().slice(0, 10),
    lugarActividad: '',
    numeroParticipantesEstimado: 0,
    descripcionActividad: '',
  })
  const [ejec, setEjec] = useState({ resultadoGeneral: '', numeroParticipantesReal: 0, recomendaciones: '' })

  const run = (fn: () => Promise<{ message?: string } | void>, ok: string, after?: () => void) =>
    startTransition(async () => {
      const res = await fn()
      if (res?.message && /no se pudo|obligatori|no tiene|no permitida|estado/i.test(res.message)) toast.error(res.message)
      else { toast.success(ok); after?.(); router.refresh() }
    })

  const submitNew = () => {
    if (!form.nombreActividad.trim() || !form.idParroquia) { toast.error('Completa parroquia y nombre.'); return }
    run(() => programarSimulacro(form), 'Simulacro programado.', () => { setShowForm(false); setForm({ ...form, nombreActividad: '', lugarActividad: '', descripcionActividad: '' }) })
  }

  const submitEjecutar = (id: string) => {
    if (!ejec.resultadoGeneral.trim()) { toast.error('Indica el resultado.'); return }
    run(() => ejecutarSimulacro(id, ejec), 'Ejecución registrada.', () => { setEjecutando(null); setEjec({ resultadoGeneral: '', numeroParticipantesReal: 0, recomendaciones: '' }) })
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[var(--caritas-green)]/10 rounded-lg flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-[var(--caritas-green)]" />
          </div>
          <div>
            <h1 className="text-[var(--caritas-text)]">Simulacros y Acciones Preventivas</h1>
            <p className="text-sm text-gray-600">Prevención · actividades por parroquia</p>
          </div>
        </div>
        <button onClick={() => setShowForm((s) => !s)} className="flex items-center gap-2 px-4 py-2 bg-[var(--caritas-green)] text-white rounded">
          <Plus className="w-4 h-4" /> Programar
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-[var(--caritas-border)] rounded-xl p-5 mb-6 grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-gray-600">Parroquia</span>
            <select value={form.idParroquia} onChange={(e) => setForm({ ...form, idParroquia: e.target.value })} className="mt-1 w-full px-3 py-2 border border-[var(--caritas-border)] rounded text-sm bg-white">
              <option value="">— Selecciona —</option>
              {parroquias.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-gray-600">Tipo</span>
            <select value={form.idTipoActividadPreventiva} onChange={(e) => setForm({ ...form, idTipoActividadPreventiva: e.target.value })} className="mt-1 w-full px-3 py-2 border border-[var(--caritas-border)] rounded text-sm bg-white">
              {TIPOS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </label>
          <label className="block md:col-span-2">
            <span className="text-xs text-gray-600">Nombre de la actividad</span>
            <input value={form.nombreActividad} onChange={(e) => setForm({ ...form, nombreActividad: e.target.value })} className="mt-1 w-full px-3 py-2 border border-[var(--caritas-border)] rounded text-sm" />
          </label>
          <label className="block">
            <span className="text-xs text-gray-600">Fecha programada</span>
            <input type="date" value={form.fechaProgramada} onChange={(e) => setForm({ ...form, fechaProgramada: e.target.value })} className="mt-1 w-full px-3 py-2 border border-[var(--caritas-border)] rounded text-sm" />
          </label>
          <label className="block">
            <span className="text-xs text-gray-600">Lugar</span>
            <input value={form.lugarActividad} onChange={(e) => setForm({ ...form, lugarActividad: e.target.value })} className="mt-1 w-full px-3 py-2 border border-[var(--caritas-border)] rounded text-sm" />
          </label>
          <label className="block">
            <span className="text-xs text-gray-600">Participantes estimados</span>
            <input type="number" value={String(form.numeroParticipantesEstimado)} onChange={(e) => setForm({ ...form, numeroParticipantesEstimado: Number(e.target.value) })} className="mt-1 w-full px-3 py-2 border border-[var(--caritas-border)] rounded text-sm" />
          </label>
          <label className="block md:col-span-2">
            <span className="text-xs text-gray-600">Descripción</span>
            <textarea value={form.descripcionActividad} onChange={(e) => setForm({ ...form, descripcionActividad: e.target.value })} rows={2} className="mt-1 w-full px-3 py-2 border border-[var(--caritas-border)] rounded text-sm" />
          </label>
          <div className="md:col-span-2 flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-[var(--caritas-border)] rounded">Cancelar</button>
            <button onClick={submitNew} disabled={pending} className="px-4 py-2 bg-[var(--caritas-green)] text-white rounded disabled:opacity-50">Guardar</button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {actividades.length === 0 && <p className="text-sm text-gray-500">No hay actividades programadas.</p>}
        {actividades.map((a) => {
          const badge = ESTADO_BADGE[a.estadoActividad] ?? ESTADO_BADGE.PROGRAMADA
          return (
            <div key={a.id} className="bg-white border border-[var(--caritas-border)] rounded-xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-gray-500">{a.codigoActividad}</div>
                  <h2 className="text-[var(--caritas-text)]">{a.nombreActividad}</h2>
                  <div className="text-sm text-gray-600 flex flex-wrap items-center gap-3 mt-1">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {a.parroquiaNombre}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {a.fechaProgramada?.slice(0, 10) ?? '—'}</span>
                  </div>
                  {a.resultadoGeneral && <p className="text-sm text-gray-700 mt-2">Resultado: {a.resultadoGeneral}</p>}
                </div>
                <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded ${badge.cls}`}>{badge.icon} {a.estadoActividad}</span>
              </div>

              {a.estadoActividad === 'PROGRAMADA' && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => setEjecutando(ejecutando === a.id ? null : a.id)} className="px-3 py-1.5 text-sm bg-[var(--caritas-green)] text-white rounded">Registrar ejecución</button>
                  <button onClick={() => run(() => cancelarSimulacro(a.id, 'Cancelado por el responsable'), 'Actividad cancelada.')} disabled={pending} className="px-3 py-1.5 text-sm border border-[var(--caritas-border)] rounded text-gray-700 disabled:opacity-50">Cancelar</button>
                </div>
              )}

              {ejecutando === a.id && (
                <div className="mt-3 bg-gray-50 border border-[var(--caritas-border)] rounded p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="block md:col-span-2">
                    <span className="text-xs text-gray-600">Resultado general</span>
                    <textarea value={ejec.resultadoGeneral} onChange={(e) => setEjec({ ...ejec, resultadoGeneral: e.target.value })} rows={2} className="mt-1 w-full px-3 py-2 border border-[var(--caritas-border)] rounded text-sm" />
                  </label>
                  <label className="block">
                    <span className="text-xs text-gray-600">Participantes reales</span>
                    <input type="number" value={String(ejec.numeroParticipantesReal)} onChange={(e) => setEjec({ ...ejec, numeroParticipantesReal: Number(e.target.value) })} className="mt-1 w-full px-3 py-2 border border-[var(--caritas-border)] rounded text-sm" />
                  </label>
                  <label className="block">
                    <span className="text-xs text-gray-600">Recomendaciones</span>
                    <input value={ejec.recomendaciones} onChange={(e) => setEjec({ ...ejec, recomendaciones: e.target.value })} className="mt-1 w-full px-3 py-2 border border-[var(--caritas-border)] rounded text-sm" />
                  </label>
                  <div className="md:col-span-2 flex justify-end gap-2">
                    <button onClick={() => setEjecutando(null)} className="px-3 py-1.5 text-sm border border-[var(--caritas-border)] rounded">Cancelar</button>
                    <button onClick={() => submitEjecutar(a.id)} disabled={pending} className="px-3 py-1.5 text-sm bg-[var(--caritas-green)] text-white rounded disabled:opacity-50">Guardar ejecución</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
