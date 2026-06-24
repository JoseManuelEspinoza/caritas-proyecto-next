"use client";

import { useState, useTransition } from "react";
import {
  X,
  CheckCircle,
  XCircle,
  MessageSquareWarning,
  Loader2,
  Hand,
} from "lucide-react";
import { toast } from "sonner";
import { votarComite, observarCasoComite } from "@/app/actions/comite-donaciones";
import type { TallyRondaConNombres } from "@/app/lib/comite-donaciones-tally";

type Props = {
  idIncidencia: string;
  codigo: string | null;
  soyMiembroDelComite: boolean;
  miIdUsuarioGRD: string | null;
  tally: TallyRondaConNombres | null;
  onClose: () => void;
};

export function ModalVotacionComite({
  idIncidencia,
  codigo,
  soyMiembroDelComite,
  miIdUsuarioGRD,
  tally,
  onClose,
}: Props) {
  const [modo, setModo] = useState<"observar" | null>(null);
  const [observacion, setObservacion] = useState("");
  const [isPending, startTransition] = useTransition();

  const miVoto =
    tally && miIdUsuarioGRD
      ? tally.votos.find((v) => v.idUsuarioGRD === miIdUsuarioGRD)?.decision ?? null
      : null;

  const ejecutarVoto = (decision: "A_FAVOR" | "EN_CONTRA") => {
    startTransition(async () => {
      const res = await votarComite(idIncidencia, decision);
      if (res.message) {
        toast.error(res.message);
      } else {
        toast.success(decision === "A_FAVOR" ? "Voto a favor registrado." : "Voto en contra registrado.");
        onClose();
      }
    });
  };

  const ejecutarObservar = () => {
    if (!observacion.trim()) {
      toast.error("Escribe las observaciones para devolver el caso.");
      return;
    }
    startTransition(async () => {
      const res = await observarCasoComite(idIncidencia, observacion);
      if (res.message) {
        toast.error(res.message);
      } else {
        toast.success("Caso observado y devuelto al GRD.");
        setObservacion("");
        onClose();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--caritas-border)]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--caritas-green)]/10 flex items-center justify-center">
              <Hand className="w-4 h-4 text-[var(--caritas-green)]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--caritas-text)] leading-tight">
                Votación del Comité
              </h2>
              {codigo && <p className="text-xs font-mono text-gray-400">{codigo}</p>}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {!tally ? (
            <p className="text-sm text-gray-500 text-center py-6">
              Aún no hay una ronda de votación abierta para este caso.
            </p>
          ) : (
            <>
              {/* Resumen del tally */}
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Conteo actual</p>
                <span className="text-xs text-gray-400">
                  Umbral: {tally.umbral} de {tally.n}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="rounded-lg bg-green-50 border border-green-100 p-3 text-center">
                  <p className="text-lg font-bold text-green-700">{tally.aFavor}</p>
                  <p className="text-[11px] text-green-600">A favor</p>
                </div>
                <div className="rounded-lg bg-red-50 border border-red-100 p-3 text-center">
                  <p className="text-lg font-bold text-red-600">{tally.enContra}</p>
                  <p className="text-[11px] text-red-500">En contra</p>
                </div>
                <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 text-center">
                  <p className="text-lg font-bold text-gray-600">{tally.pendientes}</p>
                  <p className="text-[11px] text-gray-400">Pendientes</p>
                </div>
              </div>

              {/* Detalle de votos */}
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2">Detalle de votos</p>
                <ul className="text-sm space-y-1 border border-gray-100 rounded-lg p-3 bg-gray-50/60">
                  {tally.votos.map((v) => (
                    <li key={v.idUsuarioGRD} className="flex justify-between">
                      <span className="text-gray-700">{v.nombre}</span>
                      <span className={v.decision === "A_FAVOR" ? "text-green-700 font-medium" : "text-red-600 font-medium"}>
                        {v.decision === "A_FAVOR" ? "A favor" : "En contra"}
                      </span>
                    </li>
                  ))}
                  {tally.pendientesNombres.map((nombre) => (
                    <li key={nombre} className="flex justify-between text-gray-400">
                      <span>{nombre}</span>
                      <span>Pendiente</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Acciones del miembro del comité */}
              {soyMiembroDelComite ? (
                <div className="border-t border-gray-100 pt-4 space-y-3">
                  {modo === "observar" ? (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700" htmlFor="obs-comite">
                        Observar y devolver al GRD
                      </label>
                      <textarea
                        id="obs-comite"
                        value={observacion}
                        onChange={(e) => setObservacion(e.target.value)}
                        rows={3}
                        autoFocus
                        className="w-full rounded-lg border border-[var(--caritas-border)] p-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
                        placeholder="Describe qué falta o qué se debe corregir."
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => { setModo(null); setObservacion(""); }}
                          className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Volver
                        </button>
                        <button
                          type="button"
                          onClick={ejecutarObservar}
                          disabled={isPending || !observacion.trim()}
                          className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-sm text-white disabled:opacity-50 hover:bg-amber-600 transition-colors"
                        >
                          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquareWarning className="w-4 h-4" />}
                          Confirmar observación
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-gray-500">Emite tu decisión sobre este caso:</p>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => ejecutarVoto("A_FAVOR")}
                          disabled={isPending || miVoto === "A_FAVOR"}
                          className="flex flex-col items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-3 py-3 text-sm text-green-700 font-medium disabled:opacity-50 hover:bg-green-100 transition-colors"
                        >
                          <CheckCircle className="w-5 h-5" />
                          Aprobar
                        </button>
                        <button
                          type="button"
                          onClick={() => setModo("observar")}
                          disabled={isPending}
                          className="flex flex-col items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-700 font-medium disabled:opacity-50 hover:bg-amber-100 transition-colors"
                        >
                          <MessageSquareWarning className="w-5 h-5" />
                          Observar
                        </button>
                        <button
                          type="button"
                          onClick={() => ejecutarVoto("EN_CONTRA")}
                          disabled={isPending || miVoto === "EN_CONTRA"}
                          className="flex flex-col items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-600 font-medium disabled:opacity-50 hover:bg-red-100 transition-colors"
                        >
                          <XCircle className="w-5 h-5" />
                          Rechazar
                        </button>
                      </div>
                      {miVoto && (
                        <p className="text-[11px] text-gray-400 text-center">
                          Ya registraste tu voto: {miVoto === "A_FAVOR" ? "A favor (Aprobar)" : "En contra (Rechazar)"}.
                        </p>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center border-t border-gray-100 pt-4">
                  Solo los miembros del Comité de Donaciones pueden emitir votos.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
