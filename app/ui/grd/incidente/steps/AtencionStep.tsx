import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  FileCheck,
  Package,
  ShieldCheck,
  X,
  Users,
  ChevronDown,
  ChevronUp,
  Camera,
  Upload,
  FileText,
  Download,
  Loader2,
  Pencil,
  CheckCircle,
} from "lucide-react";
import { registrarAtencion, cerrarCaso } from "@/app/actions/incidents";
import type { IncidenciaDetalleOutput } from "@/core/application/dtos/IncidenciaDetalleDTO";
import { parseInforme } from "@/core/application/dtos/InformeContenidoDTO";
import { permisosDeDetalle } from "@/app/lib/permisos-incidencia";
import { subirEvidencia } from "@/app/ui/grd/incidente/lib/subir-evidencia";
import { fmtDate } from "@/app/ui/grd/incidente/lib/format";
import { inputCls, textareaCls } from "@/app/ui/grd/incidente/lib/ui-classes";
import { AsignarSeguimientoPanel } from "@/app/ui/grd/incidente/steps/seguimiento/AsignarResponsable";

type ActaArt = { codigo: string; descripcion: string; cantidad: number };
type ActaKit = { tipoKit: string; articulos: ActaArt[] };
type ActaFam = { refId: string; nombre: string; kits: ActaKit[] };

