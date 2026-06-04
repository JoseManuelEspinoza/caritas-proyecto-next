"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Edit,
  MapPin,
  FileText,
  Users,
  Camera,
  CheckCircle,
  XCircle,
  FileCheck,
  Flame,
  Waves,
  Mountain,
  Zap,
  TrendingDown,
  UserCheck,
  ClipboardList,
  BarChart3,
  Package,
  ShieldCheck,
  Phone,
  Calendar,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
  Plus,
  Loader2,
  HandHeart,
  Search,
  UserPlus,
  Star,
  Pencil,
  X,
  ExternalLink,
  Image as ImageIcon,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import {
  assignEquipo,
  autoasignarme,
  saveInfoCampo,
  saveInformeEvaluacion,
  aprobarCaso,
  observarCaso,
  rechazarCaso,
  corregirYReenviar,
  registrarAtencion,
  addSeguimiento,
  cerrarCaso,
  agregarPersonaCampo,
  addEvidenciasCampo,
} from "@/app/actions/incidents";
import { presignEvidencia } from "@/app/actions/evidencias";
import type { FrontendRole } from "@/app/lib/roles";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Persona = {
  id: string;
  nombres: string;
  apellidos: string | null;
  edad: string | null;
  sexo: string | null;
  tipoDocumento: string | null;
  numeroDocumento: string | null;
  parentesco: string | null;
  condicionEspecial: string | null;
  telefono: string | null;
};

type IncidentData = {
  idIncidencia: string;
  codigoCaso: string | null;
  tituloIncidencia: string | null;
  tipoEvento: string | null;
  estadoActual: string;
  direccionEvento: string | null;
  descripcionEvento: string | null;
  gravedad: string | null;
  causa: string | null;
  reportanteRol: string | null;
  fechaRegistro: string;
  parroquia: string | null;
  aviso: {
    nombreInformante: string | null;
    telefonoInformante: string | null;
    descripcion: string | null;
  } | null;
  asignaciones: {
    brigadistaId: string;
    nombres: string;
    apellidos: string | null;
    celular: string | null;
    parroquia: string | null;
    fechaAsignacion: string;
    esResponsable: boolean;
    observaciones: string | null;
  }[];
  responsableGRD: { id: string; nombre: string; correo: string | null } | null;
  instruccionesAsignacion: string | null;
  gruposFamiliares: {
    id: string;
    nombreReferencia: string | null;
    totalPersonas: number;
    personas: Persona[];
  }[];
  informes: {
    id: string;
    titulo: string;
    tipo: string | null;
    resumen: string | null;
    contenido: string | null;
    estado: string;
    fecha: string;
  }[];
  seguimientos: {
    id: string;
    situacion: string | null;
    descripcion: string | null;
    necesidadesPendientes: string | null;
    recomendaciones: string | null;
    fecha: string;
  }[];
  entregas: {
    id: string;
    tipoAyuda: string | null;
    descripcionAyuda: string | null;
    lugarEntrega: string | null;
    fecha: string | null;
    observaciones: string | null;
  }[];
  historial: {
    estadoAnterior: string | null;
    estadoNuevo: string;
    motivoCambio: string | null;
    observaciones: string | null;
    fecha: string;
  }[];
  solicitudComite: {
    estado: string;
    resultado: string | null;
    observaciones: string | null;
    fecha: string | null;
  } | null;
  brigadistasDisponibles: {
    id: string;
    nombres: string;
    apellidos: string | null;
    celular: string | null;
    parroquia: string | null;
  }[];
  evidencias: {
    id: string;
    nombreArchivo: string;
    urlArchivo: string;
    formato: string | null;
    descripcion: string | null;
    fecha: string;
    tamano: number | null;
    lat: number | null;
    lng: number | null;
    cargadoPor: string | null;
  }[];
  catalogoArticulos: { codigo: string; valor: string; descripcion: string | null }[];
  parroquias: string[];
  role: FrontendRole;
  userId: string;
  idUsuarioGRDActual: string | null;
  currentUserName: string;
  currentUserBrigadistaId: string | null;
  isBrigadistaAsignado: boolean;
  isResponsableGRD: boolean;
};

// ─── Config visual ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; badge: string; dot: string }> = {
  ABIERTO: {
    label: "Abierto",
    badge: "bg-yellow-100 text-yellow-800 border-yellow-200",
    dot: "bg-yellow-500",
  },
  ASIGNADO: {
    label: "Asignado",
    badge: "bg-blue-100 text-blue-800 border-blue-200",
    dot: "bg-blue-500",
  },
  "DATA RECOPILADA": {
    label: "Data Recopilada",
    badge: "bg-orange-100 text-orange-800 border-orange-200",
    dot: "bg-orange-500",
  },
  "EN EVALUACION": {
    label: "En Evaluación",
    badge: "bg-purple-100 text-purple-800 border-purple-200",
    dot: "bg-purple-500",
  },
  OBSERVADO: {
    label: "Observado",
    badge: "bg-amber-100 text-amber-800 border-amber-200",
    dot: "bg-amber-500",
  },
  APROBADO: {
    label: "Aprobado",
    badge: "bg-green-100 text-green-800 border-green-200",
    dot: "bg-green-500",
  },
  ATENDIDO: {
    label: "Atendido",
    badge: "bg-cyan-100 text-cyan-800 border-cyan-200",
    dot: "bg-cyan-500",
  },
  "SEGUIMIENTO ABIERTO": {
    label: "Seguimiento",
    badge: "bg-teal-100 text-teal-800 border-teal-200",
    dot: "bg-teal-500",
  },
  CERRADO: {
    label: "Cerrado",
    badge: "bg-gray-100 text-gray-700 border-gray-200",
    dot: "bg-gray-400",
  },
  RECHAZADO: {
    label: "Rechazado",
    badge: "bg-red-100 text-red-700 border-red-200",
    dot: "bg-red-500",
  },
};

const STEPS = [
  { key: "REGISTRAR", label: "Registrar", icon: FileText, statuses: ["ABIERTO"] },
  { key: "ASIGNAR", label: "Asignar Equipo", icon: UserCheck, statuses: ["ASIGNADO"] },
  { key: "RECOPILAR", label: "Recopilar Info", icon: ClipboardList, statuses: ["DATA RECOPILADA"] },
  {
    key: "REVISAR",
    label: "Revisar Caso",
    icon: BarChart3,
    statuses: ["EN EVALUACION", "OBSERVADO", "APROBADO", "RECHAZADO"],
  },
  { key: "ATENDER", label: "Atender Caso", icon: Package, statuses: ["ATENDIDO"] },
  {
    key: "SEGUIMIENTO",
    label: "Seguimiento",
    icon: ShieldCheck,
    statuses: ["SEGUIMIENTO ABIERTO"],
  },
  { key: "RESUMEN", label: "Resumen Final", icon: FileCheck, statuses: ["CERRADO"] },
];

function getStepIndex(status: string): number {
  if (status === "ABIERTO") return 1;
  for (let i = 0; i < STEPS.length; i++) {
    if (STEPS[i].statuses.includes(status)) return i;
  }
  return 0;
}

const CAT_ICONS: Record<string, any> = {
  Incendios: Flame,
  Inundaciones: Waves,
  Derrumbes: Mountain,
  Tsunamis: Waves,
  Sismos: Zap,
  Deslizamientos: TrendingDown,
};

const inputCls =
  "w-full px-3 py-2 text-sm bg-[#F5F5F5] border border-[#DDDDDD] rounded focus:outline-none focus:ring-2 focus:ring-[#009850]/20 focus:border-[#009850]";
const textareaCls = `${inputCls} resize-none`;
const btnPrimary =
  "px-4 py-2 text-sm font-medium text-white rounded-lg hover:opacity-90 transition-all disabled:opacity-50";
const btnDanger =
  "px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-all disabled:opacity-50";
const btnGhost =
  "px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-[#DDDDDD] rounded-lg hover:bg-gray-50 transition-colors";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "America/Lima",
  });
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Lima",
  });
}

