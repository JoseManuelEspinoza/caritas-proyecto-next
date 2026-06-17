"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  HandHeart,
  CheckCircle,
  AlertCircle,
  Clock,
  Eye,
  FileText,
  Loader2,
  Users,
  BarChart3,
  Package,
  Plus,
  ClipboardList,
  Camera,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { registrarEntregaAyuda, listarEntregasAyuda } from "@/app/actions/donaciones";
import { PanelVotacionComite } from "./PanelVotacionComite";
import type { TallyRondaConNombres } from "@/app/lib/comite-donaciones-tally";
import { registrarEvidenciaEntrega, listarEvidenciasEntrega } from "@/app/actions/evidencias";
import { subirArchivoS3 } from "@/app/ui/shared/file-upload";
import { PaginationControls } from "@/app/ui/shared/pagination-controls";

export type Entrega = {
  idEntrega: string;
  codigoEntrega: string | null;
  fechaEntrega: string | null;
  lugarEntrega: string | null;
  tipoAyuda: string | null;
  cantidadEntregada: number | null;
  descripcionAyuda: string | null;
  observaciones: string | null;
  createdAt: string;
};

export type ReporteArticulo = { codigo: string; descripcion: string; cantidad: number };
export type ReporteKit = { tipoKit: string; articulos: ReporteArticulo[] };
export type ReporteFamilia = {
  refId: string;
  nombre: string;
  integrantes: string[];
  nota: string | null;
  kits: ReporteKit[];
};
export type ReporteComite = {
  fechaInforme: string | null;
  dirigidoA: string;
  motivo: string;
  objetivoGeneral: string;
  objetivosEspecificos: string[];
  analisisSituacion: string;
  hallazgosTexto: string;
  hallazgosClave: string[];
  conclusiones: string;
  nivelUrgencia: string;
  tipoIntervencion: string;
  familias: ReporteFamilia[];
};

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
  fechaSuceso: string | null;
  reportadoPor: string | null;
  familias: number;
  personas: number;
  idSolicitud: string | null;
  solicitudTipo: string | null;
  solicitudNecesidad: string | null;
  reporte: ReporteComite | null;
};

function fmtFecha(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
}

type ArticuloConsolidado = { tipoKit: string; codigo: string; descripcion: string; cantidad: number };

function consolidarArticulos(reporte: ReporteComite): ArticuloConsolidado[] {
  const map = new Map<string, ArticuloConsolidado>();
  for (const fam of reporte.familias) {
    for (const kit of fam.kits) {
      for (const a of kit.articulos) {
        const k = `${kit.tipoKit}||${a.codigo}||${a.descripcion}`;
        const prev = map.get(k);
        if (prev) prev.cantidad += a.cantidad;
        else map.set(k, { tipoKit: kit.tipoKit, codigo: a.codigo, descripcion: a.descripcion, cantidad: a.cantidad });
      }
    }
  }
  return Array.from(map.values());
}

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

