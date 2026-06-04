"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { HandHeart, CheckCircle, XCircle, AlertCircle, Clock, Eye } from "lucide-react";
import { toast } from "sonner";
import { aprobarCaso, observarCaso, rechazarCaso } from "@/app/actions/incidents";
import { PaginationControls } from "@/app/ui/shared/pagination-controls";

type Informe = {
  analisisSituacion?: string;
  hallazgosTexto?: string;
  conclusiones?: string;
  nivelUrgencia?: string;
  tipoIntervencion?: string;
  recomendacionComite?: string;
} | null;

export type Caso = {
  id: string;
  codigo: string | null;
  titulo: string | null;
  estado: string;
  categoria: string | null;
  gravedad: string | null;
  parroquia: string | null;
  direccion: string | null;
  descripcion: string | null;
  solicitudTipo: string | null;
  solicitudNecesidad: string | null;
  informe: Informe;
};

const STATUS_COLOR: Record<string, string> = {
  "EN EVALUACION": "bg-purple-50 text-purple-700",
  OBSERVADO: "bg-amber-50 text-amber-700",
  APROBADO: "bg-green-50 text-green-700",
  ATENDIDO: "bg-cyan-50 text-cyan-700",
  "SEGUIMIENTO ABIERTO": "bg-teal-50 text-teal-700",
  RECHAZADO: "bg-red-50 text-red-700",
  CERRADO: "bg-gray-50 text-gray-700",
};

const PENDIENTES = ["EN EVALUACION", "OBSERVADO"];
const QUEUE_PAGE_SIZE = 9;
const HISTORY_PAGE_SIZE = 9;

