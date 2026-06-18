import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle,
  XCircle,
  ClipboardList,
  Users,
  UserPlus,
  UserCircle,
  MessageSquarePlus,
  Trash2,
  Pencil,
  Camera,
  Upload,
  AlertTriangle,
  X,
  Plus,
  Loader2,
} from "lucide-react";
import {
  saveInfoCampo,
  updatePersonaCampo,
  deletePersonaCampo,
  agregarPersonaAFamiliaCampo,
  addGrupoFamiliarCampo,
  deleteGrupoFamiliarCampo,
  addEvidenciasCampo,
} from "@/app/actions/incidents";
import type { PersonaForm } from "@/app/actions/incidents";
import type {
  IncidenciaDetalleOutput,
  PersonaDetalle as Persona,
} from "@/core/application/dtos/IncidenciaDetalleDTO";
import { parseInforme } from "@/core/application/dtos/InformeContenidoDTO";
import { PersonaModal } from "@/app/ui/grd/persona-modal";
import { useConfirm } from "@/app/ui/shared/confirm-modal";
import { EvidenciasRegistro, EvidenciaChip } from "@/app/ui/grd/incidente/components/EvidenciasRegistro";
import { EvidenciaUploader } from "@/app/ui/grd/incidente/components/EvidenciaUploader";
import { subirEvidencia } from "@/app/ui/grd/incidente/lib/subir-evidencia";
import { fmtDate } from "@/app/ui/grd/incidente/lib/format";
import { inputCls, textareaCls } from "@/app/ui/grd/incidente/lib/ui-classes";

const MARCA_CAMPO = "Evidencia de campo";

