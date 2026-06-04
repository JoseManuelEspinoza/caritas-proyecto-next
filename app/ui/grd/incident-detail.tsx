'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Edit, MapPin, FileText, Users, Camera, CheckCircle,
  XCircle, FileCheck, Flame, Waves, Mountain, Zap, TrendingDown,
  UserCheck, ClipboardList, BarChart3, Package, ShieldCheck,
  Phone, Calendar, AlertTriangle, Clock, ChevronDown, ChevronUp,
  Plus, Loader2, HandHeart, Search, UserPlus, Star, Pencil, X,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  assignEquipo, autoasignarme, saveInfoCampo, saveInformeEvaluacion,
  aprobarCaso, observarCaso, rechazarCaso, corregirYReenviar,
  registrarAtencion, addSeguimiento, cerrarCaso,
} from '@/app/actions/incidents'
import type { FrontendRole } from '@/app/lib/roles'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Persona = {
  id: string; nombres: string; apellidos: string | null; edad: string | null
  sexo: string | null; tipoDocumento: string | null; numeroDocumento: string | null
  parentesco: string | null; condicionEspecial: string | null; telefono: string | null
}

type IncidentData = {
  idIncidencia: string
  codigoCaso: string | null
  tituloIncidencia: string | null
  tipoEvento: string | null
  estadoActual: string
  direccionEvento: string | null
  descripcionEvento: string | null
  gravedad: string | null
  fechaRegistro: string
  parroquia: string | null
  aviso: { nombreInformante: string | null; telefonoInformante: string | null; descripcion: string | null } | null
  asignaciones: {
    brigadistaId: string
    nombres: string
    apellidos: string | null
    celular: string | null
    parroquia: string | null
    fechaAsignacion: string
    esResponsable: boolean
    observaciones: string | null
  }[]
  responsableGRD: { id: string; nombre: string; correo: string | null } | null
  instruccionesAsignacion: string | null
  gruposFamiliares: { id: string; nombreReferencia: string | null; totalPersonas: number; personas: Persona[] }[]
  informes: { id: string; titulo: string; tipo: string | null; resumen: string | null; contenido: string | null; estado: string; fecha: string }[]
  seguimientos: { id: string; situacion: string | null; descripcion: string | null; necesidadesPendientes: string | null; recomendaciones: string | null; fecha: string }[]
  entregas: { id: string; tipoAyuda: string | null; descripcionAyuda: string | null; lugarEntrega: string | null; fecha: string | null; observaciones: string | null }[]
  historial: { estadoAnterior: string | null; estadoNuevo: string; motivoCambio: string | null; observaciones: string | null; fecha: string }[]
  solicitudComite: { estado: string; resultado: string | null; observaciones: string | null; fecha: string | null } | null
  brigadistasDisponibles: { id: string; nombres: string; apellidos: string | null; celular: string | null; parroquia: string | null }[]
  parroquias: string[]
  role: FrontendRole
  userId: string
  idUsuarioGRDActual: string | null
  currentUserName: string
  currentUserBrigadistaId: string | null
  isBrigadistaAsignado: boolean
  isResponsableGRD: boolean
}

// ─── Config visual ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; badge: string; dot: string }> = {
  'ABIERTO':             { label: 'Abierto',          badge: 'bg-yellow-100 text-yellow-800 border-yellow-200', dot: 'bg-yellow-500' },
  'ASIGNADO':            { label: 'Asignado',          badge: 'bg-blue-100 text-blue-800 border-blue-200',       dot: 'bg-blue-500'   },
  'DATA RECOPILADA':     { label: 'Data Recopilada',   badge: 'bg-orange-100 text-orange-800 border-orange-200', dot: 'bg-orange-500' },
  'EN EVALUACION':       { label: 'En Evaluación',     badge: 'bg-purple-100 text-purple-800 border-purple-200', dot: 'bg-purple-500' },
  'OBSERVADO':           { label: 'Observado',         badge: 'bg-amber-100 text-amber-800 border-amber-200',    dot: 'bg-amber-500'  },
  'APROBADO':            { label: 'Aprobado',          badge: 'bg-green-100 text-green-800 border-green-200',    dot: 'bg-green-500'  },
  'ATENDIDO':            { label: 'Atendido',          badge: 'bg-cyan-100 text-cyan-800 border-cyan-200',       dot: 'bg-cyan-500'   },
  'SEGUIMIENTO ABIERTO': { label: 'Seguimiento',       badge: 'bg-teal-100 text-teal-800 border-teal-200',       dot: 'bg-teal-500'   },
  'CERRADO':             { label: 'Cerrado',           badge: 'bg-gray-100 text-gray-700 border-gray-200',       dot: 'bg-gray-400'   },
  'RECHAZADO':           { label: 'Rechazado',         badge: 'bg-red-100 text-red-700 border-red-200',          dot: 'bg-red-500'    },
}

const STEPS = [
  { key: 'REGISTRAR',   label: 'Registrar',         icon: FileText,      statuses: ['ABIERTO'] },
  { key: 'ASIGNAR',     label: 'Asignar Equipo',    icon: UserCheck,     statuses: ['ASIGNADO'] },
  { key: 'RECOPILAR',   label: 'Recopilar Info',    icon: ClipboardList, statuses: ['DATA RECOPILADA'] },
  { key: 'REVISAR',     label: 'Revisar Caso',      icon: BarChart3,     statuses: ['EN EVALUACION', 'OBSERVADO', 'APROBADO', 'RECHAZADO'] },
  { key: 'ATENDER',     label: 'Atender Caso',      icon: Package,       statuses: ['ATENDIDO'] },
  { key: 'SEGUIMIENTO', label: 'Seguimiento',        icon: ShieldCheck,   statuses: ['SEGUIMIENTO ABIERTO'] },
  { key: 'RESUMEN',     label: 'Resumen Final',     icon: FileCheck,     statuses: ['CERRADO'] },
]

function getStepIndex(status: string): number {
  if (status === 'ABIERTO') return 1
  for (let i = 0; i < STEPS.length; i++) {
    if (STEPS[i].statuses.includes(status)) return i
  }
  return 0
}

const CAT_ICONS: Record<string, any> = {
  Incendios: Flame, Inundaciones: Waves, Derrumbes: Mountain,
  Tsunamis: Waves, Sismos: Zap, Deslizamientos: TrendingDown,
}

