"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, ClipboardList, CheckCircle2, X, Pencil } from "lucide-react";
import { toast } from "sonner";
import { crearCuestionario, editarCuestionario, obtenerCuestionarioCurso } from "@/app/actions/capacitaciones";
import type { PreguntaInput, OpcionInput, CuestionarioDetalle } from "@/app/actions/capacitaciones";
import { useRouter } from "next/navigation";

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl w-full max-w-2xl shadow-xl my-4">
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

const PREGUNTA_VACIA = (): PreguntaInput => ({
  enunciado: "",
  tipoPregunta: "OPCION_UNICA",
  puntaje: 1,
  opciones: [
    { textoOpcion: "", esCorrecta: false },
    { textoOpcion: "", esCorrecta: false },
  ],
});

function fromDetalle(detalle: CuestionarioDetalle): PreguntaInput[] {
  return detalle.preguntas.map((p) => ({
    enunciado: p.enunciado,
    tipoPregunta: p.tipoPregunta as "OPCION_UNICA" | "VERDADERO_FALSO",
    puntaje: p.puntaje,
    opciones: p.opciones.map((o) => ({ textoOpcion: o.textoOpcion, esCorrecta: o.esCorrecta })),
  }));
}

export function CuestionarioModal({
  idCurso,
  idCuestionario,
  tipoPredefinido,
  inicial,
  onClose,
}: {
  idCurso: string;
  idCuestionario?: string;
  tipoPredefinido?: "INICIAL" | "FINAL";
  inicial?: CuestionarioDetalle;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const esEdicion = !!idCuestionario;

  const tipoDefault: "INICIAL" | "FINAL" =
    (inicial?.tipoCuestionario as "INICIAL" | "FINAL") ?? tipoPredefinido ?? "FINAL";

  const [tipo, setTipo] = useState<"INICIAL" | "FINAL">(tipoDefault);
  const [titulo, setTitulo] = useState(
    inicial?.titulo ?? (tipoDefault === "INICIAL" ? "Evaluación Inicial" : "Evaluación Final")
  );
  const [descripcion, setDescripcion] = useState(inicial?.descripcion ?? "");
  const [notaAprobatoria, setNotaAprobatoria] = useState(inicial?.notaAprobatoria ?? 11);
  const [maxIntentos, setMaxIntentos] = useState(inicial?.maxIntentos ?? 3);
  const [preguntas, setPreguntas] = useState<PreguntaInput[]>(
    inicial ? fromDetalle(inicial) : [PREGUNTA_VACIA()]
  );

  const updatePregunta = (pi: number, field: keyof PreguntaInput, value: unknown) =>
    setPreguntas((prev) => prev.map((p, i) => (i === pi ? { ...p, [field]: value } : p)));

  const updateOpcion = (pi: number, oi: number, field: keyof OpcionInput, value: unknown) =>
    setPreguntas((prev) =>
      prev.map((p, i) =>
        i !== pi ? p : { ...p, opciones: p.opciones.map((o, j) => (j === oi ? { ...o, [field]: value } : o)) }
      )
    );

  const marcarCorrecta = (pi: number, oi: number) =>
    setPreguntas((prev) =>
      prev.map((p, i) =>
        i !== pi ? p : { ...p, opciones: p.opciones.map((o, j) => ({ ...o, esCorrecta: j === oi })) }
      )
    );

  const agregarOpcion = (pi: number) =>
    setPreguntas((prev) =>
      prev.map((p, i) =>
        i !== pi ? p : { ...p, opciones: [...p.opciones, { textoOpcion: "", esCorrecta: false }] }
      )
    );

  const eliminarOpcion = (pi: number, oi: number) =>
    setPreguntas((prev) =>
      prev.map((p, i) => (i !== pi ? p : { ...p, opciones: p.opciones.filter((_, j) => j !== oi) }))
    );

  const agregarPregunta = () => setPreguntas((prev) => [...prev, PREGUNTA_VACIA()]);
  const eliminarPregunta = (pi: number) => setPreguntas((prev) => prev.filter((_, i) => i !== pi));

  const puntajeTotal = preguntas.reduce((s, p) => s + p.puntaje, 0);

  const guardar = () => {
    startTransition(async () => {
      const payload = { tipoCuestionario: tipo, titulo, descripcion: descripcion || undefined, notaAprobatoria, maxIntentos, preguntas };
      const res = esEdicion
        ? await editarCuestionario(idCuestionario!, payload)
        : await crearCuestionario(idCurso, payload);

      if (res && "message" in res) {
        toast.error(res.message);
      } else {
        toast.success(esEdicion ? "Cuestionario actualizado." : "Cuestionario creado.");
        router.refresh();
        onClose();
      }
    });
  };

  return (
    <Modal title={esEdicion ? "Editar Cuestionario" : "Crear Cuestionario"} onClose={onClose}>
      <div className="space-y-5">
        {/* Tipo de cuestionario — solo informativo, no editable */}
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${tipo === "INICIAL" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
          {tipo === "INICIAL" ? "🟡 Examen Inicial" : "🟢 Examen Final"}
        </div>

        {/* Info general */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Título *</label>
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--caritas-border)] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[var(--caritas-green)]"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nota aprobatoria (sobre 20)</label>
            <input
              type="number" min={0} max={20}
              value={notaAprobatoria}
              onChange={(e) => setNotaAprobatoria(Number(e.target.value))}
              className="w-full px-3 py-2 border border-[var(--caritas-border)] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[var(--caritas-green)]"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Intentos permitidos</label>
            <input
              type="number" min={1} max={10}
              value={maxIntentos}
              onChange={(e) => setMaxIntentos(Number(e.target.value))}
              className="w-full px-3 py-2 border border-[var(--caritas-border)] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[var(--caritas-green)]"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Descripción (opcional)</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-[var(--caritas-border)] rounded-lg text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[var(--caritas-green)]"
            />
          </div>
        </div>

        {/* Preguntas */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-[var(--caritas-text)]">
              Preguntas ({preguntas.length}) · Total: {puntajeTotal} pts
            </span>
          </div>

          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
            {preguntas.map((p, pi) => (
              <div key={pi} className="border border-[var(--caritas-border)] rounded-xl p-4 bg-gray-50">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-xs font-bold text-[var(--caritas-green)]">
                    Pregunta {pi + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    <select
                      value={p.tipoPregunta}
                      onChange={(e) => updatePregunta(pi, "tipoPregunta", e.target.value)}
                      className="text-xs border border-[var(--caritas-border)] rounded px-2 py-1 bg-white"
                    >
                      <option value="OPCION_UNICA">Opción única</option>
                      <option value="VERDADERO_FALSO">Verdadero / Falso</option>
                    </select>
                    <input
                      type="number" min={0.5} step={0.5}
                      value={p.puntaje}
                      onChange={(e) => updatePregunta(pi, "puntaje", Number(e.target.value))}
                      className="w-14 text-xs border border-[var(--caritas-border)] rounded px-2 py-1 bg-white text-center"
                      title="Puntaje"
                    />
                    <span className="text-xs text-gray-400">pts</span>
                    {preguntas.length > 1 && (
                      <button onClick={() => eliminarPregunta(pi)} className="text-red-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <textarea
                  value={p.enunciado}
                  onChange={(e) => updatePregunta(pi, "enunciado", e.target.value)}
                  placeholder="Escribe el enunciado..."
                  rows={2}
                  className="w-full px-3 py-2 border border-[var(--caritas-border)] rounded-lg text-sm resize-none bg-white mb-3 focus:outline-none focus:ring-1 focus:ring-[var(--caritas-green)]"
                />

                <div className="space-y-2">
                  {p.opciones.map((o, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <button
                        onClick={() => marcarCorrecta(pi, oi)}
                        className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          o.esCorrecta
                            ? "border-[var(--caritas-green)] bg-[var(--caritas-green)]"
                            : "border-gray-300 hover:border-[var(--caritas-green)]"
                        }`}
                        title="Marcar como correcta"
                      >
                        {o.esCorrecta && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </button>
                      <input
                        value={o.textoOpcion}
                        onChange={(e) => updateOpcion(pi, oi, "textoOpcion", e.target.value)}
                        placeholder={`Opción ${oi + 1}`}
                        className="flex-1 px-3 py-1.5 border border-[var(--caritas-border)] rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[var(--caritas-green)]"
                      />
                      {p.opciones.length > 2 && (
                        <button onClick={() => eliminarOpcion(pi, oi)} className="text-gray-300 hover:text-red-400 shrink-0">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {p.tipoPregunta === "OPCION_UNICA" && p.opciones.length < 5 && (
                  <button
                    onClick={() => agregarOpcion(pi)}
                    className="mt-2 text-xs text-[var(--caritas-green)] hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Agregar opción
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={agregarPregunta}
            className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-[var(--caritas-green)]/40 rounded-xl text-sm text-[var(--caritas-green)] hover:bg-[var(--caritas-green)]/5 transition-colors"
          >
            <Plus className="w-4 h-4" /> Agregar pregunta
          </button>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-2 border-t border-[var(--caritas-border)]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-[var(--caritas-border)] rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            disabled={pending || !titulo.trim()}
            onClick={guardar}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-[var(--caritas-green)] text-white rounded-lg disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            {esEdicion ? <Pencil className="w-4 h-4" /> : <ClipboardList className="w-4 h-4" />}
            {pending ? "Guardando..." : esEdicion ? "Guardar cambios" : "Crear cuestionario"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