export function DonacionesModule({
  casos,
  canEvaluate,
  soyMiembroDelComite,
  miIdUsuarioGRD,
  tallyPorCaso,
}: {
  casos: Caso[];
  canEvaluate: boolean;
  soyMiembroDelComite: boolean;
  miIdUsuarioGRD: string | null;
  tallyPorCaso: Record<string, TallyRondaConNombres | null>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(
    casos.find((c) => PENDIENTES.includes(c.estado))?.id ?? null
  );
  const [notes, setNotes] = useState("");
  const [queuePage, setQueuePage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [queuePageSize, setQueuePageSize] = useState(5);
  const [historyPageSize, setHistoryPageSize] = useState(5);
  const [descargandoPdf, setDescargandoPdf] = useState(false);
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [evidenciasEntrega, setEvidenciasEntrega] = useState<{idEvidenciaGRD:string;nombreArchivo:string;urlArchivo:string;fechaCarga:string}[]>([]);
  const [actaFile, setActaFile] = useState<File | null>(null);
  const [showEntregaForm, setShowEntregaForm] = useState(false);
  const [entregaForm, setEntregaForm] = useState({
    fechaEntrega: new Date().toISOString().slice(0, 10),
    lugarEntrega: "",
    tipoAyuda: "",
    cantidadEntregada: "",
    descripcionAyuda: "",
    actorParroquial: "",
    observaciones: "",
  });

  const queue = casos.filter((c) => PENDIENTES.includes(c.estado));
  const closed = casos.filter((c) => !PENDIENTES.includes(c.estado));
  const current = casos.find((c) => c.id === selectedId) ?? null;

  const totalQueuePages = Math.max(1, Math.ceil(queue.length / queuePageSize));
  const safeQueuePage = Math.min(queuePage, totalQueuePages);
  const queueStart = (safeQueuePage - 1) * queuePageSize;
  const paginatedQueue = queue.slice(queueStart, queueStart + queuePageSize);
  const queueFrom = queue.length === 0 ? 0 : queueStart + 1;
  const queueTo = Math.min(queueStart + queuePageSize, queue.length);

  const totalHistoryPages = Math.max(1, Math.ceil(closed.length / historyPageSize));
  const safeHistoryPage = Math.min(historyPage, totalHistoryPages);
  const historyStart = (safeHistoryPage - 1) * historyPageSize;
  const paginatedHistory = closed.slice(historyStart, historyStart + historyPageSize);
  const historyFrom = closed.length === 0 ? 0 : historyStart + 1;
  const historyTo = Math.min(historyStart + historyPageSize, closed.length);

  useEffect(() => {
    if (queuePage > totalQueuePages) setQueuePage(totalQueuePages);
  }, [queuePage, totalQueuePages]);

  useEffect(() => {
    if (historyPage > totalHistoryPages) setHistoryPage(totalHistoryPages);
  }, [historyPage, totalHistoryPages]);

  useEffect(() => {
    if (!selectedId) { setEntregas([]); setEvidenciasEntrega([]); return; }
    listarEntregasAyuda(selectedId).then(setEntregas).catch(() => setEntregas([]));
    listarEvidenciasEntrega(selectedId).then(setEvidenciasEntrega).catch(() => setEvidenciasEntrega([]));
  }, [selectedId]);

  const submitEntrega = () => {
    if (!current) return;
    if (!entregaForm.fechaEntrega) { toast.error("Indica la fecha de entrega."); return; }
    if (!entregaForm.lugarEntrega.trim()) { toast.error("Indica el lugar de entrega."); return; }
    if (!entregaForm.tipoAyuda.trim()) { toast.error("Indica el tipo de ayuda."); return; }
    if (!entregaForm.descripcionAyuda.trim()) { toast.error("Describe la ayuda entregada."); return; }

    startTransition(async () => {
      const res = await registrarEntregaAyuda({
        idIncidencia: current.id,
        idSolicitud: current.idSolicitud ?? undefined,
        fechaEntrega: entregaForm.fechaEntrega,
        lugarEntrega: entregaForm.lugarEntrega.trim(),
        tipoAyuda: entregaForm.tipoAyuda.trim(),
        cantidadEntregada: entregaForm.cantidadEntregada ? Number(entregaForm.cantidadEntregada) : undefined,
        descripcionAyuda: entregaForm.descripcionAyuda.trim(),
        actorParroquial: entregaForm.actorParroquial.trim(),
        observaciones: entregaForm.observaciones.trim() || undefined,
      });
      if (res?.message) { toast.error(res.message); return; }

      if (actaFile) {
        try {
          const archivo = await subirArchivoS3(actaFile, { tipo: "evidencia-entrega", entidadId: current.id });
          await registrarEvidenciaEntrega(current.id, archivo);
          const updatedEv = await listarEvidenciasEntrega(current.id);
          setEvidenciasEntrega(updatedEv);
        } catch (e) {
          toast.error(`Acta: ${e instanceof Error ? e.message : "Error al subir"}`);
        }
        setActaFile(null);
      }

      toast.success("Entrega registrada correctamente.");
      setShowEntregaForm(false);
      setEntregaForm({ fechaEntrega: new Date().toISOString().slice(0, 10), lugarEntrega: "", tipoAyuda: "", cantidadEntregada: "", descripcionAyuda: "", actorParroquial: "", observaciones: "" });
      const updated = await listarEntregasAyuda(current.id);
      setEntregas(updated);
      router.refresh();
    });
  };

  // Descarga el informe en PDF (se genera en el cliente a partir del informe ya
  // guardado por el Especialista; no modifica ni persiste nada).
  const descargarInforme = async (caso: Caso) => {
    if (!caso.reporte) return;
    const rep = caso.reporte;
    setDescargandoPdf(true);
    try {
      const { generarInformePdf } = await import("@/app/lib/informe-pdf");
      await generarInformePdf({
        codigo: caso.codigo ?? "GRD",
        categoria: caso.categoria ?? "—",
        evento: caso.titulo ?? caso.codigo ?? "Incidencia",
        ubicacion: [caso.direccion, caso.parroquia].filter(Boolean).join(", ") || "—",
        fechaSuceso: fmtFecha(caso.fechaSuceso),
        familiasAfectadas: caso.familias,
        personasEmpadronadas: caso.personas,
        fechaEmision: fmtFecha(rep.fechaInforme),
        emitidoPor: "Especialista GRD",
        oficina: "Oficina de Gestión Pastoral / GRD",
        motivo: rep.motivo,
        dirigidoA: rep.dirigidoA,
        objetivoGeneral: rep.objetivoGeneral,
        objetivosEspecificos: rep.objetivosEspecificos,
        analisisSituacion: rep.analisisSituacion,
        hallazgosTexto: rep.hallazgosTexto,
        hallazgosClave: rep.hallazgosClave,
        necesidadesIdentificadas: [],
        evidenciasCount: 0,
        evidenciasImagenes: [],
        familias: rep.familias.map((f) => ({
          nombre: f.nombre,
          integrantes: f.integrantes,
          kits: f.kits,
        })),
        conclusiones: rep.conclusiones,
      });
    } catch {
      toast.error("No se pudo generar el PDF.");
    } finally {
      setDescargandoPdf(false);
    }
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
            onPrevious={() => setQueuePage((p) => Math.max(1, p - 1))}
            onNext={() => setQueuePage((p) => Math.min(totalQueuePages, p + 1))}
            pageSize={queuePageSize}
            onPageSizeChange={(s) => { setQueuePageSize(s); setQueuePage(1); }}
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
                onPrevious={() => setHistoryPage((p) => Math.max(1, p - 1))}
                onNext={() => setHistoryPage((p) => Math.min(totalHistoryPages, p + 1))}
                pageSize={historyPageSize}
                onPageSizeChange={(s) => { setHistoryPageSize(s); setHistoryPage(1); }}
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    { label: "Categoría", value: current.categoria },
                    { label: "Gravedad", value: current.gravedad },
                    { label: "Tipo de ayuda", value: current.solicitudTipo },
                    { label: "Fecha suceso", value: fmtFecha(current.fechaSuceso) },
                    { label: "Distrito", value: current.parroquia },
                    { label: "Familias", value: String(current.familias) },
                    { label: "Personas", value: String(current.personas) },
                    { label: "Reportado por", value: current.reportadoPor },
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

                {current.reporte ? (
                  <ReporteReadOnly
                    reporte={current.reporte}
                    descargando={descargandoPdf}
                    onDescargar={() => descargarInforme(current)}
                  />
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                    <p className="text-xs text-gray-500">
                      El Especialista GRD aún no ha enviado el informe de evaluación.
                    </p>
                  </div>
                )}

                {/* ── Sección Entrega de Ayuda Humanitaria (RF36 / RF81) ── */}
                {["APROBADO", "ATENDIDO", "SEGUIMIENTO ABIERTO", "CERRADO"].includes(current.estado) && (
                  <div className="border border-green-200 rounded-xl overflow-hidden">
                    <div className="bg-green-700 px-4 py-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-white" />
                        <p className="text-white font-bold text-sm">Entrega de Ayuda Humanitaria</p>
                      </div>
                      <button
                        onClick={() => setShowEntregaForm((s) => !s)}
                        className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
                      >
                        <Plus className="w-3.5 h-3.5" /> Nueva entrega
                      </button>
                    </div>

                    {showEntregaForm && (
                      <div className="p-4 bg-green-50 border-b border-green-200 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <label className="block">
                          <span className="text-xs text-gray-600">Fecha de entrega <span className="text-red-500">*</span></span>
                          <input type="date" value={entregaForm.fechaEntrega} onChange={(e) => setEntregaForm({ ...entregaForm, fechaEntrega: e.target.value })} className="mt-1 w-full px-3 py-2 border border-green-200 rounded text-sm bg-white" />
                        </label>
                        <label className="block">
                          <span className="text-xs text-gray-600">Lugar de entrega <span className="text-red-500">*</span></span>
                          <input value={entregaForm.lugarEntrega} onChange={(e) => setEntregaForm({ ...entregaForm, lugarEntrega: e.target.value })} className="mt-1 w-full px-3 py-2 border border-green-200 rounded text-sm bg-white" />
                        </label>
                        <label className="block">
                          <span className="text-xs text-gray-600">Tipo de ayuda <span className="text-red-500">*</span></span>
                          <input value={entregaForm.tipoAyuda} onChange={(e) => setEntregaForm({ ...entregaForm, tipoAyuda: e.target.value })} placeholder="Ej: Kit alimentario, Kit de abrigo" className="mt-1 w-full px-3 py-2 border border-green-200 rounded text-sm bg-white" />
                        </label>
                        <label className="block">
                          <span className="text-xs text-gray-600">Cantidad entregada</span>
                          <input type="number" min="0" value={entregaForm.cantidadEntregada} onChange={(e) => setEntregaForm({ ...entregaForm, cantidadEntregada: e.target.value })} placeholder="Ej: 10" className="mt-1 w-full px-3 py-2 border border-green-200 rounded text-sm bg-white" />
                        </label>
                        <label className="block">
                          <span className="text-xs text-gray-600">Actor parroquial presente</span>
                          <input value={entregaForm.actorParroquial} onChange={(e) => setEntregaForm({ ...entregaForm, actorParroquial: e.target.value })} className="mt-1 w-full px-3 py-2 border border-green-200 rounded text-sm bg-white" />
                        </label>
                        <label className="md:col-span-2 block">
                          <span className="text-xs text-gray-600">Composición / descripción de la ayuda <span className="text-red-500">*</span></span>
                          <textarea value={entregaForm.descripcionAyuda} onChange={(e) => setEntregaForm({ ...entregaForm, descripcionAyuda: e.target.value })} rows={2} className="mt-1 w-full px-3 py-2 border border-green-200 rounded text-sm bg-white" />
                        </label>
                        <label className="md:col-span-2 block">
                          <span className="text-xs text-gray-600">Observaciones</span>
                          <textarea value={entregaForm.observaciones} onChange={(e) => setEntregaForm({ ...entregaForm, observaciones: e.target.value })} rows={2} className="mt-1 w-full px-3 py-2 border border-green-200 rounded text-sm bg-white" />
                        </label>
                        <div className="md:col-span-2">
                          <span className="text-xs text-gray-600 block mb-1">Acta firmada <span className="text-gray-400">(opcional)</span></span>
                          <div className="flex gap-2">
                            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#91D723] text-[#009850] rounded-lg cursor-pointer hover:bg-[#91D723]/10 text-xs font-medium transition-colors">
                              <Upload className="w-3.5 h-3.5" /> Adjuntar archivo
                              <input type="file" accept="image/*,application/pdf" className="hidden"
                                onChange={(e) => setActaFile(e.target.files?.[0] ?? null)} />
                            </label>
                          </div>
                          {actaFile && (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-gray-100 border border-gray-200 rounded-full pl-2 pr-1 py-0.5 text-gray-700 mt-2">
                              {actaFile.name}
                              <button type="button" onClick={() => setActaFile(null)} className="text-gray-400 hover:text-red-500 transition-colors">
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          )}
                        </div>
                        <div className="md:col-span-2 flex justify-end gap-2">
                          <button onClick={() => { setShowEntregaForm(false); setActaFile(null); }} className="px-4 py-2 border border-gray-300 rounded text-sm">Cancelar</button>
                          <button onClick={submitEntrega} disabled={pending} className="px-4 py-2 bg-green-700 text-white rounded text-sm disabled:opacity-50">Registrar entrega</button>
                        </div>
                      </div>
                    )}

                    {/* Historial de entregas */}
                    <div className="p-4 bg-white space-y-2">
                      {entregas.length === 0 ? (
                        <div className="text-center py-6">
                          <ClipboardList className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                          <p className="text-xs text-gray-500">Sin entregas registradas para este caso.</p>
                        </div>
                      ) : (
                        entregas.map((e) => (
                          <div key={e.idEntrega} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-xs font-mono text-green-700 font-bold">{e.codigoEntrega}</span>
                              <span className="text-[10px] text-gray-500">{e.fechaEntrega ? new Date(e.fechaEntrega).toLocaleDateString("es-PE") : "—"}</span>
                            </div>
                            <p className="text-xs font-semibold text-gray-800">{e.tipoAyuda}{e.cantidadEntregada != null ? <span className="ml-2 text-green-700 font-normal">× {e.cantidadEntregada}</span> : null}</p>
                            {e.lugarEntrega && <p className="text-[11px] text-gray-600">📍 {e.lugarEntrega}</p>}
                            {e.descripcionAyuda && <p className="text-[11px] text-gray-700 mt-1">{e.descripcionAyuda}</p>}
                            {e.observaciones && <p className="text-[11px] text-gray-500 italic mt-1">{e.observaciones}</p>}
                          </div>
                        ))
                      )}
                    </div>

                    {/* Actas adjuntas */}
                    {evidenciasEntrega.length > 0 && (
                      <div className="px-4 pb-4 bg-white space-y-1">
                        <p className="text-xs text-gray-500 font-medium mb-1">Actas adjuntas</p>
                        {evidenciasEntrega.map((ev) => (
                          <div key={ev.idEvidenciaGRD} className="flex items-center gap-2 text-xs border border-gray-100 rounded p-2 bg-gray-50">
                            <span>📎</span>
                            <span className="flex-1 truncate text-gray-700">{ev.nombreArchivo}</span>
                            <span className="text-gray-400">{new Date(ev.fechaCarga).toLocaleDateString("es-PE")}</span>
                            <a
                              href={`/api/archivos?key=${encodeURIComponent(ev.urlArchivo)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-700 hover:underline font-medium"
                            >
                              Ver
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {current.estado === "EN EVALUACION" && (
                  <PanelVotacionComite
                    idIncidencia={current.id}
                    soyMiembroDelComite={soyMiembroDelComite}
                    miIdUsuarioGRD={miIdUsuarioGRD}
                    tally={tallyPorCaso[current.id] ?? null}
                  />
                )}

                <Link
                  href={`/grd/${current.id}`}
                  className="mt-2 flex items-center gap-1.5 text-xs text-[var(--caritas-green)] hover:underline"
                >
                  <Eye className="w-3.5 h-3.5" /> Ver detalle completo del incidente
                </Link>
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
// ─── Informe de Atención (solo lectura) para el Comité ────────────────────────

function ReadSeccion({
  letra,
  titulo,
  children,
}: {
  letra: string;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[11px] font-bold text-purple-700 uppercase tracking-wider mb-2">
        {letra}) {titulo}
      </p>
      {children}
    </div>
  );
}

function ReadCampo({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg border border-gray-100 px-2.5 py-1.5">
      <p className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-xs font-medium text-gray-800">{value}</p>
    </div>
  );
}

function ReporteReadOnly({
  reporte,
  descargando,
  onDescargar,
}: {
  reporte: ReporteComite;
  descargando: boolean;
  onDescargar: () => void;
}) {
  const consolidado = consolidarArticulos(reporte);
  return (
    <div className="rounded-xl border border-purple-200 overflow-hidden">
      <div className="bg-purple-600 text-white px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <BarChart3 className="w-4 h-4 flex-shrink-0" />
          <p className="font-semibold text-sm truncate">Informe de Atención de Ayuda Humanitaria</p>
        </div>
        <button
          type="button"
          onClick={onDescargar}
          disabled={descargando}
          className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50 flex-shrink-0"
        >
          {descargando ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Generando…
            </>
          ) : (
            <>
              <FileText className="w-3.5 h-3.5" /> Descargar PDF
            </>
          )}
        </button>
      </div>

      <div className="p-4 space-y-4 bg-white">
        {/* A) Identificación */}
        <ReadSeccion letra="A" titulo="Identificación">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <ReadCampo label="Fecha" value={fmtFecha(reporte.fechaInforme)} />
            <ReadCampo label="Dirigido a" value={reporte.dirigidoA || "—"} />
            <ReadCampo label="Motivo" value={reporte.motivo || "—"} />
          </div>
        </ReadSeccion>

        {/* B) Objetivos */}
        {(reporte.objetivoGeneral || reporte.objetivosEspecificos.length > 0) && (
          <ReadSeccion letra="B" titulo="Objetivos">
            {reporte.objetivoGeneral && (
              <p className="text-xs text-gray-700">
                <span className="font-semibold">General: </span>
                {reporte.objetivoGeneral}
              </p>
            )}
            {reporte.objetivosEspecificos.length > 0 && (
              <ul className="mt-2 space-y-1">
                {reporte.objetivosEspecificos.map((o, i) => (
                  <li key={i} className="text-xs text-gray-700 flex gap-1.5">
                    <span className="text-purple-500">•</span>
                    {o}
                  </li>
                ))}
              </ul>
            )}
          </ReadSeccion>
        )}

        {/* C) Análisis y hallazgos */}
        {(reporte.analisisSituacion ||
          reporte.hallazgosTexto ||
          reporte.hallazgosClave.length > 0) && (
          <ReadSeccion letra="C" titulo="Análisis y Hallazgos">
            {reporte.analisisSituacion && (
              <p className="text-xs text-gray-700">{reporte.analisisSituacion}</p>
            )}
            {reporte.hallazgosTexto && (
              <p className="text-xs text-gray-700 mt-2">{reporte.hallazgosTexto}</p>
            )}
            {reporte.hallazgosClave.length > 0 && (
              <ul className="mt-2 space-y-1">
                {reporte.hallazgosClave.map((h, i) => (
                  <li key={i} className="text-xs text-gray-700 flex gap-1.5">
                    <span className="text-purple-500">•</span>
                    {h}
                  </li>
                ))}
              </ul>
            )}
          </ReadSeccion>
        )}

        {/* D) Asignación de ayuda por familia */}
        <ReadSeccion letra="D" titulo="Asignación de Ayuda Humanitaria por Familia">
          <div className="space-y-3">
            {reporte.familias.map((fam) => (
              <div key={fam.refId} className="rounded-lg border border-purple-100 bg-purple-50/40 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-3.5 h-3.5 text-purple-600" />
                  <p className="text-xs font-bold text-purple-800">{fam.nombre}</p>
                  <span className="text-[10px] text-gray-500">
                    {fam.integrantes.length} integrante(s) · {fam.kits.length} kit(s)
                  </span>
                </div>
                {fam.integrantes.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {fam.integrantes.map((nombre, i) => (
                      <span
                        key={i}
                        className="text-[10px] bg-white border border-purple-100 rounded-full px-2 py-0.5 text-gray-700"
                      >
                        {nombre}
                      </span>
                    ))}
                  </div>
                )}
                {fam.nota && (
                  <p className="text-[11px] text-purple-700 italic mb-2">
                    <span className="font-semibold not-italic">Brigadista: </span>
                    {fam.nota}
                  </p>
                )}
                {fam.kits.length === 0 ? (
                  <p className="text-[11px] text-gray-400 italic">Sin kits asignados.</p>
                ) : (
                  <div className="space-y-2">
                    {fam.kits.map((kit, ki) => (
                      <div key={ki} className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                        <p className="text-[11px] font-bold text-[#009850] px-2.5 py-1.5 border-b border-gray-100">
                          {kit.tipoKit}
                        </p>
                        <table className="w-full text-[11px]">
                          <thead>
                            <tr className="text-gray-400 bg-gray-50">
                              <th className="text-left font-semibold px-2.5 py-1 w-8">N°</th>
                              <th className="text-left font-semibold px-2.5 py-1">Código</th>
                              <th className="text-left font-semibold px-2.5 py-1">Descripción</th>
                              <th className="text-right font-semibold px-2.5 py-1 w-16">Cant.</th>
                            </tr>
                          </thead>
                          <tbody>
                            {kit.articulos.map((a, ai) => (
                              <tr key={ai} className="border-t border-gray-50">
                                <td className="px-2.5 py-1 text-gray-400">{ai + 1}</td>
                                <td className="px-2.5 py-1 font-mono text-gray-600">{a.codigo || "—"}</td>
                                <td className="px-2.5 py-1 text-gray-700">{a.descripcion || "—"}</td>
                                <td className="px-2.5 py-1 text-right font-semibold text-gray-800">
                                  {a.cantidad}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Resumen consolidado */}
          {consolidado.length > 0 && (
            <div className="mt-3 rounded-lg overflow-hidden border border-gray-200">
              <p className="text-[11px] font-bold text-white bg-gray-700 px-3 py-2 uppercase tracking-wider">
                Resumen consolidado de artículos
              </p>
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-gray-500 bg-gray-50">
                    <th className="text-left font-semibold px-3 py-1.5">Kit</th>
                    <th className="text-left font-semibold px-3 py-1.5">Código</th>
                    <th className="text-left font-semibold px-3 py-1.5">Descripción</th>
                    <th className="text-right font-semibold px-3 py-1.5 w-20">Cant. total</th>
                  </tr>
                </thead>
                <tbody>
                  {consolidado.map((f, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="px-3 py-1.5 text-purple-700">{f.tipoKit}</td>
                      <td className="px-3 py-1.5 font-mono text-gray-600">{f.codigo || "—"}</td>
                      <td className="px-3 py-1.5 text-gray-700">{f.descripcion || "—"}</td>
                      <td className="px-3 py-1.5 text-right font-bold text-gray-800">{f.cantidad}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ReadSeccion>

        {/* E) Conclusiones */}
        {reporte.conclusiones && (
          <ReadSeccion letra="E" titulo="Conclusiones">
            <p className="text-xs text-gray-700">{reporte.conclusiones}</p>
          </ReadSeccion>
        )}
      </div>
    </div>
  );
}
