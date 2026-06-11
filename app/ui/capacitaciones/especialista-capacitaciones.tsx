"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  BookOpen,
  Send,
  Lock,
  FileText,
  Plus,
  Link as LinkIcon,
  X,
  Search,
  ArrowLeft,
  Users,
  Calendar,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  Archive,
  ClipboardList,
  Pencil,
  Trash2,
  MoreVertical,
} from "lucide-react";
import { toast } from "sonner";
import { cambiarEstadoCurso, crearSesion, agregarMaterial, editarSesion, eliminarSesion, editarMaterial, eliminarMaterial, moverMaterial, obtenerCuestionarioCurso, listarParticipantesCurso, actualizarConstancia } from "@/app/actions/capacitaciones";
import type { CuestionarioDetalle, ParticipanteCurso } from "@/app/actions/capacitaciones";
import { CuestionarioModal } from "@/app/ui/capacitaciones/cuestionario-modal";
import { MaterialModal } from "@/app/ui/capacitaciones/MaterialModal";
import type { CursoDetalle } from "@/app/actions/capacitaciones";

const TIPOS_MATERIAL = [
  "Documento (PDF, Word, Excel)",
  "Presentación",
  "Video",
  "Enlace web",
  "Otro",
];

type FiltroEstado = "todos" | "PUBLICADO" | "BORRADOR" | "CERRADO";


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

function fmtDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
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

  const guardarTituloUnidad = () => {
    if (!tituloUnidad.trim()) return;
    startTransition(async () => {
      await editarSesion(sesion.id, { tituloUnidad });
      setEditandoUnidad(false);
      onRefresh();
    });
  };

  const handleEliminarUnidad = () => {
    if (!confirm(`¿Eliminar la unidad "${sesion.tituloUnidad}" y todos sus materiales?`)) return;
    startTransition(async () => {
      await eliminarSesion(sesion.id);
      onRefresh();
    });
  };

  const handleEliminarMaterial = (idMaterial: string, titulo: string) => {
    if (!confirm(`¿Eliminar el material "${titulo}"?`)) return;
    startTransition(async () => {
      await eliminarMaterial(idMaterial);
      onRefresh();
    });
  };

  return (
    <div className="border border-[var(--caritas-border)] rounded-lg">
      {/* Header */}
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
          <span className="text-sm font-semibold text-[var(--caritas-text)] flex-1 truncate">{sesion.tituloUnidad}</span>
        )}
        <span className="text-xs text-gray-400 bg-white border border-[var(--caritas-border)] px-2 py-0.5 rounded-full shrink-0">
          {sesion.materiales.length} material{sesion.materiales.length !== 1 ? "es" : ""}
        </span>
        {editandoUnidad ? (
          <>
            <button onClick={guardarTituloUnidad} disabled={pending} className="text-xs text-[var(--caritas-green)] font-medium hover:underline shrink-0">Guardar</button>
            <button onClick={() => { setEditandoUnidad(false); setTituloUnidad(sesion.tituloUnidad); }} className="text-xs text-gray-400 hover:text-gray-600 shrink-0">Cancelar</button>
          </>
        ) : (
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => setEditandoUnidad(true)} className="p-1 text-gray-400 hover:text-[var(--caritas-green)] rounded transition-colors">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={handleEliminarUnidad} disabled={pending} className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {expandida && (
        <div className="divide-y divide-gray-100">
          {sesion.materiales.length === 0 ? (
            <p className="text-xs text-gray-400 px-4 py-3 pl-11">Sin materiales en esta unidad.</p>
          ) : (
            sesion.materiales.map((m) => (
              <div key={m.id} className="relative flex items-center gap-3 px-4 py-2.5 pl-11 bg-white hover:bg-gray-50 transition-colors border-l-4 border-[var(--caritas-green)]/20">
                <FileText className="w-4 h-4 text-[var(--caritas-green)] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--caritas-text)] truncate">{m.titulo}</p>
                  {m.tipoMaterial && <p className="text-[11px] text-gray-400">{m.tipoMaterial}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {m.enlaceMaterial && (
                    <a href={m.enlaceMaterial} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-[var(--caritas-green)] hover:underline flex items-center gap-1">
                      <LinkIcon className="w-3 h-3" /> Ver
                    </a>
                  )}
                  {/* Menú ⋮ */}
                  <div className="relative">
                    <button
                      onClick={() => setMenuAbierto(menuAbierto === m.id ? null : m.id)}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                    {menuAbierto === m.id && (
                      <div className="absolute right-0 bottom-full mb-1 bg-white border border-[var(--caritas-border)] rounded-xl shadow-xl z-30 w-56 overflow-hidden">
                        {/* Editar */}
                        <button
                          onClick={() => { setMenuAbierto(null); onEditarMaterial({ id: m.id, titulo: m.titulo, tipoMaterial: m.tipoMaterial ?? TIPOS_MATERIAL[0], enlaceMaterial: m.enlaceMaterial ?? "" }); }}
                          className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5 text-gray-400" /> Editar
                        </button>
                        <div className="border-t border-gray-100 mx-2" />
                        <button
                          onClick={() => { setMenuAbierto(null); handleEliminarMaterial(m.id, m.titulo); }}
                          className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
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
            className="flex items-center gap-1.5 text-xs text-[var(--caritas-green)] px-4 py-2.5 pl-11 w-full hover:bg-gray-50 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Agregar material
          </button>
        </div>
      )}
    </div>
  );
}

export function EspecialistaCapacitaciones({ cursos }: { cursos: CursoDetalle[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [detalle, setDetalle] = useState<CursoDetalle | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<FiltroEstado>("todos");
  const [showSesion, setShowSesion] = useState(false);
  const [sesionTitulo, setSesionTitulo] = useState("");
  const [showCuestionario, setShowCuestionario] = useState(false);
  const [cuestionarioEditar, setCuestionarioEditar] = useState<CuestionarioDetalle | null>(null);
  const [tipoCuestionarioActivo, setTipoCuestionarioActivo] = useState<"INICIAL" | "FINAL">("FINAL");
  const [materialModal, setMaterialModal] = useState<{ idSesion: string; idCurso: string } | null>(null);
  const [editarMaterialModal, setEditarMaterialModal] = useState<{ id: string; titulo: string; tipoMaterial: string; enlaceMaterial: string } | null>(null);
  const [participantes, setParticipantes] = useState<ParticipanteCurso[]>([]);
  const [loadingParticipantes, setLoadingParticipantes] = useState(false);
  const [showParticipantes, setShowParticipantes] = useState(false);
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
  const ORDEN_ESTADO: Record<string, number> = { PUBLICADO: 0, BORRADOR: 1, CERRADO: 2 };

  const cursosFiltrados = useMemo(() => {
    return cursos
      .filter((c) => {
        const coincideBusqueda =
          busqueda === "" ||
          c.nombreCurso.toLowerCase().includes(busqueda.toLowerCase()) ||
          (c.codigoCurso ?? "").toLowerCase().includes(busqueda.toLowerCase());
        const coincideFiltro = filtro === "todos" || c.estadoCurso === filtro;
        return coincideBusqueda && coincideFiltro;
      })
      .sort((a, b) => (ORDEN_ESTADO[a.estadoCurso] ?? 99) - (ORDEN_ESTADO[b.estadoCurso] ?? 99));
  }, [cursos, busqueda, filtro]);

  const stats = useMemo(() => ({
    total: cursos.length,
    publicados: cursos.filter((c) => c.estadoCurso === "PUBLICADO").length,
    borradores: cursos.filter((c) => c.estadoCurso === "BORRADOR").length,
    cerrados: cursos.filter((c) => c.estadoCurso === "CERRADO").length,
  }), [cursos]);

  // ── Vista detalle ────────────────────────────────────────────────────────────
  if (detalle) {
    const curso = cursos.find((c) => c.id === detalle.id) ?? detalle;
    const estadoConf = ESTADO_CONFIG[curso.estadoCurso] ?? ESTADO_CONFIG.BORRADOR;

    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        {/* Back + header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setDetalle(null)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[var(--caritas-text)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Mis cursos
          </button>
        </div>

        <div className="bg-white border border-[var(--caritas-border)] rounded-xl p-6 mb-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {curso.codigoCurso && (
                  <span className="text-xs text-gray-400 font-mono bg-gray-100 px-2 py-0.5 rounded">
                    {curso.codigoCurso}
                  </span>
                )}
                <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-100">
                  Asincrónica
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${estadoConf.className}`}>
                  {estadoConf.icon} {estadoConf.label}
                </span>
              </div>
              <h1 className="text-xl font-bold text-[var(--caritas-text)] mb-2">{curso.nombreCurso}</h1>
              {curso.descripcion && (
                <p className="text-sm text-gray-600 mb-3">{curso.descripcion}</p>
              )}
              <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  {curso.totalInscritos} inscritos
                </span>
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  {curso.sesiones.length} unidades
                </span>
                {curso.fechaPublicacion && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Publicado: {fmtDate(curso.fechaPublicacion)}
                  </span>
                )}
                {curso.fechaCierre && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Cierre: {fmtDate(curso.fechaCierre)}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 shrink-0">
              {curso.estadoCurso === "BORRADOR" && (
                <button
                  onClick={() => run(() => cambiarEstadoCurso(curso.id, "PUBLICAR"), "Curso publicado.")}
                  disabled={pending}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm bg-[var(--caritas-green)] text-white rounded-lg disabled:opacity-50 hover:opacity-90 transition-opacity"
                >
                  <Send className="w-3.5 h-3.5" /> Publicar
                </button>
              )}
              {curso.estadoCurso === "PUBLICADO" && (
                <button
                  onClick={() => run(() => cambiarEstadoCurso(curso.id, "CERRAR"), "Curso cerrado.")}
                  disabled={pending}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm border border-[var(--caritas-border)] rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
                >
                  <Lock className="w-3.5 h-3.5" /> Cerrar inscripciones
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sessions */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-[var(--caritas-text)]">
            Contenido del curso
          </h2>
          <button
            onClick={() => setShowSesion(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[var(--caritas-green)] border border-[var(--caritas-green)]/30 rounded-lg hover:bg-[var(--caritas-green)]/5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Nueva unidad
          </button>
        </div>

        {curso.sesiones.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-3 border border-dashed border-gray-300 rounded-xl">
            <BookOpen className="w-8 h-8" />
            <p className="text-sm">Aún no hay unidades. Agrega la primera.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {curso.sesiones.map((s) => (
              <SesionCard
                key={s.id}
                sesion={s}
                todasLasSesiones={curso.sesiones}
                onAgregarMaterial={(idSesion) => {
                  setMaterialModal({ idSesion, idCurso: curso.id });
                }}
                onEditarMaterial={(m) => setEditarMaterialModal(m)}
                onRefresh={() => router.refresh()}
              />
            ))}
          </div>
        )}

        {/* Evaluaciones */}
        <div className="mt-5">
          <h2 className="text-base font-semibold text-[var(--caritas-text)] mb-3">Evaluaciones del Curso</h2>
          <div className="space-y-3">
            {/* Examen Inicial */}
            {curso.cuestionarioInicial ? (
              <div className="flex items-center justify-between gap-3 border border-amber-200 rounded-xl p-4 bg-amber-50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                    <ClipboardList className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-[var(--caritas-text)]">{curso.cuestionarioInicial.titulo}</p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 font-medium">INICIAL</span>
                    </div>
                    <p className="text-xs text-gray-400">{curso.cuestionarioInicial.totalPreguntas} preguntas · Nota mín: {curso.cuestionarioInicial.notaAprobatoria}/20</p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    const detalle = await obtenerCuestionarioPorId(curso.cuestionarioInicial!.id);
                    if (detalle) { setCuestionarioEditar(detalle); setTipoCuestionarioActivo("INICIAL"); setShowCuestionario(true); }
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

            {/* Examen Final */}
            {curso.cuestionarioFinal ? (
              <div className="flex items-center justify-between gap-3 border border-[var(--caritas-border)] rounded-xl p-4 bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[var(--caritas-green)]/10 flex items-center justify-center shrink-0">
                    <ClipboardList className="w-4 h-4 text-[var(--caritas-green)]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-[var(--caritas-text)]">{curso.cuestionarioFinal.titulo}</p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200 font-medium">FINAL</span>
                    </div>
                    <p className="text-xs text-gray-400">{curso.cuestionarioFinal.totalPreguntas} preguntas · Nota mín: {curso.cuestionarioFinal.notaAprobatoria}/20</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={async () => {
                      const detalle = await obtenerCuestionarioPorId(curso.cuestionarioFinal!.id);
                      if (detalle) { setCuestionarioEditar(detalle); setTipoCuestionarioActivo("FINAL"); setShowCuestionario(true); }
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs border border-[var(--caritas-border)] rounded-lg hover:bg-white transition-colors"
                  >
                    <BookOpen className="w-3 h-3" /> Editar
                  </button>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 font-medium">
                    ACTIVO
                  </span>
                </div>
              </div>
            ) : (
              <div
                onClick={() => { setTipoCuestionarioActivo("FINAL"); setCuestionarioEditar(null); setShowCuestionario(true); }}
                className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 gap-2 cursor-pointer hover:border-[var(--caritas-green)]/40 hover:bg-[var(--caritas-green)]/5 transition-colors"
              >
                <ClipboardList className="w-7 h-7" />
                <p className="text-sm">Crear examen final</p>
              </div>
            )}
          </div>
        </div>

        {/* Participantes */}
        <div className="mt-6">
          <button
            onClick={async () => {
              if (!showParticipantes) {
                setLoadingParticipantes(true);
                const data = await listarParticipantesCurso(curso.id);
                setParticipantes(data);
                setLoadingParticipantes(false);
              }
              setShowParticipantes((s) => !s);
            }}
            className="flex items-center gap-2 w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 border border-[var(--caritas-border)] rounded-xl transition-colors text-left"
          >
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-semibold text-[var(--caritas-text)] flex-1">
              Participantes inscritos
              <span className="ml-2 text-xs font-normal text-gray-400">({curso.totalInscritos})</span>
            </span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showParticipantes ? "" : "-rotate-90"}`} />
          </button>

          {showParticipantes && (
            <div className="mt-2 border border-[var(--caritas-border)] rounded-xl overflow-hidden">
              {loadingParticipantes ? (
                <p className="text-sm text-gray-400 p-4 text-center">Cargando...</p>
              ) : participantes.length === 0 ? (
                <p className="text-sm text-gray-400 p-4 text-center">Sin participantes inscritos.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-[var(--caritas-border)]">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Participante</th>
                      <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-500">Nota</th>
                      <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-500">Estado</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Constancia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {participantes.map((p) => (
                      <tr key={p.idInscripcion} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-[var(--caritas-text)]">{p.nombre}</p>
                          {p.documento && <p className="text-xs text-gray-400">{p.documento}</p>}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={`text-sm font-bold ${p.resultado === "APROBADO" ? "text-green-700" : p.nota != null ? "text-red-500" : "text-gray-400"}`}>
                            {p.nota != null ? `${p.nota.toFixed(1)}/20` : "—"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          {p.certificado ? (
                            <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-medium">
                              <CheckCircle2 className="w-3 h-3" /> Certificado
                            </span>
                          ) : p.resultado === "APROBADO" ? (
                            <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                              Aprobado
                            </span>
                          ) : p.nota != null ? (
                            <span className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full">
                              Desaprobado
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">Sin evaluar</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {p.certificado ? (
                            <div className="flex items-center gap-2">
                              {p.constanciaUrl ? (
                                <a href={p.constanciaUrl} target="_blank" rel="noopener noreferrer"
                                  className="text-xs text-[var(--caritas-green)] hover:underline flex items-center gap-1">
                                  <LinkIcon className="w-3 h-3" /> Ver constancia
                                </a>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <input
                                    value={constanciaInput[p.idInscripcion] ?? ""}
                                    onChange={(e) => setConstanciaInput((s) => ({ ...s, [p.idInscripcion]: e.target.value }))}
                                    placeholder="URL del PDF..."
                                    className="text-xs px-2 py-1 border border-[var(--caritas-border)] rounded w-40 focus:outline-none focus:ring-1 focus:ring-[var(--caritas-green)]"
                                  />
                                  <button
                                    disabled={!constanciaInput[p.idInscripcion]?.trim() || pending}
                                    onClick={() => startTransition(async () => {
                                      const res = await actualizarConstancia(p.idInscripcion, constanciaInput[p.idInscripcion] ?? "");
                                      if (res?.message) toast.error(res.message);
                                      else {
                                        toast.success("Constancia guardada.");
                                        const data = await listarParticipantesCurso(curso.id);
                                        setParticipantes(data);
                                        setConstanciaInput((s) => { const n = { ...s }; delete n[p.idInscripcion]; return n; });
                                      }
                                    })}
                                    className="text-xs px-2 py-1 bg-[var(--caritas-green)] text-white rounded disabled:opacity-40"
                                  >
                                    Guardar
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* Modal: Crear / Editar cuestionario */}
        {showCuestionario && (
          <CuestionarioModal
            idCurso={curso.id}
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
                Unidad {curso.sesiones.length + 1} · {curso.nombreCurso}
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
                      () => crearSesion(curso.id, { tituloUnidad: sesionTitulo }),
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
      </div>
    );
  }

  // ── Vista lista ──────────────────────────────────────────────────────────────
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
          {/* Stats — clickeables para filtrar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {[
              { label: "Total", value: stats.total, color: "text-[var(--caritas-text)]", bg: "bg-gray-50", key: "todos" as FiltroEstado, activeBorder: "border-gray-400" },
              { label: "Publicados", value: stats.publicados, color: "text-green-700", bg: "bg-green-50", key: "PUBLICADO" as FiltroEstado, activeBorder: "border-green-400" },
              { label: "Borradores", value: stats.borradores, color: "text-amber-700", bg: "bg-amber-50", key: "BORRADOR" as FiltroEstado, activeBorder: "border-amber-400" },
              { label: "Cerrados", value: stats.cerrados, color: "text-gray-500", bg: "bg-gray-100", key: "CERRADO" as FiltroEstado, activeBorder: "border-gray-400" },
            ].map((s) => (
              <button
                key={s.label}
                onClick={() => setFiltro(filtro === s.key ? "todos" : s.key)}
                className={`${s.bg} rounded-xl px-4 py-3 border-2 text-left transition-all hover:shadow-sm ${
                  filtro === s.key ? `${s.activeBorder} shadow-sm` : "border-transparent hover:border-gray-200"
                }`}
              >
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative mb-5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o código..."
              className="w-full pl-9 pr-3 py-2 border border-[var(--caritas-border)] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[var(--caritas-green)]"
            />
          </div>

          {/* Cards */}
          {cursosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
              <Search className="w-8 h-8" />
              <p className="text-sm">No se encontraron cursos con ese criterio.</p>
              <button onClick={() => { setBusqueda(""); setFiltro("todos"); }} className="text-xs text-[var(--caritas-green)] hover:underline mt-1">
                Limpiar filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {cursosFiltrados.map((c) => {
                const conf = ESTADO_CONFIG[c.estadoCurso] ?? ESTADO_CONFIG.BORRADOR;
                const esPublicado = c.estadoCurso === "PUBLICADO";
                const esBorrador = c.estadoCurso === "BORRADOR";
                const esCerrado = c.estadoCurso === "CERRADO";

                const cardStyle = esPublicado
                  ? "bg-white border-[var(--caritas-border)] hover:border-[var(--caritas-green)]/50 hover:shadow-md"
                  : esBorrador
                  ? "bg-amber-50/60 border-amber-200 border-dashed opacity-80 hover:opacity-100"
                  : "bg-gray-50 border-gray-200 opacity-50 hover:opacity-70";

                return (
                  <button
                    key={c.id}
                    onClick={() => setDetalle(c)}
                    className={`text-left border rounded-xl p-5 transition-all group ${cardStyle}`}
                  >
                    {/* Top row */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-xs text-gray-400 font-mono">{c.codigoCurso ?? "—"}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${conf.className}`}>
                        {conf.icon} {conf.label}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className={`text-sm font-semibold line-clamp-2 mb-3 transition-colors ${
                      esPublicado
                        ? "text-[var(--caritas-text)] group-hover:text-[var(--caritas-green)]"
                        : "text-gray-500"
                    }`}>
                      {c.nombreCurso}
                    </h3>

                    {/* Description */}
                    {c.descripcion && (
                      <p className="text-xs text-gray-400 line-clamp-2 mb-3">{c.descripcion}</p>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-200 mt-auto">
                      <div className="flex gap-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3" /> {c.sesiones.length} unidades
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" /> {c.totalInscritos}
                        </span>
                      </div>
                      {esBorrador && (
                        <span className="text-[10px] text-amber-600 font-medium">No visible para brigadistas</span>
                      )}
                      {esCerrado && (
                        <span className="text-[10px] text-gray-400 font-medium">Cerrado</span>
                      )}
                      {esPublicado && c.fechaCierre && (
                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Cierra {fmtDate(c.fechaCierre)}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