const inputCls = 'w-full px-3 py-2 text-sm bg-[#F5F5F5] border border-[#DDDDDD] rounded focus:outline-none focus:ring-2 focus:ring-[#009850]/20 focus:border-[#009850]'
const textareaCls = `${inputCls} resize-none`
const btnPrimary = 'px-4 py-2 text-sm font-medium text-white rounded-lg hover:opacity-90 transition-all disabled:opacity-50'
const btnDanger  = 'px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-all disabled:opacity-50'
const btnGhost   = 'px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-[#DDDDDD] rounded-lg hover:bg-gray-50 transition-colors'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ─── Panel: Registrar (info del incidente) ────────────────────────────────────

function PanelRegistrar({ data }: { data: IncidentData }) {
  const CatIcon = (data.tipoEvento && CAT_ICONS[data.tipoEvento]) ? CAT_ICONS[data.tipoEvento] : MapPin
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InfoField label="Código" value={data.codigoCaso ?? '—'} />
        <InfoField label="Fecha de registro" value={fmtDate(data.fechaRegistro)} />
        <InfoField label="Tipo de evento" value={
          <span className="flex items-center gap-1.5">
            <CatIcon className="w-4 h-4" />{data.tipoEvento ?? '—'}
          </span>
        } />
        <InfoField label="Gravedad" value={data.gravedad ?? '—'} />
        <InfoField label="Ubicación" value={
          <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{data.direccionEvento ?? '—'}</span>
        } />
        <InfoField label="Parroquia" value={data.parroquia ?? '—'} />
      </div>
      {data.descripcionEvento && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Descripción</p>
          <p className="text-sm text-gray-800 bg-gray-50 rounded-lg p-3">{data.descripcionEvento}</p>
        </div>
      )}
      {data.aviso && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-blue-800 mb-2">Informante</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-blue-700">{data.aviso.nombreInformante ?? '—'}</span>
            {data.aviso.telefonoInformante && (
              <span className="flex items-center gap-1 text-blue-700"><Phone className="w-3.5 h-3.5" />{data.aviso.telefonoInformante}</span>
            )}
          </div>
        </div>
      )}

      {/* Familias y personas empadronadas */}
      {data.gruposFamiliares.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2">
            Personas empadronadas — {data.gruposFamiliares.length} grupo(s) · {data.gruposFamiliares.reduce((s, g) => s + g.totalPersonas, 0)} persona(s)
          </p>
          <div className="space-y-2">
            {data.gruposFamiliares.map((g) => (
              <div key={g.id} className="border border-blue-200 rounded-lg bg-blue-50 overflow-hidden">
                <div className="bg-blue-100 px-3 py-1.5 flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-xs font-semibold text-blue-900">{g.nombreReferencia ?? 'Grupo familiar'}</span>
                  <span className="text-xs text-blue-600">({g.totalPersonas} integrantes)</span>
                </div>
                {g.personas.length > 0 && (
                  <div className="p-2 space-y-1">
                    {g.personas.map((p) => (
                      <div key={p.id} className="bg-white rounded px-3 py-1.5 text-xs flex items-center gap-3">
                        <span className="font-medium text-gray-800">{p.nombres} {p.apellidos ?? ''}</span>
                        {p.edad && <span className="text-gray-500">{p.edad} años</span>}
                        {p.numeroDocumento && <span className="text-gray-400">DNI: {p.numeroDocumento}</span>}
                        {p.condicionEspecial && (
                          <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded font-medium">{p.condicionEspecial}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Panel: Asignar Equipo ────────────────────────────────────────────────────

// Paleta de colores estable por brigadista (avatar).
const AVATAR_COLORS = [
  'bg-emerald-500', 'bg-blue-500', 'bg-violet-500', 'bg-amber-500',
  'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-teal-500', 'bg-fuchsia-500',
]
function avatarColor(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}
function iniciales(nombres: string, apellidos: string | null): string {
  return `${nombres?.[0] ?? ''}${apellidos?.[0] ?? ''}`.toUpperCase()
}

function BrigCard({
  id, nombres, apellidos, parroquia, celular, badge, onRemove, draggable, onDragStart, onDragEnd,
}: {
  id: string
  nombres: string
  apellidos: string | null
  parroquia: string | null
  celular: string | null
  badge?: string
  onRemove?: () => void
  draggable?: boolean
  onDragStart?: (e:React.DragEvent) => void
  onDragEnd?: (e:React.DragEvent) => void
}) {
  return (
    <div draggable={draggable}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        className={`flex items-center gap-2 p-2 bg-white border border-[#DDDDDD] rounded-lg ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${avatarColor(id)}`}>
        <span className="text-white text-[10px] font-bold">{iniciales(nombres, apellidos)}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-medium text-gray-900 truncate">{nombres} {apellidos ?? ''}</p>
          {badge && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#00C8B4]/15 text-[#009850]">{badge}</span>
          )}
        </div>
        <p className="text-[10px] text-gray-500 truncate">{parroquia ?? '—'}{celular ? ` · ${celular}` : ''}</p>
      </div>
      {onRemove && (
        <button type="button" onClick={onRemove} className="p-1 text-gray-400 hover:text-red-500" aria-label="Quitar">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}

function PanelAsignar({ data, onDone }: { data: IncidentData; onDone: () => void }) {
  const canAct = data.role === 'admin' || data.role === 'especialistaGRD'
  const puedeEditar =
    canAct && (data.estadoActual === 'ABIERTO' || (data.estadoActual === 'ASIGNADO' && !data.informes.some((i) => i.tipo === 'CAMPO')))
  const tieneEquipo = data.asignaciones.length > 0 || Boolean(data.responsableGRD)

  const respInicial = data.asignaciones.find((a) => a.esResponsable)?.brigadistaId ?? ''
  const equipoInicial = data.asignaciones.filter((a) => !a.esResponsable).map((a) => a.brigadistaId)

  const [editing, setEditing] = useState(!tieneEquipo && puedeEditar)
  const [tab, setTab] = useState<'equipo' | 'auto'>('equipo')
  const [responsable, setResponsable] = useState(respInicial)
  const [equipo, setEquipo] = useState<string[]>(equipoInicial)
  const [query, setQuery] = useState('')
  const [instrucciones, setInstrucciones] = useState(data.instruccionesAsignacion ?? '')
  const [isPending, startTransition] = useTransition()
  const [dragging, setDragging] = useState<{ id: string; from: 'responsable' | 'equipo' | 'catalogo' } | null>(null)

  const seleccionados = [responsable, ...equipo].filter(Boolean)
  const esRecomendado = (parroquia: string | null) =>
    !!data.parroquia && !!parroquia && parroquia.trim().toLowerCase() === data.parroquia.trim().toLowerCase()

  const catalogo = data.brigadistasDisponibles
    .filter((b) => !seleccionados.includes(b.id))
    .filter((b) => {
      const q = query.trim().toLowerCase()
      if (!q) return true
      return (
        `${b.nombres} ${b.apellidos ?? ''}`.toLowerCase().includes(q) ||
        (b.parroquia ?? '').toLowerCase().includes(q)
      )
    })
    .sort((a, b) => Number(esRecomendado(b.parroquia)) - Number(esRecomendado(a.parroquia)))

  function findBrig(id: string) {
    return (
      data.brigadistasDisponibles.find((b) => b.id === id) ??
      data.asignaciones.find((a) => a.brigadistaId === id)
    )
  }

  function agregarBrigadista(id: string) {
    if (!responsable) setResponsable(id)
    else if (!equipo.includes(id) && id !== responsable) setEquipo((prev) => [...prev, id])
  }

  function iniciarEdicion() {
    setResponsable(respInicial)
    setEquipo(equipoInicial)
    setInstrucciones(data.instruccionesAsignacion ?? '')
    setTab(data.responsableGRD ? 'auto' : 'equipo')
    setEditing(true)
  }

  function handleGuardarEquipo() {
    if (!responsable) {
      toast.error('Debes designar un brigadista responsable')
      return
    }
    startTransition(async () => {
      const res = await assignEquipo(data.idIncidencia, responsable, equipo, instrucciones)
      if (res && 'message' in res) { toast.error(res.message); return }
      const total = 1 + equipo.length
      toast.success(total === 1 ? 'Equipo asignado correctamente' : `Equipo de ${total} personas asignado`)
      setEditing(false)
      onDone()
    })
  }

  function handleAutoasignarme() {
    startTransition(async () => {
      const res = await autoasignarme(data.idIncidencia, instrucciones)
      if (res && 'message' in res) { toast.error(res.message); return }
      toast.success('Te autoasignaste como único responsable del caso')
      setEditing(false)
      onDone()
    })
  }

  if (!canAct && !tieneEquipo) {
    return <p className="text-sm text-gray-500 text-center py-4">Solo el Especialista GRD puede gestionar la asignación del equipo.</p>
  }

  if (data.estadoActual !== 'ABIERTO' && !tieneEquipo && !puedeEditar) {
    return <p className="text-sm text-gray-500 text-center py-4">No hay equipo asignado para este incidente.</p>
  }

  if (tieneEquipo && !editing) {
    const respBrig = data.asignaciones.find((a) => a.esResponsable)
    const integrantes = data.asignaciones.filter((a) => !a.esResponsable)

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Equipo asignado</p>
          {puedeEditar && (
            <button
              type="button"
              onClick={iniciarEdicion}
              className="p-2 rounded-lg border border-[#DDDDDD] text-gray-600 hover:bg-gray-50 hover:text-[var(--caritas-green)] transition-colors"
              title="Editar asignación"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
        </div>

        {data.responsableGRD ? (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
            <span className="text-[10px] font-bold uppercase text-blue-700">Especialista GRD — Responsable único</span>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--caritas-green)]/20 flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-[var(--caritas-green)]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{data.responsableGRD.nombre}</p>
                {data.responsableGRD.correo && <p className="text-xs text-gray-500">{data.responsableGRD.correo}</p>}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {respBrig && (
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1.5">Responsable</p>
                <BrigCard
                  id={respBrig.brigadistaId}
                  nombres={respBrig.nombres}
                  apellidos={respBrig.apellidos}
                  parroquia={respBrig.parroquia}
                  celular={respBrig.celular}
                  badge="RESPONSABLE"
                />
              </div>
            )}
            {integrantes.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1.5">Equipo ({integrantes.length})</p>
                <div className="space-y-2">
                  {integrantes.map((m) => (
                    <BrigCard
                      key={m.brigadistaId}
                      id={m.brigadistaId}
                      nombres={m.nombres}
                      apellidos={m.apellidos}
                      parroquia={m.parroquia}
                      celular={m.celular}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {data.instruccionesAsignacion && (
          <div className="bg-[#91D723]/10 border border-[#91D723]/30 rounded-lg px-3 py-2">
            <p className="text-[10px] text-[#009850] uppercase font-semibold mb-0.5">Instrucciones</p>
            <p className="text-xs text-[#009850]">{data.instruccionesAsignacion}</p>
          </div>
        )}

        {data.estadoActual === 'ASIGNADO' && (
          <p className="text-[10px] text-gray-400">El incidente está en estado Asignado. El equipo puede iniciar el levantamiento en campo.</p>
        )}
      </div>
    )
  }

  if (!puedeEditar) {
    return <p className="text-sm text-gray-500 text-center py-4">La asignación ya no puede modificarse en esta etapa.</p>
  }

  return (
    <div className="space-y-4 border border-gray-200 rounded-2xl overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-sm font-medium text-gray-700">
          {tieneEquipo ? 'Modificar asignación' : 'Nueva asignación'}
        </h2>
        {tieneEquipo && (
          <button type="button" onClick={() => setEditing(false)} className="text-xs font-bold text-[#009850] hover:text-gray-800 cursor-pointer">
            Cancelar
          </button>
        )}
      </div>

      <div className="px-4 space-y-4 pb-4">
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
          <button
            type="button"
            onClick={() => setTab('equipo')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'equipo' ? 'bg-white text-[var(--caritas-green)] shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users className="w-4 h-4" /> Asignar brigadistas
          </button>
          <button
            type="button"
            onClick={() => setTab('auto')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'auto' ? 'bg-white text-[var(--caritas-green)] shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <UserPlus className="w-4 h-4" /> Autoasignarme
          </button>
        </div>

        {tab === 'equipo' ? (
          <>
            <p className="text-xs text-gray-600">
              Elige brigadistas con el buscador. El primero seleccionado será responsable; puedes reorganizarlo entre las áreas.
            </p>

            {seleccionados.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div 
                  className={`border rounded-xl p-3 min-h-[88px] transition-colors ${
                    dragging && dragging.id !== responsable
                      ? 'border-[#009850] bg-[#009850]/10'
                      : 'border-[#00C8B4]/30 bg-[#00C8B4]/5'
                  }`}
                  onDragOver={(e) => { if (dragging && dragging.id !== responsable) e.preventDefault() }}
                  onDrop={() => {
                    if (!dragging || dragging.id === responsable) return
                    const draggedId = dragging.id
                    const from = dragging.from
                    setDragging(null)
                    if (from === 'equipo') {
                      // Intercambio: responsable actual baja a equipo
                      setEquipo((prev) => {
                        const sinDragged = prev.filter((x) => x !== draggedId)
                        return responsable ? [responsable, ...sinDragged] : sinDragged
                      })
                      setResponsable(draggedId)
                    } else if (from === 'catalogo') {
                      // Viene de la lista: si ya hay responsable, lo manda a equipo
                      if (responsable) setEquipo((prev) => [...prev.filter((x) => x !== draggedId), responsable])
                      else setEquipo((prev) => prev.filter((x) => x !== draggedId))
                      setResponsable(draggedId)
                    }
                  }}
                >
                  <p className="text-[10px] font-bold text-[#009850] uppercase mb-2">Responsable</p>
                  {responsable ? (() => {
                    const b = findBrig(responsable)
                    if (!b) return null
                    return (
                      <BrigCard
                        id={responsable}
                        nombres={b.nombres}
                        apellidos={b.apellidos ?? null}
                        parroquia={b.parroquia ?? null}
                        celular={'celular' in b ? b.celular : null}
                        draggable
                        onDragStart={() => setDragging({ id: responsable, from: 'responsable' })}
                        onDragEnd={() => setDragging(null)}
                        onRemove={() => {
                          if (equipo.length > 0) {
                            setResponsable(equipo[0])
                            setEquipo((prev) => prev.slice(1))
                          } else setResponsable('')
                        }}
                      />
                    )
                  })() : (
                    <p className="text-xs text-gray-400 italic">
                      {dragging ? 'Suelta aquí para asignar como responsable' : 'Selecciona un brigadista de la lista'}
                    </p>
                  )}
                </div>
                <div
                  className={`border rounded-xl p-3 min-h-[88px] transition-colors ${
                    dragging && dragging.from !== 'equipo' && dragging.id !== responsable
                      ? 'border-blue-400 bg-blue-50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                  onDragOver={(e) => {
                    if (dragging && dragging.from !== 'equipo' && dragging.id !== responsable) e.preventDefault()
                  }}
                  onDrop={() => {
                    if (!dragging || dragging.from === 'equipo' || dragging.id === responsable) return
                    const draggedId = dragging.id
                    setDragging(null)
                    if (dragging.from === 'responsable') {
                      // Responsable baja a equipo, promueve el primero del equipo
                      const nuevoResponsable = equipo[0] ?? ''
                      setResponsable(nuevoResponsable)
                      setEquipo((prev) => [...prev.slice(1), draggedId])
                    } else if (dragging.from === 'catalogo') {
                      if (!equipo.includes(draggedId)) setEquipo((prev) => [...prev, draggedId])
                    }
                  }}
                >
                  <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Equipo</p>
                  {equipo.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">
                      {dragging ? 'Suelta aquí para agregar al equipo' : 'Integrantes adicionales'}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {equipo.map((id) => {
                        const b = findBrig(id)
                        if (!b) return null
                        return (
                          <BrigCard
                            key={id}
                            id={id}
                            nombres={b.nombres}
                            apellidos={b.apellidos ?? null}
                            parroquia={b.parroquia ?? null}
                            celular={'celular' in b ? b.celular : null}
                            draggable
                            onDragStart={() => setDragging({ id, from: 'equipo' })}
                            onDragEnd={() => setDragging(null)}
                            onRemove={() => setEquipo((prev) => prev.filter((x) => x !== id))}
                          />
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nombre o parroquia..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-[#DDDDDD] rounded-lg focus:outline-none focus:border-[var(--caritas-green)]"
              />
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1 border border-gray-100 rounded-xl">
              {catalogo.length === 0 ? (
                <p className="text-center py-6 text-sm text-gray-400">No hay brigadistas para mostrar</p>
              ) : (
                catalogo.map((b) => {
                  const rec = esRecomendado(b.parroquia)
                  return (
                    <button
                      type="button"
                      key={b.id}
                      draggable
                      onDragStart={() => setDragging({ id: b.id, from: 'catalogo' })}
                      onDragEnd={() => setDragging(null)}
                      onClick={() => agregarBrigadista(b.id)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-left border-b border-gray-50 last:border-0 cursor-grab active:cursor-grabbing"
                    >
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${avatarColor(b.id)}`}>
                        <span className="text-white text-xs font-bold">{iniciales(b.nombres, b.apellidos)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-800 truncate">{b.nombres} {b.apellidos ?? ''}</p>
                          {rec && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">
                              <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> RECOMENDADO
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{b.parroquia ?? '—'}{b.celular ? ` · ${b.celular}` : ''}</p>
                      </div>
                      <Plus className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </button>
                  )
                })
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Instrucciones para el equipo</label>
              <textarea
                value={instrucciones}
                onChange={(e) => setInstrucciones(e.target.value)}
                rows={3}
                placeholder="Indicaciones, punto de encuentro, materiales..."
                className="w-full px-3 py-2 text-sm border border-[#DDDDDD] rounded-lg focus:outline-none focus:border-[var(--caritas-green)] resize-none"
              />
            </div>

            <button
              type="button"
              onClick={handleGuardarEquipo}
              disabled={isPending || !responsable}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold disabled:opacity-50"
              style={{ background: 'var(--caritas-green)' }}
            >
              {isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Guardando...</> : (
                <><UserCheck className="w-4 h-4" />Guardar asignación{seleccionados.length > 0 ? ` (${seleccionados.length})` : ''}</>
              )}
            </button>
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <UserPlus className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">
                Serás el <strong>único responsable</strong> del levantamiento. No se asignará brigadista adicional.
                {data.estadoActual === 'ABIERTO' && ' El incidente pasará a estado Asignado.'}
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Notas internas (opcional)</label>
              <textarea
                value={instrucciones}
                onChange={(e) => setInstrucciones(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-[#DDDDDD] rounded-lg focus:outline-none focus:border-[var(--caritas-green)] resize-none"
              />
            </div>
            <button
              type="button"
              onClick={handleAutoasignarme}
              disabled={isPending}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold disabled:opacity-50"
              style={{ background: 'var(--caritas-green)' }}
            >
              {isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Procesando...</> : (
                <><UserPlus className="w-4 h-4" />Autoasignarme como responsable</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Panel: Recopilar Información (Campo) ────────────────────────────────────

function PanelCampo({ data, onDone }: { data: IncidentData; onDone: () => void }) {
  const [isPending, startTransition] = useTransition()
  // Brigadista solo puede llenar si está asignado a ESTE incidente
  const canAct =
    data.role === 'admin' ||
    data.role === 'especialistaGRD' ||
    data.isResponsableGRD ||
    (data.role === 'brigadista' && data.isBrigadistaAsignado)
  const done = data.estadoActual !== 'ASIGNADO'
  const informeCampo = data.informes.find((i) => i.tipo === 'CAMPO')

  const [form, setForm] = useState({
    descripcionEvento: '',
    nivelVulnerabilidad: 'Medio' as string,
    necesidadesPrioritarias: '',
    recomendacion: '',
    observaciones: '',
    agua: false, electricidad: false, refugio: false, saludAmbiental: false, acceso: false,
  })

  function set(key: string, value: any) { setForm((p) => ({ ...p, [key]: value })) }

  function handleSubmit() {
    if (!form.descripcionEvento || !form.recomendacion) {
      toast.error('Completa los campos obligatorios')
      return
    }
    startTransition(async () => {
      await saveInfoCampo(data.idIncidencia, {
        fechaVisita: new Date().toISOString().split('T')[0],
        responsable: data.isResponsableGRD ? data.currentUserName : 'Equipo de campo',
        descripcionEvento: form.descripcionEvento,
        nivelVulnerabilidad: form.nivelVulnerabilidad as any,
        necesidadesPrioritarias: form.necesidadesPrioritarias.split(',').map((s) => s.trim()).filter(Boolean),
        recomendacion: form.recomendacion,
        observaciones: form.observaciones,
        condHabitabilidad: {
          agua: form.agua, electricidad: form.electricidad,
          refugio: form.refugio, saludAmbiental: form.saludAmbiental, acceso: form.acceso,
        },
      })
      toast.success('Levantamiento de campo guardado')
      onDone()
    })
  }

  if (informeCampo) {
    const parsed = informeCampo.contenido ? (() => { try { return JSON.parse(informeCampo.contenido) } catch { return null } })() : null
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span className="text-sm font-medium text-green-800">Levantamiento completado el {fmtDate(informeCampo.fecha)}</span>
        </div>
        {parsed && (
          <div className="space-y-3 text-sm">
            <InfoField label="Descripción en campo" value={parsed.descripcionEvento} />
            <InfoField label="Nivel de vulnerabilidad" value={parsed.nivelVulnerabilidad} />
            <InfoField label="Necesidades" value={parsed.necesidadesPrioritarias?.join(', ') ?? '—'} />
            <InfoField label="Recomendación" value={parsed.recomendacion} />
          </div>
        )}
      </div>
    )
  }

  if (!canAct || done) {
    return <p className="text-sm text-gray-500 text-center py-4">El levantamiento de campo aún no ha sido completado.</p>
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Descripción del evento en campo <span className="text-red-500">*</span></label>
        <textarea rows={3} className={textareaCls} value={form.descripcionEvento} onChange={(e) => set('descripcionEvento', e.target.value)} placeholder="Describe lo observado en campo..." />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-2">Condiciones de habitabilidad</label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {(['agua', 'electricidad', 'refugio', 'saludAmbiental', 'acceso'] as const).map((cond) => (
            <label key={cond} className={`flex items-center gap-2 p-2 border rounded-lg cursor-pointer text-xs capitalize transition-colors ${form[cond] ? 'border-[#009850] bg-[#009850]/5 text-[#009850]' : 'border-[#DDDDDD] text-gray-600'}`}>
              <input type="checkbox" checked={form[cond]} onChange={(e) => set(cond, e.target.checked)} className="accent-[#009850]" />
              {cond === 'saludAmbiental' ? 'Salud Amb.' : cond.charAt(0).toUpperCase() + cond.slice(1)}
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Nivel de vulnerabilidad</label>
          <select className={inputCls} value={form.nivelVulnerabilidad} onChange={(e) => set('nivelVulnerabilidad', e.target.value)}>
            {['Bajo', 'Medio', 'Alto', 'Crítico'].map((n) => <option key={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Necesidades prioritarias</label>
          <input className={inputCls} value={form.necesidadesPrioritarias} onChange={(e) => set('necesidadesPrioritarias', e.target.value)} placeholder="Alimentos, ropa, medicamentos..." />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Recomendación <span className="text-red-500">*</span></label>
        <textarea rows={2} className={textareaCls} value={form.recomendacion} onChange={(e) => set('recomendacion', e.target.value)} placeholder="Acción recomendada..." />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Observaciones adicionales</label>
        <textarea rows={2} className={textareaCls} value={form.observaciones} onChange={(e) => set('observaciones', e.target.value)} placeholder="Observaciones relevantes..." />
      </div>

      <div className="flex justify-end">
        <button onClick={handleSubmit} disabled={isPending} className={btnPrimary} style={{ background: 'var(--caritas-green)' }}>
          {isPending ? <><Loader2 className="w-4 h-4 animate-spin inline mr-1" />Guardando...</> : 'Guardar levantamiento'}
        </button>
      </div>
    </div>
  )
}

// ─── Panel: Revisar Caso (Especialista + Comité) ──────────────────────────────

function PanelRevisar({ data, onDone }: { data: IncidentData; onDone: () => void }) {
  const [isPending, startTransition] = useTransition()
  // El comité ve "Decidir" por defecto cuando el estado ya está en evaluación
  const defaultView: 'evaluar' | 'decidir' =
    (data.role === 'comite' || data.role === 'jefaOGP') && data.estadoActual === 'EN EVALUACION'
      ? 'decidir'
      : 'evaluar'
  const [view, setView] = useState<'evaluar' | 'decidir'>(defaultView)
  const [obsText, setObsText] = useState('')
  const [evalForm, setEvalForm] = useState({ analisis: '', hallazgos: '', conclusiones: '', urgencia: 'Alta', intervencion: 'Donación en especie', recomendacion: '' })
  const setE = (k: string, v: string) => setEvalForm((p) => ({ ...p, [k]: v }))

  const canEvaluar = data.role === 'admin' || data.role === 'especialistaGRD'
  const canDecidir = data.role === 'admin' || data.role === 'comite' || data.role === 'jefaOGP'
  const informeEval = data.informes.find((i) => i.tipo === 'EVALUACION')
  const solicitud = data.solicitudComite

  function handleEvaluar() {
    if (!evalForm.analisis || !evalForm.conclusiones) { toast.error('Completa los campos obligatorios'); return }
    startTransition(async () => {
      await saveInformeEvaluacion(data.idIncidencia, {
        analisisSituacion: evalForm.analisis,
        hallazgosTexto: evalForm.hallazgos,
        conclusiones: evalForm.conclusiones,
        nivelUrgencia: evalForm.urgencia,
        tipoIntervencion: evalForm.intervencion,
        recomendacionComite: evalForm.recomendacion,
      })
      toast.success('Informe enviado al Comité')
      onDone()
    })
  }

  function handleDecision(tipo: 'aprobar' | 'observar' | 'rechazar') {
    if ((tipo === 'observar' || tipo === 'rechazar') && !obsText.trim()) {
      toast.error('Debes indicar observaciones o motivo de rechazo')
      return
    }
    startTransition(async () => {
      if (tipo === 'aprobar') {
        await aprobarCaso(data.idIncidencia)
        toast.success('Caso aprobado')
      } else if (tipo === 'observar') {
        await observarCaso(data.idIncidencia, obsText)
        toast.success('Caso devuelto con observaciones')
      } else {
        await rechazarCaso(data.idIncidencia, obsText)
        toast.error('Caso rechazado')
      }
      onDone()
    })
  }

  // Estado ya decidido
  if (['APROBADO', 'RECHAZADO'].includes(data.estadoActual)) {
    const approved = data.estadoActual === 'APROBADO'
    return (
      <div className={`p-4 rounded-lg border ${approved ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
        <div className="flex items-center gap-2 mb-2">
          {approved ? <CheckCircle className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
          <span className={`font-semibold ${approved ? 'text-green-800' : 'text-red-800'}`}>
            Caso {approved ? 'Aprobado' : 'Rechazado'} por el Comité
          </span>
        </div>
        {solicitud?.observaciones && <p className="text-sm text-gray-700">{solicitud.observaciones}</p>}
        {solicitud?.fecha && <p className="text-xs text-gray-500 mt-1">{fmtDate(solicitud.fecha)}</p>}
      </div>
    )
  }

  if (data.estadoActual === 'OBSERVADO') {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm font-semibold text-amber-800 mb-1">El Comité devolvió con observaciones</p>
          <p className="text-sm text-amber-700">{solicitud?.observaciones ?? 'Sin observaciones registradas'}</p>
        </div>
        {canEvaluar && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-gray-700">Corrección del informe</p>
            <textarea rows={3} className={textareaCls} value={evalForm.analisis} onChange={(e) => setE('analisis', e.target.value)} placeholder="Nuevo análisis de la situación..." />
            <textarea rows={2} className={textareaCls} value={evalForm.hallazgos} onChange={(e) => setE('hallazgos', e.target.value)} placeholder="Hallazgos actualizados..." />
            <textarea rows={2} className={textareaCls} value={evalForm.conclusiones} onChange={(e) => setE('conclusiones', e.target.value)} placeholder="Conclusiones corregidas..." />
            <div className="flex justify-end">
              <button
                onClick={() => {
                  startTransition(async () => {
                    await corregirYReenviar(data.idIncidencia, { analisisSituacion: evalForm.analisis, hallazgosTexto: evalForm.hallazgos, conclusiones: evalForm.conclusiones, recomendacionComite: evalForm.recomendacion })
                    toast.success('Informe corregido y reenviado')
                    onDone()
                  })
                }}
                disabled={isPending}
                className={btnPrimary} style={{ background: 'var(--caritas-green)' }}
              >
                {isPending ? 'Enviando...' : 'Reenviar al Comité'}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Tabs: Evaluar / Decidir */}
      <div className="flex border-b border-[#DDDDDD]">
        {canEvaluar && (
          <button onClick={() => setView('evaluar')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${view === 'evaluar' ? 'border-[#009850] text-[#009850]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            Informe de Evaluación
          </button>
        )}
        {canDecidir && data.estadoActual === 'EN EVALUACION' && (
          <button onClick={() => setView('decidir')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${view === 'decidir' ? 'border-[#009850] text-[#009850]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            Decisión del Comité
          </button>
        )}
      </div>

      {/* Vista: Evaluar */}
      {view === 'evaluar' && (
        informeEval ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <FileCheck className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Informe enviado al Comité — {fmtDate(informeEval.fecha)}</span>
            </div>
            <InfoField label="Análisis de la situación" value={informeEval.resumen ?? '—'} />
            {informeEval.contenido && (() => {
              try {
                const p = JSON.parse(informeEval.contenido)
                return (
                  <div className="space-y-2">
                    <InfoField label="Hallazgos" value={p.hallazgosTexto ?? '—'} />
                    <InfoField label="Conclusiones" value={p.conclusiones ?? '—'} />
                    <InfoField label="Tipo de intervención" value={p.tipoIntervencion ?? '—'} />
                  </div>
                )
              } catch { return null }
            })()}
          </div>
        ) : canEvaluar ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Análisis de la situación <span className="text-red-500">*</span></label>
              <textarea rows={3} className={textareaCls} value={evalForm.analisis} onChange={(e) => setE('analisis', e.target.value)} placeholder="Describe la situación actual de las familias afectadas..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Hallazgos principales</label>
              <textarea rows={2} className={textareaCls} value={evalForm.hallazgos} onChange={(e) => setE('hallazgos', e.target.value)} placeholder="Principales hallazgos del informe..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Conclusiones <span className="text-red-500">*</span></label>
              <textarea rows={2} className={textareaCls} value={evalForm.conclusiones} onChange={(e) => setE('conclusiones', e.target.value)} placeholder="Conclusiones del especialista..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nivel de urgencia</label>
                <select className={inputCls} value={evalForm.urgencia} onChange={(e) => setE('urgencia', e.target.value)}>
                  {['Inmediata', 'Alta', 'Media', 'Baja'].map((u) => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tipo de intervención</label>
                <select className={inputCls} value={evalForm.intervencion} onChange={(e) => setE('intervencion', e.target.value)}>
                  {['Donación en especie', 'Donación económica', 'Derivación institucional', 'Acompañamiento pastoral', 'No aplica'].map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Recomendación al Comité</label>
              <textarea rows={2} className={textareaCls} value={evalForm.recomendacion} onChange={(e) => setE('recomendacion', e.target.value)} placeholder="Recomendación para el Comité de Donaciones..." />
            </div>
            <div className="flex justify-end">
              <button onClick={handleEvaluar} disabled={isPending} className={btnPrimary} style={{ background: 'var(--caritas-green)' }}>
                {isPending ? 'Enviando...' : 'Enviar al Comité'}
              </button>
            </div>
          </div>
        ) : <p className="text-sm text-gray-500 text-center py-4">El Especialista GRD aún no ha elaborado el informe de evaluación.</p>
      )}

      {/* Vista: Decidir */}
      {view === 'decidir' && canDecidir && (
        <div className="space-y-4">
          {informeEval && (
            <div className="bg-gray-50 border border-[#DDDDDD] rounded-lg p-4 text-sm space-y-2">
              <p className="font-medium text-gray-800 text-xs mb-2">Resumen del informe del Especialista</p>
              <InfoField label="Análisis" value={informeEval.resumen ?? '—'} />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Observaciones / Motivo</label>
            <textarea rows={3} className={textareaCls} value={obsText} onChange={(e) => setObsText(e.target.value)} placeholder="Ingresa observaciones si devuelves o motivo si rechazas..." />
          </div>
          <div className="flex gap-3 justify-end flex-wrap">
            <button onClick={() => handleDecision('rechazar')} disabled={isPending} className={btnDanger}>
              {isPending ? 'Procesando...' : 'Rechazar'}
            </button>
            <button onClick={() => handleDecision('observar')} disabled={isPending} className="px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-300 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50">
              {isPending ? 'Procesando...' : 'Devolver con observaciones'}
            </button>
            <button onClick={() => handleDecision('aprobar')} disabled={isPending} className={btnPrimary} style={{ background: 'var(--caritas-green)' }}>
              {isPending ? 'Procesando...' : 'Aprobar caso'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Panel: Atender Caso ──────────────────────────────────────────────────────

function PanelAtender({ data, onDone }: { data: IncidentData; onDone: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({ tipoAyuda: 'Donación en especie', descripcion: '', lugar: '', observaciones: '' })
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }))
  const canAct = data.role === 'admin' || data.role === 'especialistaGRD'
  const done = data.entregas.length > 0

  if (done) {
    const e = data.entregas[0]
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 p-3 bg-cyan-50 border border-cyan-200 rounded-lg">
          <HandHeart className="w-4 h-4 text-cyan-600" />
          <span className="text-sm font-medium text-cyan-800">Ayuda entregada {e.fecha ? fmtDate(e.fecha) : ''}</span>
        </div>
        <InfoField label="Tipo de ayuda" value={e.tipoAyuda ?? '—'} />
        <InfoField label="Descripción" value={e.descripcionAyuda ?? '—'} />
        <InfoField label="Lugar de entrega" value={e.lugarEntrega ?? '—'} />
        {e.observaciones && <InfoField label="Observaciones" value={e.observaciones} />}
      </div>
    )
  }

  if (!canAct) return <p className="text-sm text-gray-500 text-center py-4">La entrega aún no ha sido registrada.</p>

  return (
    <div className="space-y-4">
      <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
        El Comité aprobó este caso. Registra la entrega de la ayuda humanitaria.
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Tipo de ayuda <span className="text-red-500">*</span></label>
          <select className={inputCls} value={form.tipoAyuda} onChange={(e) => set('tipoAyuda', e.target.value)}>
            {['Donación en especie', 'Donación económica', 'Kit de emergencia', 'Víveres', 'Ropa y abrigo', 'Colchones y frazadas', 'Útiles de higiene', 'Material de construcción', 'Otro'].map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Lugar de entrega <span className="text-red-500">*</span></label>
          <select className={inputCls} value={form.lugar} onChange={(e) => set('lugar', e.target.value)}>
            <option value="">Selecciona una parroquia...</option>
            {data.parroquias.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Descripción de la ayuda <span className="text-red-500">*</span></label>
        <textarea rows={3} className={textareaCls} value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} placeholder="Detalla los ítems entregados y cantidades..." />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Observaciones</label>
        <textarea rows={2} className={textareaCls} value={form.observaciones} onChange={(e) => set('observaciones', e.target.value)} placeholder="Observaciones adicionales..." />
      </div>
      <div className="flex justify-end">
        <button
          onClick={() => {
            if (!form.descripcion || !form.lugar) { toast.error('Completa los campos obligatorios'); return }
            startTransition(async () => {
              await registrarAtencion(data.idIncidencia, { tipoAyuda: form.tipoAyuda, descripcionAyuda: form.descripcion, lugarEntrega: form.lugar, observaciones: form.observaciones })
              toast.success('Entrega registrada correctamente')
              onDone()
            })
          }}
          disabled={isPending}
          className={btnPrimary} style={{ background: 'var(--caritas-green)' }}
        >
          {isPending ? 'Registrando...' : 'Registrar entrega'}
        </button>
      </div>
    </div>
  )
}

// ─── Panel: Seguimiento ───────────────────────────────────────────────────────

function PanelSeguimiento({ data, onDone }: { data: IncidentData; onDone: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({ situacion: '', descripcion: '', necesidades: '', recomendaciones: '' })
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }))
  const canAct = data.role === 'admin' || data.role === 'especialistaGRD'
  const canClose = canAct && (data.estadoActual === 'SEGUIMIENTO ABIERTO' || data.estadoActual === 'ATENDIDO')

  function handleSeguimiento() {
    if (!form.situacion || !form.descripcion) { toast.error('Completa los campos obligatorios'); return }
    startTransition(async () => {
      await addSeguimiento(data.idIncidencia, { situacion: form.situacion, descripcion: form.descripcion, necesidadesPendientes: form.necesidades, recomendaciones: form.recomendaciones })
      toast.success('Seguimiento registrado')
      setForm({ situacion: '', descripcion: '', necesidades: '', recomendaciones: '' })
      onDone()
    })
  }

  function handleCerrar() {
    startTransition(async () => {
      await cerrarCaso(data.idIncidencia)
      toast.success('Caso cerrado correctamente')
      onDone()
    })
  }

  return (
    <div className="space-y-4">
      {/* Historial de seguimientos */}
      {data.seguimientos.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2">Seguimientos registrados</p>
          <div className="space-y-2">
            {data.seguimientos.map((s) => (
              <div key={s.id} className="p-3 bg-gray-50 border border-[#DDDDDD] rounded-lg text-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-gray-800">{s.situacion ?? '—'}</span>
                  <span className="text-xs text-gray-400">{fmtDate(s.fecha)}</span>
                </div>
                <p className="text-gray-600">{s.descripcion ?? '—'}</p>
                {s.necesidadesPendientes && <p className="text-xs text-amber-700 mt-1">Necesidades: {s.necesidadesPendientes}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Formulario nuevo seguimiento */}
      {canAct && data.estadoActual !== 'CERRADO' && data.estadoActual !== 'RECHAZADO' && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-600">Agregar seguimiento</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Situación actual <span className="text-red-500">*</span></label>
              <input className={inputCls} value={form.situacion} onChange={(e) => set('situacion', e.target.value)} placeholder="Ej: Familia estabilizada, necesita asistencia" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Necesidades pendientes</label>
              <input className={inputCls} value={form.necesidades} onChange={(e) => set('necesidades', e.target.value)} placeholder="Ej: Reparación de techo" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Descripción <span className="text-red-500">*</span></label>
            <textarea rows={2} className={textareaCls} value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} placeholder="Detalla la situación actual..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Recomendaciones</label>
            <textarea rows={2} className={textareaCls} value={form.recomendaciones} onChange={(e) => set('recomendaciones', e.target.value)} placeholder="Acciones recomendadas..." />
          </div>
          <div className="flex items-center gap-3 justify-between">
            <div>
              {canClose && (
                <button onClick={handleCerrar} disabled={isPending} className={btnGhost}>
                  {isPending ? 'Cerrando...' : 'Cerrar caso'}
                </button>
              )}
            </div>
            <button onClick={handleSeguimiento} disabled={isPending} className={btnPrimary} style={{ background: 'var(--caritas-green)' }}>
              {isPending ? 'Guardando...' : 'Guardar seguimiento'}
            </button>
          </div>
        </div>
      )}

      {!canAct && data.seguimientos.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-4">No hay seguimientos registrados.</p>
      )}
    </div>
  )
}

// ─── Panel: Resumen Final ─────────────────────────────────────────────────────

function PanelResumen({ data }: { data: IncidentData }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
        <CheckCircle className="w-6 h-6 text-gray-500" />
        <div>
          <p className="font-semibold text-gray-800">Caso {data.estadoActual === 'CERRADO' ? 'cerrado' : data.estadoActual}</p>
          <p className="text-xs text-gray-500">Registrado el {fmtDate(data.fechaRegistro)}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
        {[
          { label: 'Familias', value: data.gruposFamiliares.length },
          { label: 'Personas', value: data.gruposFamiliares.reduce((s, g) => s + g.totalPersonas, 0) },
          { label: 'Seguimientos', value: data.seguimientos.length },
          { label: 'Informes', value: data.informes.length },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-[#DDDDDD] rounded-xl p-3">
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>
      {data.historial.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2">Historial de estados</p>
          <div className="space-y-1.5">
            {data.historial.map((h, i) => (
              <div key={i} className="flex items-center gap-3 text-xs text-gray-600">
                <span className="text-gray-400 shrink-0">{fmtDateTime(h.fecha)}</span>
                <span className="font-medium">{h.estadoNuevo}</span>
                {h.motivoCambio && <span className="text-gray-400">— {h.motivoCambio}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Helper: Info field ───────────────────────────────────────────────────────

function InfoField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-gray-800">{value}</p>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function IncidentDetail({ data }: { data: IncidentData }) {
  const router = useRouter()
  const [activeStep, setActiveStep] = useState(() => getStepIndex(data.estadoActual))
  const [showHistory, setShowHistory] = useState(false)

  const cfg = STATUS_CFG[data.estadoActual] ?? STATUS_CFG['ABIERTO']
  const currentStepIdx = getStepIndex(data.estadoActual)

  function handleDone() {
    router.refresh()
  }

  const CatIcon = (data.tipoEvento && CAT_ICONS[data.tipoEvento]) ? CAT_ICONS[data.tipoEvento] : MapPin
  const canEdit = (data.role === 'admin' || data.role === 'especialistaGRD') && data.estadoActual === 'ABIERTO'

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/grd" className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 mt-0.5 flex-shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-mono text-sm text-gray-500">{data.codigoCaso ?? '—'}</span>
            <span className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </span>
          </div>
          <h1 className="text-lg md:text-xl font-semibold text-gray-900 mb-1">{data.tituloIncidencia ?? 'Sin título'}</h1>
          <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
            {data.tipoEvento && (
              <span className="flex items-center gap-1"><CatIcon className="w-4 h-4" />{data.tipoEvento}</span>
            )}
            {data.direccionEvento && (
              <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{data.direccionEvento}</span>
            )}
            <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{fmtDate(data.fechaRegistro)}</span>
          </div>
        </div>
        {canEdit && (
          <Link href={`/grd/${data.idIncidencia}/editar`} className="hidden md:flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-[#DDDDDD] rounded-lg hover:bg-gray-50 transition-colors text-gray-700">
            <Edit className="w-4 h-4" />Editar
          </Link>
        )}
      </div>

      {/* Pasos del flujo */}
      <div className="bg-white border border-[#DDDDDD] rounded-xl overflow-hidden">
        {/* Barra de pasos */}
        <div className="flex border-b border-[#DDDDDD] overflow-x-auto">
          {STEPS.map((step, idx) => {
            const StepIcon = step.icon
            const completed = idx < currentStepIdx
            const current = idx === currentStepIdx
            const active = idx === activeStep
            return (
              <button
                key={step.key}
                onClick={() => setActiveStep(idx)}
                disabled={false}
                className={`flex flex-col items-center gap-1 px-3 md:px-4 py-3 text-xs font-medium transition-colors border-b-2 flex-shrink-0 min-w-[70px] ${
                  active
                    ? 'border-[#009850] text-[#009850] bg-[#009850]/5'
                    : completed
                    ? 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                    : current
                    ? 'border-[#009850]/40 text-gray-700 hover:bg-gray-50'
                    : idx === currentStepIdx + 1
                    ? 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    : 'border-transparent text-gray-300 cursor-not-allowed'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  completed ? 'bg-[#009850] text-white' :
                  current ? 'bg-[#009850]/10 text-[#009850]' :
                  'bg-gray-100 text-gray-400'
                }`}>
                  {completed ? <CheckCircle className="w-3.5 h-3.5" /> : <StepIcon className="w-3.5 h-3.5" />}
                </div>
                <span className="hidden sm:block leading-tight text-center">{step.label}</span>
              </button>
            )
          })}
        </div>

        {/* Contenido del paso activo */}
        <div className="p-4 md:p-6">
          {activeStep === 0 && <PanelRegistrar data={data} />}
          {activeStep === 1 && <PanelAsignar data={data} onDone={handleDone} />}
          {activeStep === 2 && <PanelCampo data={data} onDone={handleDone} />}
          {activeStep === 3 && <PanelRevisar data={data} onDone={handleDone} />}
          {activeStep === 4 && <PanelAtender data={data} onDone={handleDone} />}
          {activeStep === 5 && <PanelSeguimiento data={data} onDone={handleDone} />}
          {activeStep === 6 && <PanelResumen data={data} />}
        </div>
      </div>

      {/* Historial de estados */}
      {data.historial.length > 0 && (
        <div className="bg-white border border-[#DDDDDD] rounded-xl overflow-hidden">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-gray-400" />Historial de cambios</span>
            {showHistory ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {showHistory && (
            <div className="border-t border-[#DDDDDD] px-5 py-4 space-y-2">
              {data.historial.map((h, i) => (
                <div key={i} className="flex items-start gap-3 text-xs">
                  <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${STATUS_CFG[h.estadoNuevo]?.dot ?? 'bg-gray-400'}`} />
                  <div className="flex-1">
                    <span className="font-medium text-gray-800">{STATUS_CFG[h.estadoNuevo]?.label ?? h.estadoNuevo}</span>
                    {h.motivoCambio && <span className="text-gray-500"> — {h.motivoCambio}</span>}
                    {h.observaciones && <p className="text-gray-400 mt-0.5 italic">{h.observaciones}</p>}
                  </div>
                  <span className="text-gray-400 flex-shrink-0">{fmtDateTime(h.fecha)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
