"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Plus, BookOpen, Send, Lock, UserPlus, Award } from "lucide-react";
import { toast } from "sonner";
import {
  crearCurso,
  cambiarEstadoCurso,
  inscribirParticipante,
  registrarEvaluacion,
  certificarParticipante,
  listarInscripciones,
} from "@/app/actions/capacitaciones";

type Curso = {
  id: string;
  codigoCurso: string | null;
  nombreCurso: string;
  modalidadGeneral: string;
  estadoCurso: string;
  descripcion: string | null;
};
type Inscripcion = {
  idInscripcion: string;
  participante: string;
  estadoInscripcion: string;
  ultimaNota: number | null;
  resultado: string | null;
  certificado: boolean;
};

const ESTADO_BADGE: Record<string, string> = {
  BORRADOR: "bg-gray-100 text-gray-700",
  PUBLICADO: "bg-green-50 text-green-700",
  CERRADO: "bg-gray-200 text-gray-600",
};

export function CapacitacionesModule({ cursos }: { cursos: Curso[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string | null>(cursos[0]?.id ?? null);
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [showCursoForm, setShowCursoForm] = useState(false);
  const [showInscForm, setShowInscForm] = useState(false);
  const [cursoForm, setCursoForm] = useState({
    nombreCurso: "",
    descripcion: "",
    duracionEstimadaHoras: 0,
  });
  const [insc, setInsc] = useState({
    tipoDocumento: "DNI",
    numeroDocumento: "",
    nombres: "",
    apellidos: "",
    correo: "",
  });

  const current = cursos.find((c) => c.id === selected) ?? null;

  const loadInscripciones = (idCurso: string) =>
    listarInscripciones(idCurso)
      .then(setInscripciones)
      .catch(() => setInscripciones([]));

  const selectCurso = (id: string) => {
    setSelected(id);
    setShowInscForm(false);
    loadInscripciones(id);
  };

  const run = (fn: () => Promise<{ message?: string } | void>, ok: string, after?: () => void) =>
    startTransition(async () => {
      const res = await fn();
      if (res?.message && /no se pudo|no est|ya est|obligatori|no tiene|entre 0/i.test(res.message))
        toast.error(res.message);
      else {
        toast.success(ok);
        after?.();
        if (current) await loadInscripciones(current.id);
        router.refresh();
      }
    });

  const submitCurso = () => {
    if (!cursoForm.nombreCurso.trim()) {
      toast.error("Indica el nombre del curso.");
      return;
    }
    run(
      () => crearCurso(cursoForm).then((r) => (r && "id" in r ? undefined : r)),
      "Curso creado.",
      () => {
        setShowCursoForm(false);
        setCursoForm({ nombreCurso: "", descripcion: "", duracionEstimadaHoras: 0 });
      }
    );
  };

  const submitInsc = () => {
    if (!current || !insc.nombres.trim()) {
      toast.error("Indica el nombre del participante.");
      return;
    }
    run(
      () => inscribirParticipante(current.id, insc),
      "Participante inscrito.",
      () => {
        setShowInscForm(false);
        setInsc({
          tipoDocumento: "DNI",
          numeroDocumento: "",
          nombres: "",
          apellidos: "",
          correo: "",
        });
      }
    );
  };

  const evaluar = (idInscripcion: string) => {
    const v = window.prompt("Nota (0–20):");
    if (v === null) return;
    const nota = Number(v);
    if (Number.isNaN(nota)) {
      toast.error("Nota inválida.");
      return;
    }
    run(() => registrarEvaluacion(idInscripcion, nota), "Evaluación registrada.");
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[var(--caritas-green)]/10 rounded-lg flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-[var(--caritas-green)]" />
          </div>
          <div>
            <h1 className="text-[var(--caritas-text)]">Capacitación y Certificación</h1>
            <p className="text-sm text-gray-600">Cursos asincrónicos para brigadistas</p>
          </div>
        </div>
        <button
          onClick={() => setShowCursoForm((s) => !s)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--caritas-green)] text-white rounded"
        >
          <Plus className="w-4 h-4" /> Nuevo curso
        </button>
      </div>

      {showCursoForm && (
        <div className="bg-white border border-[var(--caritas-border)] rounded-xl p-5 mb-6 grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block md:col-span-2">
            <span className="text-xs text-gray-600">Nombre del curso</span>
            <input
              value={cursoForm.nombreCurso}
              onChange={(e) => setCursoForm({ ...cursoForm, nombreCurso: e.target.value })}
              className="mt-1 w-full px-3 py-2 border border-[var(--caritas-border)] rounded text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs text-gray-600">Duración (horas)</span>
            <input
              type="number"
              value={String(cursoForm.duracionEstimadaHoras)}
              onChange={(e) =>
                setCursoForm({ ...cursoForm, duracionEstimadaHoras: Number(e.target.value) })
              }
              className="mt-1 w-full px-3 py-2 border border-[var(--caritas-border)] rounded text-sm"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="text-xs text-gray-600">Descripción</span>
            <textarea
              value={cursoForm.descripcion}
              onChange={(e) => setCursoForm({ ...cursoForm, descripcion: e.target.value })}
              rows={2}
              className="mt-1 w-full px-3 py-2 border border-[var(--caritas-border)] rounded text-sm"
            />
          </label>
          <div className="md:col-span-2 flex justify-end gap-2">
            <button
              onClick={() => setShowCursoForm(false)}
              className="px-4 py-2 border border-[var(--caritas-border)] rounded"
            >
              Cancelar
            </button>
            <button
              onClick={submitCurso}
              disabled={pending}
              className="px-4 py-2 bg-[var(--caritas-green)] text-white rounded disabled:opacity-50"
            >
              Guardar
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1 space-y-3">
          {cursos.length === 0 && <p className="text-sm text-gray-500">No hay cursos.</p>}
          {cursos.map((c) => (
            <button
              key={c.id}
              onClick={() => selectCurso(c.id)}
              className={`w-full text-left p-4 border rounded-xl transition-colors ${selected === c.id ? "border-[var(--caritas-green)] bg-[var(--caritas-green)]/5" : "border-[var(--caritas-border)] hover:bg-gray-50"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-gray-500">{c.codigoCurso}</div>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded ${ESTADO_BADGE[c.estadoCurso] ?? "bg-gray-100"}`}
                >
                  {c.estadoCurso}
                </span>
              </div>
              <div className="text-sm font-medium text-[var(--caritas-text)] mt-1 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-gray-400" /> {c.nombreCurso}
              </div>
            </button>
          ))}
        </div>

        <div className="lg:col-span-2 bg-white border border-[var(--caritas-border)] rounded-xl p-5">
          {!current ? (
            <p className="text-gray-500">Selecciona un curso.</p>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h2 className="text-[var(--caritas-text)]">{current.nombreCurso}</h2>
                  <p className="text-sm text-gray-700 mt-1">{current.descripcion}</p>
                </div>
                <div className="flex gap-2">
                  {current.estadoCurso === "BORRADOR" && (
                    <button
                      onClick={() =>
                        run(() => cambiarEstadoCurso(current.id, "PUBLICAR"), "Curso publicado.")
                      }
                      disabled={pending}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" /> Publicar
                    </button>
                  )}
                  {current.estadoCurso === "PUBLICADO" && (
                    <button
                      onClick={() =>
                        run(() => cambiarEstadoCurso(current.id, "CERRAR"), "Curso cerrado.")
                      }
                      disabled={pending}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-[var(--caritas-border)] rounded disabled:opacity-50"
                    >
                      <Lock className="w-3.5 h-3.5" /> Cerrar
                    </button>
                  )}
                  {current.estadoCurso === "PUBLICADO" && (
                    <button
                      onClick={() => setShowInscForm((s) => !s)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[var(--caritas-green)] text-white rounded"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Inscribir
                    </button>
                  )}
                </div>
              </div>

              {showInscForm && (
                <div className="bg-gray-50 border border-[var(--caritas-border)] rounded p-4 mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs text-gray-600">Nombres</span>
                    <input
                      value={insc.nombres}
                      onChange={(e) => setInsc({ ...insc, nombres: e.target.value })}
                      className="mt-1 w-full px-3 py-2 border border-[var(--caritas-border)] rounded text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs text-gray-600">Apellidos</span>
                    <input
                      value={insc.apellidos}
                      onChange={(e) => setInsc({ ...insc, apellidos: e.target.value })}
                      className="mt-1 w-full px-3 py-2 border border-[var(--caritas-border)] rounded text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs text-gray-600">N° documento</span>
                    <input
                      value={insc.numeroDocumento}
                      onChange={(e) => setInsc({ ...insc, numeroDocumento: e.target.value })}
                      className="mt-1 w-full px-3 py-2 border border-[var(--caritas-border)] rounded text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs text-gray-600">Correo</span>
                    <input
                      value={insc.correo}
                      onChange={(e) => setInsc({ ...insc, correo: e.target.value })}
                      className="mt-1 w-full px-3 py-2 border border-[var(--caritas-border)] rounded text-sm"
                    />
                  </label>
                  <div className="md:col-span-2 flex justify-end gap-2">
                    <button
                      onClick={() => setShowInscForm(false)}
                      className="px-3 py-1.5 text-sm border border-[var(--caritas-border)] rounded"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={submitInsc}
                      disabled={pending}
                      className="px-3 py-1.5 text-sm bg-[var(--caritas-green)] text-white rounded disabled:opacity-50"
                    >
                      Inscribir
                    </button>
                  </div>
                </div>
              )}

              <h3 className="text-sm text-gray-600 mb-2">Participantes inscritos</h3>
              <ul className="space-y-2">
                {inscripciones.map((i) => (
                  <li
                    key={i.idInscripcion}
                    className="flex flex-wrap items-center justify-between gap-2 p-3 border border-[var(--caritas-border)] rounded"
                  >
                    <div className="flex-1 min-w-[180px]">
                      <div className="text-sm text-[var(--caritas-text)]">{i.participante}</div>
                      <div className="text-xs text-gray-500">
                        {i.ultimaNota != null
                          ? `Nota: ${i.ultimaNota} · ${i.resultado}`
                          : "Sin evaluación"}
                        {i.certificado && (
                          <span className="ml-2 text-green-600">• Certificado</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => evaluar(i.idInscripcion)}
                        disabled={pending}
                        className="px-2.5 py-1 text-xs border border-[var(--caritas-border)] rounded disabled:opacity-50"
                      >
                        Evaluar
                      </button>
                      {!i.certificado && (
                        <button
                          onClick={() =>
                            run(
                              () => certificarParticipante(i.idInscripcion),
                              "Certificado emitido."
                            )
                          }
                          disabled={pending}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs bg-[var(--caritas-green)] text-white rounded disabled:opacity-50"
                        >
                          <Award className="w-3 h-3" /> Certificar
                        </button>
                      )}
                    </div>
                  </li>
                ))}
                {inscripciones.length === 0 && (
                  <p className="text-sm text-gray-500">Sin participantes inscritos.</p>
                )}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
