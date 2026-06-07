"use client";

import { useState, useTransition } from "react";
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
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  crearCurso,
  editarCurso,
  cambiarEstadoCurso,
  crearSesion,
} from "@/app/actions/capacitaciones";
import type { CursoDetalle } from "@/app/actions/capacitaciones";

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

  const current = cursos.find((c) => c.id === selectedId) ?? null;

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
            <p className="text-sm text-gray-500">Gestión de cursos y sesiones</p>
          </div>
        </div>
        <button
          onClick={() => setShowCrear(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--caritas-green)] text-white text-sm rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" /> Nuevo Curso
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5">
        {/* Course list */}
        <div className="space-y-2">
          {cursos.length === 0 && (
            <p className="text-sm text-gray-400 py-4 text-center">No hay cursos aún.</p>
          )}
          {cursos.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`w-full text-left p-4 border rounded-xl transition-all ${
                selectedId === c.id
                  ? "border-[var(--caritas-green)] bg-[var(--caritas-green)]/5 shadow-sm"
                  : "border-[var(--caritas-border)] hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs text-gray-400">{c.codigoCurso ?? "—"}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ESTADO_BADGE[c.estadoCurso] ?? "bg-gray-100"}`}>
                  {c.estadoCurso}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-sm font-medium text-[var(--caritas-text)]">
                <BookOpen className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="line-clamp-2">{c.nombreCurso}</span>
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                <span className="flex items-center gap-1"><Users className="w-3 h-3" />{c.totalInscritos}</span>
                <span>{c.sesiones.length} sesiones</span>
              </div>
            </button>
          ))}
        </div>

        {/* Course detail */}
        <div className="bg-white border border-[var(--caritas-border)] rounded-xl p-6 min-h-[400px]">
          {!current ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
              <BookOpen className="w-10 h-10" />
              <p className="text-sm">Selecciona un curso para ver el detalle</p>
            </div>
          ) : (
            <>
              {/* Course header */}
              <div className="flex items-start justify-between gap-4 mb-5">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-400 font-mono">{current.codigoCurso}</span>
                    <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                      Asincrónica
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_BADGE[current.estadoCurso]}`}>
                      {current.estadoCurso}
                    </span>
                  </div>
                  <h2 className="text-lg font-semibold text-[var(--caritas-text)]">{current.nombreCurso}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Responsable: {current.responsable}
                    {(current.fechaPublicacion || current.fechaCierre) && (
                      <span className="ml-3">
                        Fechas: {fmtDate(current.fechaPublicacion)} — {fmtDate(current.fechaCierre)}
                      </span>
                    )}
                  </p>
                  {current.descripcion && (
                    <p className="text-sm text-gray-600 mt-2">{current.descripcion}</p>
                  )}
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
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50 hover:bg-blue-700 transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" /> Publicar
                    </button>
                  )}
                  {current.estadoCurso === "PUBLICADO" && (
                    <button
                      onClick={() => run(() => cambiarEstadoCurso(current.id, "CERRAR"), "Curso cerrado.")}
                      disabled={pending}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-[var(--caritas-border)] rounded-lg disabled:opacity-50 hover:bg-gray-50"
                    >
                      <Lock className="w-3.5 h-3.5" /> Cerrar
                    </button>
                  )}
                </div>
              </div>

              {/* Sessions */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-[var(--caritas-text)]">
                    Sesiones del Curso
                  </h3>
                  <button
                    onClick={() => setShowSesion(true)}
                    className="flex items-center gap-1 text-xs text-[var(--caritas-green)] hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar sesión
                  </button>
                </div>
                {current.sesiones.length === 0 ? (
                  <p className="text-sm text-gray-400">Este curso no tiene sesiones aún.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {current.sesiones.map((s) => (
                      <div
                        key={s.id}
                        className="border border-[var(--caritas-border)] rounded-lg p-3 bg-gray-50"
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-xs font-semibold text-[var(--caritas-green)]">
                            S{s.numeroOrden}
                          </span>
                          <span className="text-sm font-medium text-[var(--caritas-text)]">
                            {s.tituloUnidad}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">
                          {s.materiales.length} material{s.materiales.length !== 1 ? "es" : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Participants */}
              <div className="flex items-center gap-2 pt-4 border-t border-[var(--caritas-border)]">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  Participantes — Total inscritos: <strong>{current.totalInscritos}</strong>
                </span>
                <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
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
                disabled={pending || !crearForm.nombreCurso.trim() || !crearForm.idResponsable}
                onClick={() =>
                  run(
                    () =>
                      crearCurso({
                        nombreCurso: crearForm.nombreCurso,
                        descripcion: crearForm.descripcion || undefined,
                        idResponsable: crearForm.idResponsable,
                      }),
                    "Curso creado.",
                    () => {
                      setShowCrear(false);
                      setCrearForm({ nombreCurso: "", descripcion: "", idResponsable: especialistas[0]?.id ?? "" });
                    }
                  )
                }
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
                disabled={pending || !editarForm.nombreCurso.trim() || !editarForm.idResponsable}
                onClick={() =>
                  run(
                    () =>
                      editarCurso(current.id, {
                        nombreCurso: editarForm.nombreCurso,
                        descripcion: editarForm.descripcion || undefined,
                        idResponsable: editarForm.idResponsable,
                      }),
                    "Cambios guardados.",
                    () => setShowEditar(false)
                  )
                }
                className="px-4 py-2 text-sm bg-[var(--caritas-green)] text-white rounded-lg disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Agregar sesión */}
      {showSesion && current && (
        <Modal title="Nueva Sesión" onClose={() => { setShowSesion(false); setSesionTitulo(""); }}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tema de la sesión *</label>
              <input
                value={sesionTitulo}
                onChange={(e) => setSesionTitulo(e.target.value)}
                placeholder="Ej. Introducción al GRD"
                className="w-full px-3 py-2 border border-[var(--caritas-border)] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[var(--caritas-green)]"
                autoFocus
              />
            </div>
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <FileText className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500">
                Sesión S{(current.sesiones.length + 1)} · Curso: {current.nombreCurso}
              </span>
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
                    "Sesión creada.",
                    () => { setShowSesion(false); setSesionTitulo(""); }
                  )
                }
                className="px-4 py-2 text-sm bg-[var(--caritas-green)] text-white rounded-lg disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                Agregar Sesión
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