/** Paso "Recopilar Información": verificación del evento, empadronamiento y evidencias de campo. */
export function CampoStep({
  data,
  onDone,
}: {
  data: IncidenciaDetalleOutput;
  onDone: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { showConfirm, ConfirmModalJSX } = useConfirm();
  // Brigadista solo puede llenar si está asignado a ESTE incidente
  const canAct =
    data.role === "admin" ||
    data.role === "especialistaGRD" ||
    data.isResponsableGRD ||
    (data.role === "brigadista" && data.isBrigadistaAsignado);
  const canUpload =
    data.role === "admin" ||
    data.isResponsableGRD ||
    (data.role === "brigadista" && data.isBrigadistaAsignado);
  const done = data.estadoActual !== "ASIGNADO";
  const informeCampo = data.informes.find((i) => i.tipo === "CAMPO");

  const [obsCampo, setObsCampo] = useState("");
  const [obsBrig, setObsBrig] = useState("");
  const [familyNotes, setFamilyNotes] = useState<Record<string, string>>({});
  const [familyOpen, setFamilyOpen] = useState<Record<string, boolean>>({});
  // Modal de empadronamiento
  const [showPersonaModal, setShowPersonaModal] = useState(false);
  const [editingPersonaForm, setEditingPersonaForm] = useState<PersonaForm | null>(null);
  const [addingToFamiliaId, setAddingToFamiliaId] = useState<string | null>(null);
  // Nuevo grupo familiar
  const [showAddFamilia, setShowAddFamilia] = useState(false);
  const [nuevaFamilia, setNuevaFamilia] = useState("");
  const [savingFamilia, setSavingFamilia] = useState(false);
  const [subiendo, setSubiendo] = useState<string[]>([]);

  function personaToForm(p: Persona, familiaId: string): PersonaForm {
    const apellidos = p.apellidos ?? "";
    const parts = apellidos.split(" ");
    return {
      id: p.id,
      tipoDoc: p.tipoDocumento ?? "DNI",
      dni: p.numeroDocumento ?? "",
      nombre: p.nombres,
      apellidoPaterno: parts[0] ?? "",
      apellidoMaterno: parts.slice(1).join(" "),
      edad: p.edad ?? "",
      genero: p.sexo === "M" ? "Masculino" : p.sexo === "F" ? "Femenino" : "Otro",
      celular: p.telefono ?? "",
      parentesco: p.parentesco ?? "",
      situacionActual: p.condicionEspecial ?? "",
      familiaId,
    };
  }

  function handleEditPersona(p: Persona, familiaId: string) {
    setEditingPersonaForm(personaToForm(p, familiaId));
    setAddingToFamiliaId(null);
    setShowPersonaModal(true);
  }

  function handleAddToFamilia(familiaId: string) {
    setEditingPersonaForm(null);
    setAddingToFamiliaId(familiaId);
    setShowPersonaModal(true);
  }

  function handleSavePersona(form: PersonaForm) {
    const apellidos = [form.apellidoPaterno, form.apellidoMaterno].filter(Boolean).join(" ") || null;
    const edadNum = form.edad ? parseInt(form.edad, 10) : null;
    const sexo = form.genero === "Masculino" ? "M" : form.genero === "Femenino" ? "F" : null;
    const payload = {
      nombres: form.nombre,
      apellidos,
      edad: edadNum,
      sexo,
      tipoDocumento: form.tipoDoc || null,
      numeroDocumento: form.dni || null,
      parentesco: form.parentesco || null,
      condicionEspecial: form.situacionActual || null,
      telefono: form.celular || null,
    };
    const isEditing = !!editingPersonaForm;
    startTransition(async () => {
      let res;
      if (isEditing) {
        res = await updatePersonaCampo(data.idIncidencia, form.id, payload);
      } else if (addingToFamiliaId) {
        res = await agregarPersonaAFamiliaCampo(data.idIncidencia, addingToFamiliaId, payload);
      }
      if (res && "message" in res) {
        toast.error(res.message);
        return;
      }
      toast.success(isEditing ? "Persona actualizada." : "Persona agregada.");
      router.refresh();
    });
  }

  async function handleDeletePersona(personaId: string) {
    const ok = await showConfirm({
      title: "¿Eliminar persona?",
      message: "Se eliminará esta persona del empadronamiento. Esta acción no se puede deshacer.",
      confirmLabel: "Sí, eliminar",
      variant: "danger",
    });
    if (!ok) return;
    startTransition(async () => {
      const res = await deletePersonaCampo(personaId, data.idIncidencia);
      if (res && "message" in res) {
        toast.error(res.message);
        return;
      }
      toast.success("Persona eliminada.");
      router.refresh();
    });
  }

  async function handleDeleteFamilia(grupoId: string) {
    const ok = await showConfirm({
      title: "¿Eliminar grupo familiar?",
      message: "Se eliminará el grupo familiar y todas sus personas registradas. Esta acción no se puede deshacer.",
      confirmLabel: "Sí, eliminar",
      variant: "danger",
    });
    if (!ok) return;
    startTransition(async () => {
      const res = await deleteGrupoFamiliarCampo(grupoId, data.idIncidencia);
      if (res && "message" in res) {
        toast.error(res.message);
        return;
      }
      toast.success("Grupo familiar eliminado.");
      router.refresh();
    });
  }

  function handleAddFamilia() {
    if (!nuevaFamilia.trim()) return;
    setSavingFamilia(true);
    startTransition(async () => {
      const res = await addGrupoFamiliarCampo(data.idIncidencia, nuevaFamilia.trim());
      setSavingFamilia(false);
      if (res && "message" in res) {
        toast.error(res.message);
        return;
      }
      toast.success("Grupo familiar creado.");
      setNuevaFamilia("");
      setShowAddFamilia(false);
      router.refresh();
    });
  }

  async function handleUploadCampo(files: FileList | null) {
    if (!files || files.length === 0) return;
    const arr = Array.from(files);
    setSubiendo(arr.map((f) => f.name));
    const subidas: {
      key: string;
      nombreArchivo: string;
      formato: string | null;
      tamano: number | null;
      descripcion: string;
    }[] = [];
    for (const file of arr) {
      const ct = file.type || "application/octet-stream";
      try {
        const key = await subirEvidencia(file, data.idIncidencia);
        subidas.push({
          key,
          nombreArchivo: file.name,
          formato: ct,
          tamano: file.size,
          descripcion: MARCA_CAMPO,
        });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo subir el archivo.");
      }
    }
    setSubiendo([]);
    if (subidas.length) {
      const r = await addEvidenciasCampo(data.idIncidencia, subidas);
      if (r && "message" in r) {
        toast.error(r.message);
        return;
      }
      toast.success(
        subidas.length === 1 ? "Evidencia de campo subida." : `${subidas.length} evidencias subidas.`
      );
      router.refresh();
    }
  }

  function handleSubmit() {
    const notasGuardar = Object.entries(familyNotes)
      .filter(([, nota]) => nota.trim())
      .map(([id, nota]) => ({ id, nota: nota.trim() }));
    startTransition(async () => {
      const res = await saveInfoCampo(data.idIncidencia, {
        fechaVisita: new Date().toISOString().split("T")[0],
        responsable: data.currentUserName || "Equipo de campo",
        descripcionEvento: obsCampo.trim() || "Levantamiento de campo realizado.",
        nivelVulnerabilidad: "",
        necesidadesPrioritarias: [],
        recomendacion: "",
        observaciones: obsBrig.trim(),
        notasFamilias: notasGuardar.length ? notasGuardar : undefined,
        condHabitabilidad: {},
      });
      if (res && "message" in res) {
        toast.error(res.message);
        return;
      }
      toast.success("Levantamiento enviado al Especialista GRD.");
      onDone();
    });
  }

  if (informeCampo) {
    const parsed = parseInforme<{
      responsable?: string;
      descripcionEvento?: string;
      observaciones?: string;
      notasFamilias?: { id: string; nota: string }[];
    }>(informeCampo.contenido);
    const notasFamilias: { id: string; nota: string }[] = parsed?.notasFamilias ?? [];
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span className="text-sm font-medium text-green-800">
            Levantamiento completado el {fmtDate(informeCampo.fecha)}
            {parsed?.responsable ? ` · ${parsed.responsable}` : ""}
          </span>
        </div>
        {parsed && (
          <div className="space-y-4">
            {parsed.descripcionEvento &&
              parsed.descripcionEvento !== "Levantamiento de campo realizado." && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Observaciones desde campo
                  </p>
                  <p className="text-sm text-gray-800 bg-gray-50 border border-gray-100 rounded-lg p-3">
                    {parsed.descripcionEvento}
                  </p>
                </div>
              )}
            {parsed.observaciones && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Observaciones generales del campo
                </p>
                <p className="text-sm text-gray-800 bg-gray-50 border border-gray-100 rounded-lg p-3">
                  {parsed.observaciones}
                </p>
              </div>
            )}
            {notasFamilias.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Notas por familia
                </p>
                <div className="space-y-2">
                  {data.gruposFamiliares
                    .map((g) => {
                      const item = notasFamilias.find((n) => n.id === g.id);
                      if (!item?.nota) return null;
                      return (
                        <div key={g.id} className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                          <p className="text-[11px] font-semibold text-blue-700 mb-0.5">
                            {g.nombreReferencia ?? "Familia"}
                          </p>
                          <p className="text-xs text-gray-700">{item.nota}</p>
                        </div>
                      );
                    })
                    .filter(Boolean)}
                </div>
              </div>
            )}
            <EvidenciasRegistro evidencias={data.evidencias} />
          </div>
        )}
      </div>
    );
  }

  if (!canAct || done) {
    return (
      <p className="text-sm text-gray-500 text-center py-4">
        El levantamiento de campo aún no ha sido completado.
      </p>
    );
  }

  // ── Datos derivados para las secciones de verificación ──
  const todasPersonas = data.gruposFamiliares.flatMap((g) => g.personas);
  const totalPersonas = todasPersonas.length;
  const ninos = todasPersonas.filter((p) => p.edad != null && Number(p.edad) < 18).length;
  const mayores = todasPersonas.filter((p) => p.edad != null && Number(p.edad) >= 60).length;
  const adultos = Math.max(0, totalPersonas - ninos - mayores);
  const evidIniciales = data.evidencias.filter((e) => e.descripcion !== MARCA_CAMPO);
  const evidCampo = data.evidencias.filter((e) => e.descripcion === MARCA_CAMPO);
  const inicialesPorFuente = evidIniciales.reduce<Record<string, typeof evidIniciales>>((acc, ev) => {
    const k = ev.descripcion?.trim() || "General";
    (acc[k] = acc[k] ?? []).push(ev);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Header de etapa */}
      <div className="rounded-xl bg-orange-500 text-white p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
          <ClipboardList className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold">Etapa 3 — Levantamiento de Campo</p>
          <p className="text-sm text-white/90">
            Verifica los datos del evento, confirma el empadronamiento y documenta desde campo.
            {data.currentUserName ? ` · ${data.currentUserName}` : ""}
          </p>
        </div>
        <span className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded-full uppercase flex-shrink-0">
          {data.role === "brigadista" ? "Brigadista" : "GRD"}
        </span>
      </div>

      {/* 1. Verificación del Evento */}
      <details open className="border border-gray-200 rounded-xl overflow-hidden">
        <summary className="cursor-pointer px-4 py-3 flex items-center gap-2 bg-gray-50 hover:bg-gray-100">
          <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center">
            1
          </span>
          <span className="text-sm font-semibold text-gray-800">Verificación del Evento</span>
        </summary>
        <div className="p-4 text-sm space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Columna izquierda */}
            <div className="space-y-3">
              {/* Datos del evento */}
              <div className="border border-gray-200 rounded-lg p-3 space-y-1.5">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                  Datos del evento registrados
                </p>
                <p><span className="font-semibold">Categoría:</span> {data.tipoEvento ?? "—"}</p>
                <p>
                  <span className="font-semibold">Ubicación:</span>{" "}
                  {[data.direccionEvento, data.parroquia].filter(Boolean).join(", ") || "—"}
                </p>
                {data.descripcionEvento && (
                  <p><span className="font-semibold">Descripción inicial:</span> {data.descripcionEvento}</p>
                )}
                {data.causa && (() => {
                  let ctx: Record<string, unknown> | null = null;
                  try { ctx = JSON.parse(data.causa!); } catch {}
                  if (ctx && typeof ctx === "object") {
                    const causaStr = typeof ctx.causa === "string" ? ctx.causa : "";
                    const refStr = typeof ctx.referencia === "string" ? ctx.referencia : "";
                    const necs: string[] = Array.isArray(ctx.necesidades)
                      ? (ctx.necesidades as unknown[]).map((n) => String(n)) : [];
                    const necObs = typeof ctx.necesidadesObs === "string" ? ctx.necesidadesObs : "";
                    return (
                      <div className="space-y-1">
                        {causaStr && <p><span className="font-semibold">Causa:</span> {causaStr}</p>}
                        {refStr && <p><span className="font-semibold">Referencia al lugar:</span> {refStr}</p>}
                        {necs.length > 0 && (
                          <div className="flex items-start gap-2 flex-wrap">
                            <span className="font-semibold flex-shrink-0">Necesidades:</span>
                            <div className="flex flex-wrap gap-1">
                              {necs.map((n, i) => (
                                <span key={i} className="px-2 py-0.5 bg-orange-50 text-orange-700 text-[10px] rounded-full border border-orange-200">{n}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {necObs && <p><span className="font-semibold">Obs. necesidades:</span> {necObs}</p>}
                      </div>
                    );
                  }
                  return <p><span className="font-semibold">Causa:</span> {data.causa}</p>;
                })()}
              </div>

              {/* Reportado por */}
              {data.aviso && (
                <div className="border border-gray-200 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Reportado por</p>
                  <p><span className="font-semibold">Nombre:</span> {data.aviso.nombreInformante ?? "—"}</p>
                  {data.aviso.telefonoInformante && (
                    <p><span className="font-semibold">Celular:</span> {data.aviso.telefonoInformante}</p>
                  )}
                  {data.reportanteRol && (
                    <p><span className="font-semibold">Rol/Institución:</span> {data.reportanteRol}</p>
                  )}
                </div>
              )}
            </div>

            {/* Columna derecha */}
            <div className="space-y-3">
              {/* Evidencias iniciales */}
              <div className="border border-gray-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Evidencias iniciales</p>
                {evidIniciales.length === 0 ? (
                  <p className="text-xs text-gray-400">Sin evidencias iniciales registradas.</p>
                ) : (
                  <div className="space-y-2.5">
                    {Object.entries(inicialesPorFuente).map(([fuente, items]) => (
                      <div key={fuente}>
                        <p className="text-[11px] text-gray-500 mb-1">{fuente} · {items.length} archivo(s)</p>
                        <div className="grid grid-cols-1 gap-2">
                          {items.map((ev) => <EvidenciaChip key={ev.id} ev={ev} />)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Estimación */}
              <div className="border border-gray-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                  Estimación inicial de afectación
                </p>
                {data.gravedad && (
                  <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                    {data.gravedad}
                  </span>
                )}
                <p className="text-sm font-semibold mt-2">{totalPersonas} persona(s) afectada(s)</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {[["Niños", ninos], ["Adultos", adultos], ["Adultos Mayores", mayores]].map(([label, n]) => (
                    <span key={label} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded-full">
                      {label} · {n}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Observaciones — ancho completo */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Observaciones desde campo (opcional)
            </label>
            <textarea
              rows={2}
              className={textareaCls}
              value={obsCampo}
              onChange={(e) => setObsCampo(e.target.value)}
              placeholder="Lo observado en campo..."
            />
          </div>
        </div>
      </details>

      {/* 2. Verificación de Empadronamiento */}
      <details className="border border-gray-200 rounded-xl overflow-hidden">
        <summary className="cursor-pointer px-4 py-3 flex items-center gap-2 bg-gray-50 hover:bg-gray-100">
          <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center">
            2
          </span>
          <Users className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-800">Verificación de Empadronamiento</span>
          <span className="ml-auto text-[11px] text-gray-500">
            {totalPersonas} persona(s) · {data.gruposFamiliares.length} familia(s)
          </span>
        </summary>
        <div className="p-4 space-y-3">
          {data.gruposFamiliares.map((g) => (
            <div key={g.id} className="border border-blue-200 rounded-lg bg-blue-50 overflow-hidden">
              {/* Cabecera del grupo */}
              <div className="bg-blue-100 px-3 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-semibold text-blue-900">
                    {g.nombreReferencia ?? "Grupo familiar"}
                  </span>
                  <span className="text-xs text-blue-600">
                    ({g.personas.length} integrantes)
                  </span>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    title="Agregar persona a esta familia"
                    onClick={() => handleAddToFamilia(g.id)}
                    className="p-1 hover:bg-blue-200 rounded text-blue-600 transition-colors"
                  >
                    <UserPlus className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    title={familyOpen[g.id] ? "Ocultar nota" : "Agregar nota"}
                    onClick={() => setFamilyOpen((prev) => ({ ...prev, [g.id]: !prev[g.id] }))}
                    className={`p-1 rounded transition-colors ${
                      familyOpen[g.id] || familyNotes[g.id]?.trim()
                        ? "text-blue-700 bg-blue-200"
                        : "text-blue-600 hover:bg-blue-200"
                    }`}
                  >
                    <MessageSquarePlus className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    title="Eliminar grupo familiar"
                    onClick={() => handleDeleteFamilia(g.id)}
                    className="p-1 hover:bg-red-100 rounded text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Nota de familia */}
              {familyOpen[g.id] && (
                <div className="px-3 py-2 border-t border-blue-200">
                  <textarea
                    rows={2}
                    className="w-full px-2.5 py-1.5 text-xs border border-blue-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none placeholder:text-gray-400"
                    placeholder="¿Qué necesita esta familia? (opcional)"
                    value={familyNotes[g.id] ?? ""}
                    onChange={(e) => setFamilyNotes((prev) => ({ ...prev, [g.id]: e.target.value }))}
                  />
                </div>
              )}

              {/* Lista de personas */}
              <div className="p-2 space-y-1">
                {g.personas.map((p) => (
                  <div key={p.id} className="bg-white border border-gray-200 rounded px-3 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <UserCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {p.nombres} {p.apellidos ?? ""}
                          </span>
                          {p.parentesco && (
                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-medium flex-shrink-0">
                              {p.parentesco}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500 ml-6">
                          <span>
                            Edad: <strong className="text-gray-700">{p.edad ?? "—"}</strong> años
                          </span>
                          {p.tipoDocumento && (
                            <span>
                              {p.tipoDocumento}: <strong className="text-gray-700">{p.numeroDocumento ?? "—"}</strong>
                            </span>
                          )}
                          <span>
                            Género: <strong className="text-gray-700">{p.sexo ?? "—"}</strong>
                          </span>
                          {p.telefono && (
                            <span>
                              Cel: <strong className="text-gray-700">{p.telefono}</strong>
                            </span>
                          )}
                          {p.condicionEspecial && (
                            <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-[10px] font-medium">
                              {p.condicionEspecial}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          type="button"
                          title="Editar persona"
                          onClick={() => handleEditPersona(p, g.id)}
                          className="p-1 hover:bg-gray-100 rounded text-gray-500 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Eliminar persona"
                          onClick={() => handleDeletePersona(p.id)}
                          className="p-1 hover:bg-red-100 rounded text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {g.personas.length === 0 && (
                  <p className="text-xs text-blue-400 text-center py-2 italic">Sin personas registradas.</p>
                )}
              </div>
            </div>
          ))}

          {data.gruposFamiliares.length === 0 && (
            <p className="text-xs text-gray-400 italic">Sin grupos familiares registrados.</p>
          )}

          {/* Agregar nuevo grupo familiar */}
          {showAddFamilia ? (
            <div className="flex gap-2 items-center">
              <input
                type="text"
                className={inputCls}
                placeholder="Nombre del grupo familiar"
                value={nuevaFamilia}
                onChange={(e) => setNuevaFamilia(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddFamilia();
                }}
              />
              <button
                type="button"
                onClick={handleAddFamilia}
                disabled={savingFamilia}
                className="px-3 py-2 bg-[#009850] text-white rounded-lg text-sm flex-shrink-0 disabled:opacity-50"
              >
                {savingFamilia ? <Loader2 className="w-4 h-4 animate-spin" /> : "Crear"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddFamilia(false);
                  setNuevaFamilia("");
                }}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddFamilia(true)}
              className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-blue-300 rounded-lg text-sm text-blue-600 hover:border-blue-500 hover:bg-blue-50 transition-colors font-medium"
            >
              <Plus className="w-4 h-4" /> Agregar grupo familiar
            </button>
          )}
        </div>
      </details>

      {/* 3. Evidencias de Campo */}
      <details className="border border-gray-200 rounded-xl overflow-hidden">
        <summary className="cursor-pointer px-4 py-3 flex items-center gap-2 bg-gray-50 hover:bg-gray-100">
          <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center">
            3
          </span>
          <Camera className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-800">Evidencias de Campo</span>
          <span className="ml-auto text-[11px] text-gray-500">{evidCampo.length} subida(s)</span>
        </summary>
        <div className="p-4 space-y-3">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
            <p className="font-semibold flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Recomendaciones éticas:
            </p>
            <ul className="list-disc ml-5 mt-1 space-y-0.5">
              <li>Evidenciar daños o afectaciones</li>
              <li>No vulnerar la dignidad de las personas</li>
              <li>Evitar exposición innecesaria de menores o situaciones sensibles</li>
            </ul>
          </div>

          <EvidenciaUploader
            onFiles={handleUploadCampo}
            accept="image/*,video/*,.pdf"
            loading={subiendo.length > 0}
            loadingCount={subiendo.length}
            disabled={!canUpload}
            disabledMessage="Solo el equipo asignado puede cargar evidencias."
          />

          {evidCampo.length === 0 && subiendo.length === 0 ? (
            <p className="text-center text-xs text-gray-400 py-2">
              No hay evidencias de campo registradas
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {evidCampo.map((ev) => (
                <EvidenciaChip key={ev.id} ev={ev} />
              ))}
            </div>
          )}
        </div>
      </details>

      {/* 4. Observaciones generales del campo */}
      <details className="border border-gray-200 rounded-xl overflow-hidden">
        <summary className="cursor-pointer px-4 py-3 flex items-center gap-2 bg-gray-50 hover:bg-gray-100">
          <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-bold flex items-center justify-center">
            4
          </span>
          <ClipboardList className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-800">Observaciones Generales del Campo</span>
        </summary>
        <div className="p-4">
          <textarea
            rows={4}
            className={textareaCls}
            value={obsBrig}
            onChange={(e) => setObsBrig(e.target.value)}
            placeholder="Describe la situación general observada en campo: condiciones del lugar, acceso, riesgos adicionales, coordinación con otras instituciones…"
          />
        </div>
      </details>

      {/* Resumen + enviar */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
        <span className="flex items-center gap-1">
          <CheckCircle className="w-3.5 h-3.5 text-green-600" /> {totalPersonas} persona(s)
        </span>
        <span className="flex items-center gap-1">
          {obsBrig.trim() ? (
            <CheckCircle className="w-3.5 h-3.5 text-green-600" />
          ) : (
            <XCircle className="w-3.5 h-3.5 text-gray-400" />
          )}
          Observaciones
        </span>
        <span className="flex items-center gap-1">
          {evidCampo.length > 0 ? (
            <CheckCircle className="w-3.5 h-3.5 text-green-600" />
          ) : (
            <XCircle className="w-3.5 h-3.5 text-gray-400" />
          )}
          {evidCampo.length} evidencia(s)
        </span>
      </div>

      <button
        onClick={handleSubmit}
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold disabled:opacity-50 transition-opacity"
        style={{ background: "var(--caritas-green)" }}
      >
        {isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Enviando…
          </>
        ) : (
          <>
            <ClipboardList className="w-4 h-4" /> Enviar Levantamiento al Especialista GRD
          </>
        )}
      </button>

      {ConfirmModalJSX}

      {/* Modal de persona afectada (agregar / editar) */}
      {showPersonaModal && (
        <PersonaModal
          editing={editingPersonaForm ?? undefined}
          familias={data.gruposFamiliares.map((g) => ({
            id: g.id,
            nombre: g.nombreReferencia ?? "Familia",
          }))}
          activeFamiliaId={addingToFamiliaId ?? editingPersonaForm?.familiaId ?? undefined}
          onSave={handleSavePersona}
          onClose={() => {
            setShowPersonaModal(false);
            setEditingPersonaForm(null);
            setAddingToFamiliaId(null);
          }}
        />
      )}
    </div>
  );
}
