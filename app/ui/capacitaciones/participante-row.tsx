"use client";

import { useState, useTransition, useEffect } from "react";
import { ChevronDown, RefreshCw, X, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { toast } from "sonner";
import type { ParticipanteCurso, IntentoEvaluacion, DetalleEvaluacion } from "@/app/actions/capacitaciones";
import { reiniciarIntentos, listarIntentosInscripcion, listarDetalleEvaluacion } from "@/app/actions/capacitaciones";

// ── Utilidades ─────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-violet-100 text-violet-700",
  "bg-green-100 text-green-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
];

function Avatar({ name }: { name: string }) {
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
  const color = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${color}`}>
      {initials}
    </div>
  );
}

function fmtShort(iso: string) {
  return new Date(iso).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleDateString("es-PE", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// ── Modal de confirmación con cuenta regresiva ─────────────────────────────────

function ReiniciarModal({
  tipo,
  nombre,
  onConfirm,
  onClose,
}: {
  tipo: "INICIAL" | "FINAL";
  nombre: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const [seconds, setSeconds] = useState(5);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">Reiniciar último intento</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="space-y-2 text-sm text-gray-600">
            <p>
              Se eliminará el último intento de evaluación {tipo === "INICIAL" ? "inicial" : "final"} de{" "}
              <span className="font-semibold text-gray-800">{nombre}</span>, incluyendo todas sus respuestas registradas.
            </p>
            <p>
              El participante recuperará ese intento y podrá volver a rendir la evaluación.
              Esta acción no se puede deshacer.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              disabled={seconds > 0}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {seconds > 0 ? `Sí, reiniciar intento (${seconds}s)` : "Sí, reiniciar intento"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Vista de detalle de un intento ─────────────────────────────────────────────

function DetalleIntento({
  detalle,
  isLast,
  nombreParticipante,
  idInscripcion,
  tipo,
  onBack,
  onRefresh,
}: {
  detalle: DetalleEvaluacion;
  isLast: boolean;
  nombreParticipante: string;
  idInscripcion: string;
  tipo: "INICIAL" | "FINAL";
  onBack: () => void;
  onRefresh: () => Promise<void>;
}) {
  const [showModal, setShowModal] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleReiniciar = () => {
    startTransition(async () => {
      const res = await reiniciarIntentos(idInscripcion, tipo);
      if (res?.message) toast.error(res.message);
      else {
        toast.success(`Intento ${tipo.toLowerCase()} reiniciado.`);
        setShowModal(false);
        onBack();
        await onRefresh();
      }
    });
  };

  const correctas = detalle.preguntas.filter((p) => p.respuesta?.esCorrecta).length;
  const total = detalle.preguntas.length;

  return (
    <>
      <div className="space-y-3 py-2">
        {/* Cabecera del detalle */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 cursor-pointer transition-colors"
          >
            <X className="w-3.5 h-3.5" /> Cerrar
          </button>
          <div className="flex items-center gap-3">
            {isLast && (
              <button
                onClick={() => setShowModal(true)}
                disabled={pending}
                className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-green-600 text-white hover:bg-green-700 transition-colors cursor-pointer disabled:opacity-40"
              >
                <RefreshCw className="w-3 h-3" /> Reiniciar intento
              </button>
            )}
            <div className="text-right">
              <p className="text-sm font-bold text-gray-800">
                {detalle.nota != null ? `${detalle.nota}/20` : "—"}
              </p>
              <p className="text-[11px] text-gray-400">
                {correctas}/{total} correctas
                {detalle.puntajeObtenido != null && detalle.puntajeTotal != null &&
                  ` · ${detalle.puntajeObtenido}/${detalle.puntajeTotal} pts`
                }
              </p>
            </div>
            {detalle.resultado === "APROBADO" ? (
              <span className="text-[10px] bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-medium">
                Aprobado
              </span>
            ) : detalle.resultado === "DESAPROBADO" ? (
              <span className="text-[10px] bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded-full font-medium">
                Desaprobado
              </span>
            ) : (
              <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                En curso
              </span>
            )}
          </div>
        </div>

        {/* Lista de preguntas */}
        {detalle.preguntas.length === 0 ? (
          <p className="text-xs text-gray-400 italic px-2">Sin respuestas registradas.</p>
        ) : (
          <div className="space-y-3">
            {detalle.preguntas.map((preg, idx) => {
              const esCorrecta = preg.respuesta?.esCorrecta;
              return (
                <div key={preg.idPregunta} className="rounded-lg border border-gray-100 overflow-hidden">
                  {/* Enunciado */}
                  <div className={`flex items-start gap-2 px-3 py-2.5 ${esCorrecta ? "bg-green-50" : esCorrecta === false ? "bg-red-50" : "bg-gray-50"}`}>
                    <span className="text-[11px] font-bold text-gray-400 mt-0.5 shrink-0">
                      {idx + 1}.
                    </span>
                    <p className="text-xs text-gray-700 flex-1 leading-relaxed">{preg.enunciado}</p>
                    <span className="shrink-0 text-[11px] font-semibold ml-2">
                      {esCorrecta ? (
                        <span className="text-green-600">+{preg.puntaje} pts</span>
                      ) : (
                        <span className="text-gray-400">0/{preg.puntaje} pts</span>
                      )}
                    </span>
                  </div>
                  {/* Opciones */}
                  <div className="divide-y divide-gray-100 bg-white">
                    {preg.opciones.map((op) => {
                      const esFinal = op.esCorrecta;
                      const elegida = op.id === preg.respuesta?.idOpcionSeleccionada;
                      return (
                        <div
                          key={op.id}
                          className={`flex items-center gap-2 px-3 py-2 text-xs ${
                            esFinal
                              ? "bg-green-50/60 text-green-800"
                              : elegida && !esFinal
                              ? "bg-red-50/60 text-red-700"
                              : "text-gray-600"
                          }`}
                        >
                          {esFinal ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                          ) : elegida ? (
                            <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                          ) : (
                            <MinusCircle className="w-3.5 h-3.5 text-gray-200 shrink-0" />
                          )}
                          <span className={`flex-1 ${elegida ? "font-medium" : ""}`}>{op.texto}</span>
                          {elegida && !esFinal && (
                            <span className="text-[10px] text-red-500 shrink-0">Tu respuesta</span>
                          )}
                          {elegida && esFinal && (
                            <span className="text-[10px] text-green-600 shrink-0">Tu respuesta ✓</span>
                          )}
                        </div>
                      );
                    })}
                    {/* Caso: sin respuesta registrada para esta pregunta */}
                    {!preg.respuesta?.idOpcionSeleccionada && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 text-xs text-gray-400 italic">
                        Sin respuesta registrada
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <ReiniciarModal
          tipo={tipo}
          nombre={nombreParticipante}
          onConfirm={handleReiniciar}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

// ── Fila de intento individual (abre modal) ────────────────────────────────────

function IntentoRow({
  intento,
  isLast,
  nombreParticipante,
  idInscripcion,
  tipo,
  onRefresh,
}: {
  intento: IntentoEvaluacion;
  isLast: boolean;
  nombreParticipante: string;
  idInscripcion: string;
  tipo: "INICIAL" | "FINAL";
  onRefresh: () => Promise<void>;
}) {
  const [detalle, setDetalle] = useState<DetalleEvaluacion | null>(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleClick = async () => {
    setShowModal(true);
    if (!detalle) {
      setLoading(true);
      const data = await listarDetalleEvaluacion(intento.idEvaluacion);
      setDetalle(data);
      setLoading(false);
    }
  };

  const badge =
    intento.resultado === "APROBADO" ? (
      <span className="text-[10px] bg-green-100 text-green-700 border border-green-200 px-1.5 py-0.5 rounded-full font-medium">Aprobado</span>
    ) : intento.resultado === "DESAPROBADO" ? (
      <span className="text-[10px] bg-red-100 text-red-700 border border-red-200 px-1.5 py-0.5 rounded-full font-medium">Desaprobado</span>
    ) : (
      <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-medium">En curso</span>
    );

  return (
    <>
      {/* Fila clickeable */}
      <button
        onClick={handleClick}
        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-100 hover:bg-gray-50 hover:border-gray-200 transition-colors cursor-pointer text-left"
      >
        <span className="text-[11px] text-gray-400 w-14 shrink-0">
          Intento {intento.numeroIntento ?? "—"}
        </span>
        <span className="text-[11px] text-gray-500 flex-1">{fmtDateTime(intento.fechaEvaluacion)}</span>
        <span className="text-xs font-semibold text-gray-700 w-12 text-right">
          {intento.nota != null ? `${intento.nota}/20` : "—"}
        </span>
        <span className="w-24 text-right">{badge}</span>
        <span className="text-[10px] text-[var(--caritas-green)] font-medium shrink-0">Ver detalle →</span>
      </button>

      {/* Modal de detalle */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl w-full max-w-2xl shadow-xl my-4">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--caritas-border)]">
              <div>
                <h2 className="text-sm font-semibold text-[var(--caritas-text)]">
                  Intento {intento.numeroIntento ?? "—"} — Evaluación {tipo === "INICIAL" ? "Inicial" : "Final"}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">{nombreParticipante} · {fmtDateTime(intento.fechaEvaluacion)}</p>
              </div>
              <div className="flex items-center gap-3">
                {badge}
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-xs text-gray-400">
                  <div className="w-4 h-4 border-2 border-gray-200 border-t-[var(--caritas-green)] rounded-full animate-spin" />
                  Cargando respuestas…
                </div>
              ) : detalle ? (
                <DetalleIntento
                  detalle={detalle}
                  isLast={isLast}
                  nombreParticipante={nombreParticipante}
                  idInscripcion={idInscripcion}
                  tipo={tipo}
                  onBack={() => setShowModal(false)}
                  onRefresh={async () => { setShowModal(false); await onRefresh(); }}
                />
              ) : (
                <p className="text-xs text-gray-400 py-6 text-center italic">No se pudo cargar el detalle.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────

export function ParticipanteRow({
  p,
  maxIntentosInicial,
  maxIntentosFinal,
  onRefresh,
}: {
  p: ParticipanteCurso;
  maxIntentosInicial?: number;
  maxIntentosFinal?: number;
  onRefresh: () => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [intentos, setIntentos] = useState<IntentoEvaluacion[] | null>(null);
  const [loadingIntentos, setLoadingIntentos] = useState(false);

  const notaInicialStr = p.notaInicial != null ? `${p.notaInicial}/20` : "—";
  const notaFinalStr = p.nota != null ? `${p.nota}/20` : "—";

  const handleToggle = async () => {
    const next = !expanded;
    setExpanded(next);
    if (next && intentos === null) {
      setLoadingIntentos(true);
      const data = await listarIntentosInscripcion(p.idInscripcion);
      setIntentos(data);
      setLoadingIntentos(false);
    }
  };

  const iniciales = intentos?.filter((i) => i.tipoEvaluacion === "INICIAL") ?? [];
  const finales = intentos?.filter((i) => i.tipoEvaluacion === "FINAL" || !i.tipoEvaluacion) ?? [];

  const refreshIntentos = async () => {
    const data = await listarIntentosInscripcion(p.idInscripcion);
    setIntentos(data);
    await onRefresh();
  };

  return (
    <>
      {/* Fila principal */}
      <tr className="hover:bg-gray-50/60 transition-colors">
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <Avatar name={p.nombre} />
            <div className="min-w-0">
              <p className="font-medium text-[var(--caritas-text)] text-sm leading-tight">{p.nombre}</p>
              <p className="text-xs text-gray-400 mt-0.5 truncate">
                {[p.documento, `Inscrito ${fmtShort(p.fechaInscripcion)}`].filter(Boolean).join("  ·  ")}
              </p>
            </div>
          </div>
        </td>

        <td className="px-4 py-3">
          {p.certificado ? (
            <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Certificado
            </span>
          ) : p.resultado === "APROBADO" ? (
            <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Aprobado
            </span>
          ) : p.resultado === "DESAPROBADO" ? (
            <span className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Desaprobado
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400" /> Sin evaluar
            </span>
          )}
        </td>

        <td className="px-4 py-3">
          {p.ultimaActividad ? (
            <span className="text-xs text-gray-500">{fmtShort(p.ultimaActividad)}</span>
          ) : (
            <span className="text-xs text-gray-300">Sin actividad</span>
          )}
        </td>
      </tr>

      {/* Barra acordeón: Evaluaciones */}
      <tr>
        <td colSpan={3} className="px-0 py-0 border-t border-gray-100">
          <button
            onClick={handleToggle}
            className="w-full flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 transition-colors text-left cursor-pointer"
          >
            <ChevronDown
              className={`w-3.5 h-3.5 text-gray-400 transition-transform shrink-0 ${expanded ? "rotate-180" : ""}`}
            />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Evaluaciones</span>
            <span className="mx-1 text-gray-300 text-xs">·</span>
            <span className="text-xs text-gray-500">
              Inicial: <span className="font-semibold text-gray-700">{notaInicialStr}</span>{" "}
              <span className="text-gray-400">({p.intentosInicial}/{maxIntentosInicial ?? "∞"} intentos)</span>
            </span>
            <span className="mx-1 text-gray-300 text-xs">·</span>
            <span className="text-xs text-gray-500">
              Final: <span className="font-semibold text-gray-700">{notaFinalStr}</span>{" "}
              <span className="text-gray-400">({p.intentosFinal}/{maxIntentosFinal ?? "∞"} intentos)</span>
            </span>
          </button>
        </td>
      </tr>

      {/* Contenido del acordeón */}
      {expanded && (
        <tr>
          <td colSpan={3} className="px-4 pb-3 pt-2 bg-gray-50/60">
            {loadingIntentos ? (
              <div className="flex items-center gap-2 py-3 text-xs text-gray-400">
                <div className="w-3.5 h-3.5 border-2 border-gray-200 border-t-[var(--caritas-green)] rounded-full animate-spin" />
                Cargando historial…
              </div>
            ) : intentos && intentos.length === 0 ? (
              <p className="text-xs text-gray-400 py-3 italic">Sin intentos registrados.</p>
            ) : (
              <div className="space-y-3">
                {iniciales.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      Evaluación Inicial
                    </p>
                    <div className="space-y-1.5">
                      {iniciales.map((it, idx) => (
                        <IntentoRow
                          key={it.idEvaluacion}
                          intento={it}
                          isLast={idx === iniciales.length - 1}
                          nombreParticipante={p.nombre}
                          idInscripcion={p.idInscripcion}
                          tipo="INICIAL"
                          onRefresh={refreshIntentos}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {finales.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      Evaluación Final
                    </p>
                    <div className="space-y-1.5">
                      {finales.map((it, idx) => (
                        <IntentoRow
                          key={it.idEvaluacion}
                          intento={it}
                          isLast={idx === finales.length - 1}
                          nombreParticipante={p.nombre}
                          idInscripcion={p.idInscripcion}
                          tipo="FINAL"
                          onRefresh={refreshIntentos}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {iniciales.length === 0 && finales.length === 0 && (
                  <p className="text-xs text-gray-400 py-2 italic">Sin intentos registrados.</p>
                )}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
