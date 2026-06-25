"use client";

import { useState, useTransition, useMemo } from "react";
import { useConfirm } from "@/app/ui/shared/confirm-modal";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  BookOpen,
  Send,
  Lock,
  FileText,
  Plus,
  Link as LinkIcon,
  ExternalLink,
  Play,
  X,
  Search,
  Users,
  Calendar,
  ChevronDown,
  CheckCircle2,
  Clock,
  Archive,
  ClipboardList,
  Pencil,
  Trash2,
  MoreVertical,
  EyeOff,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { toast } from "sonner";
import { cambiarEstadoCurso, crearSesion, agregarMaterial, editarSesion, eliminarSesion, editarMaterial, eliminarMaterial, obtenerCuestionarioPorId, listarParticipantesCurso, actualizarConstancia } from "@/app/actions/capacitaciones";
import type { CuestionarioDetalle, ParticipanteCurso } from "@/app/actions/capacitaciones";
import { CuestionarioModal } from "@/app/ui/capacitaciones/cuestionario-modal";
import { TIPOS_MATERIAL } from "@/app/lib/capacitaciones-tipos";
import { MaterialModal } from "@/app/ui/capacitaciones/MaterialModal";
import type { CursoDetalle } from "@/app/actions/capacitaciones";
import { SeccionAcordeon } from "@/app/ui/capacitaciones/seccion-acordeon";
import { ParticipantesTable } from "@/app/ui/capacitaciones/participantes-table";

function getMaterialMeta(tipo: string | null): { rowIcon: React.ReactNode; btnIcon: React.ReactNode; btnLabel: string } {
  if (tipo === "Video") return {
    rowIcon: <Play className="w-4 h-4 text-[var(--caritas-green)] shrink-0" />,
    btnIcon: <Play className="w-3 h-3" />,
    btnLabel: "Ver video",
  };
  if (tipo === "Enlace web") return {
    rowIcon: <ExternalLink className="w-4 h-4 text-[var(--caritas-green)] shrink-0" />,
    btnIcon: <ExternalLink className="w-3 h-3" />,
    btnLabel: "Abrir enlace",
  };
  return {
    rowIcon: <FileText className="w-4 h-4 text-[var(--caritas-green)] shrink-0" />,
    btnIcon: <FileText className="w-3 h-3" />,
    btnLabel: "Abrir",
  };
}


const ESTADO_CONFIG: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  PUBLICADO: {
    label: "Publicado",
    className: "bg-green-50 text-green-700 border border-green-200",
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  BORRADOR: {
    label: "Borrador",
    className: "bg-amber-50 text-amber-700 border border-amber-200",
    icon: <Clock className="w-3 h-3" />,
  },
  CERRADO: {
    label: "Cerrado",
    className: "bg-gray-100 text-gray-500 border border-gray-200",
    icon: <Archive className="w-3 h-3" />,
  },
};

const ESTADO_BADGE: Record<string, string> = {
  BORRADOR: "bg-amber-50 text-amber-700 border border-amber-200",
  PUBLICADO: "bg-green-50 text-green-700 border border-green-200",
  CERRADO: "bg-gray-100 text-gray-500 border border-gray-200",
};

const CURSO_COLORS = [
  "from-[#009850] to-emerald-400",
  "from-blue-500 to-cyan-400",
  "from-purple-500 to-violet-400",
  "from-orange-500 to-amber-400",
  "from-rose-500 to-pink-400",
  "from-teal-500 to-green-400",
];

function getCursoColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return CURSO_COLORS[Math.abs(hash) % CURSO_COLORS.length];
}

