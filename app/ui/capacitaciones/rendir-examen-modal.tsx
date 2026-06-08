"use client";

import { useState, useTransition } from "react";
import { X, ClipboardList, CheckCircle, AlertCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { obtenerCuestionarioPorId, enviarRespuestasExamen } from "@/app/actions/capacitaciones";
import type { CuestionarioDetalle } from "@/app/actions/capacitaciones";

type Props = {
  idInscripcion: string;
  cuestionario: {
    id: string;
    titulo: string;
    notaAprobatoria: number;
    maxIntentos: number;
    totalPreguntas: number;
    intentosUsados: number;
  };
  onClose: () => void;
};

type Resultado = {
  nota: number;
  puntajeObtenido: number;
  puntajeTotal: number;
  porcentaje: number;
  aprobado: boolean;
};

export function RendirExamenModal({ idInscripcion, cuestionario, onClose }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [detalle, setDetalle] = useState<CuestionarioDetalle | null>(null);
  const [cargando, setCargando] = useState(false);
  const [respuestas, setRespuestas] = useState<Record<string, string>>({});
  const [resultado, setResultado] = useState<Resultado | null>(null);

  const intentosRestantes = cuestionario.maxIntentos - cuestionario.intentosUsados;
  const agotado = intentosRestantes <= 0;

  const iniciar = async () => {
    setCargando(true);
    try {
      const d = await obtenerCuestionarioPorId(cuestionario.id);
      if (!d) { toast.error("No se pudo cargar el examen."); return; }
      setDetalle(d);
    } catch {
      toast.error("No se pudo cargar el examen.");
    } finally {
      setCargando(false);
    }
  };

  const enviar = () => {
    if (!detalle) return;
    const sinResponder = detalle.preguntas.filter((p) => !respuestas[p.id]);
    if (sinResponder.length > 0) {
      toast.error(`Faltan ${sinResponder.length} pregunta(s) por responder.`);
      return;
    }
    startTransition(async () => {
      const res = await enviarRespuestasExamen(idInscripcion, cuestionario.id, respuestas);
      if ("message" in res) {
        toast.error(res.message);
      } else {
        setResultado(res.resultado);
        router.refresh();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl w-full max-w-xl shadow-xl my-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--caritas-border)]">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-[var(--caritas-green)]" />
            <h2 className="text-base font-semibold text-[var(--caritas-text)]">
              {cuestionario.titulo}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5">
          {/* ── Resultado ─────────────────────────────────────── */}
          {resultado ? (
            <div className="text-center py-6">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${resultado.aprobado ? "bg-green-100" : "bg-red-100"}`}>
                {resultado.aprobado
                  ? <CheckCircle className="w-8 h-8 text-green-600" />
                  : <AlertCircle className="w-8 h-8 text-red-500" />}
              </div>
              <p className={`text-xl font-bold mb-2 ${resultado.aprobado ? "text-green-700" : "text-red-600"}`}>
                {resultado.aprobado ? "¡APROBADO!" : "DESAPROBADO"}
              </p>
              <p className="text-5xl font-bold text-[var(--caritas-text)] my-3">
                {resultado.nota.toFixed(1)}
                <span className="text-xl text-gray-400">/20</span>
              </p>
              <p className="text-sm text-gray-500 mb-6">
                {resultado.puntajeObtenido} de {resultado.puntajeTotal} puntos · {resultado.porcentaje.toFixed(0)}%
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-[var(--caritas-green)] text-white rounded-lg text-sm hover:opacity-90"
              >
                Cerrar
              </button>
            </div>

          ) : !detalle ? (
            /* ── Pantalla inicio ────────────────────────────── */
            <div className="text-center">
              <div className="bg-gray-50 rounded-xl p-5 mb-5 text-left space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Preguntas</span>
                  <span className="font-semibold">{cuestionario.totalPreguntas}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Nota aprobatoria</span>
                  <span className="font-semibold">{cuestionario.notaAprobatoria}/20</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Intentos restantes</span>
                  <span className={`font-semibold ${agotado ? "text-red-500" : "text-[var(--caritas-green)]"}`}>
                    {intentosRestantes} de {cuestionario.maxIntentos}
                  </span>
                </div>
              </div>

              {agotado ? (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 mb-5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Has agotado todos tus intentos para este examen.
                </div>
              ) : (
                <p className="text-sm text-gray-500 mb-5">
                  Lee cada pregunta con cuidado. Una vez que envíes no podrás cambiar tus respuestas.
                </p>
              )}

              <div className="flex gap-2 justify-center">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm border border-[var(--caritas-border)] rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                {!agotado && (
                  <button
                    onClick={iniciar}
                    disabled={cargando}
                    className="px-5 py-2 text-sm bg-[var(--caritas-green)] text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                  >
                    {cargando ? "Cargando..." : "Comenzar examen"}
                  </button>
                )}
              </div>
            </div>

          ) : (
            /* ── Preguntas ──────────────────────────────────── */
            <div>
              <div className="space-y-5 max-h-[420px] overflow-y-auto pr-1 mb-4">
                {detalle.preguntas.map((p, pi) => (
                  <div key={p.id}>
                    <p className="text-sm font-medium text-[var(--caritas-text)] mb-2">
                      <span className="text-[var(--caritas-green)] font-bold mr-1">{pi + 1}.</span>
                      {p.enunciado}
                    </p>
                    <div className="space-y-2">
                      {p.opciones.map((o) => (
                        <label
                          key={o.id}
                          className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                            respuestas[p.id] === o.id
                              ? "border-[var(--caritas-green)] bg-[var(--caritas-green)]/5"
                              : "border-[var(--caritas-border)] hover:bg-gray-50"
                          }`}
                        >
                          <input
                            type="radio"
                            name={p.id}
                            value={o.id}
                            checked={respuestas[p.id] === o.id}
                            onChange={() => setRespuestas((prev) => ({ ...prev, [p.id]: o.id }))}
                            className="accent-[var(--caritas-green)]"
                          />
                          <span className="text-sm">{o.textoOpcion}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[var(--caritas-border)]">
                <span className="text-xs text-gray-400">
                  {Object.keys(respuestas).length}/{detalle.preguntas.length} respondidas
                </span>
                <button
                  onClick={enviar}
                  disabled={pending}
                  className="flex items-center gap-2 px-5 py-2 text-sm bg-[var(--caritas-green)] text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {pending ? "Enviando..." : "Enviar respuestas"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
