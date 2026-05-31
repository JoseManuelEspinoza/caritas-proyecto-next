'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Save, FileText, X, MessageSquare, Users,
  ChevronDown, UserCircle, Info, Upload, Trash2, Plus, Edit3, Calendar,
} from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { CategorySelector } from './category-selector'
import { LocationPicker } from './location-picker'
import {
  createIncidente,
  updateIncidente,
  type PersonaForm,
  type FamiliaForm,
  type CreateIncidenteData,
} from '@/app/actions/incidents'

// ─── Catálogos ────────────────────────────────────────────────────────────────

const FUENTES_ALERTA = [
  'Párroco', 'Agente Pastoral', 'Líder Comunitario', 'Brigadista parroquial',
  'Comunidad / Vecinos', 'Defensa Civil', 'Municipalidad', 'Bomberos',
  'INDECI', 'Policía Nacional', 'Otro',
]

const DISTRITOS_LIMA = [
  'Ancón', 'Ate', 'Barranco', 'Breña', 'Carabayllo', 'Chaclacayo',
  'Chorrillos', 'Cieneguilla', 'Comas', 'El Agustino', 'Independencia',
  'Jesús María', 'La Molina', 'La Victoria', 'Lince', 'Los Olivos',
  'Lurigancho', 'Lurín', 'Magdalena del Mar', 'Miraflores', 'Pachacámac',
  'Pueblo Libre', 'Puente Piedra', 'Rímac', 'San Borja', 'San Isidro',
  'San Juan de Lurigancho', 'San Juan de Miraflores', 'San Luis',
  'San Martín de Porres', 'San Miguel', 'Santa Anita', 'Santiago de Surco',
  'Surquillo', 'Villa El Salvador', 'Villa María del Triunfo', 'Lima Cercado',
]

const PARROQUIAS_LIMA = [
  'Parroquia San Juan Bautista', 'Parroquia Nuestra Señora del Carmen',
  'Parroquia Santa Rosa', 'Parroquia San Pedro', 'Parroquia San José Obrero',
  'Parroquia Cristo Salvador', 'Parroquia Sagrado Corazón de Jesús',
  'Parroquia Santa María de Fátima', 'Parroquia Nuestra Señora del Pilar',
  'Parroquia San Francisco de Asís',
]

const NECESIDADES_CHIPS = ['Alimentos', 'Ropa', 'Atención médica', 'Materiales de construcción', 'Otros']
const SITUACIONES_ESPECIALES = ['Gestante', 'Discapacitado', 'Con Lactancia', 'Enfermo', 'Herido', 'Enfermo crónico', 'Adulto mayor']
const PARENTESCOS = ['Jefe(a) de Hogar', 'Padre', 'Madre', 'Hijo(a)', 'Nieto(a)', 'Abuelo(a)', 'Tío(a)', 'Cónyuge', 'Otro']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toggleArr<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]
}

function nowLocal() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

const inputCls = 'w-full px-4 py-2.5 bg-white border border-[#DDDDDD] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009850]/20 focus:border-[#009850] transition-colors'

// ─── Sección numerada ─────────────────────────────────────────────────────────

function FormSection({ num, title, subtitle, children }: {
  num: number; title: string; subtitle?: string; children: React.ReactNode
}) {
  return (
    <section className="space-y-4">
      <div className="pb-2 border-b-2 border-[#009850]/20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#009850] rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">{num}</span>
          </div>
          <h2 className="text-sm font-bold text-[#49494A] uppercase tracking-wide">{title}</h2>
        </div>
        {subtitle && <p className="text-xs text-gray-500 mt-1 ml-11">{subtitle}</p>}
      </div>
      {children}
    </section>
  )
}

// ─── Modal de persona ─────────────────────────────────────────────────────────

