"use client";

import { useState, useTransition } from "react";
import { History, RefreshCw, X, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import type { ParticipanteCurso, IntentoEvaluacion } from "@/app/actions/capacitaciones";
import { reiniciarIntentos, listarIntentosInscripcion } from "@/app/actions/capacitaciones";

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-violet-100 text-violet-700",
  "bg-green-100 text-green-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
];

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
  const color = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${color}`}>
      {initials}
    </div>
  );
}

function fmtShort(iso: string) {
  return new Date(iso).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function HistorialModal({
  nombre,
  intentos,
  onClose,
}: {
  nombre: string;
  intentos: IntentoEvaluacion[];
  onClose: () => void;
}) {
  const iniciales = intentos.filter((i) => i.tipoEvaluacion === "INICIAL");
  const finales = intentos.filter((i) => i.tipoEvaluacion === "FINAL" || !i.tipoEvaluacion);

  const renderGroup = (label: string, items: IntentoEvaluacion[]) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
        {items.map((it, idx) => (
          <div key={it.idEvaluacion} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">
            <span className="text-xs text-gray-500">Intento {it.numeroIntento ?? idx + 1}</span>
            <span className="text-xs text-gray-400">{fmtDateTime(it.fechaEvaluacion)}</span>
            <span className="text-xs font-semibold text-gray-700">{it.nota != null ? `${it.nota}/20` : "—"}</span>
            {it.resultado === "APROBADO" ? (
              <span className="text-[10px] bg-green-100 text-green-700 border border-green-200 px-1.5 py-0.5 rounded-full font-medium">Aprobado</span>
            ) : it.resultado === "DESAPROBADO" ? (
              <span className="text-[10px] bg-red-100 text-red-700 border border-red-200 px-1.5 py-0.5 rounded-full font-medium">Desaprobado</span>
            ) : (
              <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-medium">En curso</span>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">Historial de intentos</h2>
            <p className="text-xs text-gray-400 mt-0.5">{nombre}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4 max-h-96 overflow-y-auto">
          {intentos.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Sin intentos registrados.</p>
          ) : (
            <>
              {renderGroup("Evaluación Inicial", iniciales)}
              {renderGroup("Evaluación Final", finales)}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

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
  const [showHistorial, setShowHistorial] = useState(false);
  const [intentos, setIntentos] = useState<IntentoEvaluacion[] | null>(null);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [pending, startTransition] = useTransition();

  const notaInicialStr = p.notaInicial != null ? `${p.notaInicial}/20` : "—";
  const notaFinalStr = p.nota != null ? `${p.nota}/20` : "—";

  const handleReiniciar = (tipo: "INICIAL" | "FINAL") => {
    startTransition(async () => {
      const res = await reiniciarIntentos(p.idInscripcion, tipo);
      if (res?.message) toast.error(res.message);
      else {
        toast.success(`Intento ${tipo.toLowerCase()} reiniciado.`);
        await onRefresh();
      }
    });
  };

  const handleVerHistorial = async () => {
    if (!intentos) {
      setLoadingHistorial(true);
      const data = await listarIntentosInscripcion(p.idInscripcion);
      setIntentos(data);
      setLoadingHistorial(false);
    }
    setShowHistorial(true);
  };

  const agotadoInicial = maxIntentosInicial != null && p.intentosInicial >= maxIntentosInicial;
  const agotadoFinal = maxIntentosFinal != null && p.intentosFinal >= maxIntentosFinal;

  return (
    <>
      <tr className="hover:bg-gray-50/60 transition-colors">
        {/* Participante */}
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

        {/* Estado */}
        <td className="px-4 py-3">
          {p.certificado ? (
            <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Certificado
            </span>
          ) : p.resultado === "APROBADO" ? (
            <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              Aprobado
            </span>
          ) : p.resultado === "DESAPROBADO" ? (
            <span className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              Desaprobado
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
              Sin evaluar
            </span>
          )}
        </td>

        {/* Último acceso */}
        <td className="px-4 py-3">
          {p.ultimaActividad ? (
            <span className="text-xs text-gray-500">{fmtShort(p.ultimaActividad)}</span>
          ) : (
            <span className="text-xs text-gray-300">Sin actividad</span>
          )}
        </td>

        {/* Acciones */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
            <button
              onClick={handleVerHistorial}
              disabled={loadingHistorial}
              title="Ver historial de intentos"
              className="p-1.5 text-gray-400 hover:text-[var(--caritas-green)] hover:bg-[var(--caritas-green)]/5 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
            >
              <History className="w-4 h-4" />
            </button>
            <button
              onClick={() => setExpanded((v) => !v)}
              title="Ver intentos"
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-colors cursor-pointer"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </td>
      </tr>

      {/* Fila expandida: detalle de intentos */}
      {expanded && (
        <tr className="bg-gray-50/80">
          <td colSpan={4} className="px-6 py-3">
            <div className="flex flex-wrap gap-4 text-xs">
              {/* Evaluación inicial */}
              <div className="flex items-center gap-2">
                <span className="text-gray-500 font-medium">Inicial:</span>
                <span className="font-semibold text-gray-700">{notaInicialStr}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${agotadoInicial ? "bg-red-50 text-red-600 border border-red-200" : "bg-gray-100 text-gray-500"}`}>
                  {p.intentosInicial}/{maxIntentosInicial ?? "∞"} intentos
                </span>
                {p.intentosInicial > 0 && (
                  <button
                    onClick={() => handleReiniciar("INICIAL")}
                    disabled={pending}
                    title="Reiniciar último intento inicial"
                    className="flex items-center gap-1 text-[10px] text-amber-600 hover:text-amber-700 border border-amber-200 hover:bg-amber-50 px-1.5 py-0.5 rounded-full transition-colors cursor-pointer disabled:opacity-40"
                  >
                    <RefreshCw className="w-3 h-3" /> Reiniciar
                  </button>
                )}
              </div>

              {/* Evaluación final */}
              <div className="flex items-center gap-2">
                <span className="text-gray-500 font-medium">Final:</span>
                <span className="font-semibold text-gray-700">{notaFinalStr}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${agotadoFinal ? "bg-red-50 text-red-600 border border-red-200" : "bg-gray-100 text-gray-500"}`}>
                  {p.intentosFinal}/{maxIntentosFinal ?? "∞"} intentos
                </span>
                {p.intentosFinal > 0 && (
                  <button
                    onClick={() => handleReiniciar("FINAL")}
                    disabled={pending}
                    title="Reiniciar último intento final"
                    className="flex items-center gap-1 text-[10px] text-amber-600 hover:text-amber-700 border border-amber-200 hover:bg-amber-50 px-1.5 py-0.5 rounded-full transition-colors cursor-pointer disabled:opacity-40"
                  >
                    <RefreshCw className="w-3 h-3" /> Reiniciar
                  </button>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}

      {showHistorial && intentos && (
        <HistorialModal
          nombre={p.nombre}
          intentos={intentos}
          onClose={() => setShowHistorial(false)}
        />
      )}
    </>
  );
}