/** Paso "Atender": confirma la entrega de kits por familia, adjunta el acta firmada y cierra/deriva. */
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
  const { puedeAtender: canAct } = permisosDeDetalle(data);
  const done = data.entregas.length > 0;

  // Kits aprobados por familia (del informe de evaluación enviado al Comité)
  const informeEval = data.informes.find((i) => i.tipo === "EVALUACION");
  const familias: ActaFam[] = (() => {
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
  })();

  const grupoDe = (refId: string) => data.gruposFamiliares.find((g) => g.id === refId);
  const integrantesDe = (refId: string): string[] =>
    (grupoDe(refId)?.personas ?? []).map((p) => `${p.nombres} ${p.apellidos ?? ""}`.trim());

  const totalItemsFam = (f: ActaFam) => f.kits.reduce((n, k) => n + k.articulos.length, 0);
  const itemKey = (refId: string, ki: number, ai: number) => `${refId}::${ki}::${ai}`;

  const today = new Date().toISOString().slice(0, 10);
  const [fecha, setFecha] = useState(today);
  const [confirmados, setConfirmados] = useState<Set<string>>(new Set());
  const [descripcion, setDescripcion] = useState("");
  const [colapsadas, setColapsadas] = useState<Set<string>>(new Set());
  const [evidencia, setEvidencia] = useState<File | null>(null);
  const [fotosFamilia, setFotosFamilia] = useState<Record<string, File | null>>({});
  const [subiendo, setSubiendo] = useState(false);
  const [showActaModal, setShowActaModal] = useState(false);
  const [actaFile, setActaFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [asignandoSeg, setAsignandoSeg] = useState(false);

  const totalItems = familias.reduce((n, f) => n + totalItemsFam(f), 0);
  const totalConfirmados = confirmados.size;

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

  const subirArchivo = (file: File) => subirEvidencia(file, data.idIncidencia);

  function resumenEntrega(): string {
    const partes = familias.map((f) => {
      const items = f.kits
        .flatMap((k, ki) =>
          k.articulos
            .filter((_, ai) => confirmados.has(itemKey(f.refId, ki, ai)))
            .map((a) => `${a.descripcion} x${a.cantidad}`)
        )
        .join(", ");
      return `• ${f.nombre}: ${items || "sin ítems confirmados"}`;
    });
    return `Ítems confirmados: ${totalConfirmados}/${totalItems}.\n${partes.join("\n")}`;
  }

  function generarActa() {
    startTransition(async () => {
      const { generarActaEntregaPdf } = await import("@/app/lib/acta-entrega-pdf");
      const urls: string[] = [];
      const objUrl = (file: File | null | undefined): string | undefined => {
        if (!file || !file.type.startsWith("image/")) return undefined;
        const u = URL.createObjectURL(file);
        urls.push(u);
        return u;
      };
      const evidencias =
        evidencia && evidencia.type.startsWith("image/")
          ? [{ url: objUrl(evidencia)!, nombre: evidencia.name }]
          : [];
      try {
        await generarActaEntregaPdf({
          codigo: data.codigoCaso ?? "GRD",
          evento: data.tituloIncidencia ?? data.codigoCaso ?? "Incidencia",
          ubicacion: [data.direccionEvento, data.parroquia].filter(Boolean).join(", ") || "—",
          fechaEntrega: fmtDate(new Date(fecha).toISOString()),
          lugarEntrega: data.parroquia ?? "—",
          emitidoPor: `${data.currentUserName} — Especialista GRD`,
          resolucionComite: data.solicitudComite?.observaciones ?? "",
          descripcionEntrega: descripcion,
          familias: familias.map((f) => {
            const foto = fotosFamilia[f.refId];
            return {
              nombre: f.nombre,
              integrantes: integrantesDe(f.refId),
              fotoUrl: objUrl(foto),
              fotoNombre: foto?.type.startsWith("image/") ? foto.name : undefined,
              kits: f.kits.map((k, ki) => ({
                tipoKit: k.tipoKit,
                articulos: k.articulos.map((a, ai) => ({
                  ...a,
                  confirmado: confirmados.has(itemKey(f.refId, ki, ai)),
                })),
              })),
            };
          }),
          evidencias,
        });
      } finally {
        urls.forEach((u) => URL.revokeObjectURL(u));
      }
    });
  }

  // Abre el modal para adjuntar el acta firmada antes de confirmar.
  function marcarAtendido() {
    if (!fecha) {
      toast.error("Indica la fecha de entrega.");
      return;
    }
    setShowActaModal(true);
  }

  function elegirActa(file: File | null) {
    if (!file) return;
    if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) {
      toast.error("El acta debe estar en formato PDF.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error("El archivo supera el máximo de 15 MB.");
      return;
    }
    setActaFile(file);
  }

  // Confirma la entrega: sube el acta firmada + evidencias y cambia a ATENDIDO.
  async function confirmarAtendido() {
    if (!actaFile) {
      toast.error("Adjunta el acta firmada en PDF para confirmar.");
      return;
    }
    setSubiendo(true);
    try {
      const files: File[] = [actaFile];
      if (evidencia) files.push(evidencia);
      for (const f of Object.values(fotosFamilia)) if (f) files.push(f);
      for (const f of files) {
        try {
          await subirArchivo(f);
        } catch {
          toast.error(`No se pudo subir ${f.name}, se continuará sin esa evidencia.`);
        }
      }
    } finally {
      setSubiendo(false);
    }

    const descFinal = [descripcion.trim(), resumenEntrega()].filter(Boolean).join("\n\n");
    startTransition(async () => {
      const res = await registrarAtencion(data.idIncidencia, {
        tipoAyuda: "Donación en especie",
        descripcionAyuda: descFinal || "Entrega de kits de ayuda humanitaria.",
        lugarEntrega: data.parroquia ?? "—",
        observaciones: `Ítems confirmados: ${totalConfirmados}/${totalItems}. Acta firmada: ${actaFile.name}.`,
        fechaEntrega: new Date(fecha).toISOString(),
      });
      if (res && "message" in res) {
        toast.error(res.message);
        return;
      }
      setShowActaModal(false);
      toast.success("Entrega registrada. Caso marcado como Atendido.");
      onDone();
    });
  }

  // Decisión post-atención: "No, cerrar caso". El "Sí" pasa por la asignación de responsable.
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

  if (done) {
    const e = data.entregas[0];
    const enAtendido = data.estadoActual === "ATENDIDO";
    return (
      <div className="space-y-4">
        {/* Decisión de seguimiento (solo cuando está ATENDIDO) */}
        {enAtendido && canAct && (
          <div className="rounded-xl border border-cyan-200 overflow-hidden">
            <div className="bg-cyan-700 text-white p-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold">Caso Atendido — Decisión de Seguimiento</p>
                  <p className="text-sm text-white/90">
                    ¿Deseas realizar seguimiento post-donación a esta familia?
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded-full uppercase flex-shrink-0">
                Especialista GRD
              </span>
            </div>
            <div className="p-4 space-y-4 bg-white">
              <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3">
                <p className="text-[11px] font-bold text-cyan-800 uppercase tracking-wider mb-1">
                  Entrega registrada
                </p>
                <p className="text-xs text-cyan-900">{e.descripcionAyuda ?? "—"}</p>
                {e.observaciones && <p className="text-[11px] text-cyan-700 mt-1">{e.observaciones}</p>}
              </div>

              {asignandoSeg ? (
                <AsignarSeguimientoPanel
                  data={data}
                  onCancel={() => setAsignandoSeg(false)}
                  onListo={() => {
                    setAsignandoSeg(false);
                    onNavigate(5);
                    onDone();
                  }}
                />
              ) : (
                <>
                  <p className="text-sm font-semibold text-gray-800 text-center">
                    ¿Deseas realizar seguimiento post-donación a esta familia?
                  </p>
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
                </>
              )}
            </div>
          </div>
        )}

        {/* Registro de entrega */}
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <Package className="w-4 h-4 text-cyan-600" />
            <p className="text-sm font-bold text-gray-800">Registro de Entrega</p>
          </div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg border border-gray-100 px-3 py-2">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Fecha de entrega</p>
                <p className="text-sm font-medium text-gray-800">{e.fecha ? fmtDate(e.fecha) : "—"}</p>
              </div>
              <div className="bg-gray-50 rounded-lg border border-gray-100 px-3 py-2">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Elaborado por</p>
                <p className="text-sm font-medium text-gray-800">{data.currentUserName}</p>
              </div>
            </div>
            <div className="bg-cyan-50 border border-cyan-100 rounded-lg px-3 py-2">
              <p className="text-[10px] text-cyan-600 uppercase tracking-wider mb-0.5">
                Descripción de la entrega
              </p>
              <p className="text-xs text-cyan-900 whitespace-pre-line">{e.descripcionAyuda ?? "—"}</p>
            </div>
            {!enAtendido && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <CheckCircle className="w-4 h-4 text-cyan-600" />
                Caso en estado <span className="font-semibold">{data.estadoActual}</span>.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!canAct)
    return (
      <p className="text-sm text-gray-500 text-center py-4">La entrega aún no ha sido registrada.</p>
    );

  return (
    <>
      <div className="rounded-xl border border-cyan-200 overflow-hidden">
        {/* Header */}
        <div className="bg-cyan-700 text-white p-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold">Registrar Entrega — Marcar como Atendido</p>
              <p className="text-sm text-white/90">
                Confirma los ítems entregados a cada familia y adjunta el acta firmada.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded-full uppercase flex-shrink-0">
            Especialista GRD
          </span>
        </div>

        <div className="p-4 space-y-4 bg-white">
          {/* Resolución del Comité */}
          {data.solicitudComite?.observaciones && (
            <div className="flex items-start gap-2 p-3 bg-cyan-50 border border-cyan-200 rounded-lg">
              <FileCheck className="w-4 h-4 text-cyan-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[11px] font-bold text-cyan-800 uppercase tracking-wider">
                  Resolución del Comité de Donaciones
                </p>
                <p className="text-xs text-cyan-800 mt-0.5">{data.solicitudComite.observaciones}</p>
              </div>
            </div>
          )}

          {/* Fecha de entrega */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Fecha de entrega <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className={`${inputCls} max-w-xs`}
            />
          </div>

          {/* Grupos familiares y kits */}
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
                  const colapsada = colapsadas.has(f.refId);
                  const conf = confirmadosFam(f);
                  const total = totalItemsFam(f);
                  return (
                    <div key={f.refId} className="rounded-lg border border-cyan-100 bg-cyan-50/40 overflow-hidden">
                      <div className="flex items-center gap-2 p-3">
                        <div className="w-8 h-8 rounded-lg bg-cyan-600 flex items-center justify-center flex-shrink-0">
                          <Users className="w-4 h-4 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-cyan-800 truncate">{f.nombre}</p>
                          <p className="text-[11px] text-gray-500">
                            {grupo?.personas.length ?? 0} integrante(s) · {f.kits.length} kit(s) ·{" "}
                            <span className={conf === total && total > 0 ? "text-green-600 font-semibold" : ""}>
                              {conf}/{total} ítems confirmados
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
                          {/* Integrantes */}
                          {grupo && grupo.personas.length > 0 && (
                            <div>
                              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">
                                Integrantes
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {grupo.personas.map((p) => (
                                  <span
                                    key={p.id}
                                    className="text-[10px] bg-white border border-cyan-100 rounded-full px-2 py-0.5 text-gray-700 flex items-center gap-1"
                                  >
                                    {`${p.nombres} ${p.apellidos ?? ""}`.trim()}
                                    {p.edad && <span className="text-gray-400">· {p.edad}a</span>}
                                    {p.condicionEspecial && (
                                      <span className="text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-1.5">
                                        {p.condicionEspecial}
                                      </span>
                                    )}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Kits con checkboxes */}
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
                                        className="w-4 h-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
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

                          {/* Foto de evidencia por familia */}
                          <div>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                              <Camera className="w-3 h-3" /> Foto de evidencia de esta familia
                            </p>
                            <label className="inline-flex items-center gap-2 px-3 py-1.5 border border-dashed border-cyan-300 rounded-lg text-cyan-700 cursor-pointer hover:bg-cyan-50 text-xs">
                              <Camera className="w-3.5 h-3.5" />
                              {fotosFamilia[f.refId]?.name ?? "Adjuntar foto"}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) =>
                                  setFotosFamilia((prev) => ({
                                    ...prev,
                                    [f.refId]: e.target.files?.[0] ?? null,
                                  }))
                                }
                              />
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Evidencia de entrega general */}
          <div>
            <p className="text-[11px] font-bold text-cyan-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5" /> Evidencia de entrega
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex flex-col items-center justify-center gap-1.5 py-5 border-2 border-cyan-200 rounded-xl text-cyan-700 cursor-pointer hover:bg-cyan-50">
                <Camera className="w-5 h-5" />
                <span className="text-xs font-medium">
                  {evidencia && evidencia.type.startsWith("image/") ? evidencia.name : "Foto / Acta"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setEvidencia(e.target.files?.[0] ?? null)}
                />
              </label>
              <label className="flex flex-col items-center justify-center gap-1.5 py-5 border-2 border-gray-200 rounded-xl text-gray-500 cursor-pointer hover:bg-gray-50">
                <Upload className="w-5 h-5" />
                <span className="text-xs font-medium">
                  {evidencia && !evidencia.type.startsWith("image/") ? evidencia.name : "Documento"}
                </span>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,image/*"
                  className="hidden"
                  onChange={(e) => setEvidencia(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
          </div>

          {/* Descripción */}
          <div>
            <p className="text-[11px] font-bold text-cyan-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Descripción de la entrega (Especialista GRD)
            </p>
            <textarea
              rows={3}
              className={textareaCls}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Describe el proceso de entrega, observaciones, condiciones de la familia al momento de la entrega, etc."
            />
          </div>

          {/* Acciones */}
          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <button
              type="button"
              onClick={generarActa}
              disabled={isPending || subiendo}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-cyan-300 text-cyan-700 rounded-xl font-medium hover:bg-cyan-50 disabled:opacity-50"
            >
              <Download className="w-4 h-4" /> Generar Acta PDF
            </button>
            <button
              type="button"
              onClick={marcarAtendido}
              disabled={isPending || subiendo}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-white font-semibold disabled:opacity-50"
              style={{ background: "#0e7490" }}
            >
              {isPending || subiendo ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Procesando…
                </>
              ) : (
                <>
                  <FileCheck className="w-4 h-4" /> Marcar como Atendido
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Modal: adjuntar acta firmada */}
      {showActaModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !subiendo && !isPending) setShowActaModal(false);
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-cyan-700 text-white p-4 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <Pencil className="w-5 h-5" />
                <div>
                  <p className="font-semibold">Adjuntar acta firmada</p>
                  <p className="text-xs text-white/90">
                    Sube el acta de entrega con la firma del especialista antes de cerrar el caso.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !subiendo && !isPending && setShowActaModal(false)}
                className="text-white/80 hover:text-white rounded-full p-1 hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  elegirActa(e.dataTransfer.files?.[0] ?? null);
                }}
                className={`flex flex-col items-center justify-center gap-2 py-10 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                  dragOver
                    ? "border-cyan-500 bg-cyan-50"
                    : actaFile
                      ? "border-green-300 bg-green-50"
                      : "border-gray-300 hover:bg-gray-50"
                }`}
              >
                {actaFile ? (
                  <>
                    <FileText className="w-7 h-7 text-green-600" />
                    <span className="text-sm font-medium text-green-700">{actaFile.name}</span>
                    <span className="text-[11px] text-gray-400">
                      {(actaFile.size / 1024 / 1024).toFixed(1)} MB · Click para reemplazar
                    </span>
                  </>
                ) : (
                  <>
                    <Upload className="w-7 h-7 text-gray-400" />
                    <span className="text-sm font-semibold text-gray-700">
                      Click o arrastra para subir el acta firmada
                    </span>
                    <span className="text-[11px] text-gray-400">Formato PDF · Máx. 15 MB</span>
                  </>
                )}
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={(e) => elegirActa(e.target.files?.[0] ?? null)}
                />
              </label>

              <div className="bg-cyan-50 border border-cyan-100 rounded-lg p-3 text-[11px] text-cyan-800">
                El acta quedará registrada como evidencia de la entrega realizada. Usa el botón{" "}
                <span className="font-semibold">Generar Acta PDF</span> para descargar la plantilla,
                fírmala y súbela aquí.
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowActaModal(false)}
                  disabled={subiendo || isPending}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmarAtendido}
                  disabled={subiendo || isPending || !actaFile}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: "#0e7490" }}
                >
                  {subiendo || isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Procesando…
                    </>
                  ) : (
                    <>
                      <FileCheck className="w-4 h-4" /> Confirmar — Marcar Atendido
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