function PersonaModal({ onSave, onClose, editing, familias, activeFamiliaId }: {
  onSave: (p: PersonaForm) => void
  onClose: () => void
  editing?: PersonaForm
  familias: FamiliaForm[]
  activeFamiliaId?: string
}) {
  const [form, setForm] = useState<PersonaForm>(editing ?? {
    id: `PER-${Date.now()}`,
    tipoDoc: 'DNI', dni: '', nombre: '', apellidoPaterno: '', apellidoMaterno: '',
    edad: '', genero: 'Femenino', celular: '', parentesco: '',
    situacionActual: '', familiaId: activeFamiliaId,
  })

  function set(key: keyof PersonaForm, value: string) {
    setForm((p) => ({ ...p, [key]: value }))
  }

  function handleSubmit() {
    if (!form.nombre.trim()) { toast.error('Ingresa el nombre de la persona'); return }
    if (!form.edad)          { toast.error('Ingresa la edad'); return }
    onSave({ ...form, id: editing?.id || `PER-${Date.now()}` })
    onClose()
  }

  const familiaActual = familias.find((f) => f.id === activeFamiliaId)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-auto shadow-xl">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">
            {editing ? 'Editar persona' : activeFamiliaId
              ? `Agregar integrante — ${familiaActual?.nombre ?? ''}`
              : 'Agregar persona afectada'}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:bg-gray-100 rounded p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {activeFamiliaId && (
          <div className="bg-blue-50 border-b border-blue-100 px-4 py-2 text-xs text-blue-800">
            Integrante de: <strong>{familiaActual?.nombre}</strong>
          </div>
        )}

        <div className="p-4 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Tipo Doc.</label>
              <select value={form.tipoDoc} onChange={(e) => set('tipoDoc', e.target.value)} className="w-full px-2 py-2 text-sm border border-gray-200 rounded-lg">
                {['DNI', 'CE', 'Pasaporte', 'Otro'].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-600 block mb-1">N° Documento</label>
              <input type="text" value={form.dni} onChange={(e) => set('dni', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg" placeholder="12345678" maxLength={15} />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Nombres <span className="text-red-500">*</span></label>
            <input type="text" value={form.nombre} onChange={(e) => set('nombre', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg" placeholder="Ej: María Elena" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Apellido Paterno</label>
              <input type="text" value={form.apellidoPaterno} onChange={(e) => set('apellidoPaterno', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Apellido Materno</label>
              <input type="text" value={form.apellidoMaterno} onChange={(e) => set('apellidoMaterno', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Edad <span className="text-red-500">*</span></label>
              <input type="number" value={form.edad} onChange={(e) => set('edad', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg" placeholder="0" min="0" max="120" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Género</label>
              <select value={form.genero} onChange={(e) => set('genero', e.target.value)} className="w-full px-2 py-2 text-sm border border-gray-200 rounded-lg">
                {['Femenino', 'Masculino', 'Otro', 'Prefiere no decir'].map((g) => <option key={g}>{g}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Celular</label>
              <input type="tel" value={form.celular} onChange={(e) => set('celular', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg" placeholder="987654321" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Parentesco</label>
              <select value={form.parentesco} onChange={(e) => set('parentesco', e.target.value)} className="w-full px-2 py-2 text-sm border border-gray-200 rounded-lg">
                <option value="">Seleccionar...</option>
                {PARENTESCOS.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Situación especial</label>
            <select value={form.situacionActual} onChange={(e) => set('situacionActual', e.target.value)} className="w-full px-2 py-2 text-sm border border-gray-200 rounded-lg">
              <option value="">Ninguna</option>
              {SITUACIONES_ESPECIALES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium">Cancelar</button>
            <button onClick={handleSubmit} className="flex-1 px-4 py-2 bg-[#009850] text-white rounded-lg text-sm font-medium">Guardar</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Modal observaciones familia ──────────────────────────────────────────────

function ObsFamiliaModal({ familia, onSave, onClose }: {
  familia: FamiliaForm
  onSave: (obs: string) => void
  onClose: () => void
}) {
  const [obs, setObs] = useState(familia.observaciones ?? '')
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full shadow-xl">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Observaciones — {familia.nombre}</h3>
          <button onClick={onClose} className="text-gray-500 hover:bg-gray-100 rounded p-1"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-3">
          <textarea rows={4} value={obs} onChange={(e) => setObs(e.target.value)}
            placeholder="Ej: La familia vive en condición de hacinamiento, requieren apoyo urgente..."
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#009850]/20 focus:border-[#009850]" />
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium">Cancelar</button>
            <button onClick={() => { onSave(obs); onClose() }} className="flex-1 px-4 py-2 bg-[#009850] text-white rounded-lg text-sm font-medium">Guardar</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface IncidentFormProps {
  /** Datos iniciales cuando se edita un incidente existente */
  initialData?: CreateIncidenteData
  /** ID del incidente a editar (ausente = modo creación) */
  incidenciaId?: string
  /** Código de caso para mostrar en el header */
  codigoCaso?: string
}

// ─── Formulario principal ─────────────────────────────────────────────────────

export function IncidentForm({ initialData, incidenciaId, codigoCaso }: IncidentFormProps = {}) {
  const isEdit = Boolean(incidenciaId)
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Sección 1
  const [fechaReporte]   = useState(initialData?.fechaReporte ?? nowLocal())
  const [reportaDni,     setReportaDni]     = useState(initialData?.reportaDni     ?? '')
  const [reportaNombre,  setReportaNombre]  = useState(initialData?.reportaNombre  ?? '')
  const [reportaTel,     setReportaTel]     = useState(initialData?.reportaTel     ?? '')
  const [reportaRol,     setReportaRol]     = useState(initialData?.reportaRol     ?? '')

  // Sección 2
  const [fechaSuceso,    setFechaSuceso]    = useState(initialData?.fechaSuceso    ?? '')
  const [horaSuceso,     setHoraSuceso]     = useState(initialData?.horaSuceso     ?? '')
  const [categoria,      setCategoria]      = useState(initialData?.categoria      ?? '')
  const [pais]                              = useState(initialData?.pais            ?? 'Perú')
  const [region]                            = useState(initialData?.region          ?? 'Lima Metropolitana')
  const [distrito,       setDistrito]       = useState(initialData?.distrito        ?? '')
  const [parroquia,      setParroquia]      = useState(initialData?.parroquia       ?? '')
  const [direccion,      setDireccion]      = useState(initialData?.direccion       ?? '')
  const [referencia,     setReferencia]     = useState(initialData?.referencia      ?? '')
  const [mapSugerencias, setMapSugerencias] = useState<{ desc: string; main: string }[]>([])
  const [, setMapSeleccionado]              = useState(initialData?.direccion       ?? '')
  const [lat,            setLat]            = useState<number | null>(initialData?.lat ?? null)
  const [lng,            setLng]            = useState<number | null>(initialData?.lng ?? null)

  // Sección 3
  const [descripcion,    setDescripcion]    = useState(initialData?.descripcion     ?? '')
  const [causa,          setCausa]          = useState(initialData?.causa           ?? '')

  // Sección 4
  const [familias,       setFamilias]       = useState<FamiliaForm[]>(initialData?.familias  ?? [])
  const [personas,       setPersonas]       = useState<PersonaForm[]>(initialData?.personas  ?? [])
  const [showPersonaModal, setShowPersonaModal] = useState(false)
  const [editingPersona, setEditingPersona] = useState<PersonaForm | undefined>()
  const [activeFamiliaId, setActiveFamiliaId] = useState<string | undefined>()
  const [editingFamiliaObs, setEditingFamiliaObs] = useState<FamiliaForm | null>(null)

  // Sección 5
  const [necesidades,    setNecesidades]    = useState<string[]>(initialData?.necesidades   ?? [])
  const [necesidadOtra,  setNecesidadOtra]  = useState(initialData?.necesidadOtra  ?? '')
  const [necesidadesObs, setNecesidadesObs] = useState(initialData?.necesidadesObs ?? '')

  // Sección 6
  const [fuentesEvidencia, setFuentesEvidencia] = useState<{ id: string; fuente: string; archivos: File[] }[]>([])

  // Sección 7
  const [nivelAfectacion, setNivelAfectacion] = useState<'Leve' | 'Moderado' | 'Severo'>(
    (initialData?.nivelAfectacion as 'Leve' | 'Moderado' | 'Severo') ?? 'Moderado'
  )

  // Alias autogenerado
  const parrShort = parroquia ? parroquia.split(' ').slice(-2).join(' ') : ''
  const alias = categoria
    ? (parrShort ? `${categoria}-${distrito || 'Lima'}-${parrShort}` : `${categoria}-${distrito || 'Lima'}`)
    : ''

  // Resumen personas (sección 7)
  const resumen = (() => {
    const ninos        = personas.filter((p) => { const e = parseInt(p.edad); return !isNaN(e) && e >= 0  && e <= 12 }).length
    const adolescentes = personas.filter((p) => { const e = parseInt(p.edad); return !isNaN(e) && e >= 13 && e <= 17 }).length
    const adultos      = personas.filter((p) => { const e = parseInt(p.edad); return !isNaN(e) && e >= 18 && e < 60  }).length
    const mayores      = personas.filter((p) => { const e = parseInt(p.edad); return !isNaN(e) && e >= 60             }).length
    const numFamilias  = familias.length + personas.filter((p) => !p.familiaId).length
    const situaciones: Record<string, number> = {}
    personas.forEach((p) => { if (p.situacionActual) situaciones[p.situacionActual] = (situaciones[p.situacionActual] ?? 0) + 1 })
    return { ninos, adolescentes, adultos, mayores, total: personas.length, numFamilias, situaciones }
  })()

  // Autocompletado dirección (mock)
  function handleDireccionChange(val: string) {
    setDireccion(val)
    setMapSeleccionado('')
    if (val.length < 3) { setMapSugerencias([]); return }
    setMapSugerencias([
      { desc: `${val}, Lima Metropolitana, Perú`, main: val },
      { desc: `${val}, ${distrito || 'Lima'}, Lima Metropolitana, Perú`, main: val },
    ])
  }

  // Familia
  function createFamilia() {
    const id     = `FAM-${Date.now()}`
    const nombre = `Grupo Familiar ${familias.length + 1}`
    setFamilias((prev) => [...prev, { id, nombre }])
    setActiveFamiliaId(id)
    toast.success(`${nombre} creado`)
  }

  function deleteFamilia(familiaId: string) {
    const hasPersonas = personas.some((p) => p.familiaId === familiaId)
    if (hasPersonas && !confirm('Esta familia tiene personas registradas. ¿Eliminar junto con sus integrantes?')) return
    if (hasPersonas) setPersonas((prev) => prev.filter((p) => p.familiaId !== familiaId))
    setFamilias((prev) => prev.filter((f) => f.id !== familiaId))
  }

  // Evidencias
  function addFuente(fuente: string) {
    if (fuentesEvidencia.some((f) => f.fuente === fuente)) { toast.error('Esta fuente ya está agregada'); return }
    setFuentesEvidencia((prev) => [...prev, { id: `EV-${Date.now()}`, fuente, archivos: [] }])
  }

  function deleteFuente(id: string) {
    const f = fuentesEvidencia.find((f) => f.id === id)
    if (f && f.archivos.length > 0 && !confirm(`¿Eliminar "${f.fuente}" y sus ${f.archivos.length} evidencia(s)?`)) return
    setFuentesEvidencia((prev) => prev.filter((f) => f.id !== id))
  }

  function uploadArchivos(fuenteId: string, files: FileList | null) {
    if (!files) return
    setFuentesEvidencia((prev) => prev.map((f) =>
      f.id === fuenteId ? { ...f, archivos: [...f.archivos, ...Array.from(files)] } : f
    ))
  }

  // ─── Guardar (crear o actualizar) ─────────────────────────────────────────

  function handleSave() {
    const payload: CreateIncidenteData = {
      reportaDni, reportaNombre, reportaTel, reportaRol, fechaReporte,
      fechaSuceso, horaSuceso, categoria, pais, region, distrito,
      parroquia, direccion, referencia, descripcion, causa,
      familias, personas,
      necesidades, necesidadOtra, necesidadesObs,
      nivelAfectacion,
      lat, lng,
    }

    startTransition(async () => {
      const result = isEdit && incidenciaId
        ? await updateIncidente(incidenciaId, payload)
        : await createIncidente(payload)

      if (result?.message) toast.error(result.message)
    })
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-24">

      {/* Header sticky */}
      <div className="bg-white border-b border-[#DDDDDD] sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href={isEdit && incidenciaId ? `/grd/${incidenciaId}` : '/grd'}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-[#49494A]">
              {isEdit ? `Editar Evento — ${codigoCaso}` : 'Registrar Nuevo Evento'}
            </h1>
            <p className="text-xs text-gray-500">
              {isEdit ? 'Actualiza los datos del evento' : 'Completa los datos del evento reportado'}
            </p>
          </div>
          <span className="flex-shrink-0 text-[10px] font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
            {isEdit ? 'EDICIÓN' : 'ETAPA 1 — REGISTRO'}
          </span>
        </div>
      </div>

      {/* Alias autogenerado / código actual */}
      {alias && (
        <div className="max-w-5xl mx-auto px-4 pt-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-blue-900">
                {isEdit ? 'Alias del evento' : 'Alias del evento (autogenerado)'}
              </p>
              <p className="text-sm font-bold text-blue-700 mt-0.5">{alias}</p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-4 space-y-6">
        <div className="bg-white border border-[#DDDDDD] rounded-xl p-5 md:p-6 space-y-8">

          {/* ── SECCIÓN 1: Datos Generales ─────────────────────────────────── */}
          <FormSection num={1} title="Datos Generales">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Fecha y hora del reporte</label>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span suppressHydrationWarning>{new Date(fechaReporte).toLocaleString('es-PE')}</span>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-600">Persona que reportó el evento</p>
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-12 sm:col-span-3">
                  <label className="text-xs text-gray-500 mb-1.5 block">DNI <span className="text-red-500">*</span></label>
                  <input type="text" inputMode="numeric" maxLength={8} placeholder="12345678"
                    value={reportaDni} onChange={(e) => setReportaDni(e.target.value.replace(/\D/g, ''))}
                    className={inputCls} />
                </div>
                <div className="col-span-12 sm:col-span-9">
                  <label className="text-xs text-gray-500 mb-1.5 block">Nombre y apellidos completos <span className="text-red-500">*</span></label>
                  <input type="text" placeholder="Ej: Juan Carlos Rodríguez Mamani"
                    value={reportaNombre} onChange={(e) => setReportaNombre(e.target.value)}
                    className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block">Número de celular <span className="text-red-500">*</span></label>
                  <input type="tel" placeholder="987 654 321"
                    value={reportaTel} onChange={(e) => setReportaTel(e.target.value)}
                    className={inputCls} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block">Rol / Institución <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select value={reportaRol} onChange={(e) => setReportaRol(e.target.value)} className={`${inputCls} appearance-none pr-8`}>
                      <option value="">Seleccionar...</option>
                      {FUENTES_ALERTA.map((f) => <option key={f}>{f}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          </FormSection>

          {/* ── SECCIONES 2 y 3: lado a lado en desktop ────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* SECCIÓN 2 */}
            <FormSection num={2} title="Datos del Evento">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Fecha del suceso <span className="text-red-500">*</span></label>
                  <input type="date" value={fechaSuceso} onChange={(e) => setFechaSuceso(e.target.value)}
                    max={new Date().toISOString().split('T')[0]} className={inputCls} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Hora <span className="text-gray-400 font-normal">(aprox.)</span></label>
                  <input type="time" value={horaSuceso} onChange={(e) => setHoraSuceso(e.target.value)} className={inputCls} />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 mb-2 block">Categoría del evento <span className="text-red-500">*</span></label>
                <CategorySelector value={categoria} onChange={setCategoria} />
              </div>

              <div className="space-y-3 pt-1">
                <p className="text-xs font-semibold text-gray-600">Ubicación del suceso</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">País</label>
                    <input value={pais} disabled className={`${inputCls} bg-gray-50 cursor-not-allowed`} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">Región</label>
                    <input value={region} disabled className={`${inputCls} bg-gray-50 cursor-not-allowed`} />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block">Distrito <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select value={distrito} onChange={(e) => setDistrito(e.target.value)} className={`${inputCls} appearance-none pr-8`}>
                      <option value="">Selecciona el distrito</option>
                      {DISTRITOS_LIMA.map((d) => <option key={d}>{d}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block">Parroquia de referencia</label>
                  <div className="relative">
                    <select value={parroquia} onChange={(e) => setParroquia(e.target.value)} className={`${inputCls} appearance-none pr-8`}>
                      <option value="">Seleccionar (opcional)</option>
                      {PARROQUIAS_LIMA.map((p) => <option key={p}>{p}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block">Dirección <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input type="text" placeholder="Av. Los Jardines 456, Urb. Las Flores"
                      value={direccion} onChange={(e) => handleDireccionChange(e.target.value)}
                      autoComplete="off" className={inputCls} />
                    {mapSugerencias.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-auto">
                        {mapSugerencias.map((s, i) => (
                          <button key={i} type="button"
                            onClick={() => { setDireccion(s.main); setMapSeleccionado(s.desc); setMapSugerencias([]) }}
                            className="w-full px-4 py-2.5 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0">
                            <p className="text-sm font-medium text-gray-900">{s.main}</p>
                            <p className="text-xs text-gray-500">{s.desc}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Ubicación: GPS (RF07) + manual (RF08) + mapa real */}
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block">Ubicación en el mapa (GPS o manual)</label>
                  <LocationPicker
                    lat={lat}
                    lng={lng}
                    onChange={(la, lo) => { setLat(la); setLng(lo) }}
                    onAddressResolved={(addr) => { setDireccion(addr); setMapSugerencias([]) }}
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block">Referencia / Indicaciones</label>
                  <textarea rows={2} placeholder="Al costado del mercado central, frente al colegio..."
                    value={referencia} onChange={(e) => setReferencia(e.target.value)}
                    className={`${inputCls} resize-none`} />
                </div>
              </div>
            </FormSection>

            {/* SECCIÓN 3 */}
            <FormSection num={3} title="Descripción del Evento">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Descripción breve del evento</label>
                <textarea rows={5} placeholder="Describe lo que se reportó: tipo de afectación, magnitud aproximada, situación actual..."
                  value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
                  className={`${inputCls} resize-none`} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Causa o posible causa del suceso</label>
                <textarea rows={4} placeholder="¿Qué originó el evento según la información disponible?"
                  value={causa} onChange={(e) => setCausa(e.target.value)}
                  className={`${inputCls} resize-none`} />
              </div>
            </FormSection>
          </div>

          {/* ── SECCIÓN 4: Personas Afectadas ───────────────────────────────── */}
          <FormSection num={4} title="Personas Afectadas"
            subtitle={`${familias.length} Grupo${familias.length !== 1 ? 's' : ''} Familiar${familias.length !== 1 ? 'es' : ''} · ${personas.length} Persona${personas.length !== 1 ? 's' : ''}`}>

            <div className="flex gap-2">
              <button type="button" onClick={createFamilia}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium">
                <Plus className="w-4 h-4" />Registrar Grupo Familiar
              </button>
              <button type="button" onClick={() => { setActiveFamiliaId(undefined); setShowPersonaModal(true) }}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed border-green-300 text-green-600 rounded-lg hover:bg-green-50 transition-colors text-sm font-medium">
                <Plus className="w-4 h-4" />Agregar Persona
              </button>
            </div>

            {/* Grupos familiares */}
            {familias.map((familia) => (
              <div key={familia.id} className="border border-blue-200 rounded-lg bg-blue-50 overflow-hidden">
                <div className="bg-blue-100 px-3 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-semibold text-blue-900">{familia.nombre}</span>
                    <span className="text-xs text-blue-600">({personas.filter((p) => p.familiaId === familia.id).length} integrantes)</span>
                  </div>
                  <div className="flex gap-1">
                    <button type="button" title="Agregar integrante"
                      onClick={() => { setActiveFamiliaId(familia.id); setShowPersonaModal(true) }}
                      className="p-1 hover:bg-blue-200 rounded text-blue-600"><Plus className="w-4 h-4" /></button>
                    <button type="button" title="Observaciones"
                      onClick={() => setEditingFamiliaObs(familia)}
                      className="p-1 hover:bg-blue-200 rounded text-blue-600"><MessageSquare className="w-4 h-4" /></button>
                    <button type="button" title="Eliminar grupo"
                      onClick={() => deleteFamilia(familia.id)}
                      className="p-1 hover:bg-red-100 rounded text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                {familia.observaciones && (
                  <div className="bg-blue-50 border-t border-blue-200 px-3 py-2">
                    <p className="text-[10px] text-blue-600 uppercase font-semibold">Observaciones</p>
                    <p className="text-xs text-blue-900 italic">{familia.observaciones}</p>
                  </div>
                )}
                <div className="p-2 space-y-1">
                  {personas.filter((p) => p.familiaId === familia.id).map((p) => (
                    <PersonaRow key={p.id} persona={p}
                      onEdit={() => { setEditingPersona(p); setShowPersonaModal(true) }}
                      onDelete={() => setPersonas((prev) => prev.filter((x) => x.id !== p.id))} />
                  ))}
                  {personas.filter((p) => p.familiaId === familia.id).length === 0 && (
                    <p className="text-xs text-blue-400 text-center py-2">Sin integrantes aún</p>
                  )}
                </div>
              </div>
            ))}

            {/* Personas individuales */}
            {personas.filter((p) => !p.familiaId).length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-gray-500 font-semibold">Personas individuales</p>
                {personas.filter((p) => !p.familiaId).map((p) => (
                  <PersonaRow key={p.id} persona={p}
                    onEdit={() => { setEditingPersona(p); setShowPersonaModal(true) }}
                    onDelete={() => setPersonas((prev) => prev.filter((x) => x.id !== p.id))} />
                ))}
              </div>
            )}

            {personas.length === 0 && familias.length === 0 && (
              <div className="text-center py-6 text-gray-400 text-sm">No hay personas o familias registradas</div>
            )}
          </FormSection>

          {/* ── SECCIÓN 5: Necesidades ──────────────────────────────────────── */}
          <FormSection num={5} title="Necesidades Identificadas">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-2 block">Selecciona las necesidades identificadas</label>
              <div className="flex flex-wrap gap-2">
                {NECESIDADES_CHIPS.map((n) => (
                  <button key={n} type="button"
                    onClick={() => setNecesidades(toggleArr(necesidades, n))}
                    className={`px-3 py-1.5 text-xs rounded-full border-2 font-medium transition-all ${
                      necesidades.includes(n)
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
                    }`}>{n}
                  </button>
                ))}
              </div>
            </div>
            {necesidades.includes('Otros') && (
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Especificar otra necesidad</label>
                <input type="text" placeholder="Describe la necesidad..." value={necesidadOtra}
                  onChange={(e) => setNecesidadOtra(e.target.value)} className={inputCls} />
              </div>
            )}
            <div>
              <label className="text-xs text-gray-500 mb-1.5 block">Observaciones (opcional)</label>
              <textarea rows={3} placeholder="Detalles adicionales sobre las necesidades..."
                value={necesidadesObs} onChange={(e) => setNecesidadesObs(e.target.value)}
                className={`${inputCls} resize-none`} />
            </div>
          </FormSection>

          {/* ── SECCIÓN 6: Evidencias Iniciales ────────────────────────────── */}
          <FormSection num={6} title="Evidencias Iniciales">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-2 block">Selecciona fuentes para subir evidencias (opcional)</label>
              <div className="flex flex-wrap gap-2">
                {FUENTES_ALERTA.map((f) => {
                  const added = fuentesEvidencia.some((fe) => fe.fuente === f)
                  return (
                    <button key={f} type="button" disabled={added} onClick={() => addFuente(f)}
                      className={`px-3 py-1.5 text-xs rounded-full border font-medium transition-all disabled:cursor-default ${
                        added ? 'bg-green-100 text-green-700 border-green-300' : 'bg-white text-gray-600 border-gray-300 hover:border-green-400'
                      }`}>
                      {f} {added && '✓'}
                    </button>
                  )
                })}
              </div>
            </div>
            {fuentesEvidencia.map((fuente) => (
              <div key={fuente.id} className="border border-gray-200 rounded-lg bg-gray-50 overflow-hidden">
                <div className="bg-gray-100 px-3 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Upload className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-semibold text-gray-900">{fuente.fuente}</span>
                    <span className="text-xs text-gray-500">({fuente.archivos.length} evidencias)</span>
                  </div>
                  <button type="button" onClick={() => deleteFuente(fuente.id)} className="p-1 hover:bg-red-100 rounded text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-3 space-y-2">
                  <label className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:bg-white hover:border-blue-400 transition-colors cursor-pointer">
                    <Upload className="w-4 h-4 text-gray-500" />
                    <span className="text-xs text-gray-600">Subir evidencias (fotos, videos, documentos)</span>
                    <input type="file" multiple accept="image/*,video/*,.pdf,.doc,.docx"
                      onChange={(e) => uploadArchivos(fuente.id, e.target.files)} className="hidden" />
                  </label>
                  {fuente.archivos.map((archivo, i) => (
                    <div key={i} className="bg-white border border-gray-200 rounded px-3 py-2 flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        <span className="text-xs text-gray-900 truncate">{archivo.name}</span>
                        <span className="text-[10px] text-gray-400">({(archivo.size / 1024).toFixed(1)} KB)</span>
                      </div>
                      <button type="button"
                        onClick={() => setFuentesEvidencia((prev) => prev.map((f) =>
                          f.id === fuente.id ? { ...f, archivos: f.archivos.filter((_, j) => j !== i) } : f
                        ))}
                        className="p-1 hover:bg-red-100 rounded text-red-600 ml-2"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {fuentesEvidencia.length === 0 && (
              <div className="text-center py-4 text-gray-400 text-sm">No hay fuentes de evidencia agregadas</div>
            )}
          </FormSection>

          {/* ── SECCIÓN 7: Estimación Inicial ───────────────────────────────── */}
          <FormSection num={7} title="Estimación Inicial de Afectación">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-700 uppercase">Resumen del reporte</p>

              <div className="bg-white/70 rounded-lg p-3 text-center border-2 border-blue-300">
                <p className="text-xs text-gray-500 mb-1">Total de Personas Afectadas</p>
                <p className="text-2xl font-bold text-blue-900">{resumen.total}</p>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Niños', value: resumen.ninos, sub: '0-12 años', color: 'text-blue-700' },
                  { label: 'Adolesc.', value: resumen.adolescentes, sub: '13-17 años', color: 'text-cyan-700' },
                  { label: 'Adultos', value: resumen.adultos, sub: '18-59 años', color: 'text-teal-700' },
                  { label: 'A. Mayores', value: resumen.mayores, sub: '60+ años', color: 'text-purple-700' },
                ].map((g) => (
                  <div key={g.label} className="bg-white/70 rounded-lg p-2 text-center">
                    <p className="text-xs text-gray-500">{g.label}</p>
                    <p className={`text-lg font-bold ${g.color}`}>{g.value}</p>
                    <p className="text-[10px] text-gray-400">{g.sub}</p>
                  </div>
                ))}
              </div>

              {resumen.numFamilias > 0 && (
                <div className="flex items-center gap-2 bg-white/70 rounded-lg px-3 py-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-semibold text-blue-900">{resumen.numFamilias} grupo(s) familiar(es) afectado(s)</span>
                </div>
              )}

              {Object.keys(resumen.situaciones).length > 0 && (
                <div className="bg-white/70 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-500 mb-1">Situaciones especiales:</p>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(resumen.situaciones).map(([sit, qty]) => (
                      <span key={sit} className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-medium">{sit}: {qty}</span>
                    ))}
                  </div>
                </div>
              )}

              {necesidades.length > 0 && (
                <div className="bg-white/70 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-500 mb-1">Necesidades identificadas:</p>
                  <div className="flex flex-wrap gap-1">
                    {necesidades.filter((n) => n !== 'Otros').map((n) => (
                      <span key={n} className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-[10px] font-medium">{n}</span>
                    ))}
                    {necesidadOtra.trim() && (
                      <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-[10px] font-medium">{necesidadOtra.trim()}</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 mb-2 block">Nivel de afectación estimado</label>
              <div className="flex gap-2">
                {(['Leve', 'Moderado', 'Severo'] as const).map((nivel) => (
                  <button key={nivel} type="button" onClick={() => setNivelAfectacion(nivel)}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 font-semibold text-sm transition-all ${
                      nivelAfectacion === nivel
                        ? nivel === 'Leve'     ? 'bg-yellow-100 text-yellow-800 border-yellow-500'
                        : nivel === 'Moderado' ? 'bg-orange-100 text-orange-800 border-orange-500'
                        :                        'bg-red-100 text-red-800 border-red-500'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                    }`}>{nivel}
                  </button>
                ))}
              </div>
            </div>
          </FormSection>

        </div>
      </div>

      {/* Footer sticky - botón guardar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#DDDDDD] p-4 shadow-lg z-10">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <Link
            href={isEdit && incidenciaId ? `/grd/${incidenciaId}` : '/grd'}
            className="px-4 py-3 border border-[#DDDDDD] rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </Link>
          <button type="button" onClick={handleSave} disabled={isPending}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#009850] text-white rounded-xl hover:opacity-90 transition-all font-bold text-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
            <Save className="w-4 h-4" />
            {isPending
              ? (isEdit ? 'Guardando...' : 'Registrando...')
              : (isEdit ? 'Guardar Cambios' : 'Registrar Evento')}
          </button>
        </div>
      </div>

      {/* Modales */}
      {showPersonaModal && (
        <PersonaModal
          onSave={(p) => {
            if (editingPersona) setPersonas((prev) => prev.map((x) => x.id === p.id ? p : x))
            else setPersonas((prev) => [...prev, p])
            setEditingPersona(undefined)
          }}
          onClose={() => { setShowPersonaModal(false); setEditingPersona(undefined); setActiveFamiliaId(undefined) }}
          editing={editingPersona}
          familias={familias}
          activeFamiliaId={activeFamiliaId}
        />
      )}
      {editingFamiliaObs && (
        <ObsFamiliaModal
          familia={editingFamiliaObs}
          onSave={(obs) => setFamilias((prev) => prev.map((f) => f.id === editingFamiliaObs.id ? { ...f, observaciones: obs } : f))}
          onClose={() => setEditingFamiliaObs(null)}
        />
      )}
    </div>
  )
}

// ─── Fila de persona (reutilizable) ──────────────────────────────────────────

function PersonaRow({ persona, onEdit, onDelete }: {
  persona: PersonaForm; onEdit: () => void; onDelete: () => void
}) {
  return (
    <div className="bg-white border border-gray-200 rounded px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <UserCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-xs font-medium text-gray-900 truncate">
              {persona.nombre} {persona.apellidoPaterno}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-500 ml-6">
            <span>Edad: {persona.edad} años</span>
            {persona.dni && <span>DNI: {persona.dni}</span>}
            {persona.situacionActual && (
              <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-[10px] font-medium">
                {persona.situacionActual}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button type="button" onClick={onEdit} className="p-1 hover:bg-gray-100 rounded text-gray-600">
            <Edit3 className="w-3 h-3" />
          </button>
          <button type="button" onClick={onDelete} className="p-1 hover:bg-red-100 rounded text-red-600">
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  )
}
