"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Camera,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Download,
  FileCheck,
  FileText,
  Loader2,
  Package,
  ShieldCheck,
  Upload,
  Users,
  X,
} from "lucide-react";
import {
  cerrarCaso,
  confirmarEntregaFamilia,
  iniciarSeguimientoCaso,
  marcarIncidenciaAtendidaSiEntregasCompletas,
} from "@/app/actions/incidents";
import type {
  EntregaDetalle,
  EvidenciaDetalle,
  IncidenciaDetalleOutput,
} from "@/core/application/dtos/IncidenciaDetalleDTO";
import { parseInforme } from "@/core/application/dtos/InformeContenidoDTO";
import { permisosDeDetalle } from "@/app/lib/permisos-incidencia";
import { subirEvidencia } from "@/app/ui/grd/incidente/lib/subir-evidencia";
import { fmtDate } from "@/app/ui/grd/incidente/lib/format";
import { inputCls, textareaCls } from "@/app/ui/grd/incidente/lib/ui-classes";
import { AsignacionStep } from "@/app/ui/grd/incidente/steps/AsignacionStep";
import { EvidenciaUploader } from "@/app/ui/grd/incidente/components/EvidenciaUploader";
import { EvidenciaChip } from "@/app/ui/grd/incidente/components/EvidenciasRegistro";

type ActaArt = { codigo: string; descripcion: string; cantidad: number };
type ActaKit = { tipoKit: string; articulos: ActaArt[] };
type ActaFam = { refId: string; nombre: string; kits: ActaKit[] };

type EntregaPayload = {
  version?: number;
  tipo?: string;
  estadoEntrega?: string;
  nombreFamilia?: string;
  descripcionEntrega?: string;
  kits?: {
    tipoKit?: string;
    articulos?: {
      codigo?: string;
      descripcion?: string;
      cantidadAsignada?: number;
      cantidadEntregada?: number;
    }[];
  }[];
};

function parseEntregaPayload(entrega: EntregaDetalle | undefined): EntregaPayload | null {
  if (!entrega?.observaciones) return null;
  try {
    const parsed = JSON.parse(entrega.observaciones);
    return parsed && typeof parsed === "object" ? (parsed as EntregaPayload) : null;
  } catch {
    return null;
  }
}

function articulosEntregados(entrega: EntregaDetalle | undefined) {
  const payload = parseEntregaPayload(entrega);
  return (payload?.kits ?? []).flatMap((kit) =>
    (kit.articulos ?? []).map((art) => ({
      tipoKit: kit.tipoKit ?? "Kit",
      codigo: art.codigo ?? "",
      descripcion: art.descripcion ?? "",
      cantidad: art.cantidadEntregada ?? 0,
    }))
  );
}

