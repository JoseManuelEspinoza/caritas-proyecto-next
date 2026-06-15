import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Pencil,
  UserCheck,
  Users,
  UserPlus,
  Search,
  Star,
  Plus,
  Loader2,
  Sparkles,
  Navigation,
} from "lucide-react";
import { assignEquipo, autoasignarme } from "@/app/actions/incidents";
import type {
  IncidenciaDetalleOutput,
  BrigadistaDisponible,
} from "@/core/application/dtos/IncidenciaDetalleDTO";
import type {
  CandidatoSugerido,
  FaseResultado,
} from "@/core/application/dtos/SugerenciaBrigadistasDTO";
import { permisosDeDetalle } from "@/app/lib/permisos-incidencia";
import { BrigCard } from "@/app/ui/grd/incidente/components/BrigadistaCard";
import { avatarColor, iniciales } from "@/app/ui/grd/incidente/lib/avatar";

// ── Algoritmo de sugerencia (RF36) ────────────────────────────────────────────

/** El endpoint valida un enum cerrado; el tipoEvento del caso es texto libre. */
const TIPO_INCIDENTE_MAP: Record<string, string> = {
  incendio: "INCENDIO",
  inundacion: "INUNDACION",
  inundación: "INUNDACION",
  derrumbe: "DERRUMBE",
  deslizamiento: "DERRUMBE",
  huaico: "DERRUMBE",
  tsunami: "TSUNAMI",
  sismo: "COLAPSO_INFRAESTRUCTURA",
  terremoto: "COLAPSO_INFRAESTRUCTURA",
  vendaval: "PERDIDA_VIVIENDA",
};

function mapTipoIncidente(tipoEvento: string | null): string {
  const t = (tipoEvento ?? "").trim().toLowerCase();
  for (const [clave, valor] of Object.entries(TIPO_INCIDENTE_MAP)) {
    if (t.includes(clave)) return valor;
  }
  return "COLAPSO_INFRAESTRUCTURA";
}

const FASE_LABEL: Record<FaseResultado, string> = {
  F1: "Fase 1 — brigadistas de la misma parroquia, ordenados por confianza",
  F2: "Fase 2 — parroquias cercanas (grafo), por score combinado",
  F2B: "Fase 2B — voluntarios/aliados de la zona",
  F3: "Sin candidatos disponibles",
};

type SugerenciaInfo = { fase: FaseResultado; mensaje: string | null; total: number };
type ScoreSugerido = { rank: number; score: number | null; dist: number | null; nivel: number | null };

