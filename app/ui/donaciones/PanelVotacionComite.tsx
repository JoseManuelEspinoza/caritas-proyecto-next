"use client";

import { useState, useTransition } from "react";
import { CheckCircle, XCircle, MessageSquareWarning, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { votarComite, observarCasoComite } from "@/app/actions/comite-donaciones";
import type { TallyRondaConNombres } from "@/app/lib/comite-donaciones-tally";

type Props = {
  idIncidencia: string;
  soyMiembroDelComite: boolean;
  miIdUsuarioGRD: string | null;
  tally: TallyRondaConNombres | null;
};

export function PanelVotacionComite({
  idIncidencia,
  soyMiembroDelComite,
  miIdUsuarioGRD,
  tally,
}: Props) {
  const [observacion, setObservacion] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!tally) {
    return (
      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        Aún no hay ronda de votación abierta.
      </div>
    );
  }

  const miVoto = miIdUsuarioGRD
    ? tally.votos.find((v) => v.idUsuarioGRD === miIdUsuarioGRD)?.decision ?? null
    : null;

  const ejecutarVoto = (decision: "A_FAVOR" | "EN_CONTRA") => {
    startTransition(async () => {
      const res = await votarComite(idIncidencia, decision);
      if (res.message) toast.error(res.message);
      else toast.success(decision === "A_FAVOR" ? "Voto a favor registrado" : "Voto en contra registrado");
    });
  };

  const ejecutarObservar = () => {
    if (!observacion.trim()) {
      toast.error("Escribe las observaciones");
      return;
    }
    startTransition(async () => {
      const res = await observarCasoComite(idIncidencia, observacion);
      if (res.message) toast.error(res.message);
      else {
        toast.success("Caso observado y devuelto al GRD");
        setObservacion("");
      }
    });
  };

  return (
    <section className="rounded-lg border p-4 space-y-4">
      <header className="flex items-baseline justify-between">
        <h3 className="text-base font-semibold">Votación del Comité</h3>
        <span className="text-sm text-muted-foreground">
          Umbral: {tally.umbral} de {tally.n}
        </span>
      </header>

      <div className="grid grid-cols-3 gap-3 text-sm">
        <div className="rounded-md bg-emerald-50 p-3 text-emerald-900">
          A favor: <strong>{tally.aFavor}</strong>
        </div>
        <div className="rounded-md bg-rose-50 p-3 text-rose-900">
          En contra: <strong>{tally.enContra}</strong>
        </div>
        <div className="rounded-md bg-slate-50 p-3 text-slate-900">
          Pendientes: <strong>{tally.pendientes}</strong>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium mb-2">Detalle de votos</h4>
        <ul className="text-sm space-y-1">
          {tally.votos.map((v) => (
            <li key={v.idUsuarioGRD} className="flex justify-between">
              <span>{v.nombre}</span>
              <span className={v.decision === "A_FAVOR" ? "text-emerald-700" : "text-rose-700"}>
                {v.decision === "A_FAVOR" ? "A favor" : "En contra"}
              </span>
            </li>
          ))}
          {tally.pendientesNombres.map((nombre) => (
            <li key={nombre} className="flex justify-between text-muted-foreground">
              <span>{nombre}</span>
              <span>Pendiente</span>
            </li>
          ))}
        </ul>
      </div>

      {soyMiembroDelComite && (
        <div className="space-y-3 border-t pt-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => ejecutarVoto("A_FAVOR")}
              disabled={isPending || miVoto === "A_FAVOR"}
              className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm text-white disabled:opacity-60"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Votar a favor
            </button>
            <button
              type="button"
              onClick={() => ejecutarVoto("EN_CONTRA")}
              disabled={isPending || miVoto === "EN_CONTRA"}
              className="inline-flex items-center gap-2 rounded-md bg-rose-600 px-3 py-2 text-sm text-white disabled:opacity-60"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              Votar en contra
            </button>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="obs-comite">
              Observar y devolver al GRD
            </label>
            <textarea
              id="obs-comite"
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              rows={3}
              className="w-full rounded-md border p-2 text-sm"
              placeholder="Describe qué falta o qué se debe corregir"
            />
            <button
              type="button"
              onClick={ejecutarObservar}
              disabled={isPending || !observacion.trim()}
              className="inline-flex items-center gap-2 rounded-md bg-amber-600 px-3 py-2 text-sm text-white disabled:opacity-60"
            >
              <MessageSquareWarning className="w-4 h-4" />
              Observar caso
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