/** Formatea bytes a una etiqueta legible (KB/MB). */
function fmtBytes(bytes: number | null): string | null {
  if (bytes == null) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Registro de todas las evidencias capturadas para la incidencia.
 * Se muestra dentro del levantamiento de campo (entre los campos y la recomendación).
 */
function EvidenciasRegistro({ evidencias }: { evidencias: IncidentData["evidencias"] }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
        Evidencias cargadas ({evidencias.length})
      </p>
      {evidencias.length === 0 ? (
        <div className="text-center py-6 text-sm text-gray-400 bg-gray-50 border border-dashed border-gray-200 rounded-lg">
          Aún no se han cargado evidencias para este caso.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {evidencias.map((ev) => {
            const esImagen = (ev.formato ?? "").startsWith("image/");
            const Icono = esImagen ? ImageIcon : FileText;
            const peso = fmtBytes(ev.tamano);
            return (
              <a
                key={ev.id}
                href={ev.urlArchivo}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 p-2.5 border border-[#DDDDDD] rounded-lg hover:border-[#009850]/50 hover:bg-[#009850]/5 transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-[#009850]/10 flex items-center justify-center flex-shrink-0">
                  <Icono className="w-4 h-4 text-[#009850]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{ev.nombreArchivo}</p>
                  {ev.descripcion && (
                    <p className="text-xs text-gray-500 truncate">{ev.descripcion}</p>
                  )}
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {fmtDate(ev.fecha)}
                    {peso ? ` · ${peso}` : ""}
                    {ev.cargadoPor ? ` · ${ev.cargadoPor}` : ""}
                  </p>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-[#009850] flex-shrink-0" />
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Panel: Registrar (info del incidente) ────────────────────────────────────

function PanelRegistrar({ data }: { data: IncidentData }) {
  const CatIcon =
    data.tipoEvento && CAT_ICONS[data.tipoEvento] ? CAT_ICONS[data.tipoEvento] : MapPin;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InfoField label="Código" value={data.codigoCaso ?? "—"} />
        <InfoField label="Fecha de registro" value={fmtDate(data.fechaRegistro)} />
        <InfoField
          label="Tipo de evento"
          value={
            <span className="flex items-center gap-1.5">
              <CatIcon className="w-4 h-4" />
              {data.tipoEvento ?? "—"}
            </span>
          }
        />
        <InfoField label="Gravedad" value={data.gravedad ?? "—"} />
        <InfoField
          label="Ubicación"
          value={
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {data.direccionEvento ?? "—"}
            </span>
          }
        />
        <InfoField label="Parroquia" value={data.parroquia ?? "—"} />
      </div>
      {data.descripcionEvento && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Descripción</p>
          <p className="text-sm text-gray-800 bg-gray-50 rounded-lg p-3">
            {data.descripcionEvento}
          </p>
        </div>
      )}
      {data.aviso && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-blue-800 mb-2">Informante</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-blue-700">{data.aviso.nombreInformante ?? "—"}</span>
            {data.aviso.telefonoInformante && (
              <span className="flex items-center gap-1 text-blue-700">
                <Phone className="w-3.5 h-3.5" />
                {data.aviso.telefonoInformante}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Familias y personas empadronadas */}
      {data.gruposFamiliares.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2">
            Personas empadronadas — {data.gruposFamiliares.length} grupo(s) ·{" "}
            {data.gruposFamiliares.reduce((s, g) => s + g.totalPersonas, 0)} persona(s)
          </p>
          <div className="space-y-2">
            {data.gruposFamiliares.map((g) => (
              <div
                key={g.id}
                className="border border-blue-200 rounded-lg bg-blue-50 overflow-hidden"
              >
                <div className="bg-blue-100 px-3 py-1.5 flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-xs font-semibold text-blue-900">
                    {g.nombreReferencia ?? "Grupo familiar"}
                  </span>
                  <span className="text-xs text-blue-600">({g.totalPersonas} integrantes)</span>
                </div>
                {g.personas.length > 0 && (
                  <div className="p-2 space-y-1">
                    {g.personas.map((p) => (
                      <div
                        key={p.id}
                        className="bg-white rounded px-3 py-1.5 text-xs flex items-center gap-3"
                      >
                        <span className="font-medium text-gray-800">
                          {p.nombres} {p.apellidos ?? ""}
                        </span>
                        {p.edad && <span className="text-gray-500">{p.edad} años</span>}
                        {p.numeroDocumento && (
                          <span className="text-gray-400">DNI: {p.numeroDocumento}</span>
                        )}
                        {p.condicionEspecial && (
                          <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded font-medium">
                            {p.condicionEspecial}
                          </span>
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
  );
}

// ─── Panel: Asignar Equipo ────────────────────────────────────────────────────

// Paleta de colores estable por brigadista (avatar).
const AVATAR_COLORS = [
  "bg-emerald-500",
  "bg-blue-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-indigo-500",
  "bg-teal-500",
  "bg-fuchsia-500",
];
function avatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function iniciales(nombres: string, apellidos: string | null): string {
  return `${nombres?.[0] ?? ""}${apellidos?.[0] ?? ""}`.toUpperCase();
}

function BrigCard({
  id,
  nombres,
  apellidos,
  parroquia,
  celular,
  badge,
  onRemove,
  draggable,
  onDragStart,
  onDragEnd,
}: {
  id: string;
  nombres: string;
  apellidos: string | null;
  parroquia: string | null;
  celular: string | null;
  badge?: string;
  onRemove?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}) {
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`flex items-center gap-2 p-2 bg-white border border-[#DDDDDD] rounded-lg ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${avatarColor(id)}`}
      >
        <span className="text-white text-[10px] font-bold">{iniciales(nombres, apellidos)}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-medium text-gray-900 truncate">
            {nombres} {apellidos ?? ""}
          </p>
          {badge && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#00C8B4]/15 text-[#009850]">
              {badge}
            </span>
          )}
        </div>
        <p className="text-[10px] text-gray-500 truncate">
          {parroquia ?? "—"}
          {celular ? ` · ${celular}` : ""}
        </p>
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="p-1 text-gray-400 hover:text-red-500"
          aria-label="Quitar"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

function PanelAsignar({ data, onDone }: { data: IncidentData; onDone: () => void }) {
  const canAct = data.role === "admin" || data.role === "especialistaGRD";
  const puedeEditar =
    canAct &&
    (data.estadoActual === "ABIERTO" ||
      (data.estadoActual === "ASIGNADO" && !data.informes.some((i) => i.tipo === "CAMPO")));
  const tieneEquipo = data.asignaciones.length > 0 || Boolean(data.responsableGRD);

  const respInicial = data.asignaciones.find((a) => a.esResponsable)?.brigadistaId ?? "";
  const equipoInicial = data.asignaciones
    .filter((a) => !a.esResponsable)
    .map((a) => a.brigadistaId);

  const [editing, setEditing] = useState(!tieneEquipo && puedeEditar);
  const [tab, setTab] = useState<"equipo" | "auto">("equipo");
  const [responsable, setResponsable] = useState(respInicial);
  const [equipo, setEquipo] = useState<string[]>(equipoInicial);
  const [query, setQuery] = useState("");
  const [instrucciones, setInstrucciones] = useState(data.instruccionesAsignacion ?? "");
  const [isPending, startTransition] = useTransition();
  const [dragging, setDragging] = useState<{
    id: string;
    from: "responsable" | "equipo" | "catalogo";
  } | null>(null);

  const seleccionados = [responsable, ...equipo].filter(Boolean);
  const esRecomendado = (parroquia: string | null) =>
    !!data.parroquia &&
    !!parroquia &&
    parroquia.trim().toLowerCase() === data.parroquia.trim().toLowerCase();

  const catalogo = data.brigadistasDisponibles
    .filter((b) => !seleccionados.includes(b.id))
    .filter((b) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return (
        `${b.nombres} ${b.apellidos ?? ""}`.toLowerCase().includes(q) ||
        (b.parroquia ?? "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => Number(esRecomendado(b.parroquia)) - Number(esRecomendado(a.parroquia)));

  function findBrig(id: string) {
    return (
      data.brigadistasDisponibles.find((b) => b.id === id) ??
      data.asignaciones.find((a) => a.brigadistaId === id)
    );
  }

  function agregarBrigadista(id: string) {
    if (!responsable) setResponsable(id);
    else if (!equipo.includes(id) && id !== responsable) setEquipo((prev) => [...prev, id]);
  }

  function iniciarEdicion() {
    setResponsable(respInicial);
    setEquipo(equipoInicial);
    setInstrucciones(data.instruccionesAsignacion ?? "");
    setTab(data.responsableGRD ? "auto" : "equipo");
    setEditing(true);
  }

  function handleGuardarEquipo() {
    if (!responsable) {
      toast.error("Debes designar un brigadista responsable");
      return;
    }
    startTransition(async () => {
      const res = await assignEquipo(data.idIncidencia, responsable, equipo, instrucciones);
      if (res && "message" in res) {
        toast.error(res.message);
        return;
      }
      const total = 1 + equipo.length;
      toast.success(
        total === 1 ? "Equipo asignado correctamente" : `Equipo de ${total} personas asignado`
      );
      setEditing(false);
      onDone();
    });
  }

  function handleAutoasignarme() {
    startTransition(async () => {
      const res = await autoasignarme(data.idIncidencia, instrucciones);
      if (res && "message" in res) {
        toast.error(res.message);
        return;
      }
      toast.success("Te autoasignaste como único responsable del caso");
      setEditing(false);
      onDone();
    });
  }

  if (!canAct && !tieneEquipo) {
    return (
      <p className="text-sm text-gray-500 text-center py-4">
        Solo el Especialista GRD puede gestionar la asignación del equipo.
      </p>
    );
  }

  if (data.estadoActual !== "ABIERTO" && !tieneEquipo && !puedeEditar) {
    return (
      <p className="text-sm text-gray-500 text-center py-4">
        No hay equipo asignado para este incidente.
      </p>
    );
  }

  if (tieneEquipo && !editing) {
    const respBrig = data.asignaciones.find((a) => a.esResponsable);
    const integrantes = data.asignaciones.filter((a) => !a.esResponsable);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Equipo asignado
          </p>
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
            <span className="text-[10px] font-bold uppercase text-blue-700">
              Especialista GRD — Responsable único
            </span>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--caritas-green)]/20 flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-[var(--caritas-green)]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{data.responsableGRD.nombre}</p>
                {data.responsableGRD.correo && (
                  <p className="text-xs text-gray-500">{data.responsableGRD.correo}</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {respBrig && (
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1.5">
                  Responsable
                </p>
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
                <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1.5">
                  Equipo ({integrantes.length})
                </p>
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
            <p className="text-[10px] text-[#009850] uppercase font-semibold mb-0.5">
              Instrucciones
            </p>
            <p className="text-xs text-[#009850]">{data.instruccionesAsignacion}</p>
          </div>
        )}

        {data.estadoActual === "ASIGNADO" && (
          <p className="text-[10px] text-gray-400">
            El incidente está en estado Asignado. El equipo puede iniciar el levantamiento en campo.
          </p>
        )}
      </div>
    );
  }

  if (!puedeEditar) {
    return (
      <p className="text-sm text-gray-500 text-center py-4">
        La asignación ya no puede modificarse en esta etapa.
      </p>
    );
  }

  return (
    <div className="space-y-4 border border-gray-200 rounded-2xl overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-sm font-medium text-gray-700">
          {tieneEquipo ? "Modificar asignación" : "Nueva asignación"}
        </h2>
        {tieneEquipo && (
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-xs font-bold text-[#009850] hover:text-gray-800 cursor-pointer"
          >
            Cancelar
          </button>
        )}
      </div>

      <div className="px-4 space-y-4 pb-4">
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
          <button
            type="button"
            onClick={() => setTab("equipo")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === "equipo"
                ? "bg-white text-[var(--caritas-green)] shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Users className="w-4 h-4" /> Asignar brigadistas
          </button>
          <button
            type="button"
            onClick={() => setTab("auto")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === "auto"
                ? "bg-white text-[var(--caritas-green)] shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <UserPlus className="w-4 h-4" /> Autoasignarme
          </button>
        </div>

        {tab === "equipo" ? (
          <>
            <p className="text-xs text-gray-600">
              Elige brigadistas con el buscador. El primero seleccionado será responsable; puedes
              reorganizarlo entre las áreas.
            </p>

            {seleccionados.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div
                  className={`border rounded-xl p-3 min-h-[88px] transition-colors ${
                    dragging && dragging.id !== responsable
                      ? "border-[#009850] bg-[#009850]/10"
                      : "border-[#00C8B4]/30 bg-[#00C8B4]/5"
                  }`}
                  onDragOver={(e) => {
                    if (dragging && dragging.id !== responsable) e.preventDefault();
                  }}
                  onDrop={() => {
                    if (!dragging || dragging.id === responsable) return;
                    const draggedId = dragging.id;
                    const from = dragging.from;
                    setDragging(null);
                    if (from === "equipo") {
                      // Intercambio: responsable actual baja a equipo
                      setEquipo((prev) => {
                        const sinDragged = prev.filter((x) => x !== draggedId);
                        return responsable ? [responsable, ...sinDragged] : sinDragged;
                      });
                      setResponsable(draggedId);
                    } else if (from === "catalogo") {
                      // Viene de la lista: si ya hay responsable, lo manda a equipo
                      if (responsable)
                        setEquipo((prev) => [...prev.filter((x) => x !== draggedId), responsable]);
                      else setEquipo((prev) => prev.filter((x) => x !== draggedId));
                      setResponsable(draggedId);
                    }
                  }}
                >
                  <p className="text-[10px] font-bold text-[#009850] uppercase mb-2">Responsable</p>
                  {responsable ? (
                    (() => {
                      const b = findBrig(responsable);
                      if (!b) return null;
                      return (
                        <BrigCard
                          id={responsable}
                          nombres={b.nombres}
                          apellidos={b.apellidos ?? null}
                          parroquia={b.parroquia ?? null}
                          celular={"celular" in b ? b.celular : null}
                          draggable
                          onDragStart={() => setDragging({ id: responsable, from: "responsable" })}
                          onDragEnd={() => setDragging(null)}
                          onRemove={() => {
                            if (equipo.length > 0) {
                              setResponsable(equipo[0]);
                              setEquipo((prev) => prev.slice(1));
                            } else setResponsable("");
                          }}
                        />
                      );
                    })()
                  ) : (
                    <p className="text-xs text-gray-400 italic">
                      {dragging
                        ? "Suelta aquí para asignar como responsable"
                        : "Selecciona un brigadista de la lista"}
                    </p>
                  )}
                </div>
                <div
                  className={`border rounded-xl p-3 min-h-[88px] transition-colors ${
                    dragging && dragging.from !== "equipo" && dragging.id !== responsable
                      ? "border-blue-400 bg-blue-50"
                      : "border-gray-200 bg-gray-50"
                  }`}
                  onDragOver={(e) => {
                    if (dragging && dragging.from !== "equipo" && dragging.id !== responsable)
                      e.preventDefault();
                  }}
                  onDrop={() => {
                    if (!dragging || dragging.from === "equipo" || dragging.id === responsable)
                      return;
                    const draggedId = dragging.id;
                    setDragging(null);
                    if (dragging.from === "responsable") {
                      // Responsable baja a equipo, promueve el primero del equipo
                      const nuevoResponsable = equipo[0] ?? "";
                      setResponsable(nuevoResponsable);
                      setEquipo((prev) => [...prev.slice(1), draggedId]);
                    } else if (dragging.from === "catalogo") {
                      if (!equipo.includes(draggedId)) setEquipo((prev) => [...prev, draggedId]);
                    }
                  }}
                >
                  <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Equipo</p>
                  {equipo.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">
                      {dragging ? "Suelta aquí para agregar al equipo" : "Integrantes adicionales"}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {equipo.map((id) => {
                        const b = findBrig(id);
                        if (!b) return null;
                        return (
                          <BrigCard
                            key={id}
                            id={id}
                            nombres={b.nombres}
                            apellidos={b.apellidos ?? null}
                            parroquia={b.parroquia ?? null}
                            celular={"celular" in b ? b.celular : null}
                            draggable
                            onDragStart={() => setDragging({ id, from: "equipo" })}
                            onDragEnd={() => setDragging(null)}
                            onRemove={() => setEquipo((prev) => prev.filter((x) => x !== id))}
                          />
                        );
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
                <p className="text-center py-6 text-sm text-gray-400">
                  No hay brigadistas para mostrar
                </p>
              ) : (
                catalogo.map((b) => {
                  const rec = esRecomendado(b.parroquia);
                  return (
                    <button
                      type="button"
                      key={b.id}
                      draggable
                      onDragStart={() => setDragging({ id: b.id, from: "catalogo" })}
                      onDragEnd={() => setDragging(null)}
                      onClick={() => agregarBrigadista(b.id)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-left border-b border-gray-50 last:border-0 cursor-grab active:cursor-grabbing"
                    >
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${avatarColor(b.id)}`}
                      >
                        <span className="text-white text-xs font-bold">
                          {iniciales(b.nombres, b.apellidos)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {b.nombres} {b.apellidos ?? ""}
                          </p>
                          {rec && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">
                              <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> RECOMENDADO
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          {b.parroquia ?? "—"}
                          {b.celular ? ` · ${b.celular}` : ""}
                        </p>
                      </div>
                      <Plus className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </button>
                  );
                })
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Instrucciones para el equipo
              </label>
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
              style={{ background: "var(--caritas-green)" }}
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  Guardar asignación{seleccionados.length > 0 ? ` (${seleccionados.length})` : ""}
                </>
              )}
            </button>
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <UserPlus className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">
                Serás el <strong>único responsable</strong> del levantamiento. No se asignará
                brigadista adicional.
                {data.estadoActual === "ABIERTO" && " El incidente pasará a estado Asignado."}
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Notas internas (opcional)
              </label>
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
              style={{ background: "var(--caritas-green)" }}
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Autoasignarme como responsable
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Tarjeta compacta de una evidencia (enlace al archivo). */
function EvidenciaChip({ ev }: { ev: IncidentData["evidencias"][number] }) {
  const esImagen = (ev.formato ?? "").startsWith("image/");
  const Icono = esImagen ? ImageIcon : FileText;
  return (
    <a
      href={ev.urlArchivo}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-2 p-2 border border-[#DDDDDD] rounded-lg hover:border-[#009850]/50 hover:bg-[#009850]/5 transition-colors"
    >
      <div className="w-8 h-8 rounded-lg bg-[#009850]/10 flex items-center justify-center flex-shrink-0">
        <Icono className="w-4 h-4 text-[#009850]" />
      </div>
      <span className="text-xs text-gray-800 truncate flex-1">{ev.nombreArchivo}</span>
      <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#009850] flex-shrink-0" />
    </a>
  );
}

const SEXOS = ["", "M", "F"];
const PARENTESCOS = ["", "Jefe(a) de hogar", "Cónyuge", "Hijo(a)", "Padre/Madre", "Otro"];
const MARCA_CAMPO = "Evidencia de campo";

// ─── Panel: Recopilar Información (Campo) ────────────────────────────────────

function PanelCampo({ data, onDone }: { data: IncidentData; onDone: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Brigadista solo puede llenar si está asignado a ESTE incidente
  const canAct =
    data.role === "admin" ||
    data.role === "especialistaGRD" ||
    data.isResponsableGRD ||
    (data.role === "brigadista" && data.isBrigadistaAsignado);
  const done = data.estadoActual !== "ASIGNADO";
  const informeCampo = data.informes.find((i) => i.tipo === "CAMPO");

  const [obsCampo, setObsCampo] = useState("");
  const [obsBrig, setObsBrig] = useState("");
  const [showPersona, setShowPersona] = useState(false);
  const [savingPersona, setSavingPersona] = useState(false);
  const [persona, setPersona] = useState({
    nombres: "",
    apellidos: "",
    edad: "",
    sexo: "",
    numeroDocumento: "",
    parentesco: "",
  });
  const [subiendo, setSubiendo] = useState<string[]>([]);

  function handleAddPersona() {
    if (!persona.nombres.trim()) {
      toast.error("Ingresa al menos el nombre de la persona.");
      return;
    }
    setSavingPersona(true);
    startTransition(async () => {
      const res = await agregarPersonaCampo(data.idIncidencia, {
        nombres: persona.nombres,
        apellidos: persona.apellidos || null,
        edad: persona.edad ? parseInt(persona.edad, 10) : null,
        sexo: persona.sexo || null,
        numeroDocumento: persona.numeroDocumento || null,
        parentesco: persona.parentesco || null,
      });
      setSavingPersona(false);
      if (res && "message" in res) {
        toast.error(res.message);
        return;
      }
      toast.success("Persona agregada al empadronamiento.");
      setPersona({
        nombres: "",
        apellidos: "",
        edad: "",
        sexo: "",
        numeroDocumento: "",
        parentesco: "",
      });
      setShowPersona(false);
      router.refresh();
    });
  }

  async function handleUploadCampo(files: FileList | null) {
    if (!files || files.length === 0) return;
    const arr = Array.from(files);
    setSubiendo(arr.map((f) => f.name));
    const subidas: {
      key: string;
      nombreArchivo: string;
      formato: string | null;
      tamano: number | null;
      descripcion: string;
    }[] = [];
    for (const file of arr) {
      const ct = file.type || "application/octet-stream";
      try {
        const res = await presignEvidencia({
          nombreArchivo: file.name,
          contentType: ct,
          incidenciaId: data.idIncidencia,
        });
        if (!res.ok) throw new Error(res.message);
        const put = await fetch(res.uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": ct },
        });
        if (!put.ok) throw new Error(`Error al subir (${put.status})`);
        subidas.push({
          key: res.key,
          nombreArchivo: file.name,
          formato: ct,
          tamano: file.size,
          descripcion: MARCA_CAMPO,
        });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo subir el archivo.");
      }
    }
    setSubiendo([]);
    if (subidas.length) {
      const r = await addEvidenciasCampo(data.idIncidencia, subidas);
      if (r && "message" in r) {
        toast.error(r.message);
        return;
      }
      toast.success(
        subidas.length === 1 ? "Evidencia de campo subida." : `${subidas.length} evidencias subidas.`
      );
      router.refresh();
    }
  }

  function handleSubmit() {
    startTransition(async () => {
      const res = await saveInfoCampo(data.idIncidencia, {
        fechaVisita: new Date().toISOString().split("T")[0],
        responsable: data.currentUserName || "Equipo de campo",
        descripcionEvento: obsCampo.trim() || "Levantamiento de campo realizado.",
        nivelVulnerabilidad: "",
        necesidadesPrioritarias: [],
        recomendacion: "",
        observaciones: obsBrig.trim(),
        condHabitabilidad: {},
      });
      if (res && "message" in res) {
        toast.error(res.message);
        return;
      }
      toast.success("Levantamiento enviado al Especialista GRD.");
      onDone();
    });
  }

  if (informeCampo) {
    const parsed = informeCampo.contenido
      ? (() => {
          try {
            return JSON.parse(informeCampo.contenido);
          } catch {
            return null;
          }
        })()
      : null;
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span className="text-sm font-medium text-green-800">
            Levantamiento completado el {fmtDate(informeCampo.fecha)}
          </span>
        </div>
        {parsed && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <InfoField label="Descripción en campo" value={parsed.descripcionEvento} />
              <InfoField label="Nivel de vulnerabilidad" value={parsed.nivelVulnerabilidad} />
              <InfoField
                label="Necesidades"
                value={parsed.necesidadesPrioritarias?.join(", ") ?? "—"}
              />
            </div>
            <EvidenciasRegistro evidencias={data.evidencias} />
            <InfoField label="Recomendación" value={parsed.recomendacion} />
          </div>
        )}
      </div>
    );
  }

  if (!canAct || done) {
    return (
      <p className="text-sm text-gray-500 text-center py-4">
        El levantamiento de campo aún no ha sido completado.
      </p>
    );
  }

  // ── Datos derivados para las secciones de verificación ──
  const todasPersonas = data.gruposFamiliares.flatMap((g) => g.personas);
  const totalPersonas = todasPersonas.length;
  const ninos = todasPersonas.filter((p) => p.edad != null && Number(p.edad) < 18).length;
  const mayores = todasPersonas.filter((p) => p.edad != null && Number(p.edad) >= 60).length;
  const adultos = Math.max(0, totalPersonas - ninos - mayores);
  const evidIniciales = data.evidencias.filter((e) => e.descripcion !== MARCA_CAMPO);
  const evidCampo = data.evidencias.filter((e) => e.descripcion === MARCA_CAMPO);
  const inicialesPorFuente = evidIniciales.reduce<Record<string, typeof evidIniciales>>(
    (acc, ev) => {
      const k = ev.descripcion?.trim() || "General";
      (acc[k] = acc[k] ?? []).push(ev);
      return acc;
    },
    {}
  );
  const setP = (k: string, v: string) => setPersona((p) => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      {/* Header de etapa */}
      <div className="rounded-xl bg-orange-500 text-white p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
          <ClipboardList className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold">Etapa 3 — Levantamiento de Campo</p>
          <p className="text-sm text-white/90">
            Verifica los datos del evento, confirma el empadronamiento y documenta desde campo.
            {data.currentUserName ? ` · ${data.currentUserName}` : ""}
          </p>
        </div>
        <span className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded-full uppercase flex-shrink-0">
          {data.role === "brigadista" ? "Brigadista" : "GRD"}
        </span>
      </div>

      {/* 1. Verificación del Evento */}
      <details open className="border border-gray-200 rounded-xl overflow-hidden">
        <summary className="cursor-pointer px-4 py-3 flex items-center gap-2 bg-gray-50 hover:bg-gray-100">
          <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center">
            1
          </span>
          <span className="text-sm font-semibold text-gray-800">Verificación del Evento</span>
        </summary>
        <div className="p-4 space-y-3 text-sm">
          <div className="border border-gray-200 rounded-lg p-3 space-y-1.5">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
              Datos del evento registrados
            </p>
            <p>
              <span className="font-semibold">Categoría:</span> {data.tipoEvento ?? "—"}
            </p>
            <p>
              <span className="font-semibold">Ubicación:</span>{" "}
              {[data.direccionEvento, data.parroquia].filter(Boolean).join(", ") || "—"}
            </p>
            {data.descripcionEvento && (
              <p>
                <span className="font-semibold">Descripción inicial:</span> {data.descripcionEvento}
              </p>
            )}
            {data.causa && (
              <p>
                <span className="font-semibold">Causa:</span> {data.causa}
              </p>
            )}
          </div>

          {data.aviso && (
            <div className="border border-gray-200 rounded-lg p-3 space-y-1">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Reportado por</p>
              <p>
                <span className="font-semibold">Nombre:</span> {data.aviso.nombreInformante ?? "—"}
              </p>
              {data.aviso.telefonoInformante && (
                <p>
                  <span className="font-semibold">Celular:</span> {data.aviso.telefonoInformante}
                </p>
              )}
              {data.reportanteRol && (
                <p>
                  <span className="font-semibold">Rol/Institución:</span> {data.reportanteRol}
                </p>
              )}
            </div>
          )}

          {/* Evidencias iniciales */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Evidencias iniciales</p>
            {evidIniciales.length === 0 ? (
              <p className="text-xs text-gray-400">Sin evidencias iniciales registradas.</p>
            ) : (
              <div className="space-y-2.5">
                {Object.entries(inicialesPorFuente).map(([fuente, items]) => (
                  <div key={fuente}>
                    <p className="text-[11px] text-gray-500 mb-1">
                      {fuente} · {items.length} archivo(s)
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {items.map((ev) => (
                        <EvidenciaChip key={ev.id} ev={ev} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Estimación */}
          <div className="border border-gray-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
              Estimación inicial de afectación
            </p>
            {data.gravedad && (
              <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                {data.gravedad}
              </span>
            )}
            <p className="text-sm font-semibold mt-2">{totalPersonas} persona(s) afectada(s)</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {[
                ["Niños", ninos],
                ["Adultos", adultos],
                ["Adultos Mayores", mayores],
              ].map(([label, n]) => (
                <span
                  key={label}
                  className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded-full"
                >
                  {label} · {n}
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Observaciones desde campo (opcional)
            </label>
            <textarea
              rows={2}
              className={textareaCls}
              value={obsCampo}
              onChange={(e) => setObsCampo(e.target.value)}
              placeholder="Lo observado en campo..."
            />
          </div>
        </div>
      </details>

      {/* 2. Verificación de Empadronamiento */}
      <details className="border border-gray-200 rounded-xl overflow-hidden">
        <summary className="cursor-pointer px-4 py-3 flex items-center gap-2 bg-gray-50 hover:bg-gray-100">
          <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center">
            2
          </span>
          <Users className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-800">
            Verificación de Empadronamiento
          </span>
          <span className="ml-auto text-[11px] text-gray-500">
            {totalPersonas} persona(s) · {data.gruposFamiliares.length} familia(s)
          </span>
        </summary>
        <div className="p-4 space-y-2">
          {totalPersonas === 0 ? (
            <p className="text-xs text-gray-400 italic">Sin personas empadronadas aún.</p>
          ) : (
            data.gruposFamiliares.map((g) => (
              <div key={g.id} className="bg-gray-50 rounded-lg border border-gray-100 p-2.5">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[11px] font-bold text-gray-700">
                    {g.nombreReferencia ?? "Grupo familiar"}
                  </p>
                  <span className="text-[10px] text-gray-500">{g.totalPersonas} miembro(s)</span>
                </div>
                <ul className="space-y-0.5">
                  {g.personas.map((p) => (
                    <li key={p.id} className="text-[11px] text-gray-700 flex justify-between gap-2">
                      <span className="truncate">
                        {p.nombres} {p.apellidos ?? ""}
                        {p.parentesco ? <span className="text-gray-400"> · {p.parentesco}</span> : ""}
                      </span>
                      <span className="text-[10px] text-gray-500 flex-shrink-0">
                        {p.edad ? `${p.edad}a` : "—"} · {p.sexo ?? "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}

          {!showPersona ? (
            <button
              type="button"
              onClick={() => setShowPersona(true)}
              className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-[#009850] hover:text-[#009850] transition-colors"
            >
              <Plus className="w-4 h-4" /> Agregar persona
            </button>
          ) : (
            <div className="border border-gray-200 rounded-lg p-3 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  className={inputCls}
                  placeholder="Nombres *"
                  value={persona.nombres}
                  onChange={(e) => setP("nombres", e.target.value)}
                />
                <input
                  className={inputCls}
                  placeholder="Apellidos"
                  value={persona.apellidos}
                  onChange={(e) => setP("apellidos", e.target.value)}
                />
                <input
                  className={inputCls}
                  placeholder="Edad"
                  inputMode="numeric"
                  value={persona.edad}
                  onChange={(e) => setP("edad", e.target.value.replace(/\D/g, ""))}
                />
                <select
                  className={inputCls}
                  value={persona.sexo}
                  onChange={(e) => setP("sexo", e.target.value)}
                >
                  {SEXOS.map((s) => (
                    <option key={s} value={s}>
                      {s === "" ? "Sexo…" : s === "M" ? "Masculino" : "Femenino"}
                    </option>
                  ))}
                </select>
                <input
                  className={inputCls}
                  placeholder="N° documento"
                  value={persona.numeroDocumento}
                  onChange={(e) => setP("numeroDocumento", e.target.value)}
                />
                <select
                  className={inputCls}
                  value={persona.parentesco}
                  onChange={(e) => setP("parentesco", e.target.value)}
                >
                  {PARENTESCOS.map((s) => (
                    <option key={s} value={s}>
                      {s === "" ? "Parentesco…" : s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPersona(false)}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleAddPersona}
                  disabled={savingPersona}
                  className="px-3 py-1.5 text-sm text-white rounded-lg disabled:opacity-50"
                  style={{ background: "var(--caritas-green)" }}
                >
                  {savingPersona ? "Agregando…" : "Agregar"}
                </button>
              </div>
            </div>
          )}
        </div>
      </details>

      {/* 3. Evidencias de Campo */}
      <details className="border border-gray-200 rounded-xl overflow-hidden">
        <summary className="cursor-pointer px-4 py-3 flex items-center gap-2 bg-gray-50 hover:bg-gray-100">
          <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center">
            3
          </span>
          <Camera className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-800">Evidencias de Campo</span>
          <span className="ml-auto text-[11px] text-gray-500">{evidCampo.length} subida(s)</span>
        </summary>
        <div className="p-4 space-y-3">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
            <p className="font-semibold flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Recomendaciones éticas:
            </p>
            <ul className="list-disc ml-5 mt-1 space-y-0.5">
              <li>Evidenciar daños o afectaciones</li>
              <li>No vulnerar la dignidad de las personas</li>
              <li>Evitar exposición innecesaria de menores o situaciones sensibles</li>
            </ul>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label className="flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-[#009850] hover:text-[#009850] cursor-pointer transition-colors">
              <Camera className="w-4 h-4" /> Tomar foto
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handleUploadCampo(e.target.files)}
              />
            </label>
            <label className="flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-[#009850] hover:text-[#009850] cursor-pointer transition-colors">
              <Upload className="w-4 h-4" /> Cargar foto / video
              <input
                type="file"
                multiple
                accept="image/*,video/*,.pdf"
                className="hidden"
                onChange={(e) => handleUploadCampo(e.target.files)}
              />
            </label>
          </div>

          {subiendo.length > 0 && (
            <p className="text-xs text-blue-600 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Subiendo {subiendo.length} archivo(s)…
            </p>
          )}

          {evidCampo.length === 0 && subiendo.length === 0 ? (
            <p className="text-center text-xs text-gray-400 py-2">
              No hay evidencias de campo registradas
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {evidCampo.map((ev) => (
                <EvidenciaChip key={ev.id} ev={ev} />
              ))}
            </div>
          )}
        </div>
      </details>

      {/* Observaciones del brigadista */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Observaciones del Brigadista
        </label>
        <textarea
          rows={3}
          className={textareaCls}
          value={obsBrig}
          onChange={(e) => setObsBrig(e.target.value)}
          placeholder="Observaciones generales del brigadista…"
        />
      </div>

      {/* Resumen + enviar */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
        <span className="flex items-center gap-1">
          <CheckCircle className="w-3.5 h-3.5 text-green-600" /> {totalPersonas} persona(s)
        </span>
        <span className="flex items-center gap-1">
          {obsBrig.trim() ? (
            <CheckCircle className="w-3.5 h-3.5 text-green-600" />
          ) : (
            <XCircle className="w-3.5 h-3.5 text-gray-400" />
          )}
          Observaciones
        </span>
        <span className="flex items-center gap-1">
          {evidCampo.length > 0 ? (
            <CheckCircle className="w-3.5 h-3.5 text-green-600" />
          ) : (
            <XCircle className="w-3.5 h-3.5 text-gray-400" />
          )}
          {evidCampo.length} evidencia(s)
        </span>
      </div>

      <button
        onClick={handleSubmit}
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold disabled:opacity-50 transition-opacity"
        style={{ background: "var(--caritas-green)" }}
      >
        {isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Enviando…
          </>
        ) : (
          <>
            <ClipboardList className="w-4 h-4" /> Enviar Levantamiento al Especialista GRD
          </>
        )}
      </button>
    </div>
  );
}

/** Sección numerada (estilo informe del especialista). */
function Seccion({
  num,
  titulo,
  children,
}: {
  num: string;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
        <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center">
          {num}
        </span>
        <span className="text-sm font-semibold text-gray-800 uppercase tracking-wide">{titulo}</span>
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  );
}

/** Lista de inputs editable con agregar/quitar. */
function ListaEditable({
  label,
  items,
  setItems,
  placeholder,
  addLabel,
}: {
  label: string;
  items: string[];
  setItems: (fn: (prev: string[]) => string[]) => void;
  placeholder: string;
  addLabel: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <div className="space-y-1.5">
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="text-purple-400">•</span>
            <input
              className="flex-1 px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg"
              placeholder={placeholder}
              value={it}
              onChange={(e) => setItems((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))}
            />
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))}
                className="text-red-500 hover:bg-red-50 rounded p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setItems((prev) => [...prev, ""])}
        className="text-[11px] text-purple-600 flex items-center gap-1 mt-1.5"
      >
        <Plus className="w-3 h-3" /> {addLabel}
      </button>
    </div>
  );
}

// ─── Panel: Revisar Caso (Especialista + Comité) ──────────────────────────────

function PanelRevisar({ data, onDone }: { data: IncidentData; onDone: () => void }) {
  const [isPending, startTransition] = useTransition();
  // El comité ve "Decidir" por defecto cuando el estado ya está en evaluación
  const defaultView: "evaluar" | "decidir" =
    (data.role === "comite" || data.role === "jefaOGP") && data.estadoActual === "EN EVALUACION"
      ? "decidir"
      : "evaluar";
  const [view, setView] = useState<"evaluar" | "decidir">(defaultView);
  const [obsText, setObsText] = useState("");
  const [evalForm, setEvalForm] = useState({
    analisis: "",
    hallazgos: "",
    conclusiones: "",
    urgencia: "Alta",
    intervencion: "Donación en especie",
    recomendacion: "",
  });
  const setE = (k: string, v: string) => setEvalForm((p) => ({ ...p, [k]: v }));

  // ── Informe enriquecido del Especialista ──
  type ArtLocal = { codigo: string; descripcion: string; cantidad: number };
  type KitLocal = { tipoKit: string; articulos: ArtLocal[] };
  const KIT_TIPOS = [
    "Kit de Víveres",
    "Kit de Higiene",
    "Kit de Dormitorio",
    "Kit de Complementos",
    "Otros",
  ];
  const [report, setReport] = useState({
    motivo: "",
    dirigidoA: "Comité de donaciones",
    objetivoGeneral: "",
    analisis: "",
    hallazgosTexto: "",
    conclusiones: "",
  });
  const setR = (k: string, v: string) => setReport((p) => ({ ...p, [k]: v }));
  const [objetivos, setObjetivos] = useState<string[]>([""]);
  const [hallazgos, setHallazgos] = useState<string[]>([""]);
  const [asignaciones, setAsignaciones] = useState<Record<string, KitLocal[]>>({});
  const [collapsed, setCollapsed] = useState(false);

  const addKit = (refId: string, tipo: string) =>
    setAsignaciones((p) => ({
      ...p,
      [refId]: [...(p[refId] ?? []), { tipoKit: tipo, articulos: [{ codigo: "", descripcion: "", cantidad: 1 }] }],
    }));
  const removeKit = (refId: string, ki: number) =>
    setAsignaciones((p) => ({ ...p, [refId]: (p[refId] ?? []).filter((_, i) => i !== ki) }));
  const addArt = (refId: string, ki: number) =>
    setAsignaciones((p) => ({
      ...p,
      [refId]: (p[refId] ?? []).map((k, i) =>
        i === ki ? { ...k, articulos: [...k.articulos, { codigo: "", descripcion: "", cantidad: 1 }] } : k
      ),
    }));
  const updArt = (refId: string, ki: number, ai: number, patch: Partial<ArtLocal>) =>
    setAsignaciones((p) => ({
      ...p,
      [refId]: (p[refId] ?? []).map((k, i) =>
        i === ki
          ? { ...k, articulos: k.articulos.map((a, j) => (j === ai ? { ...a, ...patch } : a)) }
          : k
      ),
    }));

  const canEvaluar = data.role === "admin" || data.role === "especialistaGRD";
  const canDecidir = data.role === "admin" || data.role === "comite" || data.role === "jefaOGP";
  const informeEval = data.informes.find((i) => i.tipo === "EVALUACION");
  const solicitud = data.solicitudComite;

  const targets = data.gruposFamiliares;
  const integrantesDe = (g: IncidentData["gruposFamiliares"][number]) =>
    g.personas.map((p) => `${p.nombres} ${p.apellidos ?? ""}`.trim());

  function kitsLimpios(refId: string) {
    return (asignaciones[refId] ?? [])
      .map((k) => ({
        tipoKit: k.tipoKit,
        articulos: k.articulos
          .filter((a) => a.descripcion.trim() || a.codigo.trim())
          .map((a) => ({
            codigo: a.codigo.trim(),
            descripcion: a.descripcion.trim(),
            cantidad: a.cantidad || 1,
          })),
      }))
      .filter((k) => k.articulos.length);
  }

  function handleEvaluar() {
    if (!report.analisis.trim() || !report.conclusiones.trim()) {
      toast.error("Completa el análisis de la situación y las conclusiones.");
      return;
    }
    startTransition(async () => {
      const res = await saveInformeEvaluacion(data.idIncidencia, {
        analisisSituacion: report.analisis,
        hallazgosTexto: report.hallazgosTexto,
        conclusiones: report.conclusiones,
        nivelUrgencia: "Alta",
        tipoIntervencion: "Donación en especie",
        recomendacionComite: "",
        motivo: report.motivo,
        dirigidoA: report.dirigidoA,
        objetivoGeneral: report.objetivoGeneral,
        objetivosEspecificos: objetivos.map((s) => s.trim()).filter(Boolean),
        hallazgosClave: hallazgos.map((s) => s.trim()).filter(Boolean),
        asignacionFamilias: targets.map((g) => ({
          refId: g.id,
          nombre: g.nombreReferencia ?? "Familia",
          kits: kitsLimpios(g.id),
        })),
      });
      if (res && "message" in res) {
        toast.error(res.message);
        return;
      }
      toast.success("Informe enviado al Comité");
      onDone();
    });
  }

  async function handlePdf() {
    const { generarInformePdf } = await import("@/app/lib/informe-pdf");
    generarInformePdf({
      codigo: data.codigoCaso ?? "GRD",
      categoria: data.tipoEvento ?? "—",
      evento: data.tituloIncidencia ?? data.codigoCaso ?? "Incidencia",
      ubicacion: [data.direccionEvento, data.parroquia].filter(Boolean).join(", ") || "—",
      fechaSuceso: fmtDate(data.fechaRegistro),
      familiasAfectadas: targets.length,
      personasEmpadronadas: targets.reduce((n, g) => n + g.personas.length, 0),
      fechaEmision: fmtDate(new Date().toISOString()),
      emitidoPor: `${data.currentUserName} — Especialista GRD`,
      oficina: "Oficina de Gestión Pastoral / GRD",
      motivo: report.motivo,
      dirigidoA: report.dirigidoA,
      objetivoGeneral: report.objetivoGeneral,
      objetivosEspecificos: objetivos.map((s) => s.trim()).filter(Boolean),
      analisisSituacion: report.analisis,
      hallazgosTexto: report.hallazgosTexto,
      hallazgosClave: hallazgos.map((s) => s.trim()).filter(Boolean),
      necesidadesIdentificadas: [],
      evidenciasCount: data.evidencias.length,
      familias: targets.map((g) => ({
        nombre: g.nombreReferencia ?? "Familia",
        integrantes: integrantesDe(g),
        kits: kitsLimpios(g.id),
      })),
      conclusiones: report.conclusiones,
    });
  }

  function handleDecision(tipo: "aprobar" | "observar" | "rechazar") {
    if ((tipo === "observar" || tipo === "rechazar") && !obsText.trim()) {
      toast.error("Debes indicar observaciones o motivo de rechazo");
      return;
    }
    startTransition(async () => {
      if (tipo === "aprobar") {
        await aprobarCaso(data.idIncidencia);
        toast.success("Caso aprobado");
      } else if (tipo === "observar") {
        await observarCaso(data.idIncidencia, obsText);
        toast.success("Caso devuelto con observaciones");
      } else {
        await rechazarCaso(data.idIncidencia, obsText);
        toast.error("Caso rechazado");
      }
      onDone();
    });
  }

  // Estado ya decidido
  if (["APROBADO", "RECHAZADO"].includes(data.estadoActual)) {
    const approved = data.estadoActual === "APROBADO";
    return (
      <div
        className={`p-4 rounded-lg border ${approved ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}
      >
        <div className="flex items-center gap-2 mb-2">
          {approved ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <XCircle className="w-5 h-5 text-red-600" />
          )}
          <span className={`font-semibold ${approved ? "text-green-800" : "text-red-800"}`}>
            Caso {approved ? "Aprobado" : "Rechazado"} por el Comité
          </span>
        </div>
        {solicitud?.observaciones && (
          <p className="text-sm text-gray-700">{solicitud.observaciones}</p>
        )}
        {solicitud?.fecha && (
          <p className="text-xs text-gray-500 mt-1">{fmtDate(solicitud.fecha)}</p>
        )}
      </div>
    );
  }

  if (data.estadoActual === "OBSERVADO") {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm font-semibold text-amber-800 mb-1">
            El Comité devolvió con observaciones
          </p>
          <p className="text-sm text-amber-700">
            {solicitud?.observaciones ?? "Sin observaciones registradas"}
          </p>
        </div>
        {canEvaluar && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-gray-700">Corrección del informe</p>
            <textarea
              rows={3}
              className={textareaCls}
              value={evalForm.analisis}
              onChange={(e) => setE("analisis", e.target.value)}
              placeholder="Nuevo análisis de la situación..."
            />
            <textarea
              rows={2}
              className={textareaCls}
              value={evalForm.hallazgos}
              onChange={(e) => setE("hallazgos", e.target.value)}
              placeholder="Hallazgos actualizados..."
            />
            <textarea
              rows={2}
              className={textareaCls}
              value={evalForm.conclusiones}
              onChange={(e) => setE("conclusiones", e.target.value)}
              placeholder="Conclusiones corregidas..."
            />
            <div className="flex justify-end">
              <button
                onClick={() => {
                  startTransition(async () => {
                    await corregirYReenviar(data.idIncidencia, {
                      analisisSituacion: evalForm.analisis,
                      hallazgosTexto: evalForm.hallazgos,
                      conclusiones: evalForm.conclusiones,
                      recomendacionComite: evalForm.recomendacion,
                    });
                    toast.success("Informe corregido y reenviado");
                    onDone();
                  });
                }}
                disabled={isPending}
                className={btnPrimary}
                style={{ background: "var(--caritas-green)" }}
              >
                {isPending ? "Enviando..." : "Reenviar al Comité"}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tabs: Evaluar / Decidir */}
      <div className="flex border-b border-[#DDDDDD]">
        {canEvaluar && (
          <button
            onClick={() => setView("evaluar")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${view === "evaluar" ? "border-[#009850] text-[#009850]" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            Informe de Evaluación
          </button>
        )}
        {canDecidir && data.estadoActual === "EN EVALUACION" && (
          <button
            onClick={() => setView("decidir")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${view === "decidir" ? "border-[#009850] text-[#009850]" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            Decisión del Comité
          </button>
        )}
      </div>

      {/* Vista: Evaluar */}
      {view === "evaluar" &&
        (informeEval ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <FileCheck className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">
                Informe enviado al Comité — {fmtDate(informeEval.fecha)}
              </span>
            </div>
            <InfoField label="Análisis de la situación" value={informeEval.resumen ?? "—"} />
            {informeEval.contenido &&
              (() => {
                try {
                  const p = JSON.parse(informeEval.contenido);
                  return (
                    <div className="space-y-2">
                      <InfoField label="Hallazgos" value={p.hallazgosTexto ?? "—"} />
                      <InfoField label="Conclusiones" value={p.conclusiones ?? "—"} />
                      <InfoField label="Tipo de intervención" value={p.tipoIntervencion ?? "—"} />
                    </div>
                  );
                } catch {
                  return null;
                }
              })()}
          </div>
        ) : canEvaluar ? (
          <div className="space-y-4">
            {/* Datalist de artículos del catálogo (autocompletado por código) */}
            <datalist id="cat-articulos">
              {data.catalogoArticulos.map((a) => (
                <option key={a.codigo} value={a.codigo}>
                  {a.valor}
                </option>
              ))}
            </datalist>

            {/* Header morado + resumen del evento */}
            <div className="rounded-xl bg-purple-600 text-white p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">Informe de Atención de Ayuda Humanitaria</p>
                  <p className="text-sm text-white/90">
                    Revisa el levantamiento de campo y asigna los kits que recibirá cada familia.
                  </p>
                </div>
                <span className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded-full uppercase flex-shrink-0">
                  Especialista GRD
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                {[
                  ["Código", data.codigoCaso ?? "—"],
                  ["Familias", String(targets.length)],
                  ["Personas", String(targets.reduce((n, g) => n + g.personas.length, 0))],
                  ["Distrito", data.parroquia ?? "—"],
                  ["Categoría", data.tipoEvento ?? "—"],
                  ["Fecha suceso", fmtDate(data.fechaRegistro)],
                ].map(([l, v]) => (
                  <div key={l} className="bg-white/10 rounded-lg px-2.5 py-1.5">
                    <p className="text-[10px] text-white/70 uppercase">{l}</p>
                    <p className="text-xs font-semibold truncate">{v}</p>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              className="text-xs text-purple-700 font-medium flex items-center gap-1"
            >
              {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              {collapsed ? "Mostrar formulario" : "Ocultar formulario"}
            </button>

            {!collapsed && (
              <>
                {/* A) Datos de identificación */}
                <Seccion num="A" titulo="Datos de Identificación">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Motivo <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={2}
                      className={textareaCls}
                      value={report.motivo}
                      onChange={(e) => setR("motivo", e.target.value)}
                      placeholder="Motivo del informe..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Dirigido a</label>
                    <span className="inline-block px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-medium border border-purple-200">
                      {report.dirigidoA}
                    </span>
                  </div>
                </Seccion>

                {/* B) Objetivos de la visita */}
                <Seccion num="B" titulo="Objetivos de la Visita">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Objetivo general <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={2}
                      className={textareaCls}
                      value={report.objetivoGeneral}
                      onChange={(e) => setR("objetivoGeneral", e.target.value)}
                      placeholder="Describe el objetivo general..."
                    />
                  </div>
                  <ListaEditable
                    label="Objetivos específicos"
                    items={objetivos}
                    setItems={setObjetivos}
                    placeholder="Objetivo específico..."
                    addLabel="Agregar objetivo"
                  />
                </Seccion>

                {/* C) Análisis y descripción */}
                <Seccion num="C" titulo="Análisis y Descripción">
                  {(() => {
                    const campo = data.informes.find((i) => i.tipo === "CAMPO");
                    let ref: any = null;
                    try {
                      ref = campo?.contenido ? JSON.parse(campo.contenido) : null;
                    } catch {
                      ref = null;
                    }
                    if (!ref) return null;
                    return (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-xs text-orange-900">
                        <p className="font-bold uppercase tracking-wide mb-1">
                          Levantamiento del brigadista (referencia)
                        </p>
                        {ref.nivelVulnerabilidad && (
                          <p>
                            <span className="font-semibold">Vulnerabilidad:</span>{" "}
                            {ref.nivelVulnerabilidad}
                          </p>
                        )}
                        {ref.descripcionEvento && (
                          <p>
                            <span className="font-semibold">Descripción:</span> {ref.descripcionEvento}
                          </p>
                        )}
                        {ref.observaciones && (
                          <p>
                            <span className="font-semibold">Observaciones:</span> {ref.observaciones}
                          </p>
                        )}
                        {ref.recomendacion && (
                          <p>
                            <span className="font-semibold">Recomendación:</span> {ref.recomendacion}
                          </p>
                        )}
                      </div>
                    );
                  })()}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Análisis de la situación <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      className={textareaCls}
                      value={report.analisis}
                      onChange={(e) => setR("analisis", e.target.value)}
                      placeholder="Análisis socioeconómico, magnitud del daño, redes de apoyo..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Hallazgos principales (texto)
                    </label>
                    <textarea
                      rows={2}
                      className={textareaCls}
                      value={report.hallazgosTexto}
                      onChange={(e) => setR("hallazgosTexto", e.target.value)}
                      placeholder="Resumen narrativo..."
                    />
                  </div>
                  <ListaEditable
                    label="Hallazgos clave (lista)"
                    items={hallazgos}
                    setItems={setHallazgos}
                    placeholder="Hallazgo..."
                    addLabel="Agregar hallazgo"
                  />
                </Seccion>

                {/* D) Asignación de ayuda humanitaria por familia */}
                <Seccion num="D" titulo="Asignación de Ayuda Humanitaria por Familia">
                  {targets.length === 0 ? (
                    <p className="text-xs text-gray-400">Sin familias empadronadas.</p>
                  ) : (
                    targets.map((g) => {
                      const kits = asignaciones[g.id] ?? [];
                      return (
                        <div key={g.id} className="border border-gray-200 rounded-lg p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-purple-600" />
                            <p className="text-sm font-semibold text-gray-800">
                              {g.nombreReferencia ?? "Familia"}
                            </p>
                            <span className="text-[10px] text-gray-500">
                              {g.personas.length} integrante(s)
                            </span>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-2 text-[11px] text-gray-600">
                            <p className="uppercase text-[10px] text-gray-400 mb-1">
                              Datos recopilados en campo
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {g.personas.map((p) => {
                                const mayor = p.edad != null && Number(p.edad) >= 60;
                                return (
                                  <span
                                    key={p.id}
                                    className={`px-1.5 py-0.5 rounded ${mayor ? "bg-amber-100 text-amber-700" : "bg-white border border-gray-200"}`}
                                  >
                                    {p.nombres} {p.apellidos ?? ""}
                                    {p.edad ? ` · ${p.edad}a` : ""}
                                    {mayor ? " ⚠ Adulto mayor" : ""}
                                  </span>
                                );
                              })}
                            </div>
                          </div>

                          {/* Kits asignados */}
                          {kits.map((kit, ki) => (
                            <div key={ki} className="border border-purple-100 rounded-lg p-2 bg-purple-50/40">
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-xs font-semibold text-purple-700">{kit.tipoKit}</p>
                                <button
                                  type="button"
                                  onClick={() => removeKit(g.id, ki)}
                                  className="text-red-500 hover:bg-red-50 rounded p-0.5"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              {kit.articulos.map((a, ai) => (
                                <div key={ai} className="flex items-center gap-1.5 mb-1">
                                  <input
                                    list="cat-articulos"
                                    className="w-20 px-2 py-1 text-xs border border-gray-200 rounded"
                                    placeholder="Código"
                                    value={a.codigo}
                                    onChange={(e) => {
                                      const codigo = e.target.value;
                                      const cat = data.catalogoArticulos.find((c) => c.codigo === codigo);
                                      updArt(g.id, ki, ai, {
                                        codigo,
                                        ...(cat ? { descripcion: cat.valor } : {}),
                                      });
                                    }}
                                  />
                                  <input
                                    className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded"
                                    placeholder="Descripción del artículo"
                                    value={a.descripcion}
                                    onChange={(e) => updArt(g.id, ki, ai, { descripcion: e.target.value })}
                                  />
                                  <input
                                    type="number"
                                    min={1}
                                    className="w-14 px-2 py-1 text-xs border border-gray-200 rounded"
                                    value={a.cantidad}
                                    onChange={(e) =>
                                      updArt(g.id, ki, ai, { cantidad: parseInt(e.target.value, 10) || 1 })
                                    }
                                  />
                                </div>
                              ))}
                              <button
                                type="button"
                                onClick={() => addArt(g.id, ki)}
                                className="text-[11px] text-purple-600 flex items-center gap-1 mt-1"
                              >
                                <Plus className="w-3 h-3" /> Artículo
                              </button>
                            </div>
                          ))}

                          <div className="flex flex-wrap gap-1.5">
                            {KIT_TIPOS.map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => addKit(g.id, t)}
                                className="text-[11px] px-2 py-1 border border-dashed border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50 flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3" /> {t}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  )}
                </Seccion>

                {/* E) Conclusiones */}
                <Seccion num="E" titulo="Conclusiones">
                  <textarea
                    rows={3}
                    className={textareaCls}
                    value={report.conclusiones}
                    onChange={(e) => setR("conclusiones", e.target.value)}
                    placeholder="Conclusiones finales del informe..."
                  />
                </Seccion>

                {/* Evidencia tomada por el brigadista */}
                <div className="border border-gray-200 rounded-xl p-3">
                  <EvidenciasRegistro evidencias={data.evidencias} />
                </div>

                {/* Acciones */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={handlePdf}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-purple-300 text-purple-700 rounded-xl font-medium hover:bg-purple-50"
                  >
                    <FileText className="w-4 h-4" /> Generar y descargar PDF
                  </button>
                  <button
                    type="button"
                    onClick={handleEvaluar}
                    disabled={isPending}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white font-semibold disabled:opacity-50"
                    style={{ background: "#7c3aed" }}
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Enviando…
                      </>
                    ) : (
                      <>
                        <FileCheck className="w-4 h-4" /> Enviar Informe al Comité
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">
            El Especialista GRD aún no ha elaborado el informe de evaluación.
          </p>
        ))}

      {/* Vista: Decidir */}
      {view === "decidir" && canDecidir && (
        <div className="space-y-4">
          {informeEval && (
            <div className="bg-gray-50 border border-[#DDDDDD] rounded-lg p-4 text-sm space-y-2">
              <p className="font-medium text-gray-800 text-xs mb-2">
                Resumen del informe del Especialista
              </p>
              <InfoField label="Análisis" value={informeEval.resumen ?? "—"} />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Observaciones / Motivo
            </label>
            <textarea
              rows={3}
              className={textareaCls}
              value={obsText}
              onChange={(e) => setObsText(e.target.value)}
              placeholder="Ingresa observaciones si devuelves o motivo si rechazas..."
            />
          </div>
          <div className="flex gap-3 justify-end flex-wrap">
            <button
              onClick={() => handleDecision("rechazar")}
              disabled={isPending}
              className={btnDanger}
            >
              {isPending ? "Procesando..." : "Rechazar"}
            </button>
            <button
              onClick={() => handleDecision("observar")}
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-300 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50"
            >
              {isPending ? "Procesando..." : "Devolver con observaciones"}
            </button>
            <button
              onClick={() => handleDecision("aprobar")}
              disabled={isPending}
              className={btnPrimary}
              style={{ background: "var(--caritas-green)" }}
            >
              {isPending ? "Procesando..." : "Aprobar caso"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Panel: Atender Caso ──────────────────────────────────────────────────────

function PanelAtender({ data, onDone }: { data: IncidentData; onDone: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    tipoAyuda: "Donación en especie",
    descripcion: "",
    lugar: "",
    observaciones: "",
  });
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const canAct = data.role === "admin" || data.role === "especialistaGRD";
  const done = data.entregas.length > 0;

  if (done) {
    const e = data.entregas[0];
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 p-3 bg-cyan-50 border border-cyan-200 rounded-lg">
          <HandHeart className="w-4 h-4 text-cyan-600" />
          <span className="text-sm font-medium text-cyan-800">
            Ayuda entregada {e.fecha ? fmtDate(e.fecha) : ""}
          </span>
        </div>
        <InfoField label="Tipo de ayuda" value={e.tipoAyuda ?? "—"} />
        <InfoField label="Descripción" value={e.descripcionAyuda ?? "—"} />
        <InfoField label="Lugar de entrega" value={e.lugarEntrega ?? "—"} />
        {e.observaciones && <InfoField label="Observaciones" value={e.observaciones} />}
      </div>
    );
  }

  if (!canAct)
    return (
      <p className="text-sm text-gray-500 text-center py-4">
        La entrega aún no ha sido registrada.
      </p>
    );

  return (
    <div className="space-y-4">
      <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
        El Comité aprobó este caso. Registra la entrega de la ayuda humanitaria.
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Tipo de ayuda <span className="text-red-500">*</span>
          </label>
          <select
            className={inputCls}
            value={form.tipoAyuda}
            onChange={(e) => set("tipoAyuda", e.target.value)}
          >
            {[
              "Donación en especie",
              "Donación económica",
              "Kit de emergencia",
              "Víveres",
              "Ropa y abrigo",
              "Colchones y frazadas",
              "Útiles de higiene",
              "Material de construcción",
              "Otro",
            ].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Lugar de entrega <span className="text-red-500">*</span>
          </label>
          <select
            className={inputCls}
            value={form.lugar}
            onChange={(e) => set("lugar", e.target.value)}
          >
            <option value="">Selecciona una parroquia...</option>
            {data.parroquias.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Descripción de la ayuda <span className="text-red-500">*</span>
        </label>
        <textarea
          rows={3}
          className={textareaCls}
          value={form.descripcion}
          onChange={(e) => set("descripcion", e.target.value)}
          placeholder="Detalla los ítems entregados y cantidades..."
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Observaciones</label>
        <textarea
          rows={2}
          className={textareaCls}
          value={form.observaciones}
          onChange={(e) => set("observaciones", e.target.value)}
          placeholder="Observaciones adicionales..."
        />
      </div>
      <div className="flex justify-end">
        <button
          onClick={() => {
            if (!form.descripcion || !form.lugar) {
              toast.error("Completa los campos obligatorios");
              return;
            }
            startTransition(async () => {
              await registrarAtencion(data.idIncidencia, {
                tipoAyuda: form.tipoAyuda,
                descripcionAyuda: form.descripcion,
                lugarEntrega: form.lugar,
                observaciones: form.observaciones,
              });
              toast.success("Entrega registrada correctamente");
              onDone();
            });
          }}
          disabled={isPending}
          className={btnPrimary}
          style={{ background: "var(--caritas-green)" }}
        >
          {isPending ? "Registrando..." : "Registrar entrega"}
        </button>
      </div>
    </div>
  );
}

// ─── Panel: Seguimiento ───────────────────────────────────────────────────────

function PanelSeguimiento({ data, onDone }: { data: IncidentData; onDone: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    situacion: "",
    descripcion: "",
    necesidades: "",
    recomendaciones: "",
  });
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const canAct = data.role === "admin" || data.role === "especialistaGRD";
  const canClose =
    canAct && (data.estadoActual === "SEGUIMIENTO ABIERTO" || data.estadoActual === "ATENDIDO");

  function handleSeguimiento() {
    if (!form.situacion || !form.descripcion) {
      toast.error("Completa los campos obligatorios");
      return;
    }
    startTransition(async () => {
      await addSeguimiento(data.idIncidencia, {
        situacion: form.situacion,
        descripcion: form.descripcion,
        necesidadesPendientes: form.necesidades,
        recomendaciones: form.recomendaciones,
      });
      toast.success("Seguimiento registrado");
      setForm({ situacion: "", descripcion: "", necesidades: "", recomendaciones: "" });
      onDone();
    });
  }

  function handleCerrar() {
    startTransition(async () => {
      await cerrarCaso(data.idIncidencia);
      toast.success("Caso cerrado correctamente");
      onDone();
    });
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
                  <span className="font-medium text-gray-800">{s.situacion ?? "—"}</span>
                  <span className="text-xs text-gray-400">{fmtDate(s.fecha)}</span>
                </div>
                <p className="text-gray-600">{s.descripcion ?? "—"}</p>
                {s.necesidadesPendientes && (
                  <p className="text-xs text-amber-700 mt-1">
                    Necesidades: {s.necesidadesPendientes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Formulario nuevo seguimiento */}
      {canAct && data.estadoActual !== "CERRADO" && data.estadoActual !== "RECHAZADO" && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-600">Agregar seguimiento</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Situación actual <span className="text-red-500">*</span>
              </label>
              <input
                className={inputCls}
                value={form.situacion}
                onChange={(e) => set("situacion", e.target.value)}
                placeholder="Ej: Familia estabilizada, necesita asistencia"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Necesidades pendientes
              </label>
              <input
                className={inputCls}
                value={form.necesidades}
                onChange={(e) => set("necesidades", e.target.value)}
                placeholder="Ej: Reparación de techo"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Descripción <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={2}
              className={textareaCls}
              value={form.descripcion}
              onChange={(e) => set("descripcion", e.target.value)}
              placeholder="Detalla la situación actual..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Recomendaciones</label>
            <textarea
              rows={2}
              className={textareaCls}
              value={form.recomendaciones}
              onChange={(e) => set("recomendaciones", e.target.value)}
              placeholder="Acciones recomendadas..."
            />
          </div>
          <div className="flex items-center gap-3 justify-between">
            <div>
              {canClose && (
                <button onClick={handleCerrar} disabled={isPending} className={btnGhost}>
                  {isPending ? "Cerrando..." : "Cerrar caso"}
                </button>
              )}
            </div>
            <button
              onClick={handleSeguimiento}
              disabled={isPending}
              className={btnPrimary}
              style={{ background: "var(--caritas-green)" }}
            >
              {isPending ? "Guardando..." : "Guardar seguimiento"}
            </button>
          </div>
        </div>
      )}

      {!canAct && data.seguimientos.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-4">No hay seguimientos registrados.</p>
      )}
    </div>
  );
}

// ─── Panel: Resumen Final ─────────────────────────────────────────────────────

function PanelResumen({ data }: { data: IncidentData }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
        <CheckCircle className="w-6 h-6 text-gray-500" />
        <div>
          <p className="font-semibold text-gray-800">
            Caso {data.estadoActual === "CERRADO" ? "cerrado" : data.estadoActual}
          </p>
          <p className="text-xs text-gray-500">Registrado el {fmtDate(data.fechaRegistro)}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
        {[
          { label: "Familias", value: data.gruposFamiliares.length },
          {
            label: "Personas",
            value: data.gruposFamiliares.reduce((s, g) => s + g.totalPersonas, 0),
          },
          { label: "Seguimientos", value: data.seguimientos.length },
          { label: "Informes", value: data.informes.length },
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
  );
}

// ─── Helper: Info field ───────────────────────────────────────────────────────

function InfoField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">
        {label}
      </p>
      <p className="text-sm text-gray-800">{value}</p>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function IncidentDetail({ data }: { data: IncidentData }) {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(() => getStepIndex(data.estadoActual));
  const [showHistory, setShowHistory] = useState(false);

  const cfg = STATUS_CFG[data.estadoActual] ?? STATUS_CFG["ABIERTO"];
  const currentStepIdx = getStepIndex(data.estadoActual);

  function handleDone() {
    router.refresh();
  }

  const CatIcon =
    data.tipoEvento && CAT_ICONS[data.tipoEvento] ? CAT_ICONS[data.tipoEvento] : MapPin;
  const canEdit =
    (data.role === "admin" || data.role === "especialistaGRD") && data.estadoActual === "ABIERTO";

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link
          href="/grd"
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 mt-0.5 flex-shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-mono text-sm text-gray-500">{data.codigoCaso ?? "—"}</span>
            <span
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.badge}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </span>
          </div>
          <h1 className="text-lg md:text-xl font-semibold text-gray-900 mb-1">
            {data.tituloIncidencia ?? "Sin título"}
          </h1>
          <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
            {data.tipoEvento && (
              <span className="flex items-center gap-1">
                <CatIcon className="w-4 h-4" />
                {data.tipoEvento}
              </span>
            )}
            {data.direccionEvento && (
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {data.direccionEvento}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {fmtDate(data.fechaRegistro)}
            </span>
          </div>
        </div>
        {canEdit && (
          <Link
            href={`/grd/${data.idIncidencia}/editar`}
            className="hidden md:flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-[#DDDDDD] rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
          >
            <Edit className="w-4 h-4" />
            Editar
          </Link>
        )}
      </div>

      {/* Pasos del flujo */}
      <div className="bg-white border border-[#DDDDDD] rounded-xl overflow-hidden">
        {/* Barra de pasos */}
        <div className="flex border-b border-[#DDDDDD] overflow-x-auto">
          {STEPS.map((step, idx) => {
            const StepIcon = step.icon;
            const completed = idx < currentStepIdx;
            const current = idx === currentStepIdx;
            const active = idx === activeStep;
            return (
              <button
                key={step.key}
                onClick={() => setActiveStep(idx)}
                disabled={!current && !completed && idx !== currentStepIdx + 1}
                className={`flex flex-col items-center gap-1 px-3 md:px-4 py-3 text-xs font-medium transition-colors border-b-2 flex-shrink-0 min-w-[70px] ${
                  active
                    ? "border-[#009850] text-[#009850] bg-[#009850]/5"
                    : completed
                      ? "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                      : current
                        ? "border-[#009850]/40 text-gray-700 hover:bg-gray-50"
                        : idx === currentStepIdx + 1
                          ? "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                          : "border-transparent text-gray-300 cursor-not-allowed"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    completed
                      ? "bg-[#009850] text-white"
                      : current
                        ? "bg-[#009850]/10 text-[#009850]"
                        : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {completed ? (
                    <CheckCircle className="w-3.5 h-3.5" />
                  ) : (
                    <StepIcon className="w-3.5 h-3.5" />
                  )}
                </div>
                <span className="hidden sm:block leading-tight text-center">{step.label}</span>
              </button>
            );
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
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              Historial de cambios
            </span>
            {showHistory ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>
          {showHistory && (
            <div className="border-t border-[#DDDDDD] px-5 py-4 space-y-2">
              {data.historial.map((h, i) => (
                <div key={i} className="flex items-start gap-3 text-xs">
                  <div
                    className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${STATUS_CFG[h.estadoNuevo]?.dot ?? "bg-gray-400"}`}
                  />
                  <div className="flex-1">
                    <span className="font-medium text-gray-800">
                      {STATUS_CFG[h.estadoNuevo]?.label ?? h.estadoNuevo}
                    </span>
                    {h.motivoCambio && <span className="text-gray-500"> — {h.motivoCambio}</span>}
                    {h.observaciones && (
                      <p className="text-gray-400 mt-0.5 italic">{h.observaciones}</p>
                    )}
                  </div>
                  <span className="text-gray-400 flex-shrink-0">{fmtDateTime(h.fecha)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
