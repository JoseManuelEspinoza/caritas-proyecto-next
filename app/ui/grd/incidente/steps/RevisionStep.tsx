import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileCheck,
  FileText,
  Loader2,
  Plus,
  Upload,
  Users,
  X,
  XCircle,
  Search,
} from "lucide-react";
import {
  saveInformeEvaluacion,
  saveBorradorInformeEvaluacion,
} from "@/app/actions/incidents";
import type { IncidenciaDetalleOutput } from "@/core/application/dtos/IncidenciaDetalleDTO";
import { parseInforme } from "@/core/application/dtos/InformeContenidoDTO";
import { permisosDeDetalle } from "@/app/lib/permisos-incidencia";
import { InfoField } from "@/app/ui/grd/incidente/components/InfoField";
import { Seccion, ReadSeccion, ReadCampo } from "@/app/ui/grd/incidente/components/Seccion";
import { ListaEditable } from "@/app/ui/grd/incidente/components/ListaEditable";
import {
  EvidenciasRegistro,
  EvidenciaChip,
} from "@/app/ui/grd/incidente/components/EvidenciasRegistro";
import { subirEvidencia } from "@/app/ui/grd/incidente/lib/subir-evidencia";
import { fmtDate } from "@/app/ui/grd/incidente/lib/format";
import { inputCls, textareaCls } from "@/app/ui/grd/incidente/lib/ui-classes";

