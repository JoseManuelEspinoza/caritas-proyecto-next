"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  Plus,
  BookOpen,
  Send,
  Lock,
  Pencil,
  Users,
  ChevronRight,
  FileText,
  Link as LinkIcon,
  X,
  ClipboardList,
  Search,
  EyeOff,
  Archive,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  Trash2,
  MoreVertical,
} from "lucide-react";
import { CuestionarioModal } from "@/app/ui/capacitaciones/cuestionario-modal";
import { toast } from "sonner";
import {
  crearCurso,
  editarCurso,
  cambiarEstadoCurso,
  crearSesion,
  editarSesion,
  eliminarSesion,
  agregarMaterial,
  editarMaterial,
  eliminarMaterial,
  obtenerCuestionarioCurso,
  listarParticipantesCurso,
} from "@/app/actions/capacitaciones";
import type { CuestionarioDetalle, ParticipanteCurso } from "@/app/actions/capacitaciones";
import type { CursoDetalle } from "@/app/actions/capacitaciones";
import { MaterialModal } from "@/app/ui/capacitaciones/MaterialModal";

type Especialista = { id: string; nombre: string };

const ESTADO_BADGE: Record<string, string> = {
  BORRADOR: "bg-gray-100 text-gray-600",
  PUBLICADO: "bg-green-50 text-green-700 border border-green-200",
  CERRADO: "bg-gray-200 text-gray-500",
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return iso.slice(0, 10);
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--caritas-border)]">
          <h2 className="text-base font-semibold text-[var(--caritas-text)]">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
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

  const baseStyle = isSelected
    ? "border-[var(--caritas-green)] bg-[var(--caritas-green)]/5 shadow-sm"
    : esPublicado
    ? "border-[var(--caritas-border)] bg-white hover:border-[var(--caritas-green)]/40 hover:shadow-sm"
    : esBorrador
    ? "border-amber-200 border-dashed bg-amber-50/60 opacity-80 hover:opacity-100"
    : "border-gray-200 bg-gray-50 opacity-50 hover:opacity-70";

  return (
    <button
      onClick={() => onSelect(c.id)}
      className={`w-full text-left p-4 border rounded-xl transition-all ${baseStyle}`}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-xs text-gray-400">{c.codigoCurso ?? "—"}</span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ESTADO_BADGE[c.estadoCurso] ?? "bg-gray-100"}`}>
          {c.estadoCurso}
        </span>
      </div>
      <div className={`flex items-center gap-1.5 text-sm font-medium ${esPublicado ? "text-[var(--caritas-text)]" : "text-gray-500"}`}>
        <BookOpen className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        <span className="line-clamp-2">{c.nombreCurso}</span>
      </div>
      <div className="flex items-center justify-between mt-2">
        <div className="flex gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{c.totalInscritos}</span>
          <span>{c.sesiones.length} unidades</span>
        </div>
        {esBorrador && !isSelected && (
          <span className="text-[10px] text-amber-600 font-medium">No visible</span>
        )}
      </div>
    </button>
  );
}

const TIPOS_MATERIAL = [
  "Documento (PDF, Word, Excel)",
  "Presentación",
  "Video",
  "Enlace web",
  "Otro",
];

type SesionItem = CursoDetalle["sesiones"][number];

