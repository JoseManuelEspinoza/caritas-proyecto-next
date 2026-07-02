"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { X, ClipboardList, CheckCircle, AlertCircle, Send, ShieldCheck, Timer, Eye } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { iniciarExamen, registrarPerdidaFoco, enviarRespuestasExamen } from "@/app/actions/capacitaciones";
import type { ExamenParaRendir } from "@/app/actions/capacitaciones";

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

function formatTiempo(segundos: number): string {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function RendirExamenModal({ idInscripcion, cuestionario, onClose }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [examen, setExamen] = useState<ExamenParaRendir | null>(null);
  const [cargando, setCargando] = useState(false);
  const [respuestas, setRespuestas] = useState<Record<string, string | string[]>>({});
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [comprometido, setComprometido] = useState(false);
  const [segundosRestantes, setSegundosRestantes] = useState<number | null>(null);
  const [perdidasFoco, setPerdidasFoco] = useState(0);
  const enviandoRef = useRef(false);

  const intentosRestantes = cuestionario.maxIntentos - cuestionario.intentosUsados;
  const agotado = intentosRestantes <= 0;

  const iniciar = async () => {
    setCargando(true);
    try {
      const d = await iniciarExamen(idInscripcion, cuestionario.id);
      if ("message" in d) { toast.error(d.message); return; }
      setExamen(d);
      setRespuestas({});
      setPerdidasFoco(0);
      if (d.tiempoLimiteMinutos) {
        const deadline = new Date(d.fechaInicio).getTime() + d.tiempoLimiteMinutos * 60_000;
        setSegundosRestantes(Math.max(0, Math.floor((deadline - Date.now()) / 1000)));
      } else {
        setSegundosRestantes(null);
      }
    } catch {
      toast.error("No se pudo cargar el examen.");
    } finally {
      setCargando(false);
    }
  };

  const toggleOpcionMultiple = (idPregunta: string, idOpcion: string) => {
    setRespuestas((prev) => {
      const actual = Array.isArray(prev[idPregunta]) ? (prev[idPregunta] as string[]) : [];
      const siguiente = actual.includes(idOpcion)
        ? actual.filter((id) => id !== idOpcion)
        : [...actual, idOpcion];
      return { ...prev, [idPregunta]: siguiente };
    });
  };

  const respuestasRespondidas = examen
    ? Object.keys(respuestas).filter((pid) => {
        const r = respuestas[pid];
        return Array.isArray(r) ? r.length > 0 : Boolean(r);
      }).length
    : 0;

  const enviar = (opts?: { silencioso?: boolean }) => {
    if (!examen || enviandoRef.current) return;
    if (!opts?.silencioso) {
      const sinResponder = examen.preguntas.filter((p) => {
        const r = respuestas[p.id];
        return Array.isArray(r) ? r.length === 0 : !r;
      });
      if (sinResponder.length > 0) {
        toast.error(`Faltan ${sinResponder.length} pregunta(s) por responder.`);
        return;
      }
    }
    enviandoRef.current = true;
    startTransition(async () => {
      const res = await enviarRespuestasExamen(examen.idEvaluacion, idInscripcion, examen.idCuestionario, respuestas);
      enviandoRef.current = false;
      if ("message" in res) {
        toast.error(res.message);
      } else {
        setResultado(res.resultado);
        router.refresh();
      }
    });
  };

  // Cronómetro: auto-envía las respuestas actuales al agotarse el tiempo.
  useEffect(() => {
    if (segundosRestantes == null || resultado) return;
    if (segundosRestantes <= 0) {
      toast.error("Se agotó el tiempo. Enviando tus respuestas...");
      enviar({ silencioso: true });
      return;
    }
    const t = setTimeout(() => setSegundosRestantes((s) => (s != null ? s - 1 : s)), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segundosRestantes, resultado]);

  // Anti-plagio: detecta cambios de pestaña/pérdida de foco durante el examen.
  useEffect(() => {
    if (!examen || resultado) return;
    const onFocoPerdido = () => {
      setPerdidasFoco((n) => n + 1);
      registrarPerdidaFoco(examen.idEvaluacion);
      toast.warning("Se detectó un cambio de pestaña. Este evento queda registrado.");
    };
    const onVisibility = () => { if (document.hidden) onFocoPerdido(); };
    window.addEventListener("blur", onFocoPerdido);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("blur", onFocoPerdido);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [examen, resultado]);

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
          <div className="flex items-center gap-3">
            {examen && !resultado && segundosRestantes != null && (
              <span className={`flex items-center gap-1 text-sm font-semibold tabular-nums ${segundosRestantes <= 30 ? "text-red-500" : "text-gray-600"}`}>
                <Timer className="w-4 h-4" />
                {formatTiempo(segundosRestantes)}
              </span>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
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

          ) : !examen ? (
            /* ── Pantalla inicio ────────────────────────────── */
            <div className="text-center">
              <div className="bg-gray-50 rounded-xl p-5 mb-5 text-left space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Preguntas</span>
                  <span className="font-semibold">{cuestionario.totalPreguntas}</span>
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
                <>
                  <p className="text-sm text-gray-500 mb-4">
                    Lee cada pregunta con cuidado. Una vez que envíes no podrás cambiar tus respuestas. Cambiar de pestaña o salir de la ventana durante el examen queda registrado.
                  </p>
                  {/* Compromiso de honor */}
                  <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer mb-5 transition-colors ${
                    comprometido
                      ? "bg-[var(--caritas-green)]/5 border-[var(--caritas-green)]/40"
                      : "bg-gray-50 border-gray-200 hover:border-gray-300"
                  }`}>
                    <input
                      type="checkbox"
                      checked={comprometido}
                      onChange={(e) => setComprometido(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-[var(--caritas-green)] shrink-0 cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <ShieldCheck className={`w-3.5 h-3.5 shrink-0 ${comprometido ? "text-[var(--caritas-green)]" : "text-gray-400"}`} />
                        <span className={`text-xs font-semibold ${comprometido ? "text-[var(--caritas-green)]" : "text-gray-600"}`}>
                          Compromiso de honestidad
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        Me comprometo a responder este examen con mis propios conocimientos, sin copiar respuestas ni compartir el contenido de las preguntas con otras personas.
                      </p>
                    </div>
                  </label>
                </>
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
                    disabled={cargando || !comprometido}
                    className="px-5 py-2 text-sm bg-[var(--caritas-green)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                  >
                    {cargando ? "Cargando..." : "Comenzar examen"}
                  </button>
                )}
              </div>
            </div>

          ) : (
            /* ── Preguntas ──────────────────────────────────── */
            <div>
              {/* Info bar */}
              <div className="flex items-center gap-4 bg-gray-50 border border-[var(--caritas-border)] rounded-lg px-4 py-2 mb-4 text-xs text-gray-500">
                <span>
                  {examen.preguntas.length} pregunta{examen.preguntas.length !== 1 ? "s" : ""}
                </span>
                <span className="text-gray-300">·</span>
                <span>Debes responder todas correctamente para aprobar</span>
                {perdidasFoco > 0 && (
                  <>
                    <span className="text-gray-300">·</span>
                    <span className="flex items-center gap-1 text-amber-600 font-medium">
                      <Eye className="w-3.5 h-3.5" />{perdidasFoco} cambio(s) de pestaña detectado(s)
                    </span>
                  </>
                )}
              </div>

              <div className="space-y-5 max-h-[380px] overflow-y-auto pr-1 mb-4">
                {examen.preguntas.map((p, pi) => {
                  const esMultiple = p.tipoPregunta === "OPCION_MULTIPLE";
                  const seleccionadas = esMultiple
                    ? Array.isArray(respuestas[p.id]) ? (respuestas[p.id] as string[]) : []
                    : null;

                  return (
                    <div key={p.id}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-sm font-medium text-[var(--caritas-text)]">
                          <span className="text-[var(--caritas-green)] font-bold mr-1">{pi + 1}.</span>
                          {p.enunciado}
                        </p>
                        <span className="text-[10px] text-gray-400 bg-gray-100 rounded px-1.5 py-0.5 shrink-0 whitespace-nowrap">
                          {p.puntaje} pt{p.puntaje !== 1 ? "s" : ""}
                        </span>
                      </div>
                      {esMultiple && (
                        <p className="text-xs text-blue-500 font-medium mb-2">
                          Selecciona todas las respuestas correctas
                        </p>
                      )}
                      <div className="space-y-2">
                        {p.opciones.map((o) => {
                          const isChecked = esMultiple
                            ? (seleccionadas ?? []).includes(o.id)
                            : respuestas[p.id] === o.id;

                          return (
                            <label
                              key={o.id}
                              className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                                isChecked
                                  ? "border-[var(--caritas-green)] bg-[var(--caritas-green)]/5"
                                  : "border-[var(--caritas-border)] hover:bg-gray-50"
                              }`}
                            >
                              {esMultiple ? (
                                <input
                                  type="checkbox"
                                  value={o.id}
                                  checked={isChecked}
                                  onChange={() => toggleOpcionMultiple(p.id, o.id)}
                                  className="accent-[var(--caritas-green)] w-4 h-4 shrink-0"
                                />
                              ) : (
                                <input
                                  type="radio"
                                  name={p.id}
                                  value={o.id}
                                  checked={isChecked}
                                  onChange={() =>
                                    setRespuestas((prev) => ({ ...prev, [p.id]: o.id }))
                                  }
                                  className="accent-[var(--caritas-green)] shrink-0"
                                />
                              )}
                              <span className="text-sm">{o.textoOpcion}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[var(--caritas-border)]">
                <span className="text-xs text-gray-400">
                  {respuestasRespondidas}/{examen.preguntas.length} respondidas
                </span>
                <button
                  onClick={() => enviar()}
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