/** Paso "Revisar Caso": informe del Especialista, vista de solo lectura del Comité y decisión. */
export function RevisionStep({
  data,
  onDone,
}: {
  data: IncidenciaDetalleOutput;
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  // Compute early so useState initializers can pre-populate from the last saved informe
  const informeEval = data.informes.find((i) => i.tipo === "EVALUACION");
  const sc = parseInforme<Record<string, unknown>>(informeEval?.contenido);

  // El comité ve "Decidir" por defecto cuando el estado ya está en evaluación
  const defaultView: "evaluar" | "decidir" =
    (data.role === "comite" || data.role === "jefaOGP") && data.estadoActual === "EN EVALUACION"
      ? "decidir"
      : "evaluar";
  const [view, setView] = useState<"evaluar" | "decidir">(defaultView);

  // ── Informe enriquecido del Especialista ──
  type ArtLocal = { codigo: string; descripcion: string; cantidad: number };
  type KitLocal = { tipoKit: string; idKit?: string; articulos: ArtLocal[] };
  // Nombres de catálogo presentes en los artículos cargados (módulo Catálogos):
  // solo se usan para los datalists de códigos de los kits "Otros"/legacy.
  const KIT_TIPOS = Array.from(new Set(data.catalogoArticulos.map((a) => a.catalogo))).filter(
    Boolean
  );
  const [report, setReport] = useState({
    motivo: typeof sc?.motivo === "string" ? sc.motivo : "",
    dirigidoA: typeof sc?.dirigidoA === "string" ? sc.dirigidoA : "Comité de donaciones",
    objetivoGeneral: typeof sc?.objetivoGeneral === "string" ? sc.objetivoGeneral : "",
    analisis: typeof sc?.analisisSituacion === "string" ? sc.analisisSituacion : "",
    hallazgosTexto: typeof sc?.hallazgosTexto === "string" ? sc.hallazgosTexto : "",
    conclusiones: typeof sc?.conclusiones === "string" ? sc.conclusiones : "",
  });
  const setR = (k: string, v: string) => setReport((p) => ({ ...p, [k]: v }));
  const [objetivos, setObjetivos] = useState<string[]>(
    Array.isArray(sc?.objetivosEspecificos) && (sc.objetivosEspecificos as unknown[]).length > 0
      ? (sc.objetivosEspecificos as unknown[]).map(String)
      : [""]
  );
  const [hallazgos, setHallazgos] = useState<string[]>(
    Array.isArray(sc?.hallazgosClave) && (sc.hallazgosClave as unknown[]).length > 0
      ? (sc.hallazgosClave as unknown[]).map(String)
      : [""]
  );
  const [asignaciones, setAsignaciones] = useState<Record<string, KitLocal[]>>(() => {
    if (!Array.isArray(sc?.asignacionFamilias)) return {};
    const out: Record<string, KitLocal[]> = {};
    for (const af of sc.asignacionFamilias as unknown[]) {
      const a = af as Record<string, unknown>;
      if (typeof a.refId === "string" && Array.isArray(a.kits)) {
        out[a.refId] = (a.kits as unknown[]).map((k) => {
          const kit = k as Record<string, unknown>;
          return {
            tipoKit: typeof kit.tipoKit === "string" ? kit.tipoKit : "",
            idKit: typeof kit.idKit === "string" ? kit.idKit : undefined,
            articulos: Array.isArray(kit.articulos)
              ? (kit.articulos as unknown[]).map((art) => {
                  const ar = art as Record<string, unknown>;
                  return {
                    codigo: typeof ar.codigo === "string" ? ar.codigo : "",
                    descripcion: typeof ar.descripcion === "string" ? ar.descripcion : "",
                    cantidad: typeof ar.cantidad === "number" ? ar.cantidad : 1,
                  };
                })
              : [{ codigo: "", descripcion: "", cantidad: 1 }],
          };
        });
      }
    }
    return out;
  });
  const [collapsed, setCollapsed] = useState(false);

  // Validación de campos obligatorios
  const [fieldErrors, setFieldErrors] = useState<Set<string>>(new Set());
  // Evidencias seleccionadas para incluir en el informe
  const [evidenciasSeleccionadas, setEvidenciasSeleccionadas] = useState<Set<string>>(
    new Set(Array.isArray(sc?.evidenciasSeleccionadas) ? (sc.evidenciasSeleccionadas as unknown[]).map(String) : [])
  );
  // Paso de adjuntar documento al comité (modal emergente)
  const [showDocStep, setShowDocStep] = useState(false);
  const [docTipo, setDocTipo] = useState<"link" | "file">("link");
  const [docLink, setDocLink] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [subiendoDoc, setSubiendoDoc] = useState(false);
  const [savingForPdf, setSavingForPdf] = useState(false);
  const [descargandoPdf, setDescargandoPdf] = useState(false);
  const [kitSearch, setKitSearch] = useState<Record<string, string>>({});
  const [kitDropdownOpen, setKitDropdownOpen] = useState<Record<string, boolean>>({});

  const addKit = (refId: string, tipo: string) =>
    setAsignaciones((p) => ({
      ...p,
      [refId]: [...(p[refId] ?? []), { tipoKit: tipo, articulos: [{ codigo: "", descripcion: "", cantidad: 1 }] }],
    }));
  // Kit del sistema: precarga su composición real (editable por familia).
  const addKitSistema = (refId: string, k: (typeof data.kitsEmergencia)[number]) =>
    setAsignaciones((p) => ({
      ...p,
      [refId]: [
        ...(p[refId] ?? []),
        {
          tipoKit: k.tipoKit,
          idKit: k.id,
          articulos: k.articulos.length
            ? k.articulos.map((a) => ({
                codigo: a.codigo ?? "",
                descripcion: a.descripcion,
                cantidad: a.cantidad,
              }))
            : [{ codigo: "", descripcion: "", cantidad: 1 }],
        },
      ],
    }));
  // Uso total de cada kit del sistema en el informe (para avisar si excede stock).
  const usoKits = new Map<string, number>();
  for (const kitsFam of Object.values(asignaciones))
    for (const k of kitsFam) if (k.idKit) usoKits.set(k.idKit, (usoKits.get(k.idKit) ?? 0) + 1);
  const kitsExcedidos = data.kitsEmergencia.filter((k) => (usoKits.get(k.id) ?? 0) > k.stockActual);
  const removeKit = (refId: string, ki: number) =>
    setAsignaciones((p) => ({ ...p, [refId]: (p[refId] ?? []).filter((_, i) => i !== ki) }));
  const addArt = (refId: string, ki: number) =>
    setAsignaciones((p) => ({
      ...p,
      [refId]: (p[refId] ?? []).map((k, i) =>
        i === ki ? { ...k, articulos: [...k.articulos, { codigo: "", descripcion: "", cantidad: 1 }] } : k
      ),
    }));
  const updArt = (refId: string, ki: number, ai: number, patch: Partial<ArtLocal>) =>
    setAsignaciones((p) => ({
      ...p,
      [refId]: (p[refId] ?? []).map((k, i) =>
        i === ki
          ? { ...k, articulos: k.articulos.map((a, j) => (j === ai ? { ...a, ...patch } : a)) }
          : k
      ),
    }));
  const removeArt = (refId: string, ki: number, ai: number) =>
    setAsignaciones((p) => ({
      ...p,
      [refId]: (p[refId] ?? []).map((k, i) =>
        i === ki ? { ...k, articulos: k.articulos.filter((_, j) => j !== ai) } : k
      ),
    }));

  const { puedeEvaluar: canEvaluar, puedeDecidir: canDecidir } = permisosDeDetalle(data);
  const solicitud = data.solicitudComite;
  // El informe ya fue enviado al comité cuando existe informe de evaluación y el estado avanzó a EN EVALUACION
  const informeYaEnviado = !!informeEval && data.estadoActual === "EN EVALUACION";

  const targets = data.gruposFamiliares;
  const integrantesDe = (g: IncidenciaDetalleOutput["gruposFamiliares"][number]) =>
    g.personas.map((p) => `${p.nombres} ${p.apellidos ?? ""}`.trim());

  function kitsLimpios(refId: string) {
    return (asignaciones[refId] ?? [])
      .map((k) => ({
        tipoKit: k.tipoKit,
        // Referencia al kit real del módulo de Kits (trazabilidad y stock).
        ...(k.idKit ? { idKit: k.idKit } : {}),
        articulos: k.articulos
          .filter((a) => a.descripcion.trim() || a.codigo.trim())
          .map((a) => ({
            codigo: a.codigo.trim(),
            descripcion: a.descripcion.trim(),
            cantidad: a.cantidad || 1,
          })),
      }))
      .filter((k) => k.articulos.length);
  }

  // Anotación de la familia (fuente única: GrupoFamiliar.observaciones).
  function notaFamiliaDe(refId: string): string | null {
    return targets.find((g) => g.id === refId)?.observaciones?.trim() || null;
  }

  // Resumen consolidado de todos los artículos asignados (suma por kit/código)
  function articulosConsolidados() {
    const map = new Map<string, { tipoKit: string; codigo: string; descripcion: string; cantidad: number }>();
    for (const g of targets) {
      for (const kit of kitsLimpios(g.id)) {
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

  // Descarga el PDF del informe ya enviado (uso del Comité, sin guardar)
  async function descargarInforme() {
    setDescargandoPdf(true);
    try {
      await generarPdf();
    } catch {
      toast.error("No se pudo generar el PDF.");
    } finally {
      setDescargandoPdf(false);
    }
  }

  // Helper: clase de error para campos obligatorios
  const errCls = (field: string) =>
    fieldErrors.has(field)
      ? "border-red-500 ring-1 ring-red-300 focus:ring-red-300 focus:border-red-500"
      : "";

  function validate(): boolean {
    const errs = new Set<string>();
    if (!report.motivo.trim()) errs.add("motivo");
    if (!report.objetivoGeneral.trim()) errs.add("objetivoGeneral");
    if (!report.analisis.trim()) errs.add("analisis");
    if (!report.conclusiones.trim()) errs.add("conclusiones");
    setFieldErrors(errs);
    return errs.size === 0;
  }

  // Primer click: valida y abre paso de documento
  function handleClickEnviar() {
    if (!validate()) {
      setCollapsed(false);
      toast.error("Completa los campos marcados en rojo antes de enviar.");
      return;
    }
    setShowDocStep(true);
  }

  // Segundo click (desde el paso de documento): sube documento y envía
  async function handleEvaluar() {
    // Obligatorio: al menos un enlace o un archivo.
    if (docTipo === "link" ? !docLink.trim() : !docFile) {
      toast.error("Adjunta un enlace o un archivo para enviar al Comité.");
      return;
    }
    let docAdjunto: string | null = null;

    if (docTipo === "link" && docLink.trim()) {
      docAdjunto = docLink.trim();
    } else if (docTipo === "file" && docFile) {
      setSubiendoDoc(true);
      try {
        docAdjunto = await subirEvidencia(docFile, data.idIncidencia);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo subir el documento.");
        setSubiendoDoc(false);
        return;
      }
      setSubiendoDoc(false);
    }

    startTransition(async () => {
      const res = await saveInformeEvaluacion(data.idIncidencia, {
        analisisSituacion: report.analisis,
        hallazgosTexto: report.hallazgosTexto,
        conclusiones: report.conclusiones,
        nivelUrgencia: "Alta",
        tipoIntervencion: "Donación en especie",
        recomendacionComite: "",
        motivo: report.motivo,
        dirigidoA: report.dirigidoA,
        objetivoGeneral: report.objetivoGeneral,
        objetivosEspecificos: objetivos.map((s) => s.trim()).filter(Boolean),
        hallazgosClave: hallazgos.map((s) => s.trim()).filter(Boolean),
        asignacionFamilias: targets.map((g) => ({
          refId: g.id,
          nombre: g.nombreReferencia ?? "Familia",
          kits: kitsLimpios(g.id),
        })),
        evidenciasSeleccionadas: Array.from(evidenciasSeleccionadas),
        documentoAdjunto: docAdjunto,
      });
      if (res && "message" in res) {
        toast.error(res.message);
        return;
      }
      toast.success("Informe enviado al Comité");
      setShowDocStep(false);
      onDone();
    });
  }

  async function handlePdf() {
    if (!validate()) {
      setCollapsed(false);
      toast.error("Completa los campos marcados en rojo antes de generar el PDF.");
      return;
    }

    // Save current form state as draft (no state transition)
    setSavingForPdf(true);
    const saveRes = await saveBorradorInformeEvaluacion(data.idIncidencia, {
      analisisSituacion: report.analisis,
      hallazgosTexto: report.hallazgosTexto,
      conclusiones: report.conclusiones,
      nivelUrgencia: "Alta",
      tipoIntervencion: "Donación en especie",
      recomendacionComite: "",
      motivo: report.motivo,
      dirigidoA: report.dirigidoA,
      objetivoGeneral: report.objetivoGeneral,
      objetivosEspecificos: objetivos.map((s) => s.trim()).filter(Boolean),
      hallazgosClave: hallazgos.map((s) => s.trim()).filter(Boolean),
      asignacionFamilias: targets.map((g) => ({
        refId: g.id,
        nombre: g.nombreReferencia ?? "Familia",
        kits: kitsLimpios(g.id),
      })),
      evidenciasSeleccionadas: Array.from(evidenciasSeleccionadas),
      documentoAdjunto: null,
    });
    setSavingForPdf(false);
    if (saveRes && "message" in saveRes) {
      toast.error(saveRes.message);
      return;
    }
    toast.success("Informe guardado");
    await generarPdf();
  }

  // Genera y descarga el PDF con los valores actuales del informe (sin guardar).
  async function generarPdf() {
    // Determine which images to embed: selected evidence images, or all if none selected
    const isImgEv = (ev: (typeof data.evidencias)[number]) => {
      const fmt = ev.formato ?? "";
      const name = ev.nombreArchivo ?? "";
      return fmt.startsWith("image/") || /\.(jpe?g|png|gif|webp|bmp)$/i.test(name);
    };
    const evIds = Array.from(evidenciasSeleccionadas);
    const evParaPdf = (
      evIds.length > 0
        ? data.evidencias.filter((e) => evIds.includes(e.id) && isImgEv(e))
        : data.evidencias.filter(isImgEv)
    ).filter((e) => e.urlArchivo);

    const { generarInformePdf } = await import("@/app/lib/informe-pdf");
    await generarInformePdf({
      codigo: data.codigoCaso ?? "GRD",
      categoria: data.tipoEvento ?? "—",
      evento: data.tituloIncidencia ?? data.codigoCaso ?? "Incidencia",
      ubicacion: [data.direccionEvento, data.parroquia].filter(Boolean).join(", ") || "—",
      fechaSuceso: fmtDate(data.fechaRegistro),
      familiasAfectadas: targets.length,
      personasEmpadronadas: targets.reduce((n, g) => n + g.personas.length, 0),
      fechaEmision: fmtDate(new Date().toISOString()),
      emitidoPor: `${data.currentUserName} — Especialista GRD`,
      oficina: "Oficina de Gestión Pastoral / GRD",
      motivo: report.motivo,
      dirigidoA: report.dirigidoA,
      objetivoGeneral: report.objetivoGeneral,
      objetivosEspecificos: objetivos.map((s) => s.trim()).filter(Boolean),
      analisisSituacion: report.analisis,
      hallazgosTexto: report.hallazgosTexto,
      hallazgosClave: hallazgos.map((s) => s.trim()).filter(Boolean),
      necesidadesIdentificadas: [],
      evidenciasCount: data.evidencias.length,
      evidenciasImagenes: evParaPdf.map((e) => ({
        url: e.urlArchivo!,
        nombre: e.nombreArchivo,
        formato: e.formato ?? undefined,
      })),
      familias: targets.map((g) => ({
        nombre: g.nombreReferencia ?? "Familia",
        integrantes: integrantesDe(g),
        kits: kitsLimpios(g.id),
      })),
      conclusiones: report.conclusiones,
    });
  }

  // Estado ya decidido
  if (["APROBADO", "RECHAZADO"].includes(data.estadoActual)) {
    const approved = data.estadoActual === "APROBADO";
    return (
      <div
        className={`p-4 rounded-lg border ${approved ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}
      >
        <div className="flex items-center gap-2 mb-2">
          {approved ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <XCircle className="w-5 h-5 text-red-600" />
          )}
          <span className={`font-semibold ${approved ? "text-green-800" : "text-red-800"}`}>
            Caso {approved ? "Aprobado" : "Rechazado"} por el Comité
          </span>
        </div>
        {solicitud?.observaciones && (
          <p className="text-sm text-gray-700">{solicitud.observaciones}</p>
        )}
        {solicitud?.fecha && (
          <p className="text-xs text-gray-500 mt-1">{fmtDate(solicitud.fecha)}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tabs: Evaluar / Decidir */}
      <div className="flex border-b border-[#DDDDDD]">
        {canEvaluar && (
          <button
            onClick={() => setView("evaluar")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${view === "evaluar" ? "border-[#009850] text-[#009850]" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            Informe de Evaluación
          </button>
        )}
        {canDecidir && data.estadoActual === "EN EVALUACION" && (
          <button
            onClick={() => setView("decidir")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${view === "decidir" ? "border-[#009850] text-[#009850]" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            Decisión del Comité
          </button>
        )}
      </div>

      {/* Vista: Evaluar */}
      {view === "evaluar" &&
        (canEvaluar ? (
          <div className="space-y-4">
            {data.estadoActual === "OBSERVADO" && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <p className="text-sm font-semibold text-amber-800">
                    El Comité devolvió el caso con observaciones
                  </p>
                </div>
                <p className="text-sm text-amber-700">
                  {solicitud?.observaciones ?? "Sin observaciones registradas"}
                </p>
                <p className="text-xs text-amber-600 mt-1.5">
                  Corrige el informe completo y vuelve a enviarlo al Comité.
                </p>
              </div>
            )}
            {informeEval && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <FileCheck className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  Última versión guardada: {fmtDate(informeEval.fecha)}
                </span>
              </div>
            )}
            {/* Un datalist por tipo de kit: cada kit muestra solo su catálogo */}
            {KIT_TIPOS.map((tipo, ti) => (
              <datalist key={tipo} id={`cat-${ti}`}>
                {data.catalogoArticulos
                  .filter((a) => a.catalogo === tipo)
                  .map((a) => (
                    <option key={a.codigo} value={a.codigo}>
                      {a.valor}
                    </option>
                  ))}
              </datalist>
            ))}
            {/* Catálogo completo: para kits del sistema sin catálogo propio */}
            <datalist id="cat-all">
              {data.catalogoArticulos.map((a) => (
                <option key={`${a.catalogo}-${a.codigo}`} value={a.codigo}>
                  {a.valor}
                </option>
              ))}
            </datalist>

            {/* Header morado + resumen del evento */}
            <div className="rounded-xl bg-purple-600 text-white p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">Informe de Atención de Ayuda Humanitaria</p>
                  <p className="text-sm text-white/90">
                    Revisa el levantamiento de campo y asigna los kits que recibirá cada familia.
                  </p>
                </div>
                <span className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded-full uppercase flex-shrink-0">
                  Especialista GRD
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                {[
                  ["Código", data.codigoCaso ?? "—"],
                  ["Familias", String(targets.length)],
                  ["Personas", String(targets.reduce((n, g) => n + g.personas.length, 0))],
                  ["Distrito", data.parroquia ?? "—"],
                  ["Categoría", data.tipoEvento ?? "—"],
                  ["Fecha suceso", fmtDate(data.fechaRegistro)],
                ].map(([l, v]) => (
                  <div key={l} className="bg-white/10 rounded-lg px-2.5 py-1.5">
                    <p className="text-[10px] text-white/70 uppercase">{l}</p>
                    <p className="text-xs font-semibold truncate">{v}</p>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              className="text-xs text-purple-700 font-medium flex items-center gap-1"
            >
              {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              {collapsed ? "Mostrar formulario" : "Ocultar formulario"}
            </button>

            {!collapsed && (
              <>
                <div className={informeYaEnviado ? "pointer-events-none opacity-60 select-none" : ""}>
                {/* Todo visible en 2 columnas: secciones cortas a la mitad, las
                    grandes (Análisis, Asignación, Evidencias-ref) a lo ancho. */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
                {/* A) Datos de identificación */}
                <Seccion num="A" titulo="Datos de Identificación">
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${fieldErrors.has("motivo") ? "text-red-600" : "text-gray-700"}`}>
                      Motivo <span className="text-red-500">*</span>
                      {fieldErrors.has("motivo") && (
                        <span className="ml-2 text-red-500">— Campo obligatorio</span>
                      )}
                    </label>
                    <textarea
                      rows={2}
                      className={`${textareaCls} ${errCls("motivo")}`}
                      value={report.motivo}
                      onChange={(e) => {
                        setR("motivo", e.target.value);
                        if (fieldErrors.has("motivo") && e.target.value.trim()) {
                          setFieldErrors((prev) => { const n = new Set(prev); n.delete("motivo"); return n; });
                        }
                      }}
                      placeholder="Motivo del informe..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Dirigido a</label>
                    <span className="inline-block px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-medium border border-purple-200">
                      {report.dirigidoA}
                    </span>
                  </div>
                </Seccion>

                {/* B) Objetivos de la visita */}
                <Seccion num="B" titulo="Objetivos de la Visita">
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${fieldErrors.has("objetivoGeneral") ? "text-red-600" : "text-gray-700"}`}>
                      Objetivo general <span className="text-red-500">*</span>
                      {fieldErrors.has("objetivoGeneral") && (
                        <span className="ml-2 text-red-500">— Campo obligatorio</span>
                      )}
                    </label>
                    <textarea
                      rows={2}
                      className={`${textareaCls} ${errCls("objetivoGeneral")}`}
                      value={report.objetivoGeneral}
                      onChange={(e) => {
                        setR("objetivoGeneral", e.target.value);
                        if (fieldErrors.has("objetivoGeneral") && e.target.value.trim()) {
                          setFieldErrors((prev) => { const n = new Set(prev); n.delete("objetivoGeneral"); return n; });
                        }
                      }}
                      placeholder="Describe el objetivo general..."
                    />
                  </div>
                  <ListaEditable
                    label="Objetivos específicos"
                    items={objetivos}
                    setItems={setObjetivos}
                    placeholder="Objetivo específico..."
                    addLabel="Agregar objetivo"
                  />
                </Seccion>

                {/* C) Análisis y descripción */}
                <Seccion num="C" titulo="Análisis y Descripción" className="lg:col-span-2">
                  {(() => {
                    const campo = data.informes.find((i) => i.tipo === "CAMPO");
                    let ref: any = null;
                    try {
                      ref = campo?.contenido ? JSON.parse(campo.contenido) : null;
                    } catch {
                      ref = null;
                    }
                    if (!ref) return null;
                    return (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-xs text-orange-900">
                        <p className="font-bold uppercase tracking-wide mb-1">
                          Levantamiento del brigadista (referencia)
                        </p>
                        {ref.nivelVulnerabilidad && (
                          <p>
                            <span className="font-semibold">Vulnerabilidad:</span>{" "}
                            {ref.nivelVulnerabilidad}
                          </p>
                        )}
                        {ref.descripcionEvento && (
                          <p>
                            <span className="font-semibold">Descripción:</span> {ref.descripcionEvento}
                          </p>
                        )}
                        {ref.observaciones && (
                          <p>
                            <span className="font-semibold">Observaciones:</span> {ref.observaciones}
                          </p>
                        )}
                        {ref.recomendacion && (
                          <p>
                            <span className="font-semibold">Recomendación:</span> {ref.recomendacion}
                          </p>
                        )}
                      </div>
                    );
                  })()}
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${fieldErrors.has("analisis") ? "text-red-600" : "text-gray-700"}`}>
                      Análisis de la situación <span className="text-red-500">*</span>
                      {fieldErrors.has("analisis") && (
                        <span className="ml-2 text-red-500">— Campo obligatorio</span>
                      )}
                    </label>
                    <textarea
                      rows={3}
                      className={`${textareaCls} ${errCls("analisis")}`}
                      value={report.analisis}
                      onChange={(e) => {
                        setR("analisis", e.target.value);
                        if (fieldErrors.has("analisis") && e.target.value.trim()) {
                          setFieldErrors((prev) => { const n = new Set(prev); n.delete("analisis"); return n; });
                        }
                      }}
                      placeholder="Análisis socioeconómico, magnitud del daño, redes de apoyo..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Hallazgos principales (texto)
                    </label>
                    <textarea
                      rows={2}
                      className={textareaCls}
                      value={report.hallazgosTexto}
                      onChange={(e) => setR("hallazgosTexto", e.target.value)}
                      placeholder="Resumen narrativo..."
                    />
                  </div>
                  <ListaEditable
                    label="Hallazgos clave (lista)"
                    items={hallazgos}
                    setItems={setHallazgos}
                    placeholder="Hallazgo..."
                    addLabel="Agregar hallazgo"
                  />
                </Seccion>

                {/* D) Asignación de ayuda humanitaria por familia */}
                <Seccion num="D" titulo="Asignación de Ayuda Humanitaria por Familia" className="lg:col-span-2">
                  {targets.length === 0 ? (
                    <p className="text-xs text-gray-400">Sin familias empadronadas.</p>
                  ) : (
                    targets.map((g) => {
                      const kits = asignaciones[g.id] ?? [];
                      return (
                        <div key={g.id} className="border border-gray-200 rounded-lg p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-purple-600" />
                            <p className="text-sm font-semibold text-gray-800">
                              {g.nombreReferencia ?? "Familia"}
                            </p>
                            <span className="text-[10px] text-gray-500">
                              {g.personas.length} integrante(s)
                            </span>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-2 text-[11px] text-gray-600">
                            <p className="uppercase text-[10px] text-gray-400 mb-1">
                              Datos recopilados en campo
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {g.personas.map((p) => {
                                const mayor = p.edad != null && Number(p.edad) >= 60;
                                return (
                                  <span
                                    key={p.id}
                                    className={`px-1.5 py-0.5 rounded ${mayor ? "bg-amber-100 text-amber-700" : "bg-white border border-gray-200"}`}
                                  >
                                    {p.nombres} {p.apellidos ?? ""}
                                    {p.edad ? ` · ${p.edad}a` : ""}
                                    {mayor ? " ⚠ Adulto mayor" : ""}
                                  </span>
                                );
                              })}
                            </div>
                          </div>

                          {/* Anotación de la familia (registro + brigadista, unificada) */}
                          {(() => {
                            const nota = notaFamiliaDe(g.id);
                            if (!nota) return null;
                            return (
                              <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs">
                                <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-wide mb-0.5">
                                  Anotación de la familia
                                </p>
                                <p className="text-blue-900">{nota}</p>
                              </div>
                            );
                          })()}

                          {/* Kits asignados */}
                          {kits.map((kit, ki) => (
                            <div key={ki} className="border border-purple-100 rounded-lg p-2 bg-purple-50/40">
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-xs font-semibold text-purple-700">{kit.tipoKit}</p>
                                <button
                                  type="button"
                                  onClick={() => removeKit(g.id, ki)}
                                  className="text-red-500 hover:bg-red-50 rounded p-0.5"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                                {kit.articulos.map((a, ai) => (
                                  <div
                                    key={ai}
                                    className="flex items-center gap-1 bg-white border border-purple-100 rounded px-1.5 py-1"
                                  >
                                    {kit.idKit ? (
                                      <>
                                        {/* Elementos del kit del sistema: solo lectura (se gestionan en el módulo Kits) */}
                                        {a.codigo && (
                                          <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-mono bg-purple-50 text-purple-500 rounded">
                                            {a.codigo}
                                          </span>
                                        )}
                                        <span className="flex-1 min-w-0 truncate text-[11px] text-gray-700">
                                          {a.descripcion}
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <input
                                          list={
                                            KIT_TIPOS.includes(kit.tipoKit)
                                              ? `cat-${KIT_TIPOS.indexOf(kit.tipoKit)}`
                                              : "cat-all"
                                          }
                                          className="w-16 px-1.5 py-0.5 text-[11px] border border-gray-200 rounded text-gray-500"
                                          placeholder="Cód."
                                          value={a.codigo}
                                          onChange={(e) => {
                                            const codigo = e.target.value;
                                            const cat =
                                              data.catalogoArticulos.find(
                                                (c) => c.codigo === codigo && c.catalogo === kit.tipoKit
                                              ) ?? data.catalogoArticulos.find((c) => c.codigo === codigo);
                                            updArt(g.id, ki, ai, {
                                              codigo,
                                              ...(cat ? { descripcion: cat.valor } : {}),
                                            });
                                          }}
                                        />
                                        <input
                                          className="flex-1 min-w-0 px-1.5 py-0.5 text-[11px] border border-gray-200 rounded"
                                          placeholder="Artículo"
                                          value={a.descripcion}
                                          onChange={(e) => updArt(g.id, ki, ai, { descripcion: e.target.value })}
                                        />
                                      </>
                                    )}
                                    <div className="flex items-center shrink-0">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          updArt(g.id, ki, ai, { cantidad: Math.max(1, a.cantidad - 1) })
                                        }
                                        className="w-5 h-5 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-purple-50 text-xs leading-none"
                                        title="Quitar uno"
                                      >
                                        −
                                      </button>
                                      <input
                                        key={a.cantidad}
                                        type="number"
                                        min={1}
                                        defaultValue={a.cantidad}
                                        onBlur={(e) => {
                                          const v = parseInt(e.target.value, 10);
                                          if (!isNaN(v) && v >= 1) updArt(g.id, ki, ai, { cantidad: v });
                                          else e.target.value = String(a.cantidad);
                                        }}
                                        className="w-10 text-center text-[11px] font-semibold text-gray-700 border border-gray-200 rounded outline-none focus:border-purple-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => updArt(g.id, ki, ai, { cantidad: a.cantidad + 1 })}
                                        className="w-5 h-5 flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-purple-50 text-xs leading-none"
                                        title="Agregar uno"
                                      >
                                        +
                                      </button>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => removeArt(g.id, ki, ai)}
                                      className="shrink-0 p-0.5 text-gray-300 hover:text-red-500"
                                      title="Quitar artículo"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                              {/* Solo los kits ad-hoc ("Otros") permiten agregar artículos libres */}
                              {!kit.idKit && (
                                <button
                                  type="button"
                                  onClick={() => addArt(g.id, ki)}
                                  className="text-[10px] text-purple-600 flex items-center gap-0.5 mt-1.5"
                                >
                                  <Plus className="w-3 h-3" /> Agregar artículo
                                </button>
                              )}
                            </div>
                          ))}

                          {/* Selector buscable de kits */}
                          <div className="space-y-1">
                            <button
                              type="button"
                              onClick={() => setKitDropdownOpen(p => ({ ...p, [g.id]: !p[g.id] }))}
                              className="w-full flex items-center justify-between gap-2 px-3 py-2 border border-purple-200 rounded-lg text-xs text-purple-700 hover:bg-purple-50 transition-colors"
                            >
                              <span className="flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Agregar kit</span>
                              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${kitDropdownOpen[g.id] ? "rotate-180" : ""}`} />
                            </button>
                            {kitDropdownOpen[g.id] && (
                              <div className="border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden">
                                <div className="flex items-center gap-1.5 px-3 py-2 border-b border-gray-100 bg-gray-50">
                                  <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                  <input
                                    autoFocus
                                    type="text"
                                    placeholder="Buscar kit..."
                                    value={kitSearch[g.id] ?? ""}
                                    onChange={e => setKitSearch(p => ({ ...p, [g.id]: e.target.value }))}
                                    className="flex-1 text-xs bg-transparent outline-none text-gray-700 placeholder-gray-400"
                                  />
                                </div>
                                <div className="max-h-44 overflow-y-auto divide-y divide-gray-50">
                                  {data.kitsEmergencia
                                    .filter(k => k.tipoKit.toLowerCase().includes((kitSearch[g.id] ?? "").toLowerCase()))
                                    .map((k) => {
                                      const usados = usoKits.get(k.id) ?? 0;
                                      const sinStock = k.stockActual - usados <= 0;
                                      return (
                                        <button
                                          key={k.id}
                                          type="button"
                                          onClick={() => { addKitSistema(g.id, k); setKitDropdownOpen(p => ({ ...p, [g.id]: false })); setKitSearch(p => ({ ...p, [g.id]: "" })); }}
                                          className="w-full flex items-center justify-between px-3 py-2 hover:bg-purple-50 transition-colors"
                                        >
                                          <span className="text-xs text-gray-800">{k.tipoKit}</span>
                                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${sinStock ? "bg-amber-100 text-amber-700" : "bg-purple-100 text-purple-600"}`}>
                                            stock {k.stockActual - usados}
                                          </span>
                                        </button>
                                      );
                                    })}
                                  {data.kitsEmergencia.filter(k => k.tipoKit.toLowerCase().includes((kitSearch[g.id] ?? "").toLowerCase())).length === 0 && (
                                    <p className="text-xs text-gray-400 text-center py-4">Sin resultados</p>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => { addKit(g.id, "Otros"); setKitDropdownOpen(p => ({ ...p, [g.id]: false })); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-xs text-gray-500 border-t border-gray-100 transition-colors"
                                  >
                                    <Plus className="w-3 h-3" /> Otros (personalizado)
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                          {data.kitsEmergencia.length === 0 && (
                            <p className="text-[11px] text-gray-400">
                              No hay kits activos en el módulo de Kits de Emergencia; usa
                              &quot;Otros&quot; o registra kits en ese módulo primero.
                            </p>
                          )}
                        </div>
                      );
                    })
                  )}
                  {kitsExcedidos.length > 0 && (
                    <div className="mt-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                      <p className="font-semibold">⚠ Asignación supera el stock disponible:</p>
                      {kitsExcedidos.map((k) => (
                        <p key={k.id}>
                          {k.tipoKit}: asignados {usoKits.get(k.id)} · stock {k.stockActual}
                        </p>
                      ))}
                      <p className="mt-0.5">
                        El comité verá esta diferencia; ajusta la asignación o repón stock en el
                        módulo de Kits.
                      </p>
                    </div>
                  )}
                </Seccion>

                {/* E) Evidencias a incluir en el informe */}
                <Seccion num="E" titulo="Evidencias a incluir en el informe">
                  {data.evidencias.length === 0 ? (
                    <p className="text-xs text-gray-400">
                      No hay evidencias registradas para este caso.
                    </p>
                  ) : (
                    <>
                      <p className="text-xs text-gray-500">
                        Selecciona las evidencias que quieres incluir en el informe.
                        {evidenciasSeleccionadas.size > 0 && (
                          <span className="ml-1 font-semibold text-purple-700">
                            {evidenciasSeleccionadas.size} seleccionada(s)
                          </span>
                        )}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {data.evidencias.map((ev) => {
                          const selected = evidenciasSeleccionadas.has(ev.id);
                          return (
                            <button
                              key={ev.id}
                              type="button"
                              onClick={() =>
                                setEvidenciasSeleccionadas((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(ev.id)) next.delete(ev.id);
                                  else next.add(ev.id);
                                  return next;
                                })
                              }
                              className={`text-left border-2 rounded-lg p-2 transition-all ${
                                selected
                                  ? "border-purple-500 bg-purple-50"
                                  : "border-gray-200 hover:border-purple-300 hover:bg-purple-50/30"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                                    selected
                                      ? "border-purple-600 bg-purple-600"
                                      : "border-gray-300"
                                  }`}
                                >
                                  {selected && (
                                    <CheckCircle className="w-3 h-3 text-white" />
                                  )}
                                </div>
                                <span className="text-xs text-gray-700 truncate flex-1">
                                  {ev.nombreArchivo}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </Seccion>

                {/* F) Conclusiones */}
                <Seccion num="F" titulo="Conclusiones">
                  <div>
                    <label className={`block text-xs font-medium mb-1 ${fieldErrors.has("conclusiones") ? "text-red-600" : "text-gray-700"}`}>
                      Conclusiones <span className="text-red-500">*</span>
                      {fieldErrors.has("conclusiones") && (
                        <span className="ml-2 text-red-500">— Campo obligatorio</span>
                      )}
                    </label>
                    <textarea
                      rows={3}
                      className={`${textareaCls} ${errCls("conclusiones")}`}
                      value={report.conclusiones}
                      onChange={(e) => {
                        setR("conclusiones", e.target.value);
                        if (fieldErrors.has("conclusiones") && e.target.value.trim()) {
                          setFieldErrors((prev) => { const n = new Set(prev); n.delete("conclusiones"); return n; });
                        }
                      }}
                      placeholder="Conclusiones finales del informe..."
                    />
                  </div>
                </Seccion>

                {/* Evidencias de referencia (solo visualización) */}
                <div className="border border-gray-200 rounded-xl p-3 lg:col-span-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                    Todas las evidencias del caso (referencia)
                  </p>
                  <EvidenciasRegistro evidencias={data.evidencias} />
                </div>
                </div>{/* fin grid de secciones */}
                </div>{/* fin contenedor */}

                {/* Acciones */}
                {fieldErrors.size > 0 && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>
                      Faltan {fieldErrors.size} campo(s) obligatorio(s): completa los campos
                      marcados en rojo antes de enviar el informe.
                    </span>
                  </div>
                )}

                {informeYaEnviado && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="text-sm text-green-800">
                      Informe enviado al Comité — en espera de decisión. No se puede reenviar.
                    </span>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-2 sticky bottom-0 z-10 bg-white/95 backdrop-blur pt-3 pb-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={handlePdf}
                    disabled={savingForPdf || isPending || informeYaEnviado}
                    title={informeYaEnviado ? "El informe ya fue enviado al Comité" : undefined}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-purple-300 text-purple-700 rounded-xl font-medium hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingForPdf ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Guardando…</>
                    ) : (
                      <><FileText className="w-4 h-4" /> Generar y descargar PDF</>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleClickEnviar}
                    disabled={isPending || informeYaEnviado}
                    title={informeYaEnviado ? "El informe ya fue enviado al Comité" : undefined}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: "#7c3aed" }}
                  >
                    <FileCheck className="w-4 h-4" />
                    {informeYaEnviado
                      ? "Informe ya enviado"
                      : data.estadoActual === "OBSERVADO"
                        ? "Reenviar al Comité"
                        : "Enviar Informe al Comité"}
                  </button>
                </div>

              </>
            )}
          </div>
        ) : informeEval ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <FileCheck className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">
                Informe enviado al Comité — {fmtDate(informeEval.fecha)}
              </span>
            </div>
            <InfoField label="Análisis de la situación" value={informeEval.resumen ?? "—"} />
            {informeEval.contenido &&
              (() => {
                try {
                  const p = JSON.parse(informeEval.contenido);
                  const docAdj: string | null =
                    typeof p.documentoAdjunto === "string" ? p.documentoAdjunto : null;
                  const evIdsStored: string[] = Array.isArray(p.evidenciasSeleccionadas)
                    ? (p.evidenciasSeleccionadas as unknown[]).map(String)
                    : [];
                  const evIncluidas = data.evidencias.filter((e) => evIdsStored.includes(e.id));
                  return (
                    <div className="space-y-2">
                      <InfoField label="Hallazgos" value={p.hallazgosTexto ?? "—"} />
                      <InfoField label="Conclusiones" value={p.conclusiones ?? "—"} />
                      <InfoField label="Tipo de intervención" value={p.tipoIntervencion ?? "—"} />
                      {docAdj && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                            Documento adjunto
                          </p>
                          {docAdj.startsWith("http") ? (
                            <a
                              href={docAdj}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 underline break-all flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3 flex-shrink-0" />
                              {docAdj}
                            </a>
                          ) : (
                            <span className="text-xs text-gray-600 italic">
                              Archivo adjunto disponible
                            </span>
                          )}
                        </div>
                      )}
                      {evIncluidas.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                            Evidencias incluidas en el informe ({evIncluidas.length})
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {evIncluidas.map((ev) => (
                              <EvidenciaChip key={ev.id} ev={ev} />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                } catch {
                  return null;
                }
              })()}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">
            El Especialista GRD aún no ha elaborado el informe de evaluación.
          </p>
        ))}

      {/* Vista: Decidir */}
      {view === "decidir" && canDecidir && (
        <div className="space-y-4">
          {!informeEval ? (
            <p className="text-sm text-gray-500 text-center py-6">
              El Especialista GRD aún no ha enviado el informe de evaluación al Comité.
            </p>
          ) : (
            <>
              {/* Datos del evento */}
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-3">
                  Datos del evento
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    ["Código", data.codigoCaso ?? "—"],
                    ["Categoría", data.tipoEvento ?? "—"],
                    ["Gravedad", data.gravedad ?? "—"],
                    ["Fecha suceso", fmtDate(data.fechaRegistro)],
                    ["Distrito", data.parroquia ?? "—"],
                    ["Familias", String(targets.length)],
                    ["Personas", String(targets.reduce((n, g) => n + g.personas.length, 0))],
                    ["Reportado por", data.aviso?.nombreInformante ?? "—"],
                  ].map(([l, v]) => (
                    <div key={l} className="bg-white rounded-lg border border-gray-100 px-2.5 py-1.5">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider">{l}</p>
                      <p className="text-xs font-semibold text-gray-800 truncate">{v}</p>
                    </div>
                  ))}
                </div>
                {data.descripcionEvento && (
                  <p className="text-xs text-gray-600 mt-3">
                    <span className="font-semibold text-gray-700">Descripción:</span>{" "}
                    {data.descripcionEvento}
                  </p>
                )}
              </div>

              {/* Informe de atención (solo lectura) */}
              <div className="rounded-xl border border-purple-200 overflow-hidden">
                <div className="bg-purple-600 text-white px-4 py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <BarChart3 className="w-4 h-4 flex-shrink-0" />
                    <p className="font-semibold text-sm truncate">
                      Informe de Atención de Ayuda Humanitaria
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={descargarInforme}
                    disabled={descargandoPdf}
                    className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50 flex-shrink-0"
                  >
                    {descargandoPdf ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generando…</>
                    ) : (
                      <><FileText className="w-3.5 h-3.5" /> Descargar PDF</>
                    )}
                  </button>
                </div>

                <div className="p-4 space-y-4 bg-white">
                  {/* A) Identificación */}
                  <ReadSeccion letra="A" titulo="Identificación">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <ReadCampo label="Fecha" value={fmtDate(informeEval.fecha)} />
                      <ReadCampo label="Dirigido a" value={report.dirigidoA || "—"} />
                      <ReadCampo label="Motivo" value={report.motivo || "—"} />
                    </div>
                  </ReadSeccion>

                  {/* B) Objetivos */}
                  <ReadSeccion letra="B" titulo="Objetivos">
                    <p className="text-xs text-gray-700">
                      <span className="font-semibold">General: </span>
                      {report.objetivoGeneral || "—"}
                    </p>
                    {objetivos.filter((o) => o.trim()).length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {objetivos
                          .filter((o) => o.trim())
                          .map((o, i) => (
                            <li key={i} className="text-xs text-gray-700 flex gap-1.5">
                              <span className="text-purple-500">•</span>
                              {o}
                            </li>
                          ))}
                      </ul>
                    )}
                  </ReadSeccion>

                  {/* C) Análisis y hallazgos */}
                  <ReadSeccion letra="C" titulo="Análisis y Hallazgos">
                    {report.analisis && <p className="text-xs text-gray-700">{report.analisis}</p>}
                    {report.hallazgosTexto && (
                      <p className="text-xs text-gray-700 mt-2">{report.hallazgosTexto}</p>
                    )}
                    {hallazgos.filter((h) => h.trim()).length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {hallazgos
                          .filter((h) => h.trim())
                          .map((h, i) => (
                            <li key={i} className="text-xs text-gray-700 flex gap-1.5">
                              <span className="text-purple-500">•</span>
                              {h}
                            </li>
                          ))}
                      </ul>
                    )}
                  </ReadSeccion>

                  {/* D) Asignación de ayuda por familia */}
                  <ReadSeccion letra="D" titulo="Asignación de Ayuda Humanitaria por Familia">
                    <div className="space-y-3">
                      {targets.map((g) => {
                        const kits = kitsLimpios(g.id);
                        const nota = notaFamiliaDe(g.id);
                        return (
                          <div
                            key={g.id}
                            className="rounded-lg border border-purple-100 bg-purple-50/40 p-3"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <Users className="w-3.5 h-3.5 text-purple-600" />
                              <p className="text-xs font-bold text-purple-800">
                                {g.nombreReferencia ?? "Familia"}
                              </p>
                              <span className="text-[10px] text-gray-500">
                                {g.personas.length} integrante(s) · {kits.length} kit(s)
                              </span>
                            </div>
                            {integrantesDe(g).length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {integrantesDe(g).map((nombre, i) => (
                                  <span
                                    key={i}
                                    className="text-[10px] bg-white border border-purple-100 rounded-full px-2 py-0.5 text-gray-700"
                                  >
                                    {nombre}
                                  </span>
                                ))}
                              </div>
                            )}
                            {nota && (
                              <p className="text-[11px] text-purple-700 italic mb-2">
                                <span className="font-semibold not-italic">Brigadista: </span>
                                {nota}
                              </p>
                            )}
                            {kits.length === 0 ? (
                              <p className="text-[11px] text-gray-400 italic">Sin kits asignados.</p>
                            ) : (
                              <div className="space-y-2">
                                {kits.map((kit, ki) => (
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
                                            <td className="px-2.5 py-1 text-right font-semibold text-gray-800">{a.cantidad}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Resumen consolidado */}
                    {articulosConsolidados().length > 0 && (
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
                            {articulosConsolidados().map((f, i) => (
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
                  {report.conclusiones && (
                    <ReadSeccion letra="E" titulo="Conclusiones">
                      <p className="text-xs text-gray-700">{report.conclusiones}</p>
                    </ReadSeccion>
                  )}
                </div>
              </div>
            </>
          )}

          <div className="border-t border-gray-100 pt-4">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
              <p className="font-semibold mb-1">Caso enviado al Comité de Donaciones</p>
              <p>
                La decisión se toma por votación de los miembros del Comité. Para emitir tu voto u observar el caso, ve al{" "}
                <a href="/donaciones" className="underline font-medium">panel de votación</a>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal: adjuntar documento de respaldo */}
      {showDocStep && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowDocStep(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md space-y-4 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-purple-700" />
                <p className="text-base font-semibold text-purple-900">
                  Adjuntar documento de respaldo
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDocStep(false)}
                className="text-gray-400 hover:text-gray-600 rounded-full p-1 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Obligatorio — adjunta un enlace (Google Drive, OneDrive…) <strong>o</strong> sube un
              archivo PDF/Word. Debes proporcionar al menos uno para enviar al Comité.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDocTipo("link")}
                className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition-colors ${
                  docTipo === "link"
                    ? "bg-purple-700 text-white border-purple-700"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                Enlace URL
              </button>
              <button
                type="button"
                onClick={() => setDocTipo("file")}
                className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition-colors ${
                  docTipo === "file"
                    ? "bg-purple-700 text-white border-purple-700"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                Subir archivo
              </button>
            </div>
            {docTipo === "link" ? (
              <input
                type="url"
                className={inputCls}
                placeholder="https://drive.google.com/..."
                value={docLink}
                onChange={(e) => setDocLink(e.target.value)}
              />
            ) : (
              <label className="flex items-center justify-center gap-2 py-4 border-2 border-dashed border-purple-300 rounded-xl text-purple-700 cursor-pointer hover:bg-purple-50 transition-colors">
                <Upload className="w-4 h-4" />
                <span className="text-sm">
                  {docFile ? docFile.name : "Seleccionar archivo (PDF, Word, imagen)"}
                </span>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,image/*"
                  className="hidden"
                  onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
                />
              </label>
            )}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDocStep(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleEvaluar}
                disabled={
                  isPending ||
                  subiendoDoc ||
                  (docTipo === "link" ? !docLink.trim() : !docFile)
                }
                title={
                  (docTipo === "link" ? !docLink.trim() : !docFile)
                    ? "Adjunta un enlace o un archivo para poder enviar"
                    : undefined
                }
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ background: "#7c3aed" }}
              >
                {isPending || subiendoDoc ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Enviando…</>
                ) : (
                  <><FileCheck className="w-4 h-4" /> Confirmar y enviar al Comité</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
