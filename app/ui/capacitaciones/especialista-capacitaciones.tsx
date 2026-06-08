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
  Upload,
  Search,
  ArrowLeft,
  Users,
  Calendar,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  Archive,
} from "lucide-react";
import { toast } from "sonner";
import { cambiarEstadoCurso, crearSesion, agregarMaterial } from "@/app/actions/capacitaciones";
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
  onAgregarMaterial,
}: {
  sesion: CursoDetalle["sesiones"][number];
  onAgregarMaterial: (idSesion: string) => void;
}) {
  const [expandida, setExpandida] = useState(true);

  return (
    <div className="border border-[var(--caritas-border)] rounded-xl overflow-hidden">
      <button
        onClick={() => setExpandida(!expandida)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-full bg-[var(--caritas-green)]/10 text-[var(--caritas-green)] text-xs font-bold flex items-center justify-center shrink-0">
            {sesion.numeroOrden}
          </span>
          <span className="text-sm font-semibold text-[var(--caritas-text)]">{sesion.tituloUnidad}</span>
          <span className="text-xs text-gray-400 bg-white border border-[var(--caritas-border)] px-2 py-0.5 rounded-full">
            {sesion.materiales.length} material{sesion.materiales.length !== 1 ? "es" : ""}
          </span>
        </div>
        {expandida ? (
          <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
        )}
      </button>

      {expandida && (
        <div className="px-4 py-3 space-y-2">
          {sesion.materiales.length === 0 ? (
            <p className="text-xs text-gray-400 py-1">Sin materiales en esta sesión.</p>
          ) : (
            sesion.materiales.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <FileText className="w-4 h-4 text-[var(--caritas-green)] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--caritas-text)] truncate">{m.titulo}</p>
                  {m.tipoMaterial && (
                    <p className="text-[11px] text-gray-400">{m.tipoMaterial}</p>
                  )}
                </div>
                {m.enlaceMaterial && (
                  <a
                    href={m.enlaceMaterial}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[var(--caritas-green)] hover:underline shrink-0 flex items-center gap-1"
                  >
                    <LinkIcon className="w-3 h-3" /> Ver
                  </a>
                )}
              </div>
            ))
          )}
          <button
            onClick={() => onAgregarMaterial(sesion.id)}
            className="flex items-center gap-1.5 text-xs text-[var(--caritas-green)] border border-dashed border-[var(--caritas-green)]/40 rounded-lg px-3 py-2 w-full justify-center hover:bg-[var(--caritas-green)]/5 transition-colors mt-1"
          >
            <Plus className="w-3.5 h-3.5" /> Agregar Material
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
  const [materialModal, setMaterialModal] = useState<{ idSesion: string; idCurso: string } | null>(null);
  const [materialForm, setMaterialForm] = useState({
    titulo: "",
    tipoMaterial: TIPOS_MATERIAL[0],
    enlaceMaterial: "",
  });

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

    if (!limpio) return "Ingresa el título de la sesión.";
    if (limpio.length < 3) return "El título de la sesión debe tener al menos 3 caracteres.";

    return null;
  }

  function validarUrlOpcional(value: string): string | null {
    const limpio = value.trim();
    if (!limpio) return null;

    try {
      const url = new URL(limpio);
      if (!["http:", "https:"].includes(url.protocol)) {
        return "El enlace del material debe iniciar con http:// o https://.";
      }
      return null;
    } catch {
      return "El enlace del material no tiene un formato válido.";
    }
  }

  function validarMaterialForm(): string | null {
    const titulo = materialForm.titulo.trim();
    const tipo = materialForm.tipoMaterial.trim();

    if (!titulo) return "Ingresa el título del material.";
    if (titulo.length < 3) return "El título del material debe tener al menos 3 caracteres.";

    if (!tipo) return "Selecciona el tipo de material.";
    if (!TIPOS_MATERIAL.includes(tipo)) return "Selecciona un tipo de material válido.";

    const errorUrl = validarUrlOpcional(materialForm.enlaceMaterial);
    if (errorUrl) return errorUrl;

    return null;
  }

  function handleCrearSesion(idCurso: string) {
    const error = validarSesionTitulo(sesionTitulo);
    if (error) {
      toast.error(error);
      return;
    }

    run(
      () => crearSesion(idCurso, { tituloUnidad: sesionTitulo.trim() }),
      "Sesión creada.",
      () => {
        setShowSesion(false);
        setSesionTitulo("");
      }
    );
  }

  function handleAgregarMaterial() {
    if (!materialModal) return;

    const error = validarMaterialForm();
    if (error) {
      toast.error(error);
      return;
    }

    run(
      () =>
        agregarMaterial(materialModal.idCurso, materialModal.idSesion, {
          titulo: materialForm.titulo.trim(),
          tipoMaterial: materialForm.tipoMaterial.trim(),
          enlaceMaterial: materialForm.enlaceMaterial.trim(),
        }),
      "Material agregado.",
      () => {
        setMaterialModal(null);
        setMaterialForm({
          titulo: "",
          tipoMaterial: TIPOS_MATERIAL[0],
          enlaceMaterial: "",
        });
      }
    );
  }
  const cursosFiltrados = useMemo(() => {
    return cursos.filter((c) => {
      const coincideBusqueda =
        busqueda === "" ||
        c.nombreCurso.toLowerCase().includes(busqueda.toLowerCase()) ||
        (c.codigoCurso ?? "").toLowerCase().includes(busqueda.toLowerCase());
      const coincideFiltro = filtro === "todos" || c.estadoCurso === filtro;
      return coincideBusqueda && coincideFiltro;
    });
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
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
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
                onAgregarMaterial={(idSesion) => {
                  setMaterialForm({ titulo: "", tipoMaterial: TIPOS_MATERIAL[0], enlaceMaterial: "" });
                  setMaterialModal({ idSesion, idCurso: curso.id });
                }}
              />
            ))}
          </div>
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
                  disabled={pending || sesionTitulo.trim().length < 3}
                  onClick={() => handleCrearSesion(curso.id)}
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
          <Modal title="Agregar Material" onClose={() => setMaterialModal(null)}>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Tipo de material *</label>
                <select
                  value={materialForm.tipoMaterial}
                  onChange={(e) => setMaterialForm({ ...materialForm, tipoMaterial: e.target.value })}
                  className="w-full px-3 py-2 border border-[var(--caritas-border)] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[var(--caritas-green)]"
                >
                  {TIPOS_MATERIAL.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Título *</label>
                <input
                  value={materialForm.titulo}
                  onChange={(e) => setMaterialForm({ ...materialForm, titulo: e.target.value })}
                  placeholder="Ej. Presentación - Introducción GRD"
                  className="w-full px-3 py-2 border border-[var(--caritas-border)] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[var(--caritas-green)]"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Enlace al material</label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    value={materialForm.enlaceMaterial}
                    onChange={(e) => setMaterialForm({ ...materialForm, enlaceMaterial: e.target.value })}
                    placeholder="https://drive.google.com/..."
                    className="w-full pl-8 pr-3 py-2 border border-[var(--caritas-border)] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[var(--caritas-green)]"
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1">Google Drive, Dropbox u otro enlace externo.</p>
              </div>
              <div className="flex items-center gap-3 p-3 border border-dashed border-gray-300 rounded-lg bg-gray-50">
                <Upload className="w-5 h-5 text-gray-400 shrink-0" />
                <p className="text-xs text-gray-500">Subida directa de archivos disponible próximamente.</p>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setMaterialModal(null)}
                  className="px-4 py-2 text-sm border border-[var(--caritas-border)] rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  disabled={
                    pending ||
                    materialForm.titulo.trim().length < 3 ||
                    !materialForm.tipoMaterial.trim()
                  }
                  onClick={handleAgregarMaterial}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-[var(--caritas-green)] text-white rounded-lg disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" /> Agregar
                </button>
              </div>
            </div>
          </Modal>
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
                return (
                  <button
                    key={c.id}
                    onClick={() => setDetalle(c)}
                    className="text-left bg-white border border-[var(--caritas-border)] rounded-xl p-5 hover:border-[var(--caritas-green)]/50 hover:shadow-md transition-all group"
                  >
                    {/* Top row */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-xs text-gray-400 font-mono">{c.codigoCurso ?? "—"}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${conf.className}`}>
                        {conf.icon} {conf.label}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-sm font-semibold text-[var(--caritas-text)] line-clamp-2 mb-3 group-hover:text-[var(--caritas-green)] transition-colors">
                      {c.nombreCurso}
                    </h3>

                    {/* Description */}
                    {c.descripcion && (
                      <p className="text-xs text-gray-500 line-clamp-2 mb-3">{c.descripcion}</p>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-[var(--caritas-border)] mt-auto">
                      <div className="flex gap-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3" /> {c.sesiones.length} unidades
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" /> {c.totalInscritos}
                        </span>
                      </div>
                      {c.estadoCurso === "BORRADOR" && (
                        <span className="text-[10px] text-amber-600 font-medium">Pendiente de publicar</span>
                      )}
                      {c.fechaCierre && c.estadoCurso === "PUBLICADO" && (
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