/** Paso "Asignar Equipo": designa responsable + integrantes (drag&drop) o autoasignación. */
export function AsignacionStep({
  data,
  onDone,
}: {
  data: IncidenciaDetalleOutput;
  onDone: () => void;
}) {
  const { puedeAsignar: canAct } = permisosDeDetalle(data);
  const puedeEditar =
    canAct &&
    (data.estadoActual === "ABIERTO" ||
      (data.estadoActual === "ASIGNADO" && !data.informes.some((i) => i.tipo === "CAMPO")));
  const tieneEquipo = data.asignaciones.length > 0 || Boolean(data.responsableGRD);
  const puedeAutoasignarse = data.role === "especialistaGRD";

  const respInicial = data.asignaciones.find((a) => a.esResponsable)?.brigadistaId ?? "";
  const equipoInicial = data.asignaciones
    .filter((a) => !a.esResponsable)
    .map((a) => a.brigadistaId);

  const [editing, setEditing] = useState(!tieneEquipo && puedeEditar);
  const [tab, setTab] = useState<"equipo" | "auto">("equipo");
  const [responsable, setResponsable] = useState(respInicial);
  const [equipo, setEquipo] = useState<string[]>(equipoInicial);
  const [query, setQuery] = useState("");
  const [instrucciones, setInstrucciones] = useState(data.instruccionesAsignacion ?? "");
  const [isPending, startTransition] = useTransition();
  const [dragging, setDragging] = useState<{
    id: string;
    from: "responsable" | "equipo" | "catalogo";
  } | null>(null);

  // ── Sugerencia con algoritmo (RF36) ──
  const [sugiriendo, setSugiriendo] = useState(false);
  const [sugInfo, setSugInfo] = useState<SugerenciaInfo | null>(null);
  const [sugScores, setSugScores] = useState<Map<string, ScoreSugerido>>(new Map());
  const [extraSug, setExtraSug] = useState<BrigadistaDisponible[]>([]);

  async function handleSugerir() {
    if (!data.idParroquia) {
      toast.error(
        "El incidente no tiene una parroquia del sistema registrada; el algoritmo necesita una parroquia de partida."
      );
      return;
    }
    setSugiriendo(true);
    try {
      const res = await fetch("/api/grd/asignar-brigadista", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idParroquia: data.idParroquia,
          latitud: data.latitud,
          longitud: data.longitud,
          tipoIncidente: mapTipoIncidente(data.tipoEvento),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? "No se pudo generar la sugerencia.");

      const lista = (json.listaSugerida ?? []) as CandidatoSugerido[];
      const scores = new Map<string, ScoreSugerido>();
      lista.forEach((c, i) =>
        scores.set(c.idBrigadistaParroquial, {
          rank: i,
          score: c.scoreFinal ?? c.scoreConfianza ?? null,
          dist: c.distanciaKm,
          nivel: c.nivel ?? null,
        })
      );
      setSugScores(scores);
      setSugInfo({ fase: json.faseResultado, mensaje: json.mensaje ?? null, total: lista.length });

      // Candidatos sugeridos que no estaban en la lista visible (top 100 por nombre)
      const conocidos = new Set(data.brigadistasDisponibles.map((b) => b.id));
      setExtraSug(
        lista
          .filter((c) => !conocidos.has(c.idBrigadistaParroquial))
          .map((c) => ({
            id: c.idBrigadistaParroquial,
            nombres: c.nombres,
            apellidos: c.apellidos,
            celular: c.celular,
            disponibilidad: c.disponibilidad,
            parroquia: c.nombreParroquia,
          }))
      );

      if (lista.length === 0) {
        toast.info(json.mensaje ?? "El algoritmo no encontró candidatos disponibles.");
      } else {
        toast.success(`El algoritmo sugirió ${lista.length} candidato(s), ordenados al inicio.`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo generar la sugerencia.");
    } finally {
      setSugiriendo(false);
    }
  }

  const seleccionados = [responsable, ...equipo].filter(Boolean);
  const esRecomendado = (parroquia: string | null) =>
    !!data.parroquia &&
    !!parroquia &&
    parroquia.trim().toLowerCase() === data.parroquia.trim().toLowerCase();

  const catalogo = [...data.brigadistasDisponibles, ...extraSug]
    .filter((b) => !seleccionados.includes(b.id))
    .filter((b) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return (
        `${b.nombres} ${b.apellidos ?? ""}`.toLowerCase().includes(q) ||
        (b.parroquia ?? "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      // Los sugeridos por el algoritmo van primero, en su orden de ranking.
      const ra = sugScores.get(a.id)?.rank ?? Infinity;
      const rb = sugScores.get(b.id)?.rank ?? Infinity;
      if (ra !== rb) return ra - rb;
      const aDisp = a.disponibilidad === "DISPONIBLE" ? 1 : 0;
      const bDisp = b.disponibilidad === "DISPONIBLE" ? 1 : 0;
      if (bDisp !== aDisp) return bDisp - aDisp;
      return Number(esRecomendado(b.parroquia)) - Number(esRecomendado(a.parroquia));
    });

  function findBrig(id: string) {
    return (
      data.brigadistasDisponibles.find((b) => b.id === id) ??
      extraSug.find((b) => b.id === id) ??
      data.asignaciones.find((a) => a.brigadistaId === id)
    );
  }

  function agregarBrigadista(id: string) {
    if (!responsable) setResponsable(id);
    else if (!equipo.includes(id) && id !== responsable) setEquipo((prev) => [...prev, id]);
  }

  function iniciarEdicion() {
    setResponsable(respInicial);
    setEquipo(equipoInicial);
    setInstrucciones(data.instruccionesAsignacion ?? "");
    setTab(data.responsableGRD ? "auto" : "equipo");
    setEditing(true);
  }

  function handleGuardarEquipo() {
    if (!responsable) {
      toast.error("Debes designar un brigadista responsable");
      return;
    }
    startTransition(async () => {
      const res = await assignEquipo(data.idIncidencia, responsable, equipo, instrucciones);
      if (res && "message" in res) {
        toast.error(res.message);
        return;
      }
      const total = 1 + equipo.length;
      toast.success(
        total === 1 ? "Equipo asignado correctamente" : `Equipo de ${total} personas asignado`
      );
      setEditing(false);
      onDone();
    });
  }

  function handleAutoasignarme() {
    startTransition(async () => {
      const res = await autoasignarme(data.idIncidencia, instrucciones);
      if (res && "message" in res) {
        toast.error(res.message);
        return;
      }
      toast.success("Te autoasignaste como único responsable del caso");
      setEditing(false);
      onDone();
    });
  }

  if (!canAct && !tieneEquipo) {
    return (
      <p className="text-sm text-gray-500 text-center py-4">
        Solo el Especialista GRD puede gestionar la asignación del equipo.
      </p>
    );
  }

  if (data.estadoActual !== "ABIERTO" && !tieneEquipo && !puedeEditar) {
    return (
      <p className="text-sm text-gray-500 text-center py-4">
        No hay equipo asignado para este incidente.
      </p>
    );
  }

  if (tieneEquipo && !editing) {
    const respBrig = data.asignaciones.find((a) => a.esResponsable);
    const integrantes = data.asignaciones.filter((a) => !a.esResponsable);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Equipo asignado</p>
          {puedeEditar && (
            <button
              type="button"
              onClick={iniciarEdicion}
              className="p-2 rounded-lg border border-[#DDDDDD] text-gray-600 hover:bg-gray-50 hover:text-[var(--caritas-green)] transition-colors"
              title="Editar asignación"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
        </div>

        {data.responsableGRD ? (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
            <span className="text-[10px] font-bold uppercase text-blue-700">
              Especialista GRD — Responsable único
            </span>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--caritas-green)]/20 flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-[var(--caritas-green)]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{data.responsableGRD.nombre}</p>
                {data.responsableGRD.correo && (
                  <p className="text-xs text-gray-500">{data.responsableGRD.correo}</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {respBrig && (
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1.5">Responsable</p>
                <BrigCard
                  id={respBrig.brigadistaId}
                  nombres={respBrig.nombres}
                  apellidos={respBrig.apellidos}
                  parroquia={respBrig.parroquia}
                  celular={respBrig.celular}
                  badge="RESPONSABLE"
                />
              </div>
            )}
            {integrantes.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1.5">
                  Equipo ({integrantes.length})
                </p>
                <div className="space-y-2">
                  {integrantes.map((m) => (
                    <BrigCard
                      key={m.brigadistaId}
                      id={m.brigadistaId}
                      nombres={m.nombres}
                      apellidos={m.apellidos}
                      parroquia={m.parroquia}
                      celular={m.celular}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {data.instruccionesAsignacion && (
          <div className="bg-[#91D723]/10 border border-[#91D723]/30 rounded-lg px-3 py-2">
            <p className="text-[10px] text-[#009850] uppercase font-semibold mb-0.5">Instrucciones</p>
            <p className="text-xs text-[#009850]">{data.instruccionesAsignacion}</p>
          </div>
        )}

        {data.estadoActual === "ASIGNADO" && (
          <p className="text-[10px] text-gray-400">
            El incidente está en estado Asignado. El equipo puede iniciar el levantamiento en campo.
          </p>
        )}
      </div>
    );
  }

  if (!puedeEditar) {
    return (
      <p className="text-sm text-gray-500 text-center py-4">
        La asignación ya no puede modificarse en esta etapa.
      </p>
    );
  }

  return (
    <div className="space-y-4 border border-gray-200 rounded-2xl overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-sm font-medium text-gray-700">
          {tieneEquipo ? "Modificar asignación" : "Nueva asignación"}
        </h2>
        {tieneEquipo && (
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-xs font-bold text-[#009850] hover:text-gray-800 cursor-pointer"
          >
            Cancelar
          </button>
        )}
      </div>

      <div className="px-4 space-y-4 pb-4">
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
          <button
            type="button"
            onClick={() => setTab("equipo")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === "equipo"
                ? "bg-white text-[var(--caritas-green)] shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Users className="w-4 h-4" /> Asignar brigadistas
          </button>
          {puedeAutoasignarse && (
            <button
              type="button"
              onClick={() => setTab("auto")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === "auto"
                  ? "bg-white text-[var(--caritas-green)] shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <UserPlus className="w-4 h-4" /> Autoasignarme
            </button>
          )}
        </div>

        {tab === "equipo" ? (
          <>
            <p className="text-xs text-gray-600">
              Elige brigadistas con el buscador. El primero seleccionado será responsable; puedes
              reorganizarlo entre las áreas.
            </p>

            {seleccionados.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div
                  className={`border rounded-xl p-3 min-h-[88px] transition-colors ${
                    dragging && dragging.id !== responsable
                      ? "border-[#009850] bg-[#009850]/10"
                      : "border-[#00C8B4]/30 bg-[#00C8B4]/5"
                  }`}
                  onDragOver={(e) => {
                    if (dragging && dragging.id !== responsable) e.preventDefault();
                  }}
                  onDrop={() => {
                    if (!dragging || dragging.id === responsable) return;
                    const draggedId = dragging.id;
                    const from = dragging.from;
                    setDragging(null);
                    if (from === "equipo") {
                      // Intercambio: responsable actual baja a equipo
                      setEquipo((prev) => {
                        const sinDragged = prev.filter((x) => x !== draggedId);
                        return responsable ? [responsable, ...sinDragged] : sinDragged;
                      });
                      setResponsable(draggedId);
                    } else if (from === "catalogo") {
                      // Viene de la lista: si ya hay responsable, lo manda a equipo
                      if (responsable)
                        setEquipo((prev) => [...prev.filter((x) => x !== draggedId), responsable]);
                      else setEquipo((prev) => prev.filter((x) => x !== draggedId));
                      setResponsable(draggedId);
                    }
                  }}
                >
                  <p className="text-[10px] font-bold text-[#009850] uppercase mb-2">Responsable</p>
                  {responsable ? (
                    (() => {
                      const b = findBrig(responsable);
                      if (!b) return null;
                      return (
                        <BrigCard
                          id={responsable}
                          nombres={b.nombres}
                          apellidos={b.apellidos ?? null}
                          parroquia={b.parroquia ?? null}
                          celular={"celular" in b ? b.celular : null}
                          draggable
                          onDragStart={() => setDragging({ id: responsable, from: "responsable" })}
                          onDragEnd={() => setDragging(null)}
                          onRemove={() => {
                            if (equipo.length > 0) {
                              setResponsable(equipo[0]);
                              setEquipo((prev) => prev.slice(1));
                            } else setResponsable("");
                          }}
                        />
                      );
                    })()
                  ) : (
                    <p className="text-xs text-gray-400 italic">
                      {dragging
                        ? "Suelta aquí para asignar como responsable"
                        : "Selecciona un brigadista de la lista"}
                    </p>
                  )}
                </div>
                <div
                  className={`border rounded-xl p-3 min-h-[88px] transition-colors ${
                    dragging && dragging.from !== "equipo" && dragging.id !== responsable
                      ? "border-blue-400 bg-blue-50"
                      : "border-gray-200 bg-gray-50"
                  }`}
                  onDragOver={(e) => {
                    if (dragging && dragging.from !== "equipo" && dragging.id !== responsable)
                      e.preventDefault();
                  }}
                  onDrop={() => {
                    if (!dragging || dragging.from === "equipo" || dragging.id === responsable) return;
                    const draggedId = dragging.id;
                    setDragging(null);
                    if (dragging.from === "responsable") {
                      // Responsable baja a equipo, promueve el primero del equipo
                      const nuevoResponsable = equipo[0] ?? "";
                      setResponsable(nuevoResponsable);
                      setEquipo((prev) => [...prev.slice(1), draggedId]);
                    } else if (dragging.from === "catalogo") {
                      if (!equipo.includes(draggedId)) setEquipo((prev) => [...prev, draggedId]);
                    }
                  }}
                >
                  <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Equipo</p>
                  {equipo.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">
                      {dragging ? "Suelta aquí para agregar al equipo" : "Integrantes adicionales"}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {equipo.map((id) => {
                        const b = findBrig(id);
                        if (!b) return null;
                        return (
                          <BrigCard
                            key={id}
                            id={id}
                            nombres={b.nombres}
                            apellidos={b.apellidos ?? null}
                            parroquia={b.parroquia ?? null}
                            celular={"celular" in b ? b.celular : null}
                            draggable
                            onDragStart={() => setDragging({ id, from: "equipo" })}
                            onDragEnd={() => setDragging(null)}
                            onRemove={() => setEquipo((prev) => prev.filter((x) => x !== id))}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por nombre o parroquia..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-[#DDDDDD] rounded-lg focus:outline-none focus:border-[var(--caritas-green)]"
                />
              </div>
              <button
                type="button"
                onClick={handleSugerir}
                disabled={sugiriendo}
                title="Ordena la lista con el algoritmo de sugerencia (confianza + disponibilidad + cercanía)"
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-[var(--caritas-green)]/40 text-[var(--caritas-green)] hover:bg-[var(--caritas-green)]/5 transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {sugiriendo ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                Sugerir con algoritmo
              </button>
            </div>

            {sugInfo && (
              <div
                className={`px-3 py-2 rounded-lg border text-xs ${
                  sugInfo.fase === "F3" || sugInfo.total === 0
                    ? "bg-amber-50 border-amber-200 text-amber-800"
                    : "bg-[var(--caritas-green)]/5 border-[var(--caritas-green)]/30 text-[#007a40]"
                }`}
              >
                <p className="font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  {FASE_LABEL[sugInfo.fase] ?? "Sugerencia del algoritmo"}
                </p>
                {sugInfo.mensaje && <p className="mt-0.5">{sugInfo.mensaje}</p>}
              </div>
            )}

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1 border border-gray-100 rounded-xl">
              {catalogo.length === 0 ? (
                <p className="text-center py-6 text-sm text-gray-400">No hay brigadistas para mostrar</p>
              ) : (
                catalogo.map((b) => {
                  const rec = esRecomendado(b.parroquia);
                  const sug = sugScores.get(b.id);
                  return (
                    <button
                      type="button"
                      key={b.id}
                      draggable
                      onDragStart={() => setDragging({ id: b.id, from: "catalogo" })}
                      onDragEnd={() => setDragging(null)}
                      onClick={() => agregarBrigadista(b.id)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-left border-b border-gray-50 last:border-0 cursor-grab active:cursor-grabbing"
                    >
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${avatarColor(b.id)}`}
                      >
                        <span className="text-white text-xs font-bold">
                          {iniciales(b.nombres, b.apellidos)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {b.nombres} {b.apellidos ?? ""}
                          </p>
                          {sug && (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--caritas-green)]/10 text-[#007a40]"
                              title={`Sugerido por el algoritmo (puesto ${sug.rank + 1})`}
                            >
                              <Sparkles className="w-3 h-3" />
                              {sug.score != null ? `${Math.round(sug.score * 10)}%` : `#${sug.rank + 1}`}
                            </span>
                          )}
                          {sug?.dist != null && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">
                              <Navigation className="w-3 h-3" />
                              {sug.dist.toFixed(1)} km
                            </span>
                          )}
                          {rec && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">
                              <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> RECOMENDADO
                            </span>
                          )}
                          {b.disponibilidad === "EN CAMPO" && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700">
                              EN CAMPO
                            </span>
                          )}
                          {b.disponibilidad === "NO DISPONIBLE" && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-500">
                              NO DISPONIBLE
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          {b.parroquia ?? "—"}
                          {b.celular ? ` · ${b.celular}` : ""}
                        </p>
                      </div>
                      <Plus className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </button>
                  );
                })
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Instrucciones para el equipo
              </label>
              <textarea
                value={instrucciones}
                onChange={(e) => setInstrucciones(e.target.value)}
                rows={3}
                placeholder="Indicaciones, punto de encuentro, materiales..."
                className="w-full px-3 py-2 text-sm border border-[#DDDDDD] rounded-lg focus:outline-none focus:border-[var(--caritas-green)] resize-none"
              />
            </div>

            <button
              type="button"
              onClick={handleGuardarEquipo}
              disabled={isPending || !responsable}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold disabled:opacity-50"
              style={{ background: "var(--caritas-green)" }}
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  Guardar asignación{seleccionados.length > 0 ? ` (${seleccionados.length})` : ""}
                </>
              )}
            </button>
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <UserPlus className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">
                Serás el <strong>único responsable</strong> del levantamiento. No se asignará
                brigadista adicional.
                {data.estadoActual === "ABIERTO" && " El incidente pasará a estado Asignado."}
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Notas internas (opcional)
              </label>
              <textarea
                value={instrucciones}
                onChange={(e) => setInstrucciones(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-[#DDDDDD] rounded-lg focus:outline-none focus:border-[var(--caritas-green)] resize-none"
              />
            </div>
            <button
              type="button"
              onClick={handleAutoasignarme}
              disabled={isPending}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold disabled:opacity-50"
              style={{ background: "var(--caritas-green)" }}
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Autoasignarme como responsable
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