export function DonacionesModule({ casos, canEvaluate }: { casos: Caso[]; canEvaluate: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(
    casos.find((c) => PENDIENTES.includes(c.estado))?.id ?? null
  );
  const [notes, setNotes] = useState("");
  const [queuePage, setQueuePage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);

  const queue = casos.filter((c) => PENDIENTES.includes(c.estado));
  const closed = casos.filter((c) => !PENDIENTES.includes(c.estado));
  const current = casos.find((c) => c.id === selectedId) ?? null;

  const totalQueuePages = Math.max(1, Math.ceil(queue.length / QUEUE_PAGE_SIZE));
  const safeQueuePage = Math.min(queuePage, totalQueuePages);
  const queueStart = (safeQueuePage - 1) * QUEUE_PAGE_SIZE;
  const paginatedQueue = queue.slice(queueStart, queueStart + QUEUE_PAGE_SIZE);
  const queueFrom = queue.length === 0 ? 0 : queueStart + 1;
  const queueTo = Math.min(queueStart + QUEUE_PAGE_SIZE, queue.length);

  const totalHistoryPages = Math.max(1, Math.ceil(closed.length / HISTORY_PAGE_SIZE));
  const safeHistoryPage = Math.min(historyPage, totalHistoryPages);
  const historyStart = (safeHistoryPage - 1) * HISTORY_PAGE_SIZE;
  const paginatedHistory = closed.slice(historyStart, historyStart + HISTORY_PAGE_SIZE);
  const historyFrom = closed.length === 0 ? 0 : historyStart + 1;
  const historyTo = Math.min(historyStart + HISTORY_PAGE_SIZE, closed.length);

  useEffect(() => {
    if (queuePage > totalQueuePages) setQueuePage(totalQueuePages);
  }, [queuePage, totalQueuePages]);

  useEffect(() => {
    if (historyPage > totalHistoryPages) setHistoryPage(totalHistoryPages);
  }, [historyPage, totalHistoryPages]);

  const decidir = (accion: "APROBAR" | "OBSERVAR" | "RECHAZAR") => {
    if (!current) return;
    if (!notes.trim()) {
      toast.error("Escribe la justificación de la decisión.");
      return;
    }
    const fn =
      accion === "APROBAR"
        ? () => aprobarCaso(current.id, notes)
        : accion === "OBSERVAR"
          ? () => observarCaso(current.id, notes)
          : () => rechazarCaso(current.id, notes);
    startTransition(async () => {
      const res = await fn();
      if (res?.message && /no se pudo|no permitida|obligatori/i.test(res.message)) {
        toast.error(res.message);
        return;
      }
      toast.success("Decisión registrada.");
      setNotes("");
      setSelectedId(null);
      router.refresh();
    });
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-[var(--caritas-green)]/10 rounded-lg flex items-center justify-center">
          <HandHeart className="w-5 h-5 text-[var(--caritas-green)]" />
        </div>
        <div>
          <h1 className="text-[var(--caritas-text)]">Gestión de Donaciones</h1>
          <p className="text-sm text-gray-500">Evaluación del Comité sobre solicitudes de apoyo</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat
          n={queue.length}
          label="Pendientes de evaluación"
          cls="bg-purple-50 border-purple-200 text-purple-900"
        />
        <Stat
          n={casos.filter((c) => c.estado === "APROBADO" || c.estado === "ATENDIDO").length}
          label="Aprobadas"
          cls="bg-green-50 border-green-200 text-green-900"
        />
        <Stat
          n={casos.filter((c) => c.estado === "SEGUIMIENTO ABIERTO").length}
          label="En seguimiento"
          cls="bg-teal-50 border-teal-200 text-teal-900"
        />
        <Stat
          n={casos.filter((c) => c.estado === "RECHAZADO").length}
          label="Rechazadas"
          cls="bg-red-50 border-red-200 text-red-900"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Cola + historial */}
        <div className="lg:col-span-2 bg-white border border-[var(--caritas-border)] rounded-xl overflow-hidden">
          <div className="bg-purple-700 px-4 py-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-white" />
            <p className="text-white font-bold text-sm">Cola de Evaluación ({queue.length})</p>
          </div>
          {queue.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No hay casos pendientes</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {paginatedQueue.map((c) => (
                <CasoRow
                  key={c.id}
                  c={c}
                  selected={selectedId === c.id}
                  onClick={() => setSelectedId(c.id)}
                />
              ))}
            </div>
          )}
          <PaginationControls
            total={queue.length}
            start={queueFrom}
            end={queueTo}
            page={safeQueuePage}
            totalPages={totalQueuePages}
            onPrevious={() => setQueuePage((page) => Math.max(1, page - 1))}
            onNext={() => setQueuePage((page) => Math.min(totalQueuePages, page + 1))}
            className="rounded-none border-x-0 border-b-0"
          />
          {closed.length > 0 && (
            <>
              <div className="bg-gray-50 border-t border-gray-200 px-4 py-2">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Historial ({closed.length})
                </p>
              </div>
              <div className="divide-y divide-gray-100">
                {paginatedHistory.map((c) => (
                  <CasoRow
                    key={c.id}
                    c={c}
                    selected={selectedId === c.id}
                    onClick={() => setSelectedId(c.id)}
                    compact
                  />
                ))}
              </div>
              <PaginationControls
                total={closed.length}
                start={historyFrom}
                end={historyTo}
                page={safeHistoryPage}
                totalPages={totalHistoryPages}
                onPrevious={() => setHistoryPage((page) => Math.max(1, page - 1))}
                onNext={() => setHistoryPage((page) => Math.min(totalHistoryPages, page + 1))}
                className="rounded-none border-x-0 border-b-0"
              />
            </>
          )}
        </div>

        {/* Detalle */}
        <div className="lg:col-span-3">
          {!current ? (
            <div className="bg-white border border-[var(--caritas-border)] rounded-xl p-12 text-center h-full flex flex-col items-center justify-center">
              <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm font-medium">
                Selecciona un caso para ver el detalle
              </p>
            </div>
          ) : (
            <div className="bg-white border border-[var(--caritas-border)] rounded-xl overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-mono text-gray-400">{current.codigo}</p>
                  <p className="text-base font-bold text-gray-900 leading-tight">
                    {current.titulo}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {[current.direccion, current.parroquia].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <span
                  className={`flex-shrink-0 px-3 py-1 text-xs rounded-full font-semibold ${STATUS_COLOR[current.estado] ?? "bg-gray-100"}`}
                >
                  {current.estado}
                </span>
              </div>

              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {[
                    { label: "Categoría", value: current.categoria },
                    { label: "Gravedad", value: current.gravedad },
                    { label: "Tipo de ayuda", value: current.solicitudTipo },
                  ]
                    .filter((f) => f.value)
                    .map(({ label, value }) => (
                      <div
                        key={label}
                        className="bg-gray-50 rounded-lg p-2.5 border border-gray-100"
                      >
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">
                          {label}
                        </p>
                        <p className="text-xs font-semibold text-gray-900">{value}</p>
                      </div>
                    ))}
                </div>

                {current.descripcion && (
                  <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">
                      Descripción del evento
                    </p>
                    <p className="text-xs text-gray-800">{current.descripcion}</p>
                  </div>
                )}

                {current.informe && (
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-bold text-purple-800 uppercase tracking-wider">
                      Informe del Especialista GRD
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Urgencia" value={current.informe.nivelUrgencia} />
                      <Field label="Intervención" value={current.informe.tipoIntervencion} />
                    </div>
                    {current.informe.analisisSituacion && (
                      <Block
                        label="Análisis de la situación"
                        value={current.informe.analisisSituacion}
                      />
                    )}
                    {current.informe.hallazgosTexto && (
                      <Block label="Hallazgos" value={current.informe.hallazgosTexto} />
                    )}
                    {current.informe.recomendacionComite && (
                      <Block
                        label="Recomendación al Comité"
                        value={`"${current.informe.recomendacionComite}"`}
                        italic
                      />
                    )}
                  </div>
                )}

                {canEvaluate && PENDIENTES.includes(current.estado) ? (
                  <div className="border-t border-gray-100 pt-4 space-y-3">
                    <p className="text-xs font-bold text-gray-700">Resolución del Comité</p>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder="Justificación, criterios aplicados, monto o kit aprobado..."
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-400 resize-none"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => decidir("APROBAR")}
                        disabled={pending}
                        className="flex flex-col items-center gap-1 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-lg disabled:opacity-50"
                      >
                        <CheckCircle className="w-4 h-4" /> Aprobar
                      </button>
                      <button
                        onClick={() => decidir("OBSERVAR")}
                        disabled={pending}
                        className="flex flex-col items-center gap-1 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-white font-bold text-xs rounded-lg disabled:opacity-50"
                      >
                        <AlertCircle className="w-4 h-4" /> Observar
                      </button>
                      <button
                        onClick={() => decidir("RECHAZAR")}
                        disabled={pending}
                        className="flex flex-col items-center gap-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold text-xs rounded-lg disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" /> Rechazar
                      </button>
                    </div>
                  </div>
                ) : (
                  <Link
                    href={`/grd/${current.id}`}
                    className="mt-2 flex items-center gap-1.5 text-xs text-[var(--caritas-green)] hover:underline"
                  >
                    <Eye className="w-3.5 h-3.5" /> Ver detalle completo del incidente
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ n, label, cls }: { n: number; label: string; cls: string }) {
  return (
    <div className={`border rounded-xl p-4 ${cls}`}>
      <p className="text-2xl font-bold">{n}</p>
      <p className="text-xs opacity-80">{label}</p>
    </div>
  );
}
function CasoRow({
  c,
  selected,
  onClick,
  compact,
}: {
  c: Caso;
  selected: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 ${compact ? "py-2.5" : "py-3"} hover:bg-purple-50 transition-colors ${selected ? "bg-purple-50 border-r-4 border-r-purple-600" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-mono text-gray-400">{c.codigo}</p>
          <p
            className={`${compact ? "text-xs font-medium" : "text-sm font-semibold"} text-gray-900 leading-tight truncate`}
          >
            {c.titulo}
          </p>
        </div>
        <span
          className={`flex-shrink-0 px-2 py-0.5 text-[10px] rounded-full font-semibold ${STATUS_COLOR[c.estado] ?? "bg-gray-100"}`}
        >
          {c.estado}
        </span>
      </div>
    </button>
  );
}
function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div className="bg-white rounded-lg p-2.5 border border-purple-100">
      <p className="text-[10px] text-gray-400 mb-0.5">{label}</p>
      <p className="text-xs font-bold text-purple-800">{value ?? "—"}</p>
    </div>
  );
}
function Block({ label, value, italic }: { label: string; value: string; italic?: boolean }) {
  return (
    <div className="bg-white rounded-lg p-3 border border-purple-100">
      <p className="text-[10px] text-purple-700 font-semibold mb-1">{label}:</p>
      <p className={`text-xs text-gray-700 ${italic ? "italic" : ""}`}>{value}</p>
    </div>
  );
}
