import { useState, useTransition } from "react";
import { toast } from "sonner";
import { X, UserCheck, Search } from "lucide-react";
import { assignEquipo, autoasignarme, iniciarSeguimientoCaso } from "@/app/actions/incidents";
import type { IncidenciaDetalleOutput } from "@/core/application/dtos/IncidenciaDetalleDTO";
import { inputCls, textareaCls, btnGhost, btnPrimary } from "@/app/ui/grd/incidente/lib/ui-classes";

/**
 * Sub-panel para asignar el responsable del seguimiento.
 * Reutiliza las mismas acciones de asignación de brigadistas / autoasignarse.
 */
export function AsignarSeguimientoPanel({
  data,
  onCancel,
  onListo,
}: {
  data: IncidenciaDetalleOutput;
  onCancel: () => void;
  onListo: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState<"brigadista" | "auto">("brigadista");
  const [responsable, setResponsable] = useState("");
  const [query, setQuery] = useState("");
  const [instrucciones, setInstrucciones] = useState("");

  const esRecomendado = (parroquia: string | null) =>
    !!data.parroquia &&
    !!parroquia &&
    parroquia.trim().toLowerCase() === data.parroquia.trim().toLowerCase();

  const catalogo = data.brigadistasDisponibles
    .filter((b) => b.id !== responsable)
    .filter((b) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return (
        `${b.nombres} ${b.apellidos ?? ""}`.toLowerCase().includes(q) ||
        (b.parroquia ?? "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const aDisp = a.disponibilidad === "DISPONIBLE" ? 1 : 0;
      const bDisp = b.disponibilidad === "DISPONIBLE" ? 1 : 0;
      if (bDisp !== aDisp) return bDisp - aDisp;
      return Number(esRecomendado(b.parroquia)) - Number(esRecomendado(a.parroquia));
    });

  const respBrig = data.brigadistasDisponibles.find((b) => b.id === responsable);

  function confirmarBrigadista() {
    if (!responsable) {
      toast.error("Designa un brigadista responsable del seguimiento.");
      return;
    }
    startTransition(async () => {
      const asg = await assignEquipo(data.idIncidencia, responsable, [], instrucciones);
      if (asg && "message" in asg) {
        toast.error(asg.message);
        return;
      }
      const seg = await iniciarSeguimientoCaso(data.idIncidencia);
      if (seg && "message" in seg) {
        toast.error(seg.message);
        return;
      }
      toast.success("Responsable asignado. Seguimiento iniciado.");
      onListo();
    });
  }

  function confirmarAuto() {
    startTransition(async () => {
      const asg = await autoasignarme(data.idIncidencia, instrucciones);
      if (asg && "message" in asg) {
        toast.error(asg.message);
        return;
      }
      const seg = await iniciarSeguimientoCaso(data.idIncidencia);
      if (seg && "message" in seg) {
        toast.error(seg.message);
        return;
      }
      toast.success("Te asignaste el seguimiento. Seguimiento iniciado.");
      onListo();
    });
  }

  return (
    <div className="space-y-3 border border-green-200 rounded-xl p-4 bg-green-50/40">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-green-800 uppercase tracking-wider">
          Asignar responsable del seguimiento
        </p>
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="text-gray-400 hover:text-gray-600 p-1 disabled:opacity-50"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab("brigadista")}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${
            tab === "brigadista"
              ? "bg-green-600 text-white border-green-600"
              : "border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          Asignar brigadista
        </button>
        <button
          type="button"
          onClick={() => setTab("auto")}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${
            tab === "auto"
              ? "bg-green-600 text-white border-green-600"
              : "border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          Hacerme responsable
        </button>
      </div>

      {tab === "brigadista" ? (
        <div className="space-y-3">
          {/* Responsable seleccionado */}
          {respBrig && (
            <div className="flex items-center justify-between gap-2 bg-white border border-green-200 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <UserCheck className="w-4 h-4 text-green-700" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-900 truncate">
                    {respBrig.nombres} {respBrig.apellidos ?? ""}
                  </p>
                  <p className="text-[10px] text-gray-500">{respBrig.parroquia ?? "—"} · Responsable</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResponsable("")}
                className="text-gray-400 hover:text-red-500 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Buscador + catálogo */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar brigadista por nombre o parroquia..."
              className={`${inputCls} pl-9`}
            />
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1.5">
            {catalogo.length === 0 ? (
              <p className="text-[11px] text-gray-400 italic px-1 py-2">
                No hay brigadistas disponibles que coincidan.
              </p>
            ) : (
              catalogo.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setResponsable(b.id)}
                  className="w-full flex items-center justify-between gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 hover:border-green-300 hover:bg-green-50 text-left"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-900 truncate">
                      {b.nombres} {b.apellidos ?? ""}
                    </p>
                    <p className="text-[10px] text-gray-500">{b.parroquia ?? "—"}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {esRecomendado(b.parroquia) && (
                      <span className="text-[9px] bg-green-100 text-green-700 rounded-full px-1.5 py-0.5 font-semibold">
                        Recomendado
                      </span>
                    )}
                    <span
                      className={`text-[9px] rounded-full px-1.5 py-0.5 font-semibold ${
                        b.disponibilidad === "DISPONIBLE"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {b.disponibilidad === "DISPONIBLE" ? "Disponible" : b.disponibilidad}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>

          <textarea
            rows={2}
            className={textareaCls}
            value={instrucciones}
            onChange={(e) => setInstrucciones(e.target.value)}
            placeholder="Instrucciones para el seguimiento (opcional)..."
          />

          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onCancel} disabled={isPending} className={btnGhost}>
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmarBrigadista}
              disabled={isPending || !responsable}
              className={btnPrimary}
              style={{ background: "var(--caritas-green)" }}
            >
              {isPending ? "Asignando..." : "Asignar e iniciar seguimiento"}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-white border border-green-200 rounded-lg p-3 text-xs text-gray-600">
            Te asignarás como responsable único del seguimiento de este caso.
          </div>
          <textarea
            rows={2}
            className={textareaCls}
            value={instrucciones}
            onChange={(e) => setInstrucciones(e.target.value)}
            placeholder="Notas del seguimiento (opcional)..."
          />
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onCancel} disabled={isPending} className={btnGhost}>
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmarAuto}
              disabled={isPending}
              className={btnPrimary}
              style={{ background: "var(--caritas-green)" }}
            >
              {isPending ? "Asignando..." : "Asignarme e iniciar seguimiento"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
