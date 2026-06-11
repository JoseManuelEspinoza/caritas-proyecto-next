"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck, Plus, Calendar, MapPin, CheckCircle2, XCircle, Clock,
  Search, ChevronLeft, ChevronRight, Users, MoreVertical, ChevronDown,
  ChevronUp, Activity, Check, Pencil, AlertTriangle, X, FileText,
  Send, Eye, User, MessageSquare, Upload, ExternalLink, Timer,
  UserCheck, UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import {
  programarSimulacro,
  editarSimulacro,
  asignarEquipoSimulacro,
  autoasignarmeSimulacro,
  registrarEjecucionSimulacro,
  observarSimulacro,
  validarSimulacro,
  cancelarSimulacro,
  addObservacionSimulacro,
  editarObservacionSimulacro,
  borrarObservacionSimulacro,
  addEvidenciasSimulacro,
} from "@/app/actions/simulacros";
import { subirArchivoS3 } from "@/app/ui/shared/file-upload";
import { ACCEPT } from "@/app/lib/upload-config";
import type { FrontendRole } from "@/app/lib/roles";

// ─── Types ────────────────────────────────────────────────────────────────────
type EvidenciaItem = {
  id: string; nombreArchivo: string; urlArchivo: string;
  formato: string | null; tamano: number | null;
  descripcion: string | null; fecha: string;
};
type BrigadistaAsignado = {
  id: string; nombre: string; esResponsable: boolean;
  celular?: string | null; idParroquia: string;
};
type Comentario = {
  id: string; texto: string; tipo: "ESPECIALISTA" | "BRIGADISTA";
  fechaCreacion: string; fechaEdicion: string | null;
  autorNombre: string; autorId: string;
};
type Actividad = {
  id: string; codigoActividad: string | null;
  idParroquia: string; parroquiaNombre: string;
  idTipoActividadPreventiva: string; nombreActividad: string;
  estadoActividad: string;
  fechaProgramada: string | null; horarioInicio: string | null;
  fechaEjecucion: string | null;
  lugarActividad?: string | null; numeroParticipantesEstimado?: number | null;
  objetivos?: string | null; recursos?: string | null;
  hallazgos?: string | null; duracionSimulacro?: string | null;
  participantesReales?: number | null;
  indicacionesEquipo?: string | null; reporteBrigadista?: string | null;
  observaciones?: string | null; idUsuarioResponsableGRD?: string | null;
  brigadistasAsignados: BrigadistaAsignado[];
  comentariosObservacion: Comentario[];
  evidencias: EvidenciaItem[];
};
type Parroquia = { id: string; nombre: string };
type Brigadista = {
  id: string; nombre: string; celular?: string | null;
  idParroquia: string; idUsuarioGRD?: string | null;
  parroquia?: string | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────
const TIPOS = [
  "Simulacro de Sismo", "Simulacro de Incendio", "Simulacro de Inundación",
  "Charla de Prevención", "Taller", "Campaña",
];
const ESTADOS = ["PROGRAMADA", "ASIGNADA", "EJECUTADA", "OBSERVADA", "VALIDADA", "CANCELADA"];
const PAGE_SIZE = 10;

const ESTADO_CFG: Record<string, { cls: string; label: string; icon: React.ReactNode }> = {
  PROGRAMADA: { cls: "bg-blue-50 text-blue-700 border border-blue-200",      label: "Programada", icon: <Clock className="w-3 h-3" /> },
  ASIGNADA:   { cls: "bg-indigo-50 text-indigo-700 border border-indigo-200", label: "Asignada",   icon: <Users className="w-3 h-3" /> },
  EJECUTADA:  { cls: "bg-amber-50 text-amber-700 border border-amber-200",    label: "Ejecutada",  icon: <Send className="w-3 h-3" /> },
  OBSERVADA:  { cls: "bg-orange-50 text-orange-700 border border-orange-200", label: "Observada",  icon: <Eye className="w-3 h-3" /> },
  VALIDADA:   { cls: "bg-green-50 text-green-700 border border-green-200",    label: "Validada",   icon: <CheckCircle2 className="w-3 h-3" /> },
  CANCELADA:  { cls: "bg-gray-100 text-gray-500 border border-gray-200",      label: "Cancelada",  icon: <XCircle className="w-3 h-3" /> },
};

const TIPO_BADGE: Record<string, string> = {
  "Simulacro de Sismo":      "bg-amber-50 text-amber-700 border border-amber-200",
  "Simulacro de Incendio":   "bg-red-50 text-red-700 border border-red-200",
  "Simulacro de Inundación": "bg-sky-50 text-sky-700 border border-sky-200",
  "Charla de Prevención":    "bg-emerald-50 text-emerald-700 border border-emerald-200",
  "Taller":                  "bg-indigo-50 text-indigo-700 border border-indigo-200",
  "Campaña":                 "bg-purple-50 text-purple-700 border border-purple-200",
};

const AVATAR_COLORS = [
  "bg-red-100 text-red-700", "bg-amber-100 text-amber-700", "bg-green-100 text-green-700",
  "bg-blue-100 text-blue-700", "bg-indigo-100 text-indigo-700", "bg-purple-100 text-purple-700",
  "bg-pink-100 text-pink-700", "bg-teal-100 text-teal-700", "bg-orange-100 text-orange-700",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[Math.abs(h)];
}
function iniciales(nombre: string) {
  return nombre.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function fmtFecha(iso: string | null, hora?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  let s = `${DIAS[d.getUTCDay()]}, ${d.getUTCDate()} ${MESES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  if (hora) s += `, ${hora}`;
  return s;
}
function fmtBytes(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── CSS helpers ──────────────────────────────────────────────────────────────
const fieldBase = "w-full border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--caritas-green)]/20 focus:border-[var(--caritas-green)] transition-colors";
const INPUT = `${fieldBase} px-3 py-2 border-gray-200`;
const INPUT_ERR = `${fieldBase} px-3 py-2 border-red-400 focus:ring-red-200`;
const GHOST = "text-sm font-bold text-[var(--caritas-green)] hover:opacity-70 transition-opacity";

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ nombre, size = "sm" }: { nombre: string; size?: "sm" | "md" }) {
  const cls = size === "md" ? "w-8 h-8 text-xs" : "w-6 h-6 text-[10px]";
  return (
    <span className={`${cls} rounded-full flex items-center justify-center font-semibold flex-shrink-0 ${avatarColor(nombre)}`}>
      {iniciales(nombre)}
    </span>
  );
}

// ─── BrigCard (con soporte drag) ──────────────────────────────────────────────
function BrigCard({
  brigadista, badge, onRemove, recommended, draggable, onDragStart, onDragEnd,
}: {
  brigadista: { id: string; nombre: string; celular?: string | null; idParroquia?: string; parroquia?: string | null };
  badge?: string; onRemove?: () => void; recommended?: boolean;
  draggable?: boolean; onDragStart?: (e: React.DragEvent) => void; onDragEnd?: () => void;
}) {
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`flex items-center gap-2.5 p-2.5 rounded-lg border transition-colors select-none
        ${draggable ? "cursor-grab active:cursor-grabbing" : ""}
        ${recommended ? "border-[var(--caritas-green)]/30 bg-[var(--caritas-green)]/5" : "border-gray-200 bg-white"}`}
    >
      <Avatar nombre={brigadista.nombre} size="md" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-[var(--caritas-text)] truncate">{brigadista.nombre}</p>
        {(brigadista.celular || brigadista.parroquia) && (
          <p className="text-[10px] text-gray-400 truncate">
            {[brigadista.celular, brigadista.parroquia].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>
      {badge && (
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--caritas-green)]/10 text-[var(--caritas-green)] uppercase tracking-wide flex-shrink-0">
          {badge}
        </span>
      )}
      {recommended && !badge && (
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 uppercase flex-shrink-0">
          Recom.
        </span>
      )}
      {onRemove && (
        <button onClick={onRemove} className="text-gray-300 hover:text-red-400 flex-shrink-0">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

// ─── SingleSelect (styled como filtros) ───────────────────────────────────────
function SingleSelect({
  options, value, onChange, placeholder, icon: Icon, error,
}: {
  options: { value: string; label: string }[];
  value: string; onChange: (v: string) => void;
  placeholder: string; icon: React.ComponentType<{ className?: string }>;
  error?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const label = options.find(o => o.value === value)?.label ?? "";
  return (
    <div ref={ref} className="relative w-full">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
      <button type="button" onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center justify-between pl-9 pr-3 py-2 border rounded-lg text-sm bg-white cursor-pointer transition-colors focus:outline-none
          ${open ? "border-[var(--caritas-green)] ring-2 ring-[var(--caritas-green)]/20" : error ? "border-red-400" : "border-gray-200 hover:border-gray-300"}`}>
        <span className={value ? "text-gray-700 font-medium" : "text-gray-400"}>{label || placeholder}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ml-1 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1 overflow-hidden max-h-48 overflow-y-auto">
          {options.map(opt => (
            <button key={opt.value} type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors text-left
                ${opt.value === value ? "bg-[var(--caritas-green)]/8 text-[var(--caritas-green)] font-medium" : "text-gray-700 hover:bg-[var(--caritas-green)]/5 hover:text-[var(--caritas-green)]"}`}>
              <span className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors
                ${opt.value === value ? "bg-[var(--caritas-green)] border-[var(--caritas-green)]" : "border-gray-300"}`}>
                {opt.value === value && <Check className="w-2.5 h-2.5 text-white" />}
              </span>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MultiSelect ──────────────────────────────────────────────────────────────
function MultiSelect({
  options, value, onChange, placeholder, icon: Icon,
}: {
  options: { value: string; label: string }[];
  value: string[]; onChange: (v: string[]) => void;
  placeholder: string; icon: React.ComponentType<{ className?: string }>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const toggle = (v: string) => onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v]);
  const label = value.length === 0 ? placeholder : value.length === 1
    ? (options.find(o => o.value === value[0])?.label ?? value[0])
    : `${value.length} seleccionadas`;
  return (
    <div ref={ref} className="relative flex-1">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
      <button type="button" onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center justify-between pl-9 pr-3 py-2.5 border rounded-lg text-sm bg-white cursor-pointer transition-colors focus:outline-none
          ${open ? "border-[var(--caritas-green)] ring-2 ring-[var(--caritas-green)]/20" : "border-gray-200 hover:border-gray-300"}`}>
        <span className={value.length === 0 ? "text-gray-400" : "text-gray-700 font-medium"}>{label}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ml-1 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1 overflow-hidden min-w-[180px]">
          {options.map(opt => {
            const sel = value.includes(opt.value);
            return (
              <button key={opt.value} type="button" onClick={() => toggle(opt.value)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors text-left
                  ${sel ? "bg-[var(--caritas-green)]/8 text-[var(--caritas-green)] font-medium" : "text-gray-700 hover:bg-[var(--caritas-green)]/5 hover:text-[var(--caritas-green)]"}`}>
                <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors
                  ${sel ? "bg-[var(--caritas-green)] border-[var(--caritas-green)]" : "border-gray-300"}`}>
                  {sel && <Check className="w-3 h-3 text-white" />}
                </span>
                {opt.label}
              </button>
            );
          })}
          {value.length > 0 && (
            <><div className="mx-3 my-1 border-t border-gray-100" />
              <button type="button" onClick={() => onChange([])}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:text-[var(--caritas-green)]">
                <X className="w-3 h-3" /> Limpiar
              </button></>
          )}
        </div>
      )}
    </div>
  );
}

// ─── EvidenciasPanel ──────────────────────────────────────────────────────────
function EvidenciasPanel({
  simId, evidencias, canUpload,
}: {
  simId: string; evidencias: EvidenciaItem[]; canUpload: boolean;
}) {
  const router = useRouter();
  const [subiendo, setSubiendo] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const arr = Array.from(files);
    setSubiendo(arr.map(f => f.name));
    const subidas: Parameters<typeof addEvidenciasSimulacro>[1] = [];
    for (const file of arr) {
      try {
        const s = await subirArchivoS3(file, { tipo: "evidencia-simulacro", entidadId: simId });
        subidas.push({ key: s.key, nombreArchivo: s.nombre, formato: s.formato, tamano: s.tamano });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo subir el archivo.");
      }
    }
    setSubiendo([]);
    if (subidas.length) {
      const r = await addEvidenciasSimulacro(simId, subidas);
      if (r?.message) { toast.error(r.message); return; }
      toast.success(subidas.length === 1 ? "Evidencia adjuntada." : `${subidas.length} evidencias adjuntadas.`);
      router.refresh();
    }
  }

  return (
    <div className="space-y-2.5">
      <p className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
        <FileText className="w-3.5 h-3.5 text-[var(--caritas-green)]" /> Documentos y Evidencias
      </p>

      {evidencias.length === 0 && (
        <div className="text-center py-4 text-xs text-gray-400 bg-gray-50 border border-dashed border-gray-200 rounded-lg">
          Sin evidencias adjuntas.
        </div>
      )}
      {evidencias.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {evidencias.map(ev => {
            const esImg = (ev.formato ?? "").startsWith("image/");
            return (
              <a key={ev.id} href={ev.urlArchivo} target="_blank" rel="noopener noreferrer"
                className="group flex items-center gap-2.5 p-2.5 border border-gray-200 rounded-lg hover:border-[var(--caritas-green)]/50 hover:bg-[var(--caritas-green)]/5 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-[var(--caritas-green)]/10 flex items-center justify-center flex-shrink-0">
                  {esImg ? <Eye className="w-4 h-4 text-[var(--caritas-green)]" /> : <FileText className="w-4 h-4 text-[var(--caritas-green)]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate">{ev.nombreArchivo}</p>
                  <p className="text-[10px] text-gray-400">{fmtFecha(ev.fecha)}{ev.tamano ? ` · ${fmtBytes(ev.tamano)}` : ""}</p>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-[var(--caritas-green)] flex-shrink-0" />
              </a>
            );
          })}
        </div>
      )}

      {canUpload && (
        <>
          <input ref={fileRef} type="file" multiple className="hidden" accept={ACCEPT.evidencia}
            onChange={e => handleFiles(e.target.files)} />
          {subiendo.length > 0 ? (
            <div className="text-xs text-gray-500 italic">Subiendo {subiendo.length} archivo(s)...</div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-[var(--caritas-green)]/40 rounded-lg text-xs font-medium text-[var(--caritas-green)] hover:bg-[var(--caritas-green)]/5 transition-colors">
              <Upload className="w-3.5 h-3.5" /> Adjuntar archivo
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ─── Cancel Modal ─────────────────────────────────────────────────────────────
function CancelModal({ nombre, onConfirm, onClose, loading }: {
  nombre: string; onConfirm: (m: string) => void; onClose: () => void; loading: boolean;
}) {
  const [motivo, setMotivo] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="font-semibold text-[var(--caritas-text)]">¿Cancelar este simulacro?</p>
            <p className="text-sm text-gray-500 mt-0.5">Se cancelará <span className="font-medium">{nombre}</span>. No se puede deshacer.</p>
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Motivo (opcional)</label>
          <textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={2}
            placeholder="Razón de la cancelación..." className={`resize-none ${INPUT}`} />
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className={GHOST}>Volver</button>
          <button onClick={() => onConfirm(motivo || "Cancelado")} disabled={loading}
            className="px-4 py-2 text-sm font-semibold bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50">
            Sí, cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────
function EditModal({ sim, parroquias, onClose }: { sim: Actividad; parroquias: Parroquia[]; onClose: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    idParroquia: sim.idParroquia,
    idTipoActividadPreventiva: sim.idTipoActividadPreventiva,
    nombreActividad: sim.nombreActividad,
    fechaProgramada: sim.fechaProgramada?.slice(0, 10) ?? "",
    horarioInicio: sim.horarioInicio ?? "",
    lugarActividad: sim.lugarActividad ?? "",
    numeroParticipantesEstimado: sim.numeroParticipantesEstimado ?? 0,
    descripcionActividad: sim.objetivos ?? "",
  });
  const [errors, setErrors] = useState<string[]>([]);

  const validate = () => {
    const e: string[] = [];
    if (!form.nombreActividad.trim()) e.push("nombre");
    if (!form.idParroquia) e.push("parroquia");
    setErrors(e);
    return e.length === 0;
  };

  const save = () => {
    if (!validate()) { toast.error("Completa los campos requeridos."); return; }
    startTransition(async () => {
      const res = await editarSimulacro(sim.id, form);
      if (res?.message) { toast.error(res.message); return; }
      toast.success("Simulacro actualizado."); router.refresh(); onClose();
    });
  };

  const f = (field: string) => errors.includes(field) ? INPUT_ERR : INPUT;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-[var(--caritas-text)]">Editar simulacro</p>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <label className="block md:col-span-3"><span className="text-xs text-gray-500">Nombre *</span>
            <input value={form.nombreActividad} onChange={e => setForm({ ...form, nombreActividad: e.target.value })} className={`mt-1 ${f("nombre")}`} /></label>
          <label className="block md:col-span-3"><span className="text-xs text-gray-500">Tipo</span>
            <select value={form.idTipoActividadPreventiva} onChange={e => setForm({ ...form, idTipoActividadPreventiva: e.target.value })}
              className={`mt-1 ${INPUT} bg-white cursor-pointer`}>
              {TIPOS.map(t => <option key={t}>{t}</option>)}
            </select></label>
          <label className="block md:col-span-2"><span className="text-xs text-gray-500">Fecha</span>
            <input type="date" value={form.fechaProgramada} onChange={e => setForm({ ...form, fechaProgramada: e.target.value })} className={`mt-1 ${INPUT}`} /></label>
          <label className="block md:col-span-2"><span className="text-xs text-gray-500">Hora</span>
            <input type="time" value={form.horarioInicio} onChange={e => setForm({ ...form, horarioInicio: e.target.value })} className={`mt-1 ${INPUT}`} /></label>
          <label className="block md:col-span-2"><span className="text-xs text-gray-500">Participantes est.</span>
            <input type="number" min={0} value={String(form.numeroParticipantesEstimado)}
              onChange={e => setForm({ ...form, numeroParticipantesEstimado: Number(e.target.value) })} className={`mt-1 ${INPUT}`} /></label>
          <div className="md:col-span-3">
            <span className="text-xs text-gray-500 block mb-1">Parroquia *</span>
            <SingleSelect options={parroquias.map(p => ({ value: p.id, label: p.nombre }))}
              value={form.idParroquia} onChange={v => setForm({ ...form, idParroquia: v })}
              placeholder="Selecciona" icon={MapPin} error={errors.includes("parroquia")} />
          </div>
          <label className="block md:col-span-3"><span className="text-xs text-gray-500">Lugar</span>
            <input value={form.lugarActividad} onChange={e => setForm({ ...form, lugarActividad: e.target.value })} className={`mt-1 ${INPUT}`} /></label>
          <label className="block md:col-span-6"><span className="text-xs text-gray-500">Objetivos del simulacro</span>
            <textarea value={form.descripcionActividad} onChange={e => setForm({ ...form, descripcionActividad: e.target.value })}
              rows={2} className={`mt-1 resize-none ${INPUT}`} /></label>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className={GHOST}>Cancelar</button>
          <button onClick={save} disabled={pending}
            className="px-4 py-2 text-sm bg-[var(--caritas-green)] text-white rounded-lg hover:opacity-90 disabled:opacity-50">
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 3-dot menu ───────────────────────────────────────────────────────────────
function CardMenu({ onEdit, onCancel }: { onEdit: () => void; onCancel: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600">
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-40 py-1 min-w-[170px]">
          <button type="button" onClick={() => { setOpen(false); onEdit(); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-[var(--caritas-green)]/5 hover:text-[var(--caritas-green)]">
            <Pencil className="w-3.5 h-3.5" /> Editar simulacro
          </button>
          <button type="button" onClick={() => { setOpen(false); onCancel(); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
            <XCircle className="w-3.5 h-3.5" /> Cancelar simulacro
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Panel: Asignar equipo con drag-and-drop (igual a GRD) ────────────────────
function PanelAsignar({
  sim, brigadistas, currentUsuarioGRDId, currentNombre, canEdit, onDone,
}: {
  sim: Actividad; brigadistas: Brigadista[];
  currentUsuarioGRDId: string | null; currentNombre: string;
  canEdit: boolean; onDone: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<"equipo" | "auto">("equipo");
  const [query, setQuery] = useState("");
  const [indicaciones, setIndicaciones] = useState(sim.indicacionesEquipo ?? "");
  const [notasAuto, setNotasAuto] = useState("");
  const [editing, setEditing] = useState(sim.brigadistasAsignados.length === 0);

  // Init responsable/equipo from existing
  const respInicial = sim.brigadistasAsignados.find(b => b.esResponsable)?.id ?? null;
  const equipoInicial = sim.brigadistasAsignados.filter(b => !b.esResponsable).map(b => b.id);
  const [responsable, setResponsable] = useState<string | null>(respInicial);
  const [equipo, setEquipo] = useState<string[]>(equipoInicial);
  const [dragging, setDragging] = useState<{ id: string; from: "responsable" | "equipo" | "catalogo" } | null>(null);

  const tieneEquipo = sim.brigadistasAsignados.length > 0;
  const seleccionados = [responsable, ...equipo].filter(Boolean) as string[];

  function findBrig(id: string) {
    return brigadistas.find(b => b.id === id) ?? sim.brigadistasAsignados.find(b => b.id === id);
  }

  const catalogo = brigadistas
    .filter(b => !seleccionados.includes(b.id))
    .filter(b => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return b.nombre.toLowerCase().includes(q);
    })
    .sort((a, b) => Number(a.idParroquia === sim.idParroquia) - Number(b.idParroquia === sim.idParroquia));

  function agregarBrig(id: string) {
    if (!responsable) setResponsable(id);
    else if (!equipo.includes(id) && id !== responsable) setEquipo(p => [...p, id]);
  }

  function iniciarEdicion() {
    setResponsable(respInicial);
    setEquipo(equipoInicial);
    setTab("equipo");
    setEditing(true);
  }

  function confirmar() {
    if (tab === "equipo" && !responsable) { toast.error("Designa al menos un brigadista responsable."); return; }
    startTransition(async () => {
      const res = await asignarEquipoSimulacro(sim.id, responsable, equipo, indicaciones);
      if (res?.message) { toast.error(res.message); return; }
      toast.success("Equipo asignado."); router.refresh(); setEditing(false); onDone();
    });
  }

  function confirmarAuto() {
    startTransition(async () => {
      const res = await autoasignarmeSimulacro(sim.id, notasAuto);
      if (res?.message) { toast.error(res.message); return; }
      toast.success("Te has autoasignado."); router.refresh(); setEditing(false); onDone();
    });
  }

  // ── Vista de equipo ya asignado ─────────────────────────────────────────
  if (tieneEquipo && !editing) {
    const resp = sim.brigadistasAsignados.find(b => b.esResponsable);
    const miembros = sim.brigadistasAsignados.filter(b => !b.esResponsable);
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Equipo asignado</p>
          {canEdit && (
            <button onClick={iniciarEdicion}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-[var(--caritas-green)] hover:border-[var(--caritas-green)] transition-colors">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {sim.idUsuarioResponsableGRD && !resp && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2.5">
            <UserCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <p className="text-xs font-semibold text-blue-800">Especialista GRD — Autoasignado</p>
          </div>
        )}
        {resp && (
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1.5">Responsable</p>
            <BrigCard brigadista={{ ...resp, parroquia: null }} badge="RESPONSABLE" />
          </div>
        )}
        {miembros.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1.5">Equipo ({miembros.length})</p>
            <div className="space-y-1.5">
              {miembros.map(m => <BrigCard key={m.id} brigadista={{ ...m, parroquia: null }} />)}
            </div>
          </div>
        )}
        {sim.indicacionesEquipo && (
          <div className="bg-[var(--caritas-green)]/5 border border-[var(--caritas-green)]/20 rounded-lg px-3 py-2">
            <p className="text-[10px] font-bold text-[var(--caritas-green)] uppercase mb-0.5">Indicaciones</p>
            <p className="text-xs text-gray-700">{sim.indicacionesEquipo}</p>
          </div>
        )}
      </div>
    );
  }

  if (!canEdit && !tieneEquipo) return <p className="text-sm text-gray-500 py-2">Solo el Especialista GRD puede gestionar la asignación.</p>;

  // ── Editor de equipo (drag-and-drop) ───────────────────────────────────
  return (
    <div className="space-y-4 border border-gray-200 rounded-2xl overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">{tieneEquipo ? "Modificar asignación" : "Asignar equipo"}</p>
        {tieneEquipo && (
          <button onClick={() => setEditing(false)} className={GHOST}>Cancelar</button>
        )}
      </div>
      <div className="px-4 pb-4 space-y-4">
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
          {(["equipo", "auto"] as const).map(t => (
            <button key={t} type="button" onClick={() => setTab(t)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors
                ${tab === t ? "bg-white text-[var(--caritas-green)] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              {t === "equipo" ? <><Users className="w-4 h-4" /> Asignar brigadistas</> : <><UserPlus className="w-4 h-4" /> Autoasignarme</>}
            </button>
          ))}
        </div>

        {tab === "equipo" ? (
          <>
            <p className="text-xs text-gray-500">
              El primer seleccionado es responsable. Arrastra entre áreas para reorganizar.
            </p>

            {/* Zonas drag-and-drop */}
            {seleccionados.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Zona responsable */}
                <div
                  className={`border rounded-xl p-3 min-h-[88px] transition-colors ${
                    dragging && dragging.id !== responsable
                      ? "border-[var(--caritas-green)] bg-[var(--caritas-green)]/10"
                      : "border-[var(--caritas-green)]/30 bg-[var(--caritas-green)]/5"
                  }`}
                  onDragOver={e => { if (dragging && dragging.id !== responsable) e.preventDefault(); }}
                  onDrop={() => {
                    if (!dragging || dragging.id === responsable) return;
                    const draggedId = dragging.id;
                    const from = dragging.from;
                    setDragging(null);
                    if (from === "equipo") {
                      setEquipo(prev => {
                        const sin = prev.filter(x => x !== draggedId);
                        return responsable ? [responsable, ...sin] : sin;
                      });
                      setResponsable(draggedId);
                    } else if (from === "catalogo") {
                      if (responsable) setEquipo(prev => [...prev.filter(x => x !== draggedId), responsable]);
                      else setEquipo(prev => prev.filter(x => x !== draggedId));
                      setResponsable(draggedId);
                    }
                  }}
                >
                  <p className="text-[10px] font-bold text-[var(--caritas-green)] uppercase mb-2">Responsable</p>
                  {responsable ? (() => {
                    const b = findBrig(responsable);
                    if (!b) return null;
                    const bn = "nombre" in b ? b.nombre : `${"nombres" in b ? (b as {nombres:string}).nombres : ""} ${"apellidos" in b ? (b as {apellidos?:string|null}).apellidos ?? "" : ""}`.trim();
                    return (
                      <BrigCard
                        brigadista={{ id: responsable, nombre: bn, celular: "celular" in b ? b.celular : null }}
                        badge="RESP."
                        draggable
                        onDragStart={() => setDragging({ id: responsable, from: "responsable" })}
                        onDragEnd={() => setDragging(null)}
                        onRemove={() => {
                          const [next, ...rest] = equipo;
                          setResponsable(next ?? null);
                          setEquipo(rest);
                        }}
                      />
                    );
                  })() : (
                    <p className="text-xs text-gray-400 italic">Arrastra aquí al responsable</p>
                  )}
                </div>

                {/* Zona equipo */}
                <div
                  className={`border rounded-xl p-3 min-h-[88px] transition-colors ${
                    dragging && dragging.from !== "equipo" && dragging.id !== responsable
                      ? "border-indigo-400 bg-indigo-50"
                      : "border-gray-200 bg-gray-50"
                  }`}
                  onDragOver={e => { if (dragging && dragging.from !== "equipo") e.preventDefault(); }}
                  onDrop={() => {
                    if (!dragging || dragging.from === "equipo") return;
                    const draggedId = dragging.id;
                    setDragging(null);
                    if (dragging.from === "responsable") {
                      const [next, ...rest] = equipo;
                      setEquipo([...rest, draggedId]);
                      setResponsable(next ?? null);
                    } else if (dragging.from === "catalogo") {
                      if (!equipo.includes(draggedId) && draggedId !== responsable)
                        setEquipo(prev => [...prev, draggedId]);
                    }
                  }}
                >
                  <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Equipo ({equipo.length})</p>
                  {equipo.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">Arrastra brigadistas aquí</p>
                  ) : (
                    <div className="space-y-1.5">
                      {equipo.map(id => {
                        const b = findBrig(id);
                        if (!b) return null;
                        const bn = "nombre" in b ? b.nombre : `${"nombres" in b ? (b as {nombres:string}).nombres : ""} ${"apellidos" in b ? (b as {apellidos?:string|null}).apellidos ?? "" : ""}`.trim();
                        return (
                          <BrigCard key={id}
                            brigadista={{ id, nombre: bn, celular: "celular" in b ? b.celular : null }}
                            draggable
                            onDragStart={() => setDragging({ id, from: "equipo" })}
                            onDragEnd={() => setDragging(null)}
                            onRemove={() => setEquipo(prev => prev.filter(x => x !== id))}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Catálogo */}
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-1.5">Brigadistas disponibles</p>
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar..."
                  className={`pl-8 pr-3 py-1.5 text-xs ${fieldBase} border-gray-200`} />
              </div>
              <div className="space-y-1 max-h-44 overflow-y-auto pr-0.5">
                {catalogo.slice(0, 20).map(b => (
                  <div key={b.id}
                    draggable
                    onDragStart={() => setDragging({ id: b.id, from: "catalogo" })}
                    onDragEnd={() => setDragging(null)}
                    onClick={() => agregarBrig(b.id)}
                    className="cursor-pointer hover:bg-[var(--caritas-green)]/5 rounded-lg transition-colors">
                    <BrigCard
                      brigadista={{ ...b, parroquia: null }}
                      recommended={b.idParroquia === sim.idParroquia}
                    />
                  </div>
                ))}
                {catalogo.length === 0 && <p className="text-xs text-gray-400 text-center py-3">Sin brigadistas disponibles</p>}
              </div>
            </div>

            {/* Indicaciones */}
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1">Indicaciones para el equipo</p>
              <textarea value={indicaciones} onChange={e => setIndicaciones(e.target.value)} rows={2}
                placeholder="Instrucciones, horario, puntos de encuentro..." className={`resize-none ${INPUT}`} />
            </div>

            <button onClick={confirmar} disabled={pending}
              className="w-full py-2.5 bg-[var(--caritas-green)] text-white text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
              <Check className="w-4 h-4" /> Confirmar asignación
            </button>
          </>
        ) : (
          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-start gap-2.5">
              <Avatar nombre={currentNombre} size="md" />
              <div>
                <p className="text-xs font-semibold text-blue-800">{currentNombre}</p>
                <p className="text-[11px] text-blue-600 mt-0.5">Serás el único responsable. Se liberarán asignaciones previas.</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1">Notas (opcional)</p>
              <textarea value={notasAuto} onChange={e => setNotasAuto(e.target.value)} rows={2}
                placeholder="Observaciones de la autoasignación..." className={`resize-none ${INPUT}`} />
            </div>
            <button onClick={confirmarAuto} disabled={pending || !currentUsuarioGRDId}
              className="w-full py-2.5 bg-[var(--caritas-green)] text-white text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
              <User className="w-4 h-4" /> Autoasignarme
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Panel: Resumen de Ejecución ──────────────────────────────────────────────
function PanelEjecucion({ sim, onDone }: { sim: Actividad; onDone: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [duracion, setDuracion] = useState(sim.duracionSimulacro ?? "");
  const [participantes, setParticipantes] = useState(String(sim.participantesReales ?? ""));
  const [hallazgos, setHallazgos] = useState(sim.hallazgos ?? sim.reporteBrigadista ?? "");
  const [errors, setErrors] = useState<string[]>([]);

  const validate = () => {
    const e: string[] = [];
    if (!duracion.trim()) e.push("duracion");
    if (!hallazgos.trim()) e.push("hallazgos");
    setErrors(e);
    return e.length === 0;
  };

  const registrar = () => {
    if (!validate()) { toast.error("Completa los campos requeridos."); return; }
    startTransition(async () => {
      const res = await registrarEjecucionSimulacro(sim.id, {
        duracion,
        participantesReales: Number(participantes) || 0,
        hallazgos,
      });
      if (res?.message) { toast.error(res.message); return; }
      toast.success("Ejecución registrada. Simulacro en estado EJECUTADO."); router.refresh(); onDone();
    });
  };

  const esReenvio = sim.estadoActividad === "OBSERVADA";

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-[var(--caritas-text)] uppercase tracking-wide">
        Resumen de Ejecución
      </p>

      {sim.indicacionesEquipo && (
        <div className="bg-[var(--caritas-green)]/5 border border-[var(--caritas-green)]/20 rounded-xl p-3">
          <p className="text-[10px] font-bold text-[var(--caritas-green)] uppercase mb-1">Indicaciones del especialista</p>
          <p className="text-xs text-gray-700">{sim.indicacionesEquipo}</p>
        </div>
      )}

      {esReenvio && sim.observaciones && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] font-bold text-orange-700 uppercase mb-1">Observación del especialista</p>
            <p className="text-xs text-orange-800">{sim.observaciones}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs text-gray-500">Duración del simulacro *</span>
          <div className="relative mt-1">
            <Timer className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input value={duracion} onChange={e => setDuracion(e.target.value)} placeholder="Ej: 45 min"
              className={`pl-8 pr-3 py-2 ${errors.includes("duracion") ? `${fieldBase} border-red-400` : `${fieldBase} border-gray-200`}`} />
          </div>
        </label>
        <label className="block">
          <span className="text-xs text-gray-500">Participantes reales</span>
          <input type="number" min={0} value={participantes} onChange={e => setParticipantes(e.target.value)}
            placeholder="0" className={`mt-1 ${INPUT}`} />
        </label>
      </div>

      <label className="block">
        <span className="text-xs text-gray-500">Hallazgos principales *</span>
        <textarea value={hallazgos} onChange={e => setHallazgos(e.target.value)} rows={4}
          placeholder="Describe el desarrollo, evacuación, participación, incidencias observadas..."
          className={`mt-1 resize-none ${errors.includes("hallazgos") ? `${fieldBase} border-red-400` : `${fieldBase} border-gray-200`} px-3 py-2`} />
      </label>

      <button onClick={registrar} disabled={pending}
        className="w-full py-2.5 bg-[var(--caritas-green)] text-white text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
        <CheckCircle2 className="w-4 h-4" /> {esReenvio ? "Reenviar ejecución corregida" : "Registrar ejecución"}
      </button>
    </div>
  );
}

// ─── Panel: Revisar (especialista) ────────────────────────────────────────────
function PanelRevisar({ sim, onDone }: { sim: Actividad; onDone: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [comentario, setComentario] = useState("");
  const [showObs, setShowObs] = useState(false);

  const run = (fn: () => Promise<{message?: string} | void>, ok: string) =>
    startTransition(async () => {
      const res = await fn();
      if (res && "message" in res && res.message) { toast.error(res.message); return; }
      toast.success(ok); router.refresh(); onDone();
    });

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-[var(--caritas-text)] uppercase tracking-wide">Resultado del simulacro</p>

      <div className="grid grid-cols-2 gap-3 text-xs">
        {sim.duracionSimulacro && (
          <div className="bg-gray-50 rounded-lg px-3 py-2">
            <p className="text-gray-400 mb-0.5">Duración</p>
            <p className="font-semibold text-gray-800 flex items-center gap-1"><Timer className="w-3.5 h-3.5" /> {sim.duracionSimulacro}</p>
          </div>
        )}
        {(sim.participantesReales ?? 0) > 0 && (
          <div className="bg-gray-50 rounded-lg px-3 py-2">
            <p className="text-gray-400 mb-0.5">Participantes reales</p>
            <p className="font-semibold text-gray-800 flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {sim.participantesReales}</p>
          </div>
        )}
      </div>

      {sim.hallazgos && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
          <p className="text-[10px] font-bold text-amber-700 uppercase mb-1">Hallazgos principales</p>
          <p className="text-xs text-gray-700 leading-relaxed">{sim.hallazgos}</p>
        </div>
      )}

      {!showObs ? (
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setShowObs(true)} disabled={pending}
            className="py-2.5 border-2 border-orange-300 text-orange-700 bg-orange-50 hover:bg-orange-100 text-sm font-semibold rounded-xl flex items-center justify-center gap-2">
            <Eye className="w-4 h-4" /> Observar
          </button>
          <button onClick={() => run(() => validarSimulacro(sim.id), "✅ Simulacro validado.")} disabled={pending}
            className="py-2.5 bg-[var(--caritas-green)] text-white text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Validar
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          <textarea value={comentario} onChange={e => setComentario(e.target.value)} rows={3}
            placeholder="Indica qué debe corregir o complementar el equipo..."
            className={`resize-none ${fieldBase} border-orange-300 px-3 py-2 focus:ring-orange-200`} />
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setShowObs(false)} className={GHOST}>Cancelar</button>
            <button onClick={() => {
              if (!comentario.trim()) { toast.error("Escribe el comentario."); return; }
              run(() => observarSimulacro(sim.id, comentario), "Observación enviada.");
            }} disabled={pending}
              className="py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-1.5">
              <Send className="w-3.5 h-3.5" /> Enviar observación
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Menú 3 puntos de una observación ────────────────────────────────────────
function ObsMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="w-6 h-6 flex items-center justify-center rounded text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors">
        <MoreVertical className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-0.5 bg-white border border-gray-200 rounded-xl shadow-lg z-40 py-1 min-w-[130px]">
          <button type="button" onClick={() => { setOpen(false); onEdit(); }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-[var(--caritas-green)]/5 hover:text-[var(--caritas-green)]">
            <Pencil className="w-3 h-3" /> Editar
          </button>
          <button type="button" onClick={() => { setOpen(false); onDelete(); }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50">
            <X className="w-3 h-3" /> Eliminar
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Hilo de observaciones ────────────────────────────────────────────────────
function HiloObservaciones({ comentarios, simId, currentNombre, rolTipo, canWrite, currentUsuarioGRDId }: {
  comentarios: Comentario[]; simId: string;
  currentNombre: string; rolTipo: "ESPECIALISTA" | "BRIGADISTA";
  canWrite: boolean; currentUsuarioGRDId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [texto, setTexto] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTexto, setEditTexto] = useState("");

  const enviar = () => {
    if (!texto.trim()) return;
    startTransition(async () => {
      const res = await addObservacionSimulacro(simId, texto, rolTipo);
      if (res?.message) { toast.error(res.message); return; }
      setTexto(""); router.refresh();
    });
  };

  const guardarEdicion = (id: string) => {
    if (!editTexto.trim()) return;
    startTransition(async () => {
      const res = await editarObservacionSimulacro(id, editTexto);
      if (res?.message) { toast.error(res.message); return; }
      setEditingId(null); router.refresh();
    });
  };

  const eliminar = (id: string) =>
    startTransition(async () => {
      const res = await borrarObservacionSimulacro(id);
      if (res?.message) { toast.error(res.message); return; }
      router.refresh();
    });

  const showObs = comentarios.length > 0 || canWrite;
  if (!showObs) return null;

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
        <MessageSquare className="w-3.5 h-3.5 text-[var(--caritas-green)]" /> Observaciones
      </p>

      {comentarios.length === 0 && canWrite && (
        <p className="text-xs text-gray-400 italic">Sin observaciones aún.</p>
      )}

      {comentarios.map(c => {
        const esPropia = c.autorId === currentUsuarioGRDId;
        const editando = editingId === c.id;
        return (
          <div key={c.id} className="flex gap-2.5">
            <Avatar nombre={c.autorNombre} size="md" />
            <div className="flex-1 min-w-0">
              {/* Header de la observación */}
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <p className="text-[11px] text-gray-500 min-w-0 truncate">
                  <span className="font-semibold text-[var(--caritas-text)]">{c.autorNombre}</span>
                  {" — "}
                  <span className={c.tipo === "ESPECIALISTA" ? "text-[var(--caritas-green)]" : "text-indigo-600"}>
                    {c.tipo === "ESPECIALISTA" ? "Especialista" : "Brigadista"}
                  </span>
                  <span className="ml-2 text-gray-400">{fmtFecha(c.fechaCreacion)}</span>
                  {c.fechaEdicion && (
                    <span className="ml-1 text-gray-400 italic">· Editado</span>
                  )}
                </p>
                {esPropia && (
                  <ObsMenu
                    onEdit={() => { setEditingId(c.id); setEditTexto(c.texto); }}
                    onDelete={() => eliminar(c.id)}
                  />
                )}
              </div>
              {/* Texto o editor inline */}
              {editando ? (
                <div className="space-y-1.5">
                  <textarea value={editTexto} onChange={e => setEditTexto(e.target.value)}
                    rows={2} autoFocus
                    className={`w-full resize-none text-xs ${fieldBase} border-[var(--caritas-green)] px-3 py-2`} />
                  <div className="flex items-center gap-2">
                    <button onClick={() => guardarEdicion(c.id)} disabled={pending || !editTexto.trim()}
                      className="px-3 py-1 text-xs bg-[var(--caritas-green)] text-white rounded-lg disabled:opacity-50 hover:opacity-90">
                      Guardar
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-xs text-gray-400 hover:text-gray-600">
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-700 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100 leading-relaxed">
                  {c.texto}
                </p>
              )}
            </div>
          </div>
        );
      })}

      {/* Input nueva observación */}
      {canWrite && (
        <div className="flex gap-2 items-center">
          <Avatar nombre={currentNombre} size="md" />
          <div className="flex-1 flex gap-2">
            <input value={texto} onChange={e => setTexto(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } }}
              placeholder="Escribe una observación..." className={`flex-1 ${INPUT}`} />
            <button onClick={enviar} disabled={pending || !texto.trim()}
              className="px-3 py-2 bg-[var(--caritas-green)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 flex-shrink-0">
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ActividadCard ────────────────────────────────────────────────────────────
function ActividadCard({
  sim, parroquias, brigadistas, canManage, role,
  currentUsuarioGRDId, currentBrigadistaId, currentNombre,
}: {
  sim: Actividad; parroquias: Parroquia[]; brigadistas: Brigadista[];
  canManage: boolean; role: FrontendRole;
  currentUsuarioGRDId: string | null; currentBrigadistaId: string | null; currentNombre: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showCancel, setShowCancel] = useState(false);

  const rolTipo: "ESPECIALISTA" | "BRIGADISTA" = canManage ? "ESPECIALISTA" : "BRIGADISTA";

  const estoyAsignado = currentBrigadistaId
    ? sim.brigadistasAsignados.some(b => b.id === currentBrigadistaId)
    : false;
  const soiResponsable = currentBrigadistaId
    ? sim.brigadistasAsignados.some(b => b.id === currentBrigadistaId && b.esResponsable)
    : false;

  const puedeRegistrarEjecucion = canManage || soiResponsable;
  const puedeObservar = canManage || estoyAsignado;

  // Horario check para edición
  const pastHorario = (() => {
    if (!sim.fechaProgramada) return false;
    const fechaStr = sim.fechaProgramada.slice(0, 10);
    const d = sim.horarioInicio ? new Date(`${fechaStr}T${sim.horarioInicio}`) : new Date(sim.fechaProgramada);
    return new Date() > d;
  })();
  const canEditAsignacion = sim.estadoActividad === "ASIGNADA" && !pastHorario;

  const puedeCancelar = canManage && ["PROGRAMADA", "ASIGNADA"].includes(sim.estadoActividad);
  const puedeEditar = canManage && ["PROGRAMADA", "ASIGNADA"].includes(sim.estadoActividad)
    && !pastHorario;

  // Evidencias: brigadista puede subir solo en ASIGNADA; canManage hasta VALIDADA excluida
  const canUploadEv = sim.estadoActividad !== "CANCELADA" && sim.estadoActividad !== "VALIDADA" &&
    (canManage || (estoyAsignado && sim.estadoActividad === "ASIGNADA"));

  const showPanelAsignar = canManage && ["PROGRAMADA", "ASIGNADA"].includes(sim.estadoActividad);
  const showPanelEjecucion = puedeRegistrarEjecucion && ["ASIGNADA", "OBSERVADA"].includes(sim.estadoActividad);
  const showPanelRevisar = canManage && sim.estadoActividad === "EJECUTADA";

  // Estados donde se permiten observaciones
  const estadoPermiteObs = ["PROGRAMADA", "ASIGNADA", "EJECUTADA", "OBSERVADA"].includes(sim.estadoActividad);
  // Brigadista solo puede escribir en ASIGNADA; especialista/admin en cualquier estado permitido
  const canWriteObs = estadoPermiteObs && (canManage || (estoyAsignado && sim.estadoActividad === "ASIGNADA"));
  // Mostrar el hilo si hay comentarios existentes O puede escribir
  const showObservaciones = sim.comentariosObservacion.length > 0 || canWriteObs;

  const handleCancel = (motivo: string) =>
    startTransition(async () => {
      const res = await cancelarSimulacro(sim.id, motivo);
      if (res?.message) { toast.error(res.message); return; }
      toast.success("Cancelado."); router.refresh(); setShowCancel(false);
    });

  const estado = ESTADO_CFG[sim.estadoActividad] ?? ESTADO_CFG.PROGRAMADA;
  const tipoCls = TIPO_BADGE[sim.idTipoActividadPreventiva] ?? "bg-gray-50 text-gray-600 border border-gray-200";

  return (
    <>
      {showEdit && <EditModal sim={sim} parroquias={parroquias} onClose={() => setShowEdit(false)} />}
      {showCancel && (
        <CancelModal nombre={sim.nombreActividad} onConfirm={handleCancel}
          onClose={() => setShowCancel(false)} loading={pending} />
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="p-5 cursor-pointer select-none" onClick={() => setExpanded(v => !v)}>
          {/* Row 1: tipo + código / estado + menú + chevron */}
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0 ${tipoCls}`}>
                {sim.idTipoActividadPreventiva}
              </span>
              {sim.codigoActividad && (
                <span className="text-[11px] font-mono text-gray-400">{sim.codigoActividad}</span>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
              <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full ${estado.cls}`}>
                {estado.icon} {estado.label}
              </span>
              {puedeCancelar && <CardMenu onEdit={() => setShowEdit(true)} onCancel={() => setShowCancel(true)} />}
              <button type="button" onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Nombre */}
          <h2 className="text-sm font-semibold text-[var(--caritas-text)] leading-snug mb-1.5">
            {sim.nombreActividad}
          </h2>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {sim.parroquiaNombre}</span>
            {sim.fechaProgramada && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {fmtFecha(sim.fechaProgramada, sim.horarioInicio)}
              </span>
            )}
            {sim.lugarActividad && (
              <span className="flex items-center gap-1 text-gray-400"><MapPin className="w-3 h-3" /> {sim.lugarActividad}</span>
            )}
            {(sim.numeroParticipantesEstimado ?? 0) > 0 && (
              <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {sim.numeroParticipantesEstimado} est.</span>
            )}
          </div>

          {/* Objetivos truncados */}
          {sim.objetivos && (
            <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{sim.objetivos}</p>
          )}
        </div>

        {/* Contenido expandido */}
        {expanded && (
          <div className="border-t border-gray-100 px-5 pb-5 pt-4 space-y-5">

            {/* Objetivos completos */}
            {sim.objetivos && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Objetivos del simulacro</p>
                <p className="text-xs text-gray-700 leading-relaxed">{sim.objetivos}</p>
              </div>
            )}
            {sim.recursos && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Recursos a utilizar</p>
                <p className="text-xs text-gray-700 leading-relaxed">{sim.recursos}</p>
              </div>
            )}

            {/* Panel asignación */}
            {showPanelAsignar && (
              <PanelAsignar sim={sim} brigadistas={brigadistas}
                currentUsuarioGRDId={currentUsuarioGRDId} currentNombre={currentNombre}
                canEdit={puedeEditar || (canManage && canEditAsignacion)}
                onDone={() => setExpanded(false)} />
            )}

            {/* Chips brigadistas (si no se muestra el panel de asignar) */}
            {!showPanelAsignar && sim.brigadistasAsignados.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-gray-400 uppercase">Equipo</p>
                {sim.brigadistasAsignados.map(b => (
                  <BrigCard key={b.id} brigadista={{ ...b, parroquia: null }}
                    badge={b.esResponsable ? "RESP." : undefined} />
                ))}
              </div>
            )}
            {sim.idUsuarioResponsableGRD && sim.brigadistasAsignados.length === 0 && (
              <div className="flex items-center gap-2 text-xs text-gray-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                <User className="w-3.5 h-3.5 text-blue-500" /> Autoasignado al especialista GRD
              </div>
            )}

            {/* Panel ejecución */}
            {showPanelEjecucion && (
              <PanelEjecucion sim={sim} onDone={() => setExpanded(false)} />
            )}

            {/* Panel revisión (EJECUTADA) */}
            {showPanelRevisar && (
              <PanelRevisar sim={sim} onDone={() => setExpanded(false)} />
            )}

            {/* Resumen si VALIDADA */}
            {sim.estadoActividad === "VALIDADA" && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-[var(--caritas-green)] font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Actividad validada y cerrada
                </div>
                {sim.hallazgos && (
                  <div className="bg-green-50 border border-green-100 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-[var(--caritas-green)] uppercase mb-1">Hallazgos principales</p>
                    <p className="text-xs text-gray-700">{sim.hallazgos}</p>
                  </div>
                )}
              </div>
            )}

            {/* Observaciones */}
            {showObservaciones && (
              <HiloObservaciones
                comentarios={sim.comentariosObservacion}
                simId={sim.id}
                currentNombre={currentNombre}
                rolTipo={rolTipo}
                canWrite={canWriteObs}
                currentUsuarioGRDId={currentUsuarioGRDId}
              />
            )}

            {/* Evidencias */}
            <EvidenciasPanel simId={sim.id} evidencias={sim.evidencias} canUpload={canUploadEv} />
          </div>
        )}
      </div>
    </>
  );
}

// ─── Nueva Actividad Form ─────────────────────────────────────────────────────
function NuevaActividadForm({ parroquias, onCancel, onSaved }: {
  parroquias: Parroquia[]; onCancel: () => void; onSaved: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    idParroquia: "",
    idTipoActividadPreventiva: TIPOS[0],
    nombreActividad: "",
    fechaProgramada: new Date().toISOString().slice(0, 10),
    horarioInicio: "",
    lugarActividad: "",
    numeroParticipantesEstimado: 0,
    descripcionActividad: "", // objetivos
    recomendaciones: "",      // recursos (opcional)
  });
  const [errors, setErrors] = useState<string[]>([]);

  const required = ["nombreActividad", "idParroquia", "fechaProgramada", "descripcionActividad"] as const;

  const validate = () => {
    const e: string[] = [];
    for (const k of required) {
      if (!String(form[k]).trim()) e.push(k);
    }
    setErrors(e);
    return e.length === 0;
  };

  const submit = () => {
    if (!validate()) { toast.error("Completa todos los campos obligatorios."); return; }
    startTransition(async () => {
      const res = await programarSimulacro({
        idParroquia: form.idParroquia,
        idTipoActividadPreventiva: form.idTipoActividadPreventiva,
        nombreActividad: form.nombreActividad,
        fechaProgramada: form.fechaProgramada,
        horarioInicio: form.horarioInicio || undefined,
        lugarActividad: form.lugarActividad || undefined,
        numeroParticipantesEstimado: form.numeroParticipantesEstimado || undefined,
        descripcionActividad: form.descripcionActividad || undefined,
      });
      if (res?.message) { toast.error(res.message); return; }
      toast.success("Simulacro programado."); router.refresh(); onSaved();
    });
  };

  const f = (field: string) => errors.includes(field) ? INPUT_ERR : INPUT;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
      {/* Título */}
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-8 h-8 rounded-lg bg-[var(--caritas-green)]/10 flex items-center justify-center flex-shrink-0">
          <Calendar className="w-4.5 h-4.5 text-[var(--caritas-green)]" style={{ width: 18, height: 18 }} />
        </div>
        <p className="text-lg font-bold text-[var(--caritas-text)]">Nuevo Simulacro</p>
      </div>

      <div className="space-y-3">
        {/* Línea 1: Nombre + Tipo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-gray-500">Nombre del simulacro *</span>
            <input value={form.nombreActividad} onChange={e => setForm({ ...form, nombreActividad: e.target.value })}
              placeholder="Ej. Simulacro parroquial ante sismo 2026" className={`mt-1 ${f("nombreActividad")}`} />
          </label>
          <label className="block">
            <span className="text-xs text-gray-500">Tipo de simulacro *</span>
            <div className="mt-1">
              <SingleSelect options={TIPOS.map(t => ({ value: t, label: t }))}
                value={form.idTipoActividadPreventiva}
                onChange={v => setForm({ ...form, idTipoActividadPreventiva: v })}
                placeholder="Selecciona tipo" icon={ShieldCheck} />
            </div>
          </label>
        </div>

        {/* Línea 2: Fecha + Hora + Participantes */}
        <div className="grid grid-cols-3 gap-3">
          <label className="block">
            <span className="text-xs text-gray-500">Fecha *</span>
            <input type="date" value={form.fechaProgramada} onChange={e => setForm({ ...form, fechaProgramada: e.target.value })}
              className={`mt-1 ${f("fechaProgramada")}`} />
          </label>
          <label className="block">
            <span className="text-xs text-gray-500">Hora</span>
            <input type="time" value={form.horarioInicio} onChange={e => setForm({ ...form, horarioInicio: e.target.value })}
              className={`mt-1 ${INPUT}`} />
          </label>
          <label className="block">
            <span className="text-xs text-gray-500">Participantes estimados</span>
            <input type="number" min={0} value={String(form.numeroParticipantesEstimado)}
              onChange={e => setForm({ ...form, numeroParticipantesEstimado: Number(e.target.value) })}
              className={`mt-1 ${INPUT}`} />
          </label>
        </div>

        {/* Línea 3: Parroquia + Lugar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <span className="text-xs text-gray-500 block mb-1">Parroquia *</span>
            <SingleSelect options={parroquias.map(p => ({ value: p.id, label: p.nombre }))}
              value={form.idParroquia} onChange={v => setForm({ ...form, idParroquia: v })}
              placeholder="Selecciona parroquia" icon={MapPin} error={errors.includes("idParroquia")} />
          </div>
          <label className="block">
            <span className="text-xs text-gray-500">Lugar</span>
            <input value={form.lugarActividad} onChange={e => setForm({ ...form, lugarActividad: e.target.value })}
              placeholder="Ej. Plaza principal, nave de la parroquia..." className={`mt-1 ${INPUT}`} />
          </label>
        </div>

        {/* Línea 4: Objetivos */}
        <label className="block">
          <span className="text-xs text-gray-500">Objetivos del simulacro *</span>
          <textarea value={form.descripcionActividad} onChange={e => setForm({ ...form, descripcionActividad: e.target.value })}
            rows={3} placeholder="Describe los objetivos que se buscan alcanzar con este simulacro..."
            className={`mt-1 resize-none ${f("descripcionActividad")} px-3 py-2`} />
        </label>

        {/* Línea 5: Recursos (opcional) */}
        <label className="block">
          <span className="text-xs text-gray-500 flex items-center gap-1.5">
            Recursos a utilizar
            <span className="text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full">Opcional</span>
          </span>
          <textarea value={form.recomendaciones} onChange={e => setForm({ ...form, recomendaciones: e.target.value })}
            rows={2} placeholder="Equipos, materiales, personal de apoyo..."
            className={`mt-1 resize-none ${INPUT}`} />
        </label>
      </div>

      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onCancel} className={GHOST}>Cancelar</button>
        <button onClick={submit} disabled={pending}
          className="px-4 py-2 text-sm bg-[var(--caritas-green)] text-white rounded-lg hover:opacity-90 disabled:opacity-50">
          Guardar
        </button>
      </div>
    </div>
  );
}

// ─── Main Module ──────────────────────────────────────────────────────────────
export function SimulacrosModule({
  actividades, parroquias, brigadistas, role,
  currentUsuarioGRDId, currentBrigadistaId, currentNombre,
}: {
  actividades: Actividad[];
  parroquias: Parroquia[];
  brigadistas: Brigadista[];
  role: FrontendRole;
  currentUsuarioGRDId: string | null;
  currentBrigadistaId: string | null;
  currentNombre: string;
}) {
  const canManage = role !== "brigadista";

  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<string[]>([]);
  const [parroquiaFilter, setParroquiaFilter] = useState<string[]>([]);
  const [tipoFilter, setTipoFilter] = useState<string[]>([]);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => setCurrentPage(1), [search, estadoFilter, parroquiaFilter, tipoFilter, fechaDesde, fechaHasta]);

  const filtered = actividades.filter(a => {
    if (estadoFilter.length > 0 && !estadoFilter.includes(a.estadoActividad)) return false;
    if (parroquiaFilter.length > 0 && !parroquiaFilter.includes(a.idParroquia)) return false;
    if (tipoFilter.length > 0 && !tipoFilter.includes(a.idTipoActividadPreventiva)) return false;
    if (fechaDesde && a.fechaProgramada && a.fechaProgramada.slice(0, 10) < fechaDesde) return false;
    if (fechaHasta && a.fechaProgramada && a.fechaProgramada.slice(0, 10) > fechaHasta) return false;
    if (search) {
      const q = search.toLowerCase();
      const hit = (a.codigoActividad?.toLowerCase().includes(q) ?? false) ||
        a.nombreActividad.toLowerCase().includes(q) ||
        a.parroquiaNombre.toLowerCase().includes(q) ||
        (a.lugarActividad?.toLowerCase().includes(q) ?? false) ||
        a.idTipoActividadPreventiva.toLowerCase().includes(q);
      if (!hit) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * PAGE_SIZE;
  const paginated = filtered.slice(startIdx, startIdx + PAGE_SIZE);
  const visibleFrom = filtered.length === 0 ? 0 : startIdx + 1;
  const visibleTo = Math.min(startIdx + PAGE_SIZE, filtered.length);
  const hasFilters = search || estadoFilter.length > 0 || parroquiaFilter.length > 0 || tipoFilter.length > 0 || fechaDesde || fechaHasta;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[var(--caritas-green)]/10 rounded-lg flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-[var(--caritas-green)]" />
          </div>
          <div>
            <h1 className="font-semibold text-[var(--caritas-text)]">Simulacros y Acciones Preventivas</h1>
            <p className="text-xs text-gray-500 max-w-sm">
              Registre simulacros de prevención y respuesta en misas, parroquias o espacios comunitarios.
            </p>
          </div>
        </div>
        {canManage && (
          <button onClick={() => setShowForm(s => !s)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--caritas-green)] text-white text-sm font-medium rounded-lg hover:opacity-90">
            <Plus className="w-4 h-4" /> Programar
          </button>
        )}
      </div>

      {showForm && canManage && (
        <NuevaActividadForm parroquias={parroquias}
          onCancel={() => setShowForm(false)} onSaved={() => setShowForm(false)} />
      )}

      {/* Filtros */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative lg:w-52 flex-shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar..." className={`${fieldBase} border-gray-200 pl-9 pr-4 py-2.5`} />
          </div>
          <div className="flex flex-1 flex-col sm:flex-row gap-3">
            <MultiSelect options={ESTADOS.map(e => ({ value: e, label: e }))} value={estadoFilter} onChange={setEstadoFilter} placeholder="Estado" icon={Activity} />
            <MultiSelect options={parroquias.map(p => ({ value: p.id, label: p.nombre }))} value={parroquiaFilter} onChange={setParroquiaFilter} placeholder="Parroquia" icon={MapPin} />
            <MultiSelect options={TIPOS.map(t => ({ value: t, label: t }))} value={tipoFilter} onChange={setTipoFilter} placeholder="Tipo" icon={ShieldCheck} />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="flex items-center gap-2 flex-1">
            <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-xs text-gray-500 flex-shrink-0">Desde</span>
            <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} className={`flex-1 ${fieldBase} border-gray-200 px-3 py-2`} />
          </div>
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xs text-gray-500 flex-shrink-0">Hasta</span>
            <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} className={`flex-1 ${fieldBase} border-gray-200 px-3 py-2`} />
          </div>
          {(fechaDesde || fechaHasta) && (
            <button type="button" onClick={() => { setFechaDesde(""); setFechaHasta(""); }}
              className="text-xs text-gray-400 hover:text-[var(--caritas-green)] flex items-center gap-1">
              <X className="w-3 h-3" /> Limpiar fecha
            </button>
          )}
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Mostrando{" "}
            <span className="font-semibold text-base text-[var(--caritas-text)]">{visibleFrom}</span>–<span className="font-semibold text-base text-[var(--caritas-text)]">{visibleTo}</span>
            {" "}de <span className="font-semibold text-base text-[var(--caritas-text)]">{filtered.length}</span> actividades
          </p>
          {hasFilters && (
            <button onClick={() => { setSearch(""); setEstadoFilter([]); setParroquiaFilter([]); setTipoFilter([]); setFechaDesde(""); setFechaHasta(""); }}
              className="text-xs font-medium text-[var(--caritas-green)] hover:underline">
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Lista */}
      <div className="space-y-4">
        {filtered.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No hay actividades para mostrar.</p>
          </div>
        )}
        {paginated.map(a => (
          <ActividadCard key={a.id} sim={a} parroquias={parroquias} brigadistas={brigadistas}
            canManage={canManage} role={role}
            currentUsuarioGRDId={currentUsuarioGRDId}
            currentBrigadistaId={currentBrigadistaId}
            currentNombre={currentNombre} />
        ))}
        {filtered.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-500">Página {safePage} de {totalPages}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium border border-gray-200 rounded-lg bg-white text-gray-700 disabled:opacity-50 hover:bg-gray-50">
                <ChevronLeft className="w-3.5 h-3.5" /> Anterior
              </button>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium border border-gray-200 rounded-lg bg-white text-gray-700 disabled:opacity-50 hover:bg-gray-50">
                Siguiente <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