/** Paso "Atender": confirma entrega de kits por familia y luego cierra la atención global. */
export function AtencionStep({
  data,
  onDone,
  onNavigate,
}: {
  data: IncidenciaDetalleOutput;
  onDone: () => void;
  onNavigate: (step: number) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const { puedeAtender: canAct, puedeDecidirSeguimiento, puedeAsignar } = permisosDeDetalle(data);
  const yaAtendido = ["ATENDIDO", "CERRADO", "SEGUIMIENTO ABIERTO"].includes(data.estadoActual ?? "");

  const esResponsableEntrega =
    puedeAsignar ||
    (!!data.currentUserBrigadistaId &&
      data.asignaciones.some(
        (a) => a.esResponsable && a.brigadistaId === data.currentUserBrigadistaId
      ));

  const informeEval = data.informes.find((i) => i.tipo === "EVALUACION");
  const familias: ActaFam[] = useMemo(() => {
    const sc = parseInforme<Record<string, unknown>>(informeEval?.contenido);
    if (!sc || !Array.isArray(sc.asignacionFamilias)) return [];
    return (sc.asignacionFamilias as unknown[]).map((af) => {
      const a = af as Record<string, unknown>;
      const kits = Array.isArray(a.kits)
        ? (a.kits as unknown[]).map((k) => {
            const kit = k as Record<string, unknown>;
            return {
              tipoKit: typeof kit.tipoKit === "string" ? kit.tipoKit : "",
              articulos: Array.isArray(kit.articulos)
                ? (kit.articulos as unknown[]).map((art) => {
                    const ar = art as Record<string, unknown>;
                    return {
                      codigo: typeof ar.codigo === "string" ? ar.codigo : "",
                      descripcion: typeof ar.descripcion === "string" ? ar.descripcion : "",
                      cantidad: typeof ar.cantidad === "number" ? ar.cantidad : 1,
                    };
                  })
                : [],
            };
          })
        : [];
      return {
        refId: typeof a.refId === "string" ? a.refId : "",
        nombre: typeof a.nombre === "string" ? a.nombre : "Familia",
        kits: kits.filter((k) => k.articulos.length > 0),
      };
    });
  }, [informeEval?.contenido]);

  const entregaPorFamilia = (refId: string) =>
    data.entregas.find((e) => e.idGrupoFamiliar === refId);
  const evidenciasDeEntrega = (entregaId: string): EvidenciaDetalle[] =>
    data.evidencias.filter((ev) => ev.idReferencia === entregaId);
  const grupoDe = (refId: string) => data.gruposFamiliares.find((g) => g.id === refId);
  const integrantesDe = (refId: string): string[] =>
    (grupoDe(refId)?.personas ?? []).map((p) => `${p.nombres} ${p.apellidos ?? ""}`.trim());

  const totalItemsFam = (f: ActaFam) => f.kits.reduce((n, k) => n + k.articulos.length, 0);
  const itemKey = (refId: string, ki: number, ai: number) => `${refId}::${ki}::${ai}`;

  const today = new Date().toISOString().slice(0, 10);
  const [fecha, setFecha] = useState(today);
  const [confirmados, setConfirmados] = useState<Set<string>>(new Set());
  const [descripciones, setDescripciones] = useState<Record<string, string>>({});
  const [evidenciasPendientes, setEvidenciasPendientes] = useState<Record<string, File[]>>({});
  const [colapsadas, setColapsadas] = useState<Set<string>>(new Set());
  const [subiendoFamilia, setSubiendoFamilia] = useState<string | null>(null);
  const [asignandoSeg, setAsignandoSeg] = useState(false);

  const totalFamilias = familias.length;
  const familiasConfirmadas = familias.filter((f) => entregaPorFamilia(f.refId)).length;
  const todasConfirmadas = totalFamilias > 0 && familiasConfirmadas === totalFamilias;

  const toggleItem = (key: string) =>
    setConfirmados((prev) => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  const confirmadosFam = (f: ActaFam) =>
    f.kits.reduce(
      (n, k, ki) => n + k.articulos.filter((_, ai) => confirmados.has(itemKey(f.refId, ki, ai))).length,
      0
    );
  const toggleColapso = (refId: string) =>
    setColapsadas((prev) => {
      const n = new Set(prev);
      if (n.has(refId)) n.delete(refId);
      else n.add(refId);
      return n;
    });

  function setFilesFamilia(refId: string, files: FileList | null) {
    if (!files?.length) return;
    setEvidenciasPendientes((prev) => ({
      ...prev,
      [refId]: [...(prev[refId] ?? []), ...Array.from(files)],
    }));
  }

  function removeFileFamilia(refId: string, index: number) {
    setEvidenciasPendientes((prev) => ({
      ...prev,
      [refId]: (prev[refId] ?? []).filter((_, i) => i !== index),
    }));
  }

  function kitsConfirmadosFamilia(f: ActaFam) {
    return f.kits
      .map((kit, ki) => ({
        tipoKit: kit.tipoKit,
        articulos: kit.articulos
          .filter((_, ai) => confirmados.has(itemKey(f.refId, ki, ai)))
          .map((art) => ({
            codigo: art.codigo,
            descripcion: art.descripcion,
            cantidadAsignada: art.cantidad,
            cantidadEntregada: art.cantidad,
          })),
      }))
      .filter((kit) => kit.articulos.length > 0);
  }

  async function confirmarFamilia(f: ActaFam) {
    const descripcion = descripciones[f.refId]?.trim() ?? "";
    const files = evidenciasPendientes[f.refId] ?? [];
    const kits = kitsConfirmadosFamilia(f);

    if (!fecha) {
      toast.error("Indica la fecha de entrega.");
      return;
    }
    if (kits.length === 0) {
      toast.error("Marca al menos un artículo entregado para esta familia.");
      return;
    }
    if (!descripcion) {
      toast.error("La descripción de entrega de esta familia es obligatoria.");
      return;
    }
    if (files.length === 0) {
      toast.error("Adjunta al menos una evidencia para esta entrega.");
      return;
    }

    setSubiendoFamilia(f.refId);
    try {
      const evidencias = [];
      for (const file of files) {
        const key = await subirEvidencia(file, data.idIncidencia);
        evidencias.push({
          key,
          nombreArchivo: file.name,
          formato: file.type || "application/octet-stream",
          tamano: file.size,
        });
      }

      const res = await confirmarEntregaFamilia(data.idIncidencia, {
        idGrupoFamiliar: f.refId,
        nombreFamilia: f.nombre,
        fechaEntrega: new Date(fecha).toISOString(),
        lugarEntrega: data.parroquia ?? data.direccionEvento ?? null,
        descripcionEntrega: descripcion,
        kits,
        evidencias,
      });
      if (res && "message" in res) {
        toast.error(res.message);
        return;
      }
      toast.success("Entrega de familia confirmada.");
      setEvidenciasPendientes((prev) => ({ ...prev, [f.refId]: [] }));
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo confirmar la entrega.");
    } finally {
      setSubiendoFamilia(null);
    }
  }

  function generarActa() {
    const familiasEntregadas = familias.filter((f) => entregaPorFamilia(f.refId));
    if (familiasEntregadas.length === 0) {
      toast.error("Confirma al menos una entrega antes de generar el acta.");
      return;
    }

    startTransition(async () => {
      const { generarActaEntregaPdf } = await import("@/app/lib/acta-entrega-pdf");
      const evidencias = data.evidencias
        .filter((e) => data.entregas.some((ent) => ent.id === e.idReferencia))
        .filter((e) => (e.formato ?? "").startsWith("image/") && !!e.urlArchivo)
        .map((e) => ({ url: e.urlArchivo, nombre: e.nombreArchivo }));

      await generarActaEntregaPdf({
        codigo: data.codigoCaso ?? "GRD",
        evento: data.tituloIncidencia ?? data.codigoCaso ?? "Incidencia",
        ubicacion: [data.direccionEvento, data.parroquia].filter(Boolean).join(", ") || "-",
        fechaEntrega: fmtDate(new Date(fecha).toISOString()),
        lugarEntrega: data.parroquia ?? "-",
        emitidoPor: `${data.currentUserName} - Especialista GRD`,
        resolucionComite: data.solicitudComite?.observaciones ?? "",
        descripcionEntrega: data.entregas
          .map((e) => e.descripcionAyuda)
          .filter(Boolean)
          .join("\n\n"),
        familias: familiasEntregadas.map((f) => {
          const entrega = entregaPorFamilia(f.refId);
          const payload = parseEntregaPayload(entrega);
          return {
            nombre: f.nombre,
            integrantes: integrantesDe(f.refId),
            kits: (payload?.kits ?? []).map((kit) => ({
              tipoKit: kit.tipoKit ?? "Kit",
              articulos: (kit.articulos ?? []).map((a) => ({
                codigo: a.codigo ?? "",
                descripcion: a.descripcion ?? "",
                cantidad: a.cantidadEntregada ?? 0,
                confirmado: (a.cantidadEntregada ?? 0) > 0,
              })),
            })),
          };
        }),
        evidencias,
      });
    });
  }

  function marcarAtendido() {
    if (!todasConfirmadas) {
      toast.error("Confirma todas las familias/kits antes de marcar como Atendido.");
      return;
    }
    startTransition(async () => {
      const res = await marcarIncidenciaAtendidaSiEntregasCompletas(data.idIncidencia);
      if (res && "message" in res) {
        toast.error(res.message);
        return;
      }
      toast.success("Caso marcado como Atendido.");
      onDone();
    });
  }

  function enviarInformacion() {
    toast.success("Tu información fue enviada al responsable del equipo.");
    onDone();
  }

  function decidirSeguimiento(seguir: boolean) {
    if (seguir) {
      setAsignandoSeg(true);
      return;
    }
    startTransition(async () => {
      const res = await cerrarCaso(data.idIncidencia);
      if (res && "message" in res) {
        toast.error(res.message);
        return;
      }
      toast.success("Caso cerrado correctamente.");
      onNavigate(6);
      onDone();
    });
  }

  function iniciarSeguimientoTrasAsignar() {
    startTransition(async () => {
      const res = await iniciarSeguimientoCaso(data.idIncidencia);
      if (res && "message" in res) {
        toast.error(res.message);
        return;
      }
      toast.success("Responsable asignado. Seguimiento iniciado.");
      setAsignandoSeg(false);
      onNavigate(5);
      onDone();
    });
  }

  if (!canAct && data.entregas.length === 0) {
    return <p className="text-sm text-gray-500 text-center py-4">La entrega aún no ha sido registrada.</p>;
  }

  return (
    <div className="space-y-4">
      {data.estadoActual === "ATENDIDO" && puedeDecidirSeguimiento && (
        <div className="rounded-xl border border-cyan-200 overflow-hidden">
          <div className="bg-cyan-700 text-white p-4 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                <FileCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold">Caso Atendido - Decisión de Seguimiento</p>
                <p className="text-sm text-white/90">¿Deseas realizar seguimiento post-donación?</p>
              </div>
            </div>
            <span className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded-full uppercase flex-shrink-0">
              Especialista GRD
            </span>
          </div>
          <div className="p-4 space-y-4 bg-white">
            {asignandoSeg ? (
              <div className="space-y-3 border border-green-200 rounded-xl p-3 bg-green-50/40">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-green-800 uppercase tracking-wider">
                    Asignar responsable del seguimiento
                  </p>
                  <button
                    type="button"
                    onClick={() => setAsignandoSeg(false)}
                    disabled={isPending}
                    className="text-gray-400 hover:text-gray-600 p-1 disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <AsignacionStep data={data} iniciarEditando onDone={iniciarSeguimientoTrasAsignar} />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAsignandoSeg(true)}
                  disabled={isPending}
                  className="flex flex-col items-center gap-1.5 py-6 rounded-xl border-2 border-green-300 bg-green-50 hover:bg-green-100 text-green-700 disabled:opacity-50"
                >
                  <ShieldCheck className="w-6 h-6" />
                  <span className="text-sm font-bold">Sí, realizar seguimiento</span>
                  <span className="text-[11px] text-green-600">Asignar responsable y documentar</span>
                </button>
                <button
                  type="button"
                  onClick={() => decidirSeguimiento(false)}
                  disabled={isPending}
                  className="flex flex-col items-center gap-1.5 py-6 rounded-xl border-2 border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600 disabled:opacity-50"
                >
                  <X className="w-6 h-6" />
                  <span className="text-sm font-bold">No, cerrar caso</span>
                  <span className="text-[11px] text-gray-400">Marcar como cerrado definitivamente</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-cyan-200 overflow-hidden">
        <div className="bg-cyan-700 text-white p-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold">Registrar Entrega - Kits por familia</p>
              <p className="text-sm text-white/90">
                Confirma cada familia con artículos entregados, descripción y evidencias.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded-full uppercase flex-shrink-0">
            {data.estadoActual}
          </span>
        </div>

        <div className="p-4 space-y-4 bg-white">
          {!yaAtendido && <AsignacionStep data={data} onDone={onDone} />}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Fecha de entrega <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                disabled={yaAtendido}
                className={`${inputCls} max-w-xs disabled:bg-gray-50`}
              />
            </div>
            <div className="bg-cyan-50 border border-cyan-100 rounded-xl px-4 py-3">
              <p className="text-[10px] font-bold text-cyan-700 uppercase tracking-wider">
                Entregas confirmadas
              </p>
              <p className="text-sm font-semibold text-cyan-900">
                {familiasConfirmadas}/{totalFamilias} familia(s)
              </p>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-bold text-cyan-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Grupos familiares y kits asignados
            </p>
            {familias.length === 0 ? (
              <p className="text-xs text-gray-500 italic">
                El informe aprobado no registra kits asignados por familia.
              </p>
            ) : (
              <div className="space-y-3">
                {familias.map((f) => {
                  const grupo = grupoDe(f.refId);
                  const entrega = entregaPorFamilia(f.refId);
                  const entregada = Boolean(entrega);
                  const colapsada = colapsadas.has(f.refId);
                  const conf = entregada ? totalItemsFam(f) : confirmadosFam(f);
                  const total = totalItemsFam(f);
                  const evidencias = entrega ? evidenciasDeEntrega(entrega.id) : [];
                  const pendientes = evidenciasPendientes[f.refId] ?? [];
                  const subiendo = subiendoFamilia === f.refId;

                  return (
                    <div key={f.refId} className="rounded-lg border border-cyan-100 bg-cyan-50/40 overflow-hidden">
                      <div className="flex items-center gap-2 p-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${entregada ? "bg-green-600" : "bg-cyan-600"}`}>
                          {entregada ? <CheckCircle className="w-4 h-4 text-white" /> : <Users className="w-4 h-4 text-white" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-cyan-800 truncate">{f.nombre}</p>
                          <p className="text-[11px] text-gray-500">
                            {grupo?.personas.length ?? 0} integrante(s) · {f.kits.length} kit(s) ·{" "}
                            <span className={entregada ? "text-green-600 font-semibold" : ""}>
                              {entregada ? "Entrega confirmada" : `${conf}/${total} ítems marcados`}
                            </span>
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleColapso(f.refId)}
                          className="text-gray-400 hover:text-gray-600 p-1"
                        >
                          {colapsada ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                        </button>
                      </div>

                      {!colapsada && (
                        <div className="px-3 pb-3 space-y-3">
                          {grupo && grupo.personas.length > 0 && (
                            <div>
                              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">
                                Integrantes
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {grupo.personas.map((p) => (
                                  <span
                                    key={p.id}
                                    className="text-[10px] bg-white border border-cyan-100 rounded-full px-2 py-0.5 text-gray-700"
                                  >
                                    {`${p.nombres} ${p.apellidos ?? ""}`.trim()}
                                    {p.edad ? ` · ${p.edad}a` : ""}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {entregada ? (
                            <div className="space-y-3">
                              <div className="bg-white rounded-lg border border-green-100 p-3">
                                <p className="text-[10px] font-bold text-green-700 uppercase tracking-wider mb-2">
                                  Artículos efectivamente entregados
                                </p>
                                <div className="space-y-1">
                                  {articulosEntregados(entrega).map((a, i) => (
                                    <div key={`${a.codigo}-${i}`} className="flex items-center gap-2 text-xs text-gray-700">
                                      <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                                      <span className="flex-1">{a.tipoKit} - {a.descripcion}</span>
                                      <span className="font-semibold">x{a.cantidad}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div className="bg-cyan-50 border border-cyan-100 rounded-lg p-3">
                                <p className="text-[10px] font-bold text-cyan-700 uppercase tracking-wider mb-1">
                                  Descripción de entrega
                                </p>
                                <p className="text-xs text-cyan-900 whitespace-pre-line">{entrega?.descripcionAyuda ?? "-"}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                  <Camera className="w-3 h-3" /> Evidencias vinculadas a esta entrega
                                </p>
                                {evidencias.length === 0 ? (
                                  <p className="text-xs text-gray-400">Sin evidencias visibles.</p>
                                ) : (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {evidencias.map((ev) => <EvidenciaChip key={ev.id} ev={ev} />)}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <>
                              {f.kits.map((kit, ki) => (
                                <div key={ki} className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                                  <p className="text-[11px] font-bold text-cyan-700 px-3 py-1.5 border-b border-gray-100 flex items-center gap-1.5">
                                    <Package className="w-3.5 h-3.5" /> {kit.tipoKit}
                                  </p>
                                  <div className="divide-y divide-gray-50">
                                    {kit.articulos.map((a, ai) => {
                                      const key = itemKey(f.refId, ki, ai);
                                      const checked = confirmados.has(key);
                                      return (
                                        <label
                                          key={ai}
                                          className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 ${checked ? "bg-cyan-50/50" : ""}`}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => toggleItem(key)}
                                            disabled={subiendo || yaAtendido}
                                            className="w-4 h-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500 disabled:opacity-50"
                                          />
                                          <span className="text-xs text-gray-700 flex-1">{a.descripcion}</span>
                                          <span className="text-[10px] font-mono text-gray-400">{a.codigo}</span>
                                          <span className="text-[11px] font-semibold text-gray-600">x{a.cantidad}</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}

                              <div>
                                <p className="text-[11px] font-bold text-cyan-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                  <FileText className="w-3.5 h-3.5" /> Descripción de esta entrega
                                </p>
                                <textarea
                                  rows={3}
                                  className={textareaCls}
                                  value={descripciones[f.refId] ?? ""}
                                  onChange={(e) => setDescripciones((prev) => ({ ...prev, [f.refId]: e.target.value }))}
                                  disabled={subiendo || yaAtendido}
                                  placeholder="Describe el proceso de entrega, observaciones y condiciones de la familia."
                                />
                              </div>

                              <div>
                                <p className="text-[11px] font-bold text-cyan-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                  <Camera className="w-3.5 h-3.5" /> Evidencia de esta entrega
                                </p>
                                <EvidenciaUploader
                                  onFiles={(files) => setFilesFamilia(f.refId, files)}
                                  accept="image/*,video/*,.pdf,application/pdf"
                                  loading={subiendo}
                                  pendingFiles={pendientes}
                                  onRemove={(index) => removeFileFamilia(f.refId, index)}
                                  disabled={yaAtendido}
                                />
                              </div>

                              {esResponsableEntrega ? (
                                <button
                                  type="button"
                                  onClick={() => confirmarFamilia(f)}
                                  disabled={subiendo || isPending || yaAtendido}
                                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-white disabled:opacity-50"
                                  style={{ background: "#0e7490" }}
                                >
                                  {subiendo ? (
                                    <>
                                      <Loader2 className="w-4 h-4 animate-spin" /> Confirmando...
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="w-4 h-4" /> Confirmar entrega de esta familia
                                    </>
                                  )}
                                </button>
                              ) : null}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {esResponsableEntrega ? (
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="button"
                onClick={generarActa}
                disabled={isPending}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-cyan-300 text-cyan-700 rounded-xl font-medium hover:bg-cyan-50 disabled:opacity-50"
              >
                <Download className="w-4 h-4" /> Generar Acta PDF
              </button>
              <button
                type="button"
                onClick={marcarAtendido}
                disabled={isPending || yaAtendido || !todasConfirmadas}
                title={!todasConfirmadas ? "Confirma todas las familias/kits antes de cerrar." : undefined}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold transition-all ${
                  yaAtendido || !todasConfirmadas
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "text-white disabled:opacity-50"
                }`}
                style={yaAtendido || !todasConfirmadas ? undefined : { background: "#0e7490" }}
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Procesando...
                  </>
                ) : (
                  <>
                    <FileCheck className="w-4 h-4" /> Marcar como Atendido
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="pt-1 space-y-2">
              <p className="text-[11px] text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                El cierre de la entrega lo realiza el brigadista responsable del equipo. Sube tus evidencias y envía tu información.
              </p>
              <button
                type="button"
                onClick={enviarInformacion}
                disabled={isPending}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-white disabled:opacity-50"
                style={{ background: "#0e7490" }}
              >
                <Upload className="w-4 h-4" /> Enviar información
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
