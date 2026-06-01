"use client";

import { useEffect, useState, useMemo, useTransition } from "react";
import {
  HandHeart,
  CheckCircle,
  XCircle,
  Eye,
  AlertCircle,
  Clock,
  Package,
  ShieldCheck,
  FileText,
  Users,
  Camera,
  MapPin,
  Phone,
  AlertTriangle,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type {
  Incident,
  IncidentStatus,
  HistoryEntry,
} from "@/app/lib/incident-types";
import { initialIncidents } from "@/app/lib/incident-data";

const STATUS_COLOR: Record<IncidentStatus, string> = {
  ABIERTO: "bg-yellow-50 text-yellow-700",
  ASIGNADO: "bg-blue-50 text-blue-700",
  "DATA RECOPILADA": "bg-orange-50 text-orange-700",
  "EN EVALUACION": "bg-purple-50 text-purple-700",
  APROBADO: "bg-green-50 text-green-700",
  OBSERVADO: "bg-amber-50 text-amber-700",
  RECHAZADO: "bg-red-50 text-red-700",
  ATENDIDO: "bg-cyan-50 text-cyan-700",
  "SEGUIMIENTO ABIERTO": "bg-teal-50 text-teal-700",
  CERRADO: "bg-gray-50 text-gray-700",
};

const STATUS_LABEL: Record<IncidentStatus, string> = {
  ABIERTO: "Abierto",
  ASIGNADO: "Asignado",
  "DATA RECOPILADA": "Data Recopilada",
  "EN EVALUACION": "En Evaluación",
  APROBADO: "Aprobado",
  OBSERVADO: "Observado",
  RECHAZADO: "Rechazado",
  ATENDIDO: "Atendido",
  "SEGUIMIENTO ABIERTO": "Seguimiento Abierto",
  CERRADO: "Cerrado",
};

const nowIso = () => new Date().toISOString();

interface Props {
  canEvaluate: boolean;
  currentUser: string;
}

export function DonacionesModule({ canEvaluate, currentUser }: Props) {
  const [incidents, setIncidents] = useState<Incident[]>(initialIncidents);
  const [selected, setSelected] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const queue = useMemo(
    () => incidents.filter((i) => ["EN EVALUACION", "OBSERVADO"].includes(i.status)),
    [incidents],
  )
  const closed = useMemo(
    () => incidents.filter((i) => ["APROBADO", "ATENDIDO", "SEGUIMIENTO ABIERTO", "RECHAZADO", "CERRADO"].includes(i.status)),
    [incidents],
  )
  
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [parroquiaFilter, setParroquiaFilter] = useState("all")
  const [queuePage, setQueuePage] = useState(1)
  const [historyPage, setHistoryPage] = useState(1)

  const queueAll = useMemo(
    () => incidents.filter((i) => ["EN EVALUACION", "OBSERVADO"].includes(i.status)),
    [incidents],
  )
  const closedAll = useMemo(
    () => incidents.filter((i) => !["EN EVALUACION", "OBSERVADO"].includes(i.status)),
    [incidents],
  )

  const filteredIncidents = useMemo(() => {
    const q = search.trim().toLowerCase()
    return incidents.filter((i) => {
      if (statusFilter !== "all" && i.status !== statusFilter) return false
      if (categoryFilter !== "all" && i.categoria !== categoryFilter) return false
      if (parroquiaFilter !== "all" && (i.parroquia ?? "") !== parroquiaFilter) return false
      if (!q) return true
      return [
        i.codigo,
        i.titulo,
        i.estado,
        i.categoria,
        i.gravedad,
        i.parroquia,
        i.direccion,
        i.descripcion,
        i.solicitudTipo,
        i.solicitudNecesidad,
        i.informe?.analisisSituacion,
        i.informe?.hallazgosTexto,
        i.informe?.conclusiones,
        i.informe?.nivelUrgencia,
        i.informe?.tipoIntervencion,
        i.informe?.recomendacionComite,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    })
  }, [incidents, search, statusFilter, categoryFilter, parroquiaFilter])

  const queue = useMemo(
    () => filteredIncidents.filter((i) => ["EN EVALUACION", "OBSERVADO"].includes(i.status)),
    [filteredIncidents],
  )
  const closed = useMemo(
    () => filteredIncidents.filter((i) => !["EN EVALUACION", "OBSERVADO"].includes(i.status)),
    [filteredIncidents],
  )

  const queueTotalPages = Math.max(1, Math.ceil(queue.length / 10))
  const historyTotalPages = Math.max(1, Math.ceil(closed.length / 10))
  const safeQueuePage = Math.min(queuePage, queueTotalPages)
  const safeHistoryPage = Math.min(historyPage, historyTotalPages)
  const queueSlice = queue.slice((safeQueuePage - 1) * 10, safeQueuePage * 10)
  const historySlice = closed.slice((safeHistoryPage - 1) * 10, safeHistoryPage * 10)
  const queueFrom = queue.length === 0 ? 0 : (safeQueuePage - 1) * 10 + 1
  const queueTo = Math.min(queue.length, safeQueuePage * 10)
  const historyFrom = closed.length === 0 ? 0 : (safeHistoryPage - 1) * 10 + 1
  const historyTo = Math.min(closed.length, safeHistoryPage * 10)

  useEffect(() => {
    setQueuePage(1)
    setHistoryPage(1)
  }, [search, statusFilter, categoryFilter, parroquiaFilter])

  useEffect(() => {
    if (queuePage > queueTotalPages) setQueuePage(queueTotalPages)
  }, [queuePage, queueTotalPages])

  useEffect(() => {
    if (historyPage > historyTotalPages) setHistoryPage(historyTotalPages)
  }, [historyPage, historyTotalPages])

  const current = selected
    ? (incidents.find((i) => i.id === selected) ?? null)
    : null;

  const aprobarCaso = (id: string, notas: string) => {
    setIncidents((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        const entry: HistoryEntry = {
          id: `h-${Date.now()}`,
          user: currentUser,
          timestamp: nowIso(),
          action: "aprobacion",
          prevStatus: i.status,
          newStatus: "APROBADO",
          notes: notas,
        };
        return {
          ...i,
          status: "APROBADO",
          updatedAt: nowIso(),
          updatedBy: currentUser,
          history: [...(i.history ?? []), entry],
        };
      }),
    );
  };

  const observarCaso = (id: string, observaciones: string) => {
    setIncidents((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        const entry: HistoryEntry = {
          id: `h-${Date.now()}`,
          user: currentUser,
          timestamp: nowIso(),
          action: "observacion",
          prevStatus: i.status,
          newStatus: "OBSERVADO",
          notes: observaciones,
        };
        const updatedInforme = i.informeEvaluacion
          ? { ...i.informeEvaluacion, observacionesComite: observaciones }
          : i.informeEvaluacion;
        return {
          ...i,
          status: "OBSERVADO",
          informeEvaluacion: updatedInforme,
          updatedAt: nowIso(),
          updatedBy: currentUser,
          history: [...(i.history ?? []), entry],
        };
      }),
    );
  };

  const rechazarCaso = (id: string, notas: string) => {
    setIncidents((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        const entry: HistoryEntry = {
          id: `h-${Date.now()}`,
          user: currentUser,
          timestamp: nowIso(),
          action: "rechazo",
          prevStatus: i.status,
          newStatus: "RECHAZADO",
          notes: notas,
        };
        return {
          ...i,
          status: "RECHAZADO",
          updatedAt: nowIso(),
          updatedBy: currentUser,
          history: [...(i.history ?? []), entry],
        };
      }),
    );
  };

  const handleAprobar = () => {
    if (!current) return;
    if (!notes.trim()) {
      alert("Escribe las notas de aprobación");
      return;
    }
    aprobarCaso(current.id, notes);
    setSelected(null);
    setNotes("");
  };

  const handleObservar = () => {
    if (!current) return;
    if (!notes.trim()) {
      alert("Escribe las observaciones antes de devolver");
      return;
    }
    observarCaso(current.id, notes);
    setSelected(null);
    setNotes("");
  };

  const handleRechazar = () => {
    if (!current) return;
    if (!notes.trim()) {
      alert("Escribe el motivo de rechazo");
      return;
    }
    rechazarCaso(current.id, notes);
    setSelected(null);
    setNotes("");
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{
            backgroundColor:
              "color-mix(in srgb, var(--caritas-green) 10%, transparent)",
          }}
        >
          <HandHeart
            className="w-5 h-5"
            style={{ color: "var(--caritas-green)" }}
          />
        </div>
        <div>
          <h1
            className="font-bold text-lg"
            style={{ color: "var(--caritas-text)" }}
          >
            Gestión de Donaciones
          </h1>
          <p className="text-sm text-gray-500">
            Evaluación y decisión sobre solicitudes de apoyo
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-purple-900">{queueAll.length}</p>
          <p className="text-xs text-purple-700">Pendientes de evaluación</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-green-900">
            {
              incidents.filter(
                (i) => i.status === "APROBADO" || i.status === "ATENDIDO",
              ).length
            }
          </p>
          <p className="text-xs text-green-700">Donaciones aprobadas</p>
        </div>
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-teal-900">
            {incidents.filter((i) => i.status === "SEGUIMIENTO ABIERTO").length}
          </p>
          <p className="text-xs text-teal-700">En seguimiento</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-2xl font-bold text-red-900">
            {incidents.filter((i) => i.status === "RECHAZADO").length}
          </p>
          <p className="text-xs text-red-700">Rechazadas</p>
        </div>
      </div>

      <div className="bg-white border border-[var(--caritas-border)] rounded-xl p-4 mb-5 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1 lg:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por código, nombre, parroquia o descripción..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-[var(--caritas-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--caritas-green)]/20 focus:border-[var(--caritas-green)]"
            />
          </div>

          <div className="flex flex-1 flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-[var(--caritas-border)] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[var(--caritas-green)]/20 focus:border-[var(--caritas-green)]"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="relative flex-1">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-[var(--caritas-border)] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[var(--caritas-green)]/20 focus:border-[var(--caritas-green)]"
              >
                <option value="all">Todas las categorías</option>
                {[...new Set(incidents.map((i) => i.categoria).filter(Boolean))].map((cat) => (
                  <option key={cat as string} value={cat as string}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="relative flex-1">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={parroquiaFilter}
                onChange={(e) => setParroquiaFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-[var(--caritas-border)] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[var(--caritas-green)]/20 focus:border-[var(--caritas-green)]"
              >
                <option value="all">Todas las parroquias</option>
                {[...new Set(incidents.map((i) => i.parroquia).filter(Boolean))].map((p) => (
                  <option key={p as string} value={p as string}>{p}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-xs text-gray-500">
            {filteredIncidents.length} caso{filteredIncidents.length !== 1 ? "s" : ""} filtrado{filteredIncidents.length !== 1 ? "s" : ""}
          </p>
          {(search || statusFilter !== "all" || categoryFilter !== "all" || parroquiaFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearch("")
                setStatusFilter("all")
                setCategoryFilter("all")
                setParroquiaFilter("all")
              }}
              className="text-xs font-medium text-[var(--caritas-green)] hover:underline self-start sm:self-auto"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Cola de evaluación */}
        <div
          className="lg:col-span-2 bg-white border rounded-xl overflow-hidden"
          style={{ borderColor: "var(--caritas-border)" }}
        >
          <div className="bg-purple-700 px-4 py-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-white" />
            <p className="text-white font-bold text-sm">
              Cola de Evaluación ({queue.length})
            </p>
          </div>
          {queue.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                No hay incidentes pendientes
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {queueSlice.map((inc) => (
                <button
                  key={inc.id}
                  onClick={() => setSelected(inc.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-purple-50 transition-colors ${selected === inc.id ? "bg-purple-50 border-r-4 border-r-purple-600" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-mono text-gray-400">
                        {inc.id}
                      </p>
                      <p className="text-sm font-semibold text-gray-900 leading-tight truncate">
                        {inc.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {inc.distrito ?? inc.location}
                      </p>
                    </div>
                    <span
                      className={`flex-shrink-0 px-2 py-0.5 text-[10px] rounded-full font-semibold ${STATUS_COLOR[inc.status]}`}
                    >
                      {STATUS_LABEL[inc.status]}
                    </span>
                  </div>
                  {inc.informeEvaluacion && (

                {queue.length > 0 && (
                  <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50">
                    <p className="text-xs text-gray-500">Mostrando {queueFrom}-{queueTo} de {queue.length}</p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQueuePage((p) => Math.max(1, p - 1))}
                        disabled={safeQueuePage === 1}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-[var(--caritas-border)] rounded-lg bg-white text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" /> Anterior
                      </button>
                      <span className="text-xs text-gray-500 font-medium">{safeQueuePage} / {queueTotalPages}</span>
                      <button
                        type="button"
                        onClick={() => setQueuePage((p) => Math.min(queueTotalPages, p + 1))}
                        disabled={safeQueuePage === queueTotalPages}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-[var(--caritas-border)] rounded-lg bg-white text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Siguiente <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
                    <div className="mt-1.5 flex gap-2">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          inc.informeEvaluacion.nivelUrgencia === "Inmediata"
                            ? "bg-red-100 text-red-700"
                            : inc.informeEvaluacion.nivelUrgencia === "Alta"
                      {historySlice.map((inc) => (
                              : inc.informeEvaluacion.nivelUrgencia === "Media"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        Urgencia: {inc.informeEvaluacion.nivelUrgencia}
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Historial */}
          {closed.length > 0 && (
            <>
              <div className="bg-gray-50 border-t border-gray-200 px-4 py-2">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Historial ({closed.length})
                </p>
              </div>
              <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto">
                {closed.map((inc) => (
                  <button
                    key={inc.id}
                    onClick={() => setSelected(inc.id)}
                    className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors ${selected === inc.id ? "bg-gray-100" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-mono text-gray-400">
                          {inc.id}
                        </p>
                        <p className="text-xs font-medium text-gray-700 truncate">
                          {inc.name}
                        </p>
                      </div>
                      <span
                        className={`flex-shrink-0 px-2 py-0.5 text-[10px] rounded-full font-semibold ${STATUS_COLOR[inc.status]}`}
                      >
                        {STATUS_LABEL[inc.status]}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50">
                <p className="text-xs text-gray-500">Mostrando {historyFrom}-{historyTo} de {closed.length}</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                    disabled={safeHistoryPage === 1}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-[var(--caritas-border)] rounded-lg bg-white text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Anterior
                  </button>
                  <span className="text-xs text-gray-500 font-medium">{safeHistoryPage} / {historyTotalPages}</span>
                  <button
                    type="button"
                    onClick={() => setHistoryPage((p) => Math.min(historyTotalPages, p + 1))}
                    disabled={safeHistoryPage === historyTotalPages}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-[var(--caritas-border)] rounded-lg bg-white text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Siguiente <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Panel de detalle */}
        <div className="lg:col-span-3">
          {!current ? (
            <div
              className="bg-white border rounded-xl p-12 text-center h-full flex flex-col items-center justify-center"
              style={{ borderColor: "var(--caritas-border)" }}
            >
              <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm font-medium">
                Selecciona un incidente para ver el detalle
              </p>
              <p className="text-gray-400 text-xs mt-1">
                Haz click en un incidente de la lista izquierda
              </p>
            </div>
          ) : (
            <div
              className="bg-white border rounded-xl overflow-hidden space-y-0"
              style={{ borderColor: "var(--caritas-border)" }}
            >
              {/* Header */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-mono text-gray-400">
                      {current.id}
                    </p>
                    <p className="text-base font-bold text-gray-900 leading-tight">
                      {current.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {current.distrito ?? current.location}
                    </p>
                  </div>
                  <span
                    className={`flex-shrink-0 px-3 py-1 text-xs rounded-full font-semibold ${STATUS_COLOR[current.status]}`}
                  >
                    {STATUS_LABEL[current.status]}
                  </span>
                </div>
              </div>

              {/* Datos del incidente */}
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {[
                    { label: "Categoría", value: current.category },
                    { label: "Fecha del suceso", value: current.startDate },
                    {
                      label: "Nivel afectación",
                      value: current.nivelAfectacion,
                    },
                    {
                      label: "Nº familias",
                      value:
                        current.numFamiliasAfectadas != null
                          ? String(current.numFamiliasAfectadas)
                          : undefined,
                    },
                    {
                      label: "Fuente de alerta",
                      value: current.fuenteAlerta?.[0],
                    },
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
                        <p className="text-xs font-semibold text-gray-900">
                          {value}
                        </p>
                      </div>
                    ))}
                </div>

                {/* Levantamiento del Brigadista */}
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-gray-100 px-3 py-2 border-b border-gray-200">
                    <p className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                      Levantamiento del Brigadista
                    </p>
                  </div>

                  {/* 1. Verificación del Evento */}
                  <details open className="border-b border-gray-200">
                    <summary className="cursor-pointer px-3 py-2.5 flex items-center gap-2 hover:bg-gray-50">
                      <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold flex items-center justify-center">
                        1
                      </span>
                      <ShieldCheck className="w-3.5 h-3.5 text-gray-500" />
                      <span className="text-xs font-semibold text-gray-800">
                        Verificación del Evento
                      </span>
                    </summary>
                    <div className="px-3 pb-3 space-y-2.5">
                      {current.description && (
                        <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">
                            Descripción
                          </p>
                          <p className="text-xs text-gray-800">
                            {current.description}
                          </p>
                        </div>
                      )}
                      {current.causaSuceso && (
                        <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">
                            Causa
                          </p>
                          <p className="text-xs text-gray-800">
                            {current.causaSuceso}
                          </p>
                        </div>
                      )}
                      {(current.distrito || current.direccion) && (
                        <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100 flex items-start gap-2">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">
                              Ubicación
                            </p>
                            <p className="text-xs text-gray-800">
                              {[
                                current.direccion,
                                current.distrito,
                                current.region,
                              ]
                                .filter(Boolean)
                                .join(", ")}
                            </p>
                            {current.referencia && (
                              <p className="text-[10px] text-gray-500 italic mt-0.5">
                                Ref: {current.referencia}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      {current.reportadoPor && (
                        <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">
                            Reportado por
                          </p>
                          <p className="text-xs font-semibold text-gray-800">
                            {current.reportadoPor.nombreCompleto}
                          </p>
                          <div className="flex items-center gap-3 mt-0.5 text-[11px] text-gray-600">
                            <span>DNI: {current.reportadoPor.dni}</span>
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {current.reportadoPor.telefono}
                            </span>
                          </div>
                          {current.fuenteAlerta?.[0] && (
                            <p className="text-[10px] text-gray-500 mt-1">
                              Fuente: {current.fuenteAlerta[0]}
                            </p>
                          )}
                        </div>
                      )}
                      {current.necesidadesUrgentes &&
                        current.necesidadesUrgentes.length > 0 && (
                          <div>
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Necesidades
                              urgentes
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {current.necesidadesUrgentes.map((n) => (
                                <span
                                  key={n}
                                  className="px-2 py-0.5 bg-orange-50 text-orange-700 border border-orange-200 text-[10px] rounded-full font-medium"
                                >
                                  {n}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      {current.nivelAfectacion && (
                        <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">
                            Nivel de afectación estimado
                          </p>
                          <p className="text-xs font-bold text-gray-800">
                            {current.nivelAfectacion}
                          </p>
                        </div>
                      )}
                    </div>
                  </details>

                  {/* 2. Verificación de Empadronamiento */}
                  <details className="border-b border-gray-200">
                    <summary className="cursor-pointer px-3 py-2.5 flex items-center gap-2 hover:bg-gray-50">
                      <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold flex items-center justify-center">
                        2
                      </span>
                      <Users className="w-3.5 h-3.5 text-gray-500" />
                      <span className="text-xs font-semibold text-gray-800">
                        Verificación de Empadronamiento
                      </span>
                      <span className="ml-auto text-[10px] text-gray-500">
                        {current.numFamiliasAfectadas ?? 0} fam ·{" "}
                        {current.affectedPeople?.length ?? 0} pers
                      </span>
                    </summary>
                    <div className="px-3 pb-3 space-y-2">
                      {!current.affectedPeople ||
                      current.affectedPeople.length === 0 ? (
                        <p className="text-[11px] text-gray-500 italic px-1">
                          Sin personas empadronadas registradas.
                        </p>
                      ) : (
                        (() => {
                          const grupos = current.affectedPeople!.reduce<
                            Record<
                              string,
                              NonNullable<typeof current.affectedPeople>
                            >
                          >((acc, p) => {
                            const k =
                              p.familiaNombre ?? p.familiaId ?? "Sin familia";
                            (acc[k] = acc[k] ?? []).push(p);
                            return acc;
                          }, {});
                          return Object.entries(grupos).map(
                            ([fam, miembros]) => (
                              <div
                                key={fam}
                                className="bg-gray-50 rounded-lg border border-gray-100 p-2.5"
                              >
                                <div className="flex items-center justify-between mb-1.5">
                                  <p className="text-[11px] font-bold text-gray-700">
                                    {fam}
                                  </p>
                                  <span className="text-[10px] text-gray-500">
                                    {miembros.length} miembro(s)
                                  </span>
                                </div>
                                <ul className="space-y-1">
                                  {miembros.map((p) => (
                                    <li
                                      key={p.id}
                                      className="flex items-center justify-between gap-2 text-[11px] text-gray-700"
                                    >
                                      <span className="truncate">
                                        {p.nombre} {p.apellidoPaterno ?? ""}{" "}
                                        {p.apellidoMaterno ?? ""}
                                        {p.parentesco && (
                                          <span className="text-gray-400">
                                            {" "}
                                            · {p.parentesco}
                                          </span>
                                        )}
                                      </span>
                                      <span className="text-[10px] text-gray-500 flex-shrink-0">
                                        {p.edad}a · {p.genero ?? "—"} · DNI{" "}
                                        {p.dni}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ),
                          );
                        })()
                      )}
                    </div>
                  </details>

                  {/* 3. Evidencias de Campo */}
                  <details>
                    <summary className="cursor-pointer px-3 py-2.5 flex items-center gap-2 hover:bg-gray-50">
                      <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold flex items-center justify-center">
                        3
                      </span>
                      <Camera className="w-3.5 h-3.5 text-gray-500" />
                      <span className="text-xs font-semibold text-gray-800">
                        Evidencias de Campo
                      </span>
                      <span className="ml-auto text-[10px] text-gray-500">
                        {current.evidenciasPorFuente?.flatMap((e) => e.archivos)
                          .length ??
                          current.uploadedFiles?.length ??
                          0}{" "}
                        archivo(s)
                      </span>
                    </summary>
                    <div className="px-3 pb-3 space-y-2">
                      {current.evidenciasPorFuente &&
                      current.evidenciasPorFuente.length > 0 ? (
                        current.evidenciasPorFuente.map((grp) => (
                          <div
                            key={grp.fuente}
                            className="bg-gray-50 rounded-lg border border-gray-100 p-2.5"
                          >
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">
                              {grp.fuente}
                            </p>
                            <ul className="space-y-1">
                              {grp.archivos.map((a) => (
                                <li
                                  key={a}
                                  className="flex items-center gap-1.5 text-[11px] text-gray-700"
                                >
                                  <FileText className="w-3 h-3 text-gray-400" />
                                  <span className="truncate">{a}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))
                      ) : current.uploadedFiles &&
                        current.uploadedFiles.length > 0 ? (
                        <ul className="space-y-1 bg-gray-50 rounded-lg border border-gray-100 p-2.5">
                          {current.uploadedFiles.map((a) => (
                            <li
                              key={a}
                              className="flex items-center gap-1.5 text-[11px] text-gray-700"
                            >
                              <FileText className="w-3 h-3 text-gray-400" />
                              <span className="truncate">{a}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-[11px] text-gray-500 italic px-1">
                          Sin evidencias adjuntas.
                        </p>
                      )}
                    </div>
                  </details>
                </div>

                {/* Informe de evaluación */}
                {current.informeEvaluacion && (
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-bold text-purple-800 uppercase tracking-wider">
                      Informe del Especialista GRD
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white rounded-lg p-2.5 border border-purple-100">
                        <p className="text-[10px] text-gray-400 mb-0.5">
                          Urgencia
                        </p>
                        <p
                          className={`text-sm font-bold ${
                            current.informeEvaluacion.nivelUrgencia ===
                            "Inmediata"
                              ? "text-red-700"
                              : current.informeEvaluacion.nivelUrgencia ===
                                  "Alta"
                                ? "text-orange-700"
                                : current.informeEvaluacion.nivelUrgencia ===
                                    "Media"
                                  ? "text-yellow-700"
                                  : "text-green-700"
                          }`}
                        >
                          {current.informeEvaluacion.nivelUrgencia}
                        </p>
                      </div>
                      <div className="bg-white rounded-lg p-2.5 border border-purple-100">
                        <p className="text-[10px] text-gray-400 mb-0.5">
                          Intervención
                        </p>
                        <p className="text-xs font-bold text-purple-800">
                          {current.informeEvaluacion.tipoIntervencion}
                        </p>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-purple-100">
                      <p className="text-[10px] text-purple-700 font-semibold mb-1">
                        Ayuda propuesta:
                      </p>
                      <p className="text-xs text-gray-700">
                        {current.informeEvaluacion.descripcionAyuda}
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-purple-100">
                      <p className="text-[10px] text-purple-700 font-semibold mb-1">
                        Recomendación al Comité:
                      </p>
                      <p className="text-xs text-gray-700 italic">
                        &ldquo;{current.informeEvaluacion.recomendacionComite}
                        &rdquo;
                      </p>
                    </div>
                    {current.informeEvaluacion.criteriosPriorizacion &&
                      current.informeEvaluacion.criteriosPriorizacion.length >
                        0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {current.informeEvaluacion.criteriosPriorizacion.map(
                            (c) => (
                              <span
                                key={c}
                                className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[10px] rounded-full border border-purple-200 font-medium"
                              >
                                {c}
                              </span>
                            ),
                          )}
                        </div>
                      )}
                    {current.informeEvaluacion.observacionesComite && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <p className="text-[10px] text-yellow-700 font-semibold mb-1">
                          Observaciones previas del Comité:
                        </p>
                        <p className="text-xs text-yellow-800">
                          {current.informeEvaluacion.observacionesComite}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Panel de decisión */}
                {canEvaluate &&
                  ["EN EVALUACION", "OBSERVADO"].includes(current.status) && (
                    <div className="border-t border-gray-100 pt-4 space-y-3">
                      <p className="text-xs font-bold text-gray-700">
                        Resolución del Comité
                      </p>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        placeholder="Justificación de la decisión, criterios aplicados, condiciones, monto o kit aprobado..."
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-400 resize-none"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={handleAprobar}
                          className="flex flex-col items-center gap-1 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-lg transition-all"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Aprobar
                        </button>
                        <button
                          onClick={handleObservar}
                          className="flex flex-col items-center gap-1 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-white font-bold text-xs rounded-lg transition-all"
                        >
                          <AlertCircle className="w-4 h-4" />
                          Observar
                        </button>
                        <button
                          onClick={handleRechazar}
                          className="flex flex-col items-center gap-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold text-xs rounded-lg transition-all"
                        >
                          <XCircle className="w-4 h-4" />
                          Rechazar
                        </button>
                      </div>
                    </div>
                  )}

                {/* Vista de solo lectura para casos procesados */}
                {!["EN EVALUACION", "OBSERVADO"].includes(current.status) &&
                  current.history &&
                  current.history.length > 0 && (
                    <div className="border-t border-gray-100 pt-3">
                      <p className="text-xs font-semibold text-gray-500 mb-2">
                        Última acción registrada
                      </p>
                      {(() => {
                        const last =
                          current.history![current.history!.length - 1];
                        return (
                          <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2.5">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-semibold text-gray-600 uppercase">
                                {last.action}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                {new Date(last.timestamp).toLocaleDateString(
                                  "es-PE",
                                )}
                              </span>
                            </div>
                            {last.notes && (
                              <p className="text-xs text-gray-700">
                                {last.notes}
                              </p>
                            )}
                          </div>
                        );
                      })()}
                      <div
                        className="mt-3 flex items-center gap-1.5 text-xs hover:underline"
                        style={{ color: "var(--caritas-green)" }}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Ver detalle completo del incidente
                      </div>
                    </div>
                  )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
