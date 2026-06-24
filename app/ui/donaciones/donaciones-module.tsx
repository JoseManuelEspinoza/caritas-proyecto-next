"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  HandHeart,
  Hand,
  CheckCircle,
  AlertCircle,
  FileText,
  Loader2,
  Users,
  BarChart3,
  Package,
  Plus,
  ClipboardList,
  Upload,
  X,
  Search,
  ChevronDown,
  ChevronLeft,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowUpRight,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { registrarEntregaAyuda, listarEntregasAyuda } from "@/app/actions/donaciones";
import { ModalVotacionComite } from "./ModalVotacion";
import { ModalUbicacion } from "./ModalUbicacion";
import type { TallyRondaConNombres } from "@/app/lib/comite-donaciones-tally";
import { registrarEvidenciaEntrega, listarEvidenciasEntrega } from "@/app/actions/evidencias";
import { subirArchivoS3 } from "@/app/ui/shared/file-upload";

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
  lat: number | null;
  lng: number | null;
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
  return d.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
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
  CERRADO: "bg-gray-100 text-gray-600",
};

const FILTROS: { id: string; label: string; estados: string[] | null }[] = [
  { id: "pendientes", label: "Pendientes", estados: ["EN EVALUACION", "OBSERVADO"] },
  { id: "evaluacion", label: "En evaluación", estados: ["EN EVALUACION"] },
  { id: "observados", label: "Observados", estados: ["OBSERVADO"] },
  { id: "aprobados", label: "Aprobados", estados: ["APROBADO", "ATENDIDO"] },
  { id: "seguimiento", label: "En seguimiento", estados: ["SEGUIMIENTO ABIERTO"] },
  { id: "rechazados", label: "Rechazados", estados: ["RECHAZADO"] },
  { id: "cerrados", label: "Cerrados", estados: ["CERRADO"] },
  { id: "todas", label: "Todas", estados: null },
];

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
  const [panelAbierto, setPanelAbierto] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [filtroId, setFiltroId] = useState("pendientes");
  const [showDetail, setShowDetail] = useState(false);
  const [showVotacion, setShowVotacion] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [stickyVisible, setStickyVisible] = useState(false);
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

  const headerRef = useRef<HTMLDivElement>(null);
  const detailScrollRef = useRef<HTMLDivElement>(null);

  const filtroActivo = FILTROS.find((f) => f.id === filtroId) ?? FILTROS[0];

  const listaFiltrada = useMemo(() => {
    const porEstado = casos.filter(
      (c) => filtroActivo.estados === null || filtroActivo.estados.includes(c.estado)
    );
    const q = busqueda.trim().toLowerCase();
    if (!q) return porEstado;
    return porEstado.filter(
      (c) =>
        (c.codigo ?? "").toLowerCase().includes(q) ||
        (c.titulo ?? "").toLowerCase().includes(q) ||
        (c.parroquia ?? "").toLowerCase().includes(q)
    );
  }, [casos, filtroActivo, busqueda]);

  const current = casos.find((c) => c.id === selectedId) ?? null;
  const puedeVotar = canEvaluate && current?.estado === "EN EVALUACION";

  // En móvil navega automáticamente al detalle al seleccionar un caso
  const handleSelectCase = (id: string) => {
    setSelectedId(id);
    setShowDetail(true);
  };

  // Al cambiar de caso: resetear scroll y sticky
  useEffect(() => {
    if (detailScrollRef.current) detailScrollRef.current.scrollTop = 0;
    setStickyVisible(false);
  }, [current?.id]);

  // Sticky header: aparece solo cuando el header principal sale del área visible
  useEffect(() => {
    const scrollEl = detailScrollRef.current;
    if (!scrollEl) return;
    const handleScroll = () => {
      if (!headerRef.current) return;
      const headerBottom = headerRef.current.getBoundingClientRect().bottom;
      const containerTop = scrollEl.getBoundingClientRect().top;
      setStickyVisible(headerBottom <= containerTop);
    };
    scrollEl.addEventListener("scroll", handleScroll, { passive: true });
    return () => scrollEl.removeEventListener("scroll", handleScroll);
  }, [current?.id]);

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

  // Clases responsivas para list y detail
  const listClasses = [
    "flex-shrink-0 flex-col",
    "w-full md:w-[260px] xl:w-[320px]",
    showDetail ? "hidden md:flex" : "flex",   // móvil: oculto si hay detalle abierto
    !panelAbierto ? "md:hidden" : "md:flex",  // desktop: oculto si panel colapsado
  ].join(" ");

  const detailClasses = [
    "flex-1 min-w-0 flex-col",
    showDetail ? "flex" : "hidden md:flex",   // móvil: visible solo con detalle; desktop: siempre
  ].join(" ");

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 md:mb-6">
        <div className="w-10 h-10 bg-[var(--caritas-green)]/10 rounded-lg flex items-center justify-center">
          <HandHeart className="w-5 h-5 text-[var(--caritas-green)]" />
        </div>
        <div>
          <h1 className="text-[var(--caritas-text)] font-semibold text-lg">Gestión de Donaciones</h1>
          <p className="text-sm text-gray-500">Evaluación del Comité sobre solicitudes de apoyo</p>
        </div>
      </div>

      {/* ── Layout principal: flex responsivo ── */}
      <div className="flex gap-4 h-[calc(100vh-180px)]">

        {/* ── Cola de Evaluación (panel lateral) ── */}
        <div className={listClasses}>
          <div className="flex-1 flex flex-col bg-white border border-[var(--caritas-border)] rounded-xl overflow-hidden">
            {/* Barra superior: lupa + dropdown / botón colapsar (desktop only) */}
            <div className="flex items-center gap-1 px-2 py-2 border-b border-gray-100 shrink-0">
              {searchOpen ? (
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar por código, título..."
                    autoFocus
                    className="w-full pl-9 pr-9 py-2 border border-[var(--caritas-border)] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[var(--caritas-green)]"
                  />
                  <button
                    onClick={() => { setSearchOpen(false); setBusqueda(""); }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    title="Cerrar búsqueda"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setSearchOpen(true)}
                    title="Buscar"
                    className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 border border-transparent hover:border-gray-200 hover:text-[var(--caritas-green)] hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                  <FiltroDropdown
                    filtroId={filtroId}
                    onChange={setFiltroId}
                    casos={casos}
                  />
                </>
              )}
              {/* Botón colapsar: solo desktop */}
              <button
                onClick={() => setPanelAbierto(false)}
                title="Colapsar panel"
                className="hidden md:flex shrink-0 w-8 h-8 items-center justify-center rounded-lg text-gray-400 border border-transparent hover:border-gray-200 hover:text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>

            {/* Lista de casos (scroll independiente) */}
            <div className="flex-1 overflow-y-auto">
              {listaFiltrada.length === 0 ? (
                <div className="p-8 text-center">
                  <CheckCircle className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">
                    {busqueda ? "Sin resultados para tu búsqueda." : "No hay casos en esta vista."}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {listaFiltrada.map((c) => (
                    <CasoRow
                      key={c.id}
                      c={c}
                      selected={selectedId === c.id}
                      onClick={() => handleSelectCase(c.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Detalle ── */}
        <div className={detailClasses}>
          {/* Botón volver — solo móvil */}
          <button
            onClick={() => setShowDetail(false)}
            className="md:hidden flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 font-medium mb-3 cursor-pointer transition-colors shrink-0"
          >
            <ChevronLeft className="w-4 h-4" /> Volver a la lista
          </button>

          {/* Botón mostrar cola — solo desktop cuando está colapsado */}
          {!panelAbierto && (
            <button
              onClick={() => setPanelAbierto(true)}
              title="Expandir panel"
              className="hidden md:flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors cursor-pointer shrink-0 mb-3"
            >
              <PanelLeftOpen className="w-4 h-4" /> Mostrar cola de evaluación
            </button>
          )}

          {/* Área con scroll independiente */}
          <div ref={detailScrollRef} className="flex-1 overflow-y-auto">
            {/* Sticky mini header — visible cuando el header principal sale de vista */}
            {current && (
              <div
                className={`sticky top-0 z-20 bg-white border-b border-gray-100 items-center justify-between px-4 py-2.5 gap-3 ${
                  stickyVisible ? "flex shadow-sm" : "hidden"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{current.titulo}</p>
                  <span
                    className={`flex-shrink-0 px-2 py-0.5 text-[10px] rounded-full font-semibold ${STATUS_COLOR[current.estado] ?? "bg-gray-100"}`}
                  >
                    {current.estado}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => router.push(`/grd/${current.id}`)}
                    title="Ir a Incidencia"
                    className="p-1.5 text-gray-400 hover:text-[var(--caritas-green)] rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                  {puedeVotar && (
                    <button
                      onClick={() => setShowVotacion(true)}
                      className="flex items-center gap-1.5 text-[var(--caritas-green)] text-sm font-medium px-2.5 py-1.5 rounded-lg border border-transparent hover:border-[var(--caritas-green)]/40 hover:bg-[var(--caritas-green)]/5 transition-all cursor-pointer"
                    >
                      <Hand className="w-4 h-4" />
                      <span>Votar</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {!current ? (
              <div className="bg-white border border-[var(--caritas-border)] rounded-xl p-12 text-center min-h-64 flex flex-col items-center justify-center">
                <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm font-medium">
                  Selecciona un caso para ver el detalle
                </p>
              </div>
            ) : (
              <div className="bg-white border border-[var(--caritas-border)] rounded-xl overflow-hidden">
                {/* Cabecera principal — observada para activar el sticky */}
                <div ref={headerRef} className="p-4 border-b border-gray-100 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-mono text-gray-400">{current.codigo}</p>
                      <span
                        className={`px-2 py-0.5 text-[10px] rounded-full font-semibold ${STATUS_COLOR[current.estado] ?? "bg-gray-100"}`}
                      >
                        {current.estado}
                      </span>
                    </div>
                    <p className="text-base font-bold text-gray-900 leading-tight mt-1">
                      {current.titulo}
                    </p>
                    {/* Dirección cliqueable con ícono de ubicación */}
                    {(current.direccion || current.parroquia) && (
                      <button
                        onClick={() => setShowMapModal(true)}
                        className="flex items-center gap-1 text-xs text-gray-500 mt-0.5 hover:text-[var(--caritas-green)] transition-colors cursor-pointer group"
                      >
                        <MapPin className="w-3 h-3 shrink-0 group-hover:text-[var(--caritas-green)]" />
                        <span>{[current.direccion, current.parroquia].filter(Boolean).join(" · ")}</span>
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => router.push(`/grd/${current.id}`)}
                      title="Ir a Incidencia"
                      className="p-1.5 text-gray-400 hover:text-[var(--caritas-green)] rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                    {puedeVotar && (
                      <button
                        onClick={() => setShowVotacion(true)}
                        className="flex items-center gap-1.5 text-[var(--caritas-green)] text-sm font-medium px-2.5 py-1.5 rounded-lg border border-transparent hover:border-[var(--caritas-green)]/40 hover:bg-[var(--caritas-green)]/5 transition-all cursor-pointer"
                      >
                        <Hand className="w-4 h-4" />
                        <span>Votar</span>
                      </button>
                    )}
                  </div>
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
                        <div key={label} className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
                          <p className="text-xs font-semibold text-gray-900">{value}</p>
                        </div>
                      ))}
                  </div>

                  {current.descripcion && (
                    <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Descripción del evento</p>
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

                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de ubicación con mapa real */}
      {showMapModal && current && (
        <ModalUbicacion
          lat={current.lat}
          lng={current.lng}
          direccion={current.direccion}
          parroquia={current.parroquia}
          onClose={() => setShowMapModal(false)}
        />
      )}

      {/* Modal de votación */}
      {showVotacion && current && (
        <ModalVotacionComite
          idIncidencia={current.id}
          codigo={current.codigo}
          soyMiembroDelComite={soyMiembroDelComite}
          miIdUsuarioGRD={miIdUsuarioGRD}
          tally={tallyPorCaso[current.id] ?? null}
          onClose={() => setShowVotacion(false)}
        />
      )}
    </div>
  );
}

// ─── Dropdown de filtro de la cola ────────────────────────────────────────────

function FiltroDropdown({
  filtroId,
  onChange,
  casos,
}: {
  filtroId: string;
  onChange: (id: string) => void;
  casos: Caso[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const contar = (estados: string[] | null) =>
    casos.filter((c) => estados === null || estados.includes(c.estado)).length;

  const activo = FILTROS.find((f) => f.id === filtroId) ?? FILTROS[0];

  return (
    <div ref={ref} className="relative flex-1">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center justify-between gap-2 w-full px-3 py-2 rounded-lg text-sm bg-transparent transition-colors cursor-pointer border ${
          open
            ? "border-[var(--caritas-green)] ring-1 ring-[var(--caritas-green)]/30 bg-white"
            : "border-transparent hover:border-gray-200 hover:bg-gray-50"
        }`}
      >
        <span className="font-medium text-gray-800 truncate">
          {activo.label} <span className="text-gray-400 font-normal">({contar(activo.estados)})</span>
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-full bg-white border border-[var(--caritas-border)] rounded-xl shadow-lg z-30 py-1 max-h-72 overflow-y-auto">
          {FILTROS.map((f) => {
            const sel = f.id === filtroId;
            return (
              <button
                key={f.id}
                onClick={() => { onChange(f.id); setOpen(false); }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left transition-colors cursor-pointer ${
                  sel ? "bg-[var(--caritas-green)]/8 text-[var(--caritas-green)] font-medium" : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span className="truncate">{f.label}</span>
                <span className={`text-xs ${sel ? "text-[var(--caritas-green)]" : "text-gray-400"}`}>
                  {contar(f.estados)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CasoRow({
  c,
  selected,
  onClick,
}: {
  c: Caso;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 transition-colors cursor-pointer ${
        selected
          ? "bg-[var(--caritas-green)]/5 border-r-4 border-r-[var(--caritas-green)]"
          : "hover:bg-gray-50"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-mono text-gray-400">{c.codigo}</p>
          <p className="text-sm font-semibold text-gray-900 leading-tight truncate">
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
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      {/* Cabecera sin fondo morado — título en morado, fondo blanco */}
      <div className="px-4 py-3 flex items-center justify-between gap-3 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-2 min-w-0">
          <BarChart3 className="w-4 h-4 text-purple-600 flex-shrink-0" />
          <h3 className="font-semibold text-sm text-purple-700 truncate">
            Informe de Atención de Ayuda Humanitaria
          </h3>
        </div>
        <button
          type="button"
          onClick={onDescargar}
          disabled={descargando}
          className="flex items-center gap-1.5 border border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-800 text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50 flex-shrink-0 cursor-pointer transition-colors"
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
              {/* Cabecera acorde al estilo del sistema */}
              <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-200 bg-gray-50">
                <BarChart3 className="w-3.5 h-3.5 text-[var(--caritas-green)]" />
                <p className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                  Resumen consolidado
                </p>
              </div>
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-gray-500 bg-white border-b border-gray-100">
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