function fmtDate(iso: string | null) {
  if (!iso) return null;
  return iso.slice(0, 10);
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--caritas-border)]">
          <h2 className="text-base font-semibold text-[var(--caritas-text)]">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function CursoCard({
  c,
  selectedId,
  onSelect,
}: {
  c: CursoDetalle;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const esPublicado = c.estadoCurso === "PUBLICADO";
  const esBorrador  = c.estadoCurso === "BORRADOR";
  const isSelected  = selectedId === c.id;

  return (
    <button
      onClick={() => onSelect(c.id)}
      className={`w-full text-left p-4 rounded-xl border transition-all ${
        isSelected
          ? "border-[var(--caritas-green)]/50 bg-[var(--caritas-green)]/5 ring-1 ring-[var(--caritas-green)]/30"
          : "border-gray-200 bg-white hover:bg-gray-50"
      } ${!esPublicado && !isSelected ? "opacity-70" : ""}`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <h2 className="text-sm font-semibold text-[var(--caritas-text)] leading-snug line-clamp-2">{c.nombreCurso}</h2>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${ESTADO_BADGE[c.estadoCurso] ?? "bg-gray-100 text-gray-600"}`}>
          {c.estadoCurso}
        </span>
      </div>
      {c.codigoCurso && (
        <p className="text-[11px] font-mono text-gray-400 mb-2">{c.codigoCurso}</p>
      )}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{c.totalInscritos} inscritos</span>
        <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{c.sesiones.length} unidades</span>
      </div>
    </button>
  );
}

function SesionCard({
  sesion,
  todasLasSesiones,
  onAgregarMaterial,
  onEditarMaterial,
  onRefresh,
}: {
  sesion: CursoDetalle["sesiones"][number];
  todasLasSesiones: CursoDetalle["sesiones"];
  onAgregarMaterial: (idSesion: string) => void;
  onEditarMaterial: (m: { id: string; titulo: string; tipoMaterial: string; enlaceMaterial: string }) => void;
  onRefresh: () => void;
}) {
  const [expandida, setExpandida] = useState(true);
  const [editandoUnidad, setEditandoUnidad] = useState(false);
  const [tituloUnidad, setTituloUnidad] = useState(sesion.tituloUnidad);
  const [menuAbierto, setMenuAbierto] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { showConfirm, ConfirmModalJSX } = useConfirm();

  const guardarTituloUnidad = () => {
    if (!tituloUnidad.trim()) return;
    startTransition(async () => {
      await editarSesion(sesion.id, { tituloUnidad });
      setEditandoUnidad(false);
      onRefresh();
    });
  };

  const handleEliminarUnidad = async () => {
    const ok = await showConfirm({
      title: "¿Eliminar unidad?",
      message: `Se eliminará "${sesion.tituloUnidad}" y todos sus materiales. Esta acción no se puede deshacer.`,
      confirmLabel: "Sí, eliminar",
      variant: "danger",
    });
    if (!ok) return;
    startTransition(async () => {
      await eliminarSesion(sesion.id);
      onRefresh();
    });
  };

  const handleEliminarMaterial = async (idMaterial: string, titulo: string) => {
    const ok = await showConfirm({
      title: "¿Eliminar material?",
      message: `Se eliminará "${titulo}". Esta acción no se puede deshacer.`,
      confirmLabel: "Sí, eliminar",
      variant: "danger",
    });
    if (!ok) return;
    startTransition(async () => {
      await eliminarMaterial(idMaterial);
      onRefresh();
    });
  };

  void todasLasSesiones;

  return (
    <div className="border border-[var(--caritas-border)] rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-l-4 border-[var(--caritas-green)]">
        <button onClick={() => setExpandida(!expandida)} className="shrink-0">
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expandida ? "" : "-rotate-90"}`} />
        </button>
        {editandoUnidad ? (
          <input
            value={tituloUnidad}
            onChange={(e) => setTituloUnidad(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") guardarTituloUnidad(); if (e.key === "Escape") { setEditandoUnidad(false); setTituloUnidad(sesion.tituloUnidad); } }}
            className="flex-1 text-sm font-semibold px-2 py-0.5 border border-[var(--caritas-green)] rounded focus:outline-none"
            autoFocus
          />
        ) : (
          <span className="text-sm font-semibold text-gray-800 flex-1 truncate">{sesion.tituloUnidad}</span>
        )}
        <span className="text-[11px] text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded-full shrink-0 font-medium">
          {sesion.materiales.length} material{sesion.materiales.length !== 1 ? "es" : ""}
        </span>
        {editandoUnidad ? (
          <>
            <button onClick={guardarTituloUnidad} disabled={pending} className="text-xs text-[var(--caritas-green)] font-medium hover:underline shrink-0">Guardar</button>
            <button onClick={() => { setEditandoUnidad(false); setTituloUnidad(sesion.tituloUnidad); }} className="text-xs text-gray-400 hover:text-gray-600 shrink-0">Cancelar</button>
          </>
        ) : (
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => setEditandoUnidad(true)} className="p-1.5 text-gray-400 hover:text-[var(--caritas-green)] hover:bg-white rounded-lg transition-colors">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={handleEliminarUnidad} disabled={pending} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {expandida && (
        <div className="divide-y divide-gray-100 bg-white">
          {sesion.materiales.length === 0 ? (
            <p className="text-xs text-gray-400 px-4 py-4 pl-10 italic">Sin materiales en esta unidad.</p>
          ) : (
            sesion.materiales.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3 pl-10 hover:bg-gray-50 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-[var(--caritas-green)]/8 flex items-center justify-center shrink-0">
                  {getMaterialMeta(m.tipoMaterial).rowIcon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{m.titulo}</p>
                  {m.tipoMaterial && <p className="text-[11px] text-gray-400 mt-0.5">{m.tipoMaterial}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {m.enlaceMaterial && (() => {
                    const { btnIcon, btnLabel } = getMaterialMeta(m.tipoMaterial);
                    return (
                      <a href={m.enlaceMaterial} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-[var(--caritas-green)] border border-[var(--caritas-green)]/30 hover:bg-[var(--caritas-green)]/5 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors">
                        {btnIcon} {btnLabel}
                      </a>
                    );
                  })()}
                  <div className="relative">
                    <button
                      onClick={() => setMenuAbierto(menuAbierto === m.id ? null : m.id)}
                      className="p-1.5 text-gray-300 hover:text-gray-500 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {menuAbierto === m.id && (
                      <div className="absolute right-0 bottom-full mb-1 bg-white border border-[var(--caritas-border)] rounded-xl shadow-lg z-30 w-36 py-1">
                        <button
                          onClick={() => { setMenuAbierto(null); onEditarMaterial({ id: m.id, titulo: m.titulo, tipoMaterial: m.tipoMaterial ?? TIPOS_MATERIAL[0], enlaceMaterial: m.enlaceMaterial ?? "" }); }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5 text-gray-400" /> Editar
                        </button>
                        <div className="border-t border-gray-100 my-1" />
                        <button
                          onClick={() => { setMenuAbierto(null); handleEliminarMaterial(m.id, m.titulo); }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          <button
            onClick={() => onAgregarMaterial(sesion.id)}
            className="flex items-center gap-1.5 text-xs text-[var(--caritas-green)] px-4 py-2.5 pl-10 w-full hover:bg-gray-50 transition-colors font-medium"
          >
            <Plus className="w-3.5 h-3.5" /> Agregar material
          </button>
        </div>
      )}
      {ConfirmModalJSX}
    </div>
  );
}

export function EspecialistaCapacitaciones({ cursos }: { cursos: CursoDetalle[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(
    cursos.find((c) => c.estadoCurso === "PUBLICADO")?.id ?? cursos[0]?.id ?? null
  );
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<"todos" | "PUBLICADO" | "BORRADOR" | "CERRADO">("todos");
  const [showBorradores, setShowBorradores] = useState(false);
  const [showCerrados, setShowCerrados] = useState(false);
  const [panelAbierto, setPanelAbierto] = useState(true);
  const [showSesion, setShowSesion] = useState(false);
  const [sesionTitulo, setSesionTitulo] = useState("");
  const [showCuestionario, setShowCuestionario] = useState(false);
  const [cuestionarioEditar, setCuestionarioEditar] = useState<CuestionarioDetalle | null>(null);
  const [tipoCuestionarioActivo, setTipoCuestionarioActivo] = useState<"INICIAL" | "FINAL">("FINAL");
  const [materialModal, setMaterialModal] = useState<{ idSesion: string; idCurso: string } | null>(null);
  const [editarMaterialModal, setEditarMaterialModal] = useState<{ id: string; titulo: string; tipoMaterial: string; enlaceMaterial: string } | null>(null);
  const [participantes, setParticipantes] = useState<ParticipanteCurso[]>([]);
  const [loadingParticipantes, setLoadingParticipantes] = useState(false);
  const [activeTab, setActiveTab] = useState<"contenido" | "evaluaciones" | "participantes">("contenido");
  const [participantesCargados, setParticipantesCargados] = useState(false);
  const [constanciaInput, setConstanciaInput] = useState<Record<string, string>>({});

  const run = (fn: () => Promise<{ message?: string } | void>, ok: string, after?: () => void) =>
    startTransition(async () => {
      const res = await fn();
      if (res && "message" in res && res.message) {
        toast.error(res.message);
      } else {
        toast.success(ok);
        after?.();
        router.refresh();
      }
    });

  function validarSesionTitulo(titulo: string): string | null {
    const limpio = titulo.trim();
    if (!limpio) return "El título no puede estar vacío.";
    if (limpio.length < 3) return "El título debe tener al menos 3 caracteres.";
    return null;
  }

  void validarSesionTitulo;

  const cursosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return cursos;
    const q = busqueda.toLowerCase();
    const resultado = cursos.filter((c) =>
      c.nombreCurso.toLowerCase().includes(q) ||
      (c.codigoCurso ?? "").toLowerCase().includes(q)
    );
    if (resultado.some((c) => c.estadoCurso === "BORRADOR")) setShowBorradores(true);
    if (resultado.some((c) => c.estadoCurso === "CERRADO")) setShowCerrados(true);
    return resultado;
  }, [cursos, busqueda]);

  const cursosVista = filtroEstado === "todos" ? cursosFiltrados : cursosFiltrados.filter((c) => c.estadoCurso === filtroEstado);
  const publicados = cursosVista.filter((c) => c.estadoCurso === "PUBLICADO");
  const borradores = cursosVista.filter((c) => c.estadoCurso === "BORRADOR");
  const cerrados   = cursosVista.filter((c) => c.estadoCurso === "CERRADO");

  const current = cursos.find((c) => c.id === selectedId) ?? null;

  const handleSelectCurso = (id: string) => {
    setSelectedId(id);
    setActiveTab("contenido");
    setParticipantes([]);
    setLoadingParticipantes(false);
    setParticipantesCargados(false);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-[var(--caritas-green)]/10 rounded-lg flex items-center justify-center">
          <GraduationCap className="w-5 h-5 text-[var(--caritas-green)]" />
        </div>
        <div>
          <h1 className="text-[var(--caritas-text)] font-semibold text-lg">Formación y Certificación</h1>
          <p className="text-sm text-gray-500">Mis cursos asignados</p>
        </div>
      </div>

      {cursos.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-3 border border-dashed border-gray-300 rounded-xl">
          <BookOpen className="w-10 h-10" />
          <p className="text-sm">No tienes cursos asignados aún.</p>
        </div>
      ) : (
        <>
        {/* Filtros rápidos */}
        <div className="bg-white border border-gray-200 rounded-xl p-3 mb-4 flex flex-wrap items-center gap-2">
          <button
            onClick={() => { setBusqueda(""); setFiltroEstado("todos"); setShowBorradores(true); setShowCerrados(true); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition-colors ${filtroEstado === "todos" ? "border-gray-500 text-gray-700 bg-gray-50" : "border-transparent bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"}`}
          >
            Todos ({cursos.length})
          </button>
          <button
            onClick={() => { setBusqueda(""); setFiltroEstado("PUBLICADO"); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition-colors ${filtroEstado === "PUBLICADO" ? "border-green-500 text-green-700 bg-green-50" : "border-transparent bg-green-50 text-green-600 hover:bg-green-100"}`}
          >
            Publicados ({cursos.filter(c => c.estadoCurso === "PUBLICADO").length})
          </button>
          <button
            onClick={() => { setBusqueda(""); setFiltroEstado("BORRADOR"); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition-colors ${filtroEstado === "BORRADOR" ? "border-amber-400 text-amber-700 bg-amber-50" : "border-transparent bg-amber-50 text-amber-600 hover:bg-amber-100"}`}
          >
            No publicados ({cursos.filter(c => c.estadoCurso === "BORRADOR").length})
          </button>
          <button
            onClick={() => { setBusqueda(""); setFiltroEstado("CERRADO"); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition-colors ${filtroEstado === "CERRADO" ? "border-gray-400 text-gray-600 bg-gray-100" : "border-transparent bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
          >
            Cerrados ({cursos.filter(c => c.estadoCurso === "CERRADO").length})
          </button>
        </div>
        <div className={`grid grid-cols-1 gap-5 ${panelAbierto ? "lg:grid-cols-[300px_1fr]" : ""}`}>
          {/* Panel izquierdo */}
          {panelAbierto && (
            <div className="flex flex-col gap-3 h-[calc(100vh-180px)]">
              {/* Buscador + botón colapsar */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar curso..."
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[var(--caritas-green)] focus:border-[var(--caritas-green)]"
                  />
                </div>
                <button
                  onClick={() => setPanelAbierto(false)}
                  className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg text-[var(--caritas-green)] border border-[var(--caritas-green)]/30 bg-[var(--caritas-green)]/8 hover:bg-[var(--caritas-green)]/15 transition-colors"
                  title="Colapsar panel"
                >
                  <PanelLeftClose className="w-5 h-5" />
                </button>
              </div>

              {/* Lista con scroll */}
              <div className="overflow-y-auto flex-1 space-y-3 pr-1">
                {cursosFiltrados.length === 0 && (
                  <p className="text-sm text-gray-400 py-4 text-center">Sin resultados.</p>
                )}

                {/* Publicados */}
                {publicados.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-green-700 uppercase tracking-wide px-1">
                      Publicados ({publicados.length})
                    </p>
                    {publicados.map((c) => (
                      <CursoCard key={c.id} c={c} selectedId={selectedId} onSelect={handleSelectCurso} />
                    ))}
                  </div>
                )}

                {/* No publicados (borradores) */}
                {borradores.length > 0 && (
                  <div className="space-y-2">
                    <button
                      onClick={() => setShowBorradores((s) => !s)}
                      className="flex items-center justify-between w-full px-1 group"
                    >
                      <div className="flex items-center gap-1.5">
                        <EyeOff className="w-3 h-3 text-gray-400" />
                        <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">
                          No publicados ({borradores.length})
                        </p>
                      </div>
                      <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showBorradores ? "rotate-180" : ""}`} />
                    </button>
                    {showBorradores && borradores.map((c) => (
                      <CursoCard key={c.id} c={c} selectedId={selectedId} onSelect={handleSelectCurso} />
                    ))}
                  </div>
                )}

                {/* Cerrados */}
                {cerrados.length > 0 && (
                  <div className="space-y-2">
                    <button
                      onClick={() => setShowCerrados((s) => !s)}
                      className="flex items-center justify-between w-full px-1 group"
                    >
                      <div className="flex items-center gap-1.5">
                        <Archive className="w-3 h-3 text-gray-400" />
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                          Cerrados ({cerrados.length})
                        </p>
                      </div>
                      <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showCerrados ? "rotate-180" : ""}`} />
                    </button>
                    {showCerrados && cerrados.map((c) => (
                      <CursoCard key={c.id} c={c} selectedId={selectedId} onSelect={handleSelectCurso} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Panel derecho — detalle */}
          <div className="bg-white border border-[var(--caritas-border)] rounded-xl p-6 min-h-[400px]">
            {/* Toggle */}
            <div className="flex items-center mb-4">
              <button
                onClick={() => setPanelAbierto((s) => !s)}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                title={panelAbierto ? "Colapsar panel" : "Expandir panel"}
              >
                {panelAbierto ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
              </button>
            </div>

            {!current ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                <BookOpen className="w-10 h-10" />
                <p className="text-sm">Selecciona un curso para ver el detalle</p>
              </div>
            ) : (
              <>
                {/* Course header */}
                <div className="border border-[var(--caritas-border)] rounded-xl p-4 mb-5 bg-white">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {current.codigoCurso && (
                          <span className="text-xs text-gray-400 font-mono bg-gray-100 px-2 py-0.5 rounded">
                            {current.codigoCurso}
                          </span>
                        )}
                        <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-100">
                          Asincrónica
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${ESTADO_CONFIG[current.estadoCurso]?.className ?? ""}`}>
                          {ESTADO_CONFIG[current.estadoCurso]?.icon} {ESTADO_CONFIG[current.estadoCurso]?.label ?? current.estadoCurso}
                        </span>
                      </div>
                      <h2 className="text-xl font-bold text-[var(--caritas-text)] mb-2">{current.nombreCurso}</h2>
                      {current.descripcion && (
                        <p className="text-sm text-gray-600 mb-3">{current.descripcion}</p>
                      )}
                      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" />
                          {current.totalInscritos} inscritos
                        </span>
                        <span className="flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5" />
                          {current.sesiones.length} unidades
                        </span>
                        {current.fechaPublicacion && (
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            Publicado: {fmtDate(current.fechaPublicacion)}
                          </span>
                        )}
                        {current.fechaCierre && (
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            Cierre: {fmtDate(current.fechaCierre)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 shrink-0">
                      {current.estadoCurso === "BORRADOR" && (
                        <button
                          onClick={() => run(() => cambiarEstadoCurso(current.id, "PUBLICAR"), "Curso publicado.")}
                          disabled={pending}
                          className="flex items-center gap-1.5 px-4 py-2 text-sm bg-[var(--caritas-green)] text-white rounded-lg disabled:opacity-50 hover:opacity-90 transition-opacity"
                        >
                          <Send className="w-3.5 h-3.5" /> Publicar
                        </button>
                      )}
                      {current.estadoCurso === "PUBLICADO" && (
                        <button
                          onClick={() => run(() => cambiarEstadoCurso(current.id, "CERRAR"), "Curso cerrado.")}
                          disabled={pending}
                          className="flex items-center gap-1.5 px-4 py-2 text-sm border border-[var(--caritas-border)] rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
                        >
                          <Lock className="w-3.5 h-3.5" /> Cerrar inscripciones
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Pestañas */}
                <div className="flex border-b border-[var(--caritas-border)] mb-5">
                  <button
                    onClick={() => setActiveTab("contenido")}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === "contenido" ? "border-[var(--caritas-green)] text-[var(--caritas-green)]" : "border-transparent text-gray-500 hover:text-[var(--caritas-text)] hover:border-gray-200"}`}
                  >
                    <BookOpen className="w-4 h-4" />
                    Contenido
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${activeTab === "contenido" ? "bg-[var(--caritas-green)]/10 text-[var(--caritas-green)]" : "bg-gray-100 text-gray-500"}`}>{current.sesiones.length}</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("evaluaciones")}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === "evaluaciones" ? "border-[var(--caritas-green)] text-[var(--caritas-green)]" : "border-transparent text-gray-500 hover:text-[var(--caritas-text)] hover:border-gray-200"}`}
                  >
                    <ClipboardList className="w-4 h-4" />
                    Evaluaciones
                  </button>
                  <button
                    onClick={async () => {
                      setActiveTab("participantes");
                      if (!participantesCargados) {
                        setLoadingParticipantes(true);
                        const data = await listarParticipantesCurso(current.id);
                        setParticipantes(data);
                        setLoadingParticipantes(false);
                        setParticipantesCargados(true);
                      }
                    }}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${activeTab === "participantes" ? "border-[var(--caritas-green)] text-[var(--caritas-green)]" : "border-transparent text-gray-500 hover:text-[var(--caritas-text)] hover:border-gray-200"}`}
                  >
                    <Users className="w-4 h-4" />
                    Participantes
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${activeTab === "participantes" ? "bg-[var(--caritas-green)]/10 text-[var(--caritas-green)]" : "bg-gray-100 text-gray-500"}`}>{current.totalInscritos}</span>
                  </button>
                </div>

                {/* Tab: Contenido */}
                {activeTab === "contenido" && (
                  <div className="space-y-3">
                    <div className="flex justify-end">
                      <button
                        onClick={() => setShowSesion(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[var(--caritas-border)] rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> Nueva unidad
                      </button>
                    </div>
                    {current.sesiones.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-3 border-2 border-dashed border-gray-200 rounded-xl">
                        <BookOpen className="w-8 h-8" />
                        <p className="text-sm">Aún no hay unidades. Agrega la primera.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {current.sesiones.map((s) => (
                          <SesionCard
                            key={s.id}
                            sesion={s}
                            todasLasSesiones={current.sesiones}
                            onAgregarMaterial={(idSesion) => setMaterialModal({ idSesion, idCurso: current.id })}
                            onEditarMaterial={(m) => setEditarMaterialModal(m)}
                            onRefresh={() => router.refresh()}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Tab: Evaluaciones */}
                {activeTab === "evaluaciones" && (
                  <div className="space-y-3">
                    {current.cuestionarioInicial ? (
                      <div className="flex items-center justify-between gap-3 border border-amber-200 rounded-xl p-4 bg-amber-50">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                            <ClipboardList className="w-4 h-4 text-amber-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-[var(--caritas-text)]">{current.cuestionarioInicial.titulo}</p>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 font-medium">INICIAL</span>
                            </div>
                            <p className="text-xs text-gray-400">{current.cuestionarioInicial.totalPreguntas} preguntas · Puntaje: {current.cuestionarioInicial.notaAprobatoria}/20</p>
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            const det = await obtenerCuestionarioPorId(current.cuestionarioInicial!.id);
                            if (det) { setCuestionarioEditar(det); setTipoCuestionarioActivo("INICIAL"); setShowCuestionario(true); }
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs border border-[var(--caritas-border)] rounded-lg hover:bg-white transition-colors shrink-0"
                        >
                          <BookOpen className="w-3 h-3" /> Editar
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => { setTipoCuestionarioActivo("INICIAL"); setCuestionarioEditar(null); setShowCuestionario(true); }}
                        className="flex items-center gap-3 py-4 px-4 border-2 border-dashed border-amber-300 rounded-xl text-amber-500 cursor-pointer hover:bg-amber-50 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        <p className="text-sm">Crear examen inicial</p>
                      </div>
                    )}
                    {current.cuestionarioFinal ? (
                      <div className="flex items-center justify-between gap-3 border border-[var(--caritas-border)] rounded-xl p-4 bg-gray-50">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[var(--caritas-green)]/10 flex items-center justify-center shrink-0">
                            <ClipboardList className="w-4 h-4 text-[var(--caritas-green)]" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-[var(--caritas-text)]">{current.cuestionarioFinal.titulo}</p>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200 font-medium">FINAL</span>
                            </div>
                            <p className="text-xs text-gray-400">{current.cuestionarioFinal.totalPreguntas} preguntas · Puntaje: {current.cuestionarioFinal.notaAprobatoria}/20</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={async () => {
                              const det = await obtenerCuestionarioPorId(current.cuestionarioFinal!.id);
                              if (det) { setCuestionarioEditar(det); setTipoCuestionarioActivo("FINAL"); setShowCuestionario(true); }
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs border border-[var(--caritas-border)] rounded-lg hover:bg-white transition-colors"
                          >
                            <BookOpen className="w-3 h-3" /> Editar
                          </button>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 font-medium">ACTIVO</span>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => { setTipoCuestionarioActivo("FINAL"); setCuestionarioEditar(null); setShowCuestionario(true); }}
                        className="flex items-center gap-3 py-4 px-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 cursor-pointer hover:border-[var(--caritas-green)]/40 hover:bg-[var(--caritas-green)]/5 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        <p className="text-sm">Crear examen final</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab: Participantes */}
                {activeTab === "participantes" && (
                  <ParticipantesTable
                    participantes={participantes}
                    onRefresh={async () => {
                      const data = await listarParticipantesCurso(current.id);
                      setParticipantes(data);
                    }}
                    loading={loadingParticipantes}
                  />
                )}

                {/* Modal: Crear / Editar cuestionario */}
                {showCuestionario && (
                  <CuestionarioModal
                    idCurso={current.id}
                    idCuestionario={cuestionarioEditar?.id}
                    tipoPredefinido={tipoCuestionarioActivo}
                    inicial={cuestionarioEditar ?? undefined}
                    onClose={() => { setShowCuestionario(false); setCuestionarioEditar(null); }}
                  />
                )}

                {/* Modal: Nueva sesión */}
                {showSesion && (
                  <Modal title="Nueva Unidad" onClose={() => { setShowSesion(false); setSesionTitulo(""); }}>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Título de la unidad *</label>
                        <input
                          value={sesionTitulo}
                          onChange={(e) => setSesionTitulo(e.target.value)}
                          placeholder="Ej. Introducción al GRD"
                          className="w-full px-3 py-2 border border-[var(--caritas-border)] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[var(--caritas-green)]"
                          autoFocus
                        />
                      </div>
                      <p className="text-xs text-gray-400">
                        Unidad {current.sesiones.length + 1} · {current.nombreCurso}
                      </p>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => { setShowSesion(false); setSesionTitulo(""); }}
                          className="px-4 py-2 text-sm border border-[var(--caritas-border)] rounded-lg hover:bg-gray-50"
                        >
                          Cancelar
                        </button>
                        <button
                          disabled={pending || !sesionTitulo.trim()}
                          onClick={() =>
                            run(
                              () => crearSesion(current.id, { tituloUnidad: sesionTitulo }),
                              "Unidad creada.",
                              () => { setShowSesion(false); setSesionTitulo(""); }
                            )
                          }
                          className="px-4 py-2 text-sm bg-[var(--caritas-green)] text-white rounded-lg disabled:opacity-50"
                        >
                          Crear Unidad
                        </button>
                      </div>
                    </div>
                  </Modal>
                )}

                {/* Modal: Agregar material */}
                {materialModal && (
                  <MaterialModal
                    onClose={() => setMaterialModal(null)}
                    loading={pending}
                    onConfirm={async (data) => {
                      run(
                        () => agregarMaterial(materialModal.idCurso, materialModal.idSesion, data),
                        "Material agregado.",
                        () => setMaterialModal(null)
                      );
                    }}
                  />
                )}

                {/* Modal: Editar material */}
                {editarMaterialModal && (
                  <MaterialModal
                    title="Editar Material"
                    inicial={editarMaterialModal}
                    onClose={() => setEditarMaterialModal(null)}
                    loading={pending}
                    onConfirm={async (data) => {
                      run(
                        () => editarMaterial(editarMaterialModal.id, data),
                        "Material actualizado.",
                        () => setEditarMaterialModal(null)
                      );
                    }}
                  />
                )}
              </>
            )}
          </div>
        </div>
        </>
      )}
    </div>
  );
}