function UnidadRow({
  sesion,
  idCurso,
  todasLasSesiones,
  onRefresh,
}: {
  sesion: SesionItem;
  idCurso: string;
  todasLasSesiones: SesionItem[];
  onRefresh: () => void;
}) {
  const [expandida, setExpandida] = useState(true);
  const [editandoUnidad, setEditandoUnidad] = useState(false);
  const [tituloUnidad, setTituloUnidad] = useState(sesion.tituloUnidad);
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [menuMaterial, setMenuMaterial] = useState<string | null>(null);
  const [editandoMaterial, setEditandoMaterial] = useState<{ id: string; titulo: string; tipoMaterial: string; enlaceMaterial: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const guardarTituloUnidad = () => {
    if (!tituloUnidad.trim()) return;
    startTransition(async () => {
      const res = await editarSesion(sesion.id, { tituloUnidad: tituloUnidad });
      if (res?.message) toast.error(res.message);
      else { toast.success("Unidad actualizada."); setEditandoUnidad(false); onRefresh(); }
    });
  };

  const borrarUnidad = () => {
    if (!confirm(`¿Eliminar la unidad "${sesion.tituloUnidad}" y todos sus materiales?`)) return;
    startTransition(async () => {
      const res = await eliminarSesion(sesion.id);
      if (res?.message) toast.error(res.message);
      else { toast.success("Unidad eliminada."); onRefresh(); }
    });
  };

  const abrirEditarMaterial = (m: SesionItem["materiales"][number]) => {
    setMenuMaterial(null);
    setEditandoMaterial({ id: m.id, titulo: m.titulo, tipoMaterial: m.tipoMaterial ?? TIPOS_MATERIAL[0], enlaceMaterial: m.enlaceMaterial ?? "" });
  };

  const borrarMaterial = (idMaterial: string, nombre: string) => {
    if (!confirm(`¿Eliminar el material "${nombre}"?`)) return;
    setMenuMaterial(null);
    startTransition(async () => {
      const res = await eliminarMaterial(idMaterial);
      if (res?.message) toast.error(res.message);
      else { toast.success("Material eliminado."); onRefresh(); }
    });
  };

  const otrasUnidades = todasLasSesiones.filter((s) => s.id !== sesion.id);

  return (
    <div className="border border-[var(--caritas-border)] rounded-lg">
      {/* Header de la unidad */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border-l-4 border-[var(--caritas-green)]">
        <button
          onClick={() => setExpandida(!expandida)}
          className="flex items-center gap-2 flex-1 text-left min-w-0"
        >
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${expandida ? "" : "-rotate-90"}`} />
          {editandoUnidad ? (
            <input
              value={tituloUnidad}
              onChange={(e) => setTituloUnidad(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === "Enter") guardarTituloUnidad();
                if (e.key === "Escape") { setEditandoUnidad(false); setTituloUnidad(sesion.tituloUnidad); }
              }}
              autoFocus
              className="flex-1 text-sm font-semibold text-[var(--caritas-text)] bg-white border border-[var(--caritas-green)] rounded px-2 py-0.5 focus:outline-none"
            />
          ) : (
            <span className="text-sm font-semibold text-[var(--caritas-text)] flex-1 truncate">{sesion.tituloUnidad}</span>
          )}
        </button>
        <span className="text-xs text-gray-400 bg-white border border-[var(--caritas-border)] px-2 py-0.5 rounded-full shrink-0">
          {sesion.materiales.length} material{sesion.materiales.length !== 1 ? "es" : ""}
        </span>
        {editandoUnidad ? (
          <>
            <button onClick={guardarTituloUnidad} disabled={pending} className="text-xs text-[var(--caritas-green)] hover:underline px-1 shrink-0">Guardar</button>
            <button onClick={() => { setEditandoUnidad(false); setTituloUnidad(sesion.tituloUnidad); }} className="text-xs text-gray-400 hover:text-gray-600 px-1 shrink-0">Cancelar</button>
          </>
        ) : (
          <>
            <button onClick={() => setShowMaterialForm((s) => !s)} title="Agregar material" className="p-1 text-gray-400 hover:text-[var(--caritas-green)] transition-colors shrink-0">
              <Plus className="w-4 h-4" />
            </button>
            <button onClick={() => setEditandoUnidad(true)} title="Editar nombre" className="p-1 text-gray-400 hover:text-[var(--caritas-green)] transition-colors shrink-0">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={borrarUnidad} disabled={pending} title="Eliminar unidad" className="p-1 text-gray-400 hover:text-red-500 transition-colors shrink-0">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>

      {/* Modal: Agregar material */}
      {showMaterialForm && (
        <MaterialModal
          onClose={() => setShowMaterialForm(false)}
          loading={pending}
          onConfirm={async (data) => {
            startTransition(async () => {
              const res = await agregarMaterial(idCurso, sesion.id, data);
              if (res?.message) toast.error(res.message);
              else { toast.success("Material agregado."); setShowMaterialForm(false); onRefresh(); }
            });
          }}
        />
      )}

      {/* Materiales */}
      {expandida && (
        <div className="divide-y divide-gray-100">
          {sesion.materiales.length === 0 && !showMaterialForm ? (
            <p className="text-xs text-gray-400 px-4 py-3 pl-11">Sin materiales en esta unidad.</p>
          ) : (
            sesion.materiales.map((m) => (
              <div key={m.id} className="border-l-4 border-[var(--caritas-green)]/20">
                <div className="flex items-center gap-3 px-4 py-2.5 pl-11 bg-white hover:bg-gray-50 transition-colors">
                  <FileText className="w-4 h-4 text-[var(--caritas-green)] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--caritas-text)] truncate">{m.titulo}</p>
                    {m.tipoMaterial && <p className="text-[11px] text-gray-400">{m.tipoMaterial}</p>}
                  </div>
                  {m.enlaceMaterial && (
                    <a href={m.enlaceMaterial} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-[var(--caritas-green)] hover:underline shrink-0 flex items-center gap-1">
                      <LinkIcon className="w-3 h-3" /> Ver
                    </a>
                  )}
                  {/* Menú ⋮ */}
                  <div className="relative shrink-0">
                    <button
                      onClick={() => setMenuMaterial(menuMaterial === m.id ? null : m.id)}
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors rounded"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {menuMaterial === m.id && (
                      <div className="absolute right-0 bottom-full mb-1 z-30 bg-white border border-[var(--caritas-border)] rounded-lg shadow-lg py-1 w-36">
                        <button
                          onClick={() => abrirEditarMaterial(m)}
                          className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[var(--caritas-text)] hover:bg-gray-50 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5 text-gray-400" /> Editar
                        </button>
                        <div className="border-t border-gray-100 my-1" />
                        <button
                          onClick={() => borrarMaterial(m.id, m.titulo)}
                          disabled={pending}
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
        </div>
      )}

      {/* Modal: Editar material */}
      {editandoMaterial && (
        <MaterialModal
          title="Editar Material"
          inicial={editandoMaterial}
          onClose={() => setEditandoMaterial(null)}
          loading={pending}
          onConfirm={async (data) => {
            startTransition(async () => {
              const res = await editarMaterial(editandoMaterial.id, data);
              if (res?.message) toast.error(res.message);
              else { toast.success("Material actualizado."); setEditandoMaterial(null); onRefresh(); }
            });
          }}
        />
      )}
    </div>
  );
}

export function AdminCapacitaciones({
  cursos,
  especialistas,
}: {
  cursos: CursoDetalle[];
  especialistas: Especialista[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(cursos[0]?.id ?? null);

  const [showCrear, setShowCrear] = useState(false);
  const [showEditar, setShowEditar] = useState(false);
  const [showSesion, setShowSesion] = useState(false);
  const [showCuestionario, setShowCuestionario] = useState(false);
  const [tipoCuestionarioActivo, setTipoCuestionarioActivo] = useState<"INICIAL" | "FINAL">("FINAL");
  const [cuestionarioEditar, setCuestionarioEditar] = useState<CuestionarioDetalle | null>(null);
  const [showConfirmCerrar, setShowConfirmCerrar] = useState(false);

  const [crearForm, setCrearForm] = useState({
    nombreCurso: "",
    descripcion: "",
    idResponsable: especialistas[0]?.id ?? "",
  });
  const [editarForm, setEditarForm] = useState({
    nombreCurso: "",
    descripcion: "",
    idResponsable: "",
  });
  const [sesionTitulo, setSesionTitulo] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [showBorradores, setShowBorradores] = useState(false);
  const [showCerrados, setShowCerrados] = useState(false);
  const [panelAbierto, setPanelAbierto] = useState(true);
  const [showParticipantes, setShowParticipantes] = useState(false);
  const [participantes, setParticipantes] = useState<ParticipanteCurso[]>([]);
  const [loadingParticipantes, setLoadingParticipantes] = useState(false);

  const cursosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return cursos;
    const q = busqueda.toLowerCase();
    const resultado = cursos.filter((c) =>
      c.nombreCurso.toLowerCase().includes(q) ||
      (c.codigoCurso ?? "").toLowerCase().includes(q)
    );
    // Al buscar, expandir secciones que tengan resultados
    if (resultado.some((c) => c.estadoCurso === "BORRADOR")) setShowBorradores(true);
    if (resultado.some((c) => c.estadoCurso === "CERRADO")) setShowCerrados(true);
    return resultado;
  }, [cursos, busqueda]);

  const publicados = cursosFiltrados.filter((c) => c.estadoCurso === "PUBLICADO");
  const borradores = cursosFiltrados.filter((c) => c.estadoCurso === "BORRADOR");
  const cerrados  = cursosFiltrados.filter((c) => c.estadoCurso === "CERRADO");

  const current = cursos.find((c) => c.id === selectedId) ?? null;

  const handleSelectCurso = (id: string) => {
    setSelectedId(id);
    setShowParticipantes(false);
    setParticipantes([]);
  };

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
  function validarCursoForm(form: {
    nombreCurso: string;
    descripcion?: string;
    idResponsable: string;
  }): string | null {
    const nombre = form.nombreCurso.trim();
    const descripcion = form.descripcion?.trim() ?? "";

    if (!nombre) return "Ingresa el nombre del curso.";
    if (nombre.length < 3) return "El nombre del curso debe tener al menos 3 caracteres.";

    if (!form.idResponsable.trim()) return "Selecciona el responsable del curso.";

    if (descripcion && descripcion.length < 5) {
      return "La descripción del curso debe tener al menos 5 caracteres si se ingresa.";
    }

    return null;
  }

  function validarSesionTitulo(titulo: string): string | null {
    const limpio = titulo.trim();

    if (!limpio) return "Ingresa el título de la sesión.";
    if (limpio.length < 3) return "El título de la sesión debe tener al menos 3 caracteres.";

    return null;
  }

  function handleCrearCurso() {
    const error = validarCursoForm(crearForm);
    if (error) {
      toast.error(error);
      return;
    }

    run(
      () =>
        crearCurso({
          nombreCurso: crearForm.nombreCurso.trim(),
          descripcion: crearForm.descripcion.trim() || undefined,
          idResponsable: crearForm.idResponsable,
        }),
      "Curso creado.",
      () => {
        setShowCrear(false);
        setCrearForm({
          nombreCurso: "",
          descripcion: "",
          idResponsable: especialistas[0]?.id ?? "",
        });
      }
    );
  }

  function handleEditarCurso() {
    if (!current) return;

    const error = validarCursoForm(editarForm);
    if (error) {
      toast.error(error);
      return;
    }

    run(
      () =>
        editarCurso(current.id, {
          nombreCurso: editarForm.nombreCurso.trim(),
          descripcion: editarForm.descripcion.trim() || undefined,
          idResponsable: editarForm.idResponsable,
        }),
      "Curso actualizado.",
      () => {
        setShowEditar(false);
      }
    );
  }

  function handleCrearSesion() {
    if (!current) return;

    const error = validarSesionTitulo(sesionTitulo);
    if (error) {
      toast.error(error);
      return;
    }

    run(
      () => crearSesion(current.id, { tituloUnidad: sesionTitulo.trim() }),
      "Sesión creada.",
      () => {
        setShowSesion(false);
        setSesionTitulo("");
      }
    );
  }
  const abrirEditar = () => {
    if (!current) return;
    const responsableValido = especialistas.some((e) => e.id === current.idResponsable);
    setEditarForm({
      nombreCurso: current.nombreCurso,
      descripcion: current.descripcion ?? "",
      idResponsable: responsableValido ? current.idResponsable : (especialistas[0]?.id ?? ""),
    });
    setShowEditar(true);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[var(--caritas-green)]/10 rounded-lg flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-[var(--caritas-green)]" />
          </div>
          <div>
            <h1 className="text-[var(--caritas-text)] font-semibold text-lg">Formación y Certificación</h1>
            <p className="text-sm text-gray-500">Gestión de cursos y unidades</p>
          </div>
        </div>
        <button
          onClick={() => setShowCrear(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--caritas-green)] text-white text-sm rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" /> Nuevo Curso
        </button>
      </div>

      <div className={`grid grid-cols-1 gap-5 ${panelAbierto ? "lg:grid-cols-[300px_1fr]" : ""}`}>
        {/* Course list */}
        {panelAbierto && (
          <div className="flex flex-col gap-3 h-[calc(100vh-180px)]">
            {/* Header del panel con botón toggle */}
            <div className="flex items-center justify-between shrink-0">
              <button
                onClick={() => setPanelAbierto(false)}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors ml-auto"
                title="Colapsar panel"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>
            {/* Buscador — fijo arriba */}
            <div className="relative shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar curso..."
                className="w-full pl-9 pr-3 py-2 border border-[var(--caritas-border)] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[var(--caritas-green)]"
              />
            </div>
            {/* Lista con scroll propio */}
            <div className="overflow-y-auto flex-1 space-y-3 pr-1">
            {cursosFiltrados.length === 0 && (
              <p className="text-sm text-gray-400 py-4 text-center">Sin resultados.</p>
            )}

            {/* Sección: Publicados */}
            {publicados.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">
                  Activos ({publicados.length})
                </p>
                {publicados.map((c) => (
                  <CursoCard key={c.id} c={c} selectedId={selectedId} onSelect={handleSelectCurso} />
                ))}
              </div>
            )}

            {/* Sección: Borradores (colapsable) */}
            {borradores.length > 0 && (
              <div className="space-y-2">
                <button
                  onClick={() => setShowBorradores((s) => !s)}
                  className="flex items-center justify-between w-full px-1 group"
                >
                  <div className="flex items-center gap-1.5">
                    <EyeOff className="w-3 h-3 text-gray-400" />
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      No visibles para brigadistas ({borradores.length})
                    </p>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showBorradores ? "rotate-180" : ""}`} />
                </button>
                {showBorradores && borradores.map((c) => (
                  <CursoCard key={c.id} c={c} selectedId={selectedId} onSelect={handleSelectCurso} />
                ))}
              </div>
            )}

            {/* Sección: Cerrados (colapsable) */}
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

        {/* Course detail */}
        <div className="bg-white border border-[var(--caritas-border)] rounded-xl p-6 min-h-[400px]">
          {/* Botón toggle — siempre visible arriba del detalle */}
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
              {/* Course header — card estilo especialista */}
              <div className="border border-[var(--caritas-border)] rounded-xl p-4 mb-5 bg-white">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="text-xs text-gray-400 font-mono">{current.codigoCurso}</span>
                      <span className="text-xs bg-purple-50 text-purple-700 border border-purple-100 px-2 py-0.5 rounded-full">Asincrónica</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_BADGE[current.estadoCurso]}`}>
                        {current.estadoCurso}
                      </span>
                    </div>
                    <h2 className="text-lg font-semibold text-[var(--caritas-text)]">{current.nombreCurso}</h2>
                    <p className="text-sm text-gray-500 mt-0.5">Responsable: {current.responsable}</p>
                    {current.descripcion && (
                      <p className="text-sm text-gray-500 mt-1">{current.descripcion}</p>
                    )}
                    {/* Stats */}
                    <div className="flex items-center gap-4 mt-2.5 text-sm text-gray-500">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-gray-400" />
                        {current.totalInscritos} inscritos
                      </span>
                      <span className="flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-gray-400" />
                        {current.sesiones.length} unidades
                      </span>
                      {current.fechaPublicacion && (
                        <span className="text-xs text-gray-400">
                          Publicado: {fmtDate(current.fechaPublicacion)}
                          {current.fechaCierre && <> · Cerrado: {fmtDate(current.fechaCierre)}</>}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={abrirEditar}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-[var(--caritas-border)] rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Editar
                    </button>
                    {current.estadoCurso === "BORRADOR" && (
                      <button
                        onClick={() => run(() => cambiarEstadoCurso(current.id, "PUBLICAR"), "Curso publicado.")}
                        disabled={pending}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[var(--caritas-green)] text-white rounded-lg disabled:opacity-50 hover:opacity-90 transition-opacity"
                      >
                        <Send className="w-3.5 h-3.5" /> Publicar
                      </button>
                    )}
                    {current.estadoCurso === "PUBLICADO" && (
                      <button
                        onClick={() => setShowConfirmCerrar(true)}
                        disabled={pending}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-[var(--caritas-border)] rounded-lg disabled:opacity-50 hover:bg-gray-50"
                      >
                        <Lock className="w-3.5 h-3.5" /> Cerrar inscripciones
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Contenido del curso */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-[var(--caritas-text)]">Contenido del curso</h3>
                  <button
                    onClick={() => { setSesionTitulo(""); setShowSesion(true); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[var(--caritas-border)] rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Nueva unidad
                  </button>
                </div>
                {current.sesiones.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl py-10 text-gray-400">
                    <BookOpen className="w-8 h-8" />
                    <p className="text-sm">Aún no hay unidades. Agrega la primera.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {current.sesiones.map((s) => (
                      <UnidadRow key={s.id} sesion={s} idCurso={current.id} todasLasSesiones={current.sesiones} onRefresh={() => router.refresh()} />
                    ))}
                  </div>
                )}
              </div>

              {/* Cuestionario Final */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-[var(--caritas-text)]">Cuestionario Final</h3>
                  {!current.cuestionario && (
                    <button
                      onClick={() => {
                        setTipoCuestionarioActivo("FINAL");
                        setShowCuestionario(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[var(--caritas-border)] rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Pencil className="w-3 h-3" /> Editar
                    </button>
                  )}
                </div>
                {current.cuestionario ? (
                  <div className="flex items-center justify-between gap-3 border border-[var(--caritas-border)] rounded-xl p-4 bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[var(--caritas-green)]/10 flex items-center justify-center shrink-0">
                        <ClipboardList className="w-5 h-5 text-[var(--caritas-green)]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--caritas-text)]">
                          {current.cuestionario.titulo}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {current.cuestionario.totalPreguntas} preguntas · Nota mín: {current.cuestionario.notaAprobatoria}/20
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={async () => {
                          const detalle = await obtenerCuestionarioCurso(current.id);
                          if (detalle) {
                            setTipoCuestionarioActivo("FINAL");
                            setCuestionarioEditar(detalle);
                            setShowCuestionario(true);
                          }
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[var(--caritas-border)] rounded-lg hover:bg-white transition-colors"
                      >
                        <Pencil className="w-3 h-3" /> Editar
                      </button>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 font-medium">ACTIVO</span>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowCuestionario(true)}
                    className="w-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl py-10 text-gray-400 hover:border-[var(--caritas-green)]/40 hover:text-[var(--caritas-green)] transition-colors"
                  >
                    <ClipboardList className="w-8 h-8" />
                    <p className="text-sm">Aún no hay cuestionario. Haz clic para crear uno.</p>
                  </button>
                )}
              </div>

              {/* Participantes */}
              <div className="pt-4 border-t border-[var(--caritas-border)]">
                <button
                  onClick={async () => {
                    if (!showParticipantes) {
                      setLoadingParticipantes(true);
                      const data = await listarParticipantesCurso(current.id);
                      setParticipantes(data);
                      setLoadingParticipantes(false);
                    }
                    setShowParticipantes((s) => !s);
                  }}
                  className="flex items-center gap-2 w-full text-left"
                >
                  <Users className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-600 flex-1">
                    Participantes — Total inscritos: <strong>{current.totalInscritos}</strong>
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showParticipantes ? "" : "-rotate-90"}`} />
                </button>
                {showParticipantes && (
                  <div className="mt-3">
                    {loadingParticipantes ? (
                      <p className="text-xs text-gray-400 py-4 text-center">Cargando...</p>
                    ) : participantes.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 py-8 text-gray-400 border border-dashed border-gray-200 rounded-xl">
                        <Users className="w-7 h-7" />
                        <p className="text-sm">Ningún brigadista inscrito aún.</p>
                      </div>
                    ) : (
                      <div className="border border-[var(--caritas-border)] rounded-xl overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 text-xs text-gray-500">
                            <tr>
                              <th className="text-left px-4 py-2.5 font-medium">Participante</th>
                              <th className="text-left px-4 py-2.5 font-medium">Nota</th>
                              <th className="text-left px-4 py-2.5 font-medium">Estado</th>
                              <th className="text-left px-4 py-2.5 font-medium">Constancia</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {participantes.map((p) => (
                              <tr key={p.idInscripcion} className="hover:bg-gray-50">
                                <td className="px-4 py-2.5 font-medium text-[var(--caritas-text)]">{p.nombre}</td>
                                <td className="px-4 py-2.5 text-gray-600">{p.nota != null ? `${p.nota}/20` : "—"}</td>
                                <td className="px-4 py-2.5">
                                  {p.certificado ? (
                                    <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">Certificado</span>
                                  ) : p.resultado === "APROBADO" ? (
                                    <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">Aprobado</span>
                                  ) : p.resultado === "DESAPROBADO" ? (
                                    <span className="text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full">Desaprobado</span>
                                  ) : (
                                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Sin evaluar</span>
                                  )}
                                </td>
                                <td className="px-4 py-2.5">
                                  {p.constanciaUrl ? (
                                    <a href={p.constanciaUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--caritas-green)] hover:underline">
                                      Ver constancia
                                    </a>
                                  ) : (
                                    <span className="text-xs text-gray-400">—</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal: Crear curso */}
      {showCrear && (
        <Modal title="Crear Nuevo Curso" onClose={() => setShowCrear(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nombre del curso *</label>
              <input
                value={crearForm.nombreCurso}
                onChange={(e) => setCrearForm({ ...crearForm, nombreCurso: e.target.value })}
                placeholder="Ej. Plan de Seguridad Parroquial"
                className="w-full px-3 py-2 border border-[var(--caritas-border)] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[var(--caritas-green)]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Modalidad</label>
                <div className="px-3 py-2 border border-[var(--caritas-border)] rounded-lg text-sm bg-gray-50 text-gray-500">
                  Asincrónica
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Responsable *</label>
                <select
                  value={crearForm.idResponsable}
                  onChange={(e) => setCrearForm({ ...crearForm, idResponsable: e.target.value })}
                  className="w-full px-3 py-2 border border-[var(--caritas-border)] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[var(--caritas-green)]"
                >
                  {especialistas.length === 0 && (
                    <option value="">Sin especialistas</option>
                  )}
                  {especialistas.map((e) => (
                    <option key={e.id} value={e.id}>{e.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Descripción</label>
              <textarea
                value={crearForm.descripcion}
                onChange={(e) => setCrearForm({ ...crearForm, descripcion: e.target.value })}
                placeholder="Objetivos y descripción del curso..."
                rows={3}
                className="w-full px-3 py-2 border border-[var(--caritas-border)] rounded-lg text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[var(--caritas-green)]"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setShowCrear(false)}
                className="px-4 py-2 text-sm border border-[var(--caritas-border)] rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                disabled={
                  pending ||
                  crearForm.nombreCurso.trim().length < 3 ||
                  !crearForm.idResponsable.trim() ||
                  (!!crearForm.descripcion.trim() && crearForm.descripcion.trim().length < 5)
                }
                onClick={handleCrearCurso}
                className="px-4 py-2 text-sm bg-[var(--caritas-green)] text-white rounded-lg disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                Crear Curso
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Editar curso */}
      {showEditar && current && (
        <Modal title="Editar Curso" onClose={() => setShowEditar(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nombre del curso *</label>
              <input
                value={editarForm.nombreCurso}
                onChange={(e) => setEditarForm({ ...editarForm, nombreCurso: e.target.value })}
                className="w-full px-3 py-2 border border-[var(--caritas-border)] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[var(--caritas-green)]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Modalidad</label>
                <div className="px-3 py-2 border border-[var(--caritas-border)] rounded-lg text-sm bg-gray-50 text-gray-500">
                  Asincrónica
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Responsable *</label>
                <select
                  value={editarForm.idResponsable}
                  onChange={(e) => setEditarForm({ ...editarForm, idResponsable: e.target.value })}
                  className="w-full px-3 py-2 border border-[var(--caritas-border)] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[var(--caritas-green)]"
                >
                  {especialistas.map((e) => (
                    <option key={e.id} value={e.id}>{e.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Descripción</label>
              <textarea
                value={editarForm.descripcion}
                onChange={(e) => setEditarForm({ ...editarForm, descripcion: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-[var(--caritas-border)] rounded-lg text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[var(--caritas-green)]"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setShowEditar(false)}
                className="px-4 py-2 text-sm border border-[var(--caritas-border)] rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                disabled={
                  pending ||
                  editarForm.nombreCurso.trim().length < 3 ||
                  !editarForm.idResponsable ||
                  (!!editarForm.descripcion.trim() && editarForm.descripcion.trim().length < 5)
                }
                onClick={handleEditarCurso}
                className="px-4 py-2 text-sm bg-[var(--caritas-green)] text-white rounded-lg disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Crear / Editar cuestionario */}
      {showCuestionario && current && (
        <CuestionarioModal
          idCurso={current.id}
          idCuestionario={cuestionarioEditar?.id}
          tipoPredefinido={tipoCuestionarioActivo}
          inicial={cuestionarioEditar ?? undefined}
          onClose={() => { setShowCuestionario(false); setCuestionarioEditar(null); }}
        />
      )}

      {/* Modal: Agregar unidad */}
      {showSesion && current && (
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
                className="px-4 py-2 text-sm bg-[var(--caritas-green)] text-white rounded-lg disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                Agregar Unidad
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Confirmar cierre de curso */}
      {showConfirmCerrar && current && (
        <Modal title="Cerrar curso" onClose={() => setShowConfirmCerrar(false)}>
          <div className="space-y-4">
            <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">Esta acción es permanente</p>
                <p className="text-sm text-amber-700 mt-0.5">
                  Los brigadistas ya no podrán inscribirse ni acceder al curso. El curso pasará al archivo.
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              ¿Confirmas que deseas cerrar el curso <strong>"{current.nombreCurso}"</strong>?
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setShowConfirmCerrar(false)}
                className="px-4 py-2 text-sm border border-[var(--caritas-border)] rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                disabled={pending}
                onClick={() => {
                  setShowConfirmCerrar(false);
                  run(() => cambiarEstadoCurso(current.id, "CERRAR"), "Curso cerrado.");
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                <Lock className="w-3.5 h-3.5" /> Sí, cerrar curso
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
