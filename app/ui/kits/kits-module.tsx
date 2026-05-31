'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Package, Plus, ArrowDownCircle, ArrowUpCircle, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { crearKit, registrarMovimientoKit, listarMovimientosKit } from '@/app/actions/kits'

type Kit = { id: string; tipoKit: string; descripcion: string | null; stockActual: number; estadoKit: string }
type Parroquia = { id: string; nombre: string }
type Movimiento = { id: string; tipo: string; cantidad: number; fecha: string; responsable: string | null; motivoMovimiento: string | null; observaciones: string | null }

const TIPOS = ['INGRESO', 'ENTREGA', 'REPOSICION'] as const

export function KitsModule({ kits, parroquias }: { kits: Kit[]; parroquias: Parroquia[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [selected, setSelected] = useState<string | null>(kits[0]?.id ?? null)
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [showKitForm, setShowKitForm] = useState(false)
  const [showMovForm, setShowMovForm] = useState(false)

  const [kitForm, setKitForm] = useState({ tipoKit: '', descripcion: '', stockInicial: 0 })
  const [movForm, setMovForm] = useState({ tipo: 'ENTREGA' as (typeof TIPOS)[number], cantidad: 1, idParroquiaDestino: parroquias[0]?.id ?? '', motivoMovimiento: '', observaciones: '' })

  const current = kits.find((k) => k.id === selected) ?? null

  const selectKit = (id: string) => {
    setSelected(id)
    setShowMovForm(false)
    listarMovimientosKit(id).then(setMovimientos).catch(() => setMovimientos([]))
  }

  const submitKit = () => {
    if (!kitForm.tipoKit.trim()) { toast.error('Indica el tipo de kit.'); return }
    startTransition(async () => {
      const res = await crearKit(kitForm)
      if (res?.message) toast.error(res.message)
      else { toast.success('Kit creado.'); setShowKitForm(false); setKitForm({ tipoKit: '', descripcion: '', stockInicial: 0 }); router.refresh() }
    })
  }

  const submitMov = () => {
    if (!current) return
    startTransition(async () => {
      const res = await registrarMovimientoKit(current.id, {
        tipo: movForm.tipo,
        cantidad: movForm.cantidad,
        idParroquiaDestino: movForm.tipo === 'ENTREGA' ? movForm.idParroquiaDestino || undefined : undefined,
        motivoMovimiento: movForm.motivoMovimiento || undefined,
        observaciones: movForm.observaciones || undefined,
      })
      if (res?.message && /insuficiente|no se pudo|no tiene/i.test(res.message)) { toast.error(res.message); return }
      toast.success(res?.message ?? 'Movimiento registrado.')
      setShowMovForm(false)
      setMovForm({ ...movForm, cantidad: 1, motivoMovimiento: '', observaciones: '' })
      const movs = await listarMovimientosKit(current.id)
      setMovimientos(movs)
      router.refresh()
    })
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[var(--caritas-green)]/10 rounded-lg flex items-center justify-center">
            <Package className="w-5 h-5 text-[var(--caritas-green)]" />
          </div>
          <div>
            <h1 className="text-[var(--caritas-text)]">Kits y Mochilas de Emergencia</h1>
            <p className="text-sm text-gray-600">Logística · control de stock</p>
          </div>
        </div>
        <button onClick={() => setShowKitForm((s) => !s)} className="flex items-center gap-2 px-4 py-2 bg-[var(--caritas-green)] text-white rounded">
          <Plus className="w-4 h-4" /> Nuevo kit
        </button>
      </div>

      {showKitForm && (
        <div className="bg-white border border-[var(--caritas-border)] rounded-xl p-5 mb-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input label="Tipo de kit" value={kitForm.tipoKit} onChange={(v) => setKitForm({ ...kitForm, tipoKit: v })} />
          <Input label="Stock inicial" type="number" value={String(kitForm.stockInicial)} onChange={(v) => setKitForm({ ...kitForm, stockInicial: Number(v) })} />
          <label className="block md:col-span-2">
            <span className="text-xs text-gray-600">Contenido / descripción</span>
            <textarea value={kitForm.descripcion} onChange={(e) => setKitForm({ ...kitForm, descripcion: e.target.value })} rows={2} className="mt-1 w-full px-3 py-2 border border-[var(--caritas-border)] rounded text-sm" />
          </label>
          <div className="md:col-span-2 flex justify-end gap-2">
            <button onClick={() => setShowKitForm(false)} className="px-4 py-2 border border-[var(--caritas-border)] rounded">Cancelar</button>
            <button onClick={submitKit} disabled={pending} className="px-4 py-2 bg-[var(--caritas-green)] text-white rounded disabled:opacity-50">Guardar</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1 space-y-3">
          {kits.length === 0 && <p className="text-sm text-gray-500">No hay kits registrados.</p>}
          {kits.map((k) => (
            <button key={k.id} onClick={() => selectKit(k.id)} className={`w-full text-left p-4 border rounded-xl transition-colors ${selected === k.id ? 'border-[var(--caritas-green)] bg-[var(--caritas-green)]/5' : 'border-[var(--caritas-border)] hover:bg-gray-50'}`}>
              <div className="text-sm font-medium text-[var(--caritas-text)]">{k.tipoKit}</div>
              <div className="text-xs text-gray-600 mt-1">Stock: <span className={`font-semibold ${k.stockActual < 5 ? 'text-red-600' : 'text-green-700'}`}>{k.stockActual}</span></div>
            </button>
          ))}
        </div>

        <div className="lg:col-span-2 bg-white border border-[var(--caritas-border)] rounded-xl p-5">
          {!current ? (
            <p className="text-gray-500">Selecciona un kit.</p>
          ) : (
            <>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="text-[var(--caritas-text)]">{current.tipoKit}</h2>
                  <p className="text-sm text-gray-700 mt-1">{current.descripcion}</p>
                  <p className="text-sm text-gray-600 mt-1">Stock actual: <span className="font-semibold">{current.stockActual}</span></p>
                </div>
                <button onClick={() => setShowMovForm((s) => !s)} className="flex items-center gap-2 px-3 py-2 bg-[var(--caritas-green)] text-white text-sm rounded">
                  <RefreshCw className="w-4 h-4" /> Movimiento
                </button>
              </div>

              {showMovForm && (
                <div className="bg-gray-50 border border-[var(--caritas-border)] rounded p-4 mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Select label="Tipo" value={movForm.tipo} options={TIPOS as unknown as string[]} onChange={(v) => setMovForm({ ...movForm, tipo: v as (typeof TIPOS)[number] })} />
                  <Input label="Cantidad" type="number" value={String(movForm.cantidad)} onChange={(v) => setMovForm({ ...movForm, cantidad: Number(v) })} />
                  {movForm.tipo === 'ENTREGA' && (
                    <label className="block">
                      <span className="text-xs text-gray-600">Parroquia destino</span>
                      <select value={movForm.idParroquiaDestino} onChange={(e) => setMovForm({ ...movForm, idParroquiaDestino: e.target.value })} className="mt-1 w-full px-3 py-2 border border-[var(--caritas-border)] rounded text-sm bg-white">
                        <option value="">— Selecciona —</option>
                        {parroquias.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                      </select>
                    </label>
                  )}
                  <Input label="Motivo" value={movForm.motivoMovimiento} onChange={(v) => setMovForm({ ...movForm, motivoMovimiento: v })} />
                  <label className="md:col-span-2 block">
                    <span className="text-xs text-gray-600">Notas</span>
                    <textarea value={movForm.observaciones} onChange={(e) => setMovForm({ ...movForm, observaciones: e.target.value })} rows={2} className="mt-1 w-full px-3 py-2 border border-[var(--caritas-border)] rounded text-sm" />
                  </label>
                  <div className="md:col-span-2 flex justify-end gap-2">
                    <button onClick={() => setShowMovForm(false)} className="px-3 py-2 border border-[var(--caritas-border)] rounded">Cancelar</button>
                    <button onClick={submitMov} disabled={pending} className="px-3 py-2 bg-[var(--caritas-green)] text-white rounded disabled:opacity-50">Registrar</button>
                  </div>
                </div>
              )}

              <h3 className="text-sm text-gray-600 mb-2">Historial de movimientos</h3>
              <ul className="space-y-2">
                {movimientos.map((m) => (
                  <li key={m.id} className="flex items-start gap-3 p-3 border border-[var(--caritas-border)] rounded">
                    {m.tipo === 'ENTREGA' ? <ArrowUpCircle className="w-5 h-5 text-red-600" /> : <ArrowDownCircle className="w-5 h-5 text-green-600" />}
                    <div className="flex-1">
                      <div className="text-sm text-[var(--caritas-text)]">{m.tipo} · <span className="font-medium">{m.cantidad}</span> unidades</div>
                      <div className="text-xs text-gray-500">{new Date(m.fecha).toLocaleDateString()} {m.responsable ? `· ${m.responsable}` : ''}</div>
                      {m.motivoMovimiento && <div className="text-xs text-gray-600">{m.motivoMovimiento}</div>}
                      {m.observaciones && <div className="text-xs text-gray-500 italic mt-1">{m.observaciones}</div>}
                    </div>
                  </li>
                ))}
                {movimientos.length === 0 && <p className="text-sm text-gray-500">Sin movimientos.</p>}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Input({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="text-xs text-gray-600">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full px-3 py-2 border border-[var(--caritas-border)] rounded text-sm" />
    </label>
  )
}
function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs text-gray-600">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full px-3 py-2 border border-[var(--caritas-border)] rounded text-sm bg-white">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  )
}
