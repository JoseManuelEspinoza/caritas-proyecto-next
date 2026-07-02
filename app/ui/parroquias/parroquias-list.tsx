"use client";

import { useState, useTransition, useRef } from "react";
import dynamic from "next/dynamic";
import {
  Search,
  Church,
  MapPin,
  Phone,
  Mail,
  Users,
  AlertTriangle,
  ClipboardList,
  Filter,
  Plus,
  Edit3,
  ToggleLeft,
  ToggleRight,
  X,
  Loader2,
  Upload,
  Download,
  FileSpreadsheet,
  Trash2,
  AlertCircle,
  CheckCircle2,
  UserX,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  createParroquia,
  updateParroquia,
  toggleEstadoParroquia,
  checkParroquiaDelete,
  deleteParroquia,
  importParroquias,
  type ParroquiaFormData,
  type ParroquiaDeleteCheck,
  type ImportParroquiaRow,
} from "@/app/actions/parroquias";
import { PaginationControls } from "@/app/ui/shared/pagination-controls";
import { useConfirm } from "@/app/ui/shared/confirm-modal";

const LocationPicker = dynamic(
  () => import("./location-picker").then((m) => m.LocationPicker),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 bg-[#F5F5F5] border border-[#DDDDDD] rounded-lg flex items-center justify-center">
        <span className="text-sm text-gray-400">Cargando mapa...</span>
      </div>
    ),
  }
);

export type ParroquiaDetalle = {
  id: string;
  nombre: string;
  direccion: string | null;
  referencia: string | null;
  latitud: string | null;
  longitud: string | null;
  telefono: string | null;
  correo: string | null;
  estado: string;
  _count: {
    brigadistas: number;
    incidencias: number;
    planesTrabajo: number;
  };
};

interface Props {
  parroquias: ParroquiaDetalle[];
  canEdit?: boolean;
}

const inputCls =
  "w-full px-3 py-2 text-sm bg-[#F5F5F5] border border-[#DDDDDD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009850]/20 focus:border-[#009850] transition-colors";
const labelCls = "block text-xs font-medium text-gray-700 mb-1";

// ─── Modal crear/editar parroquia ─────────────────────────────────────────────

function ParroquiaModal({
  editing,
  onClose,
}: {
  editing?: ParroquiaDetalle;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<ParroquiaFormData>({
    nombre: editing?.nombre ?? "",
    direccion: editing?.direccion ?? "",
    referencia: editing?.referencia ?? "",
    telefono: editing?.telefono ?? "",
    correo: editing?.correo ?? "",
    latitud: editing?.latitud ?? "",
    longitud: editing?.longitud ?? "",
  });

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function set(k: keyof ParroquiaFormData, v: string) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function handleLocationChange(lat: number | null, lng: number | null, address: string | null) {
    setForm((p) => ({
      ...p,
      latitud: lat != null ? String(lat) : "",
      longitud: lng != null ? String(lng) : "",
      ...(address != null ? { direccion: address } : {}),
    }));
  }

  function validate(): string | null {
    if (!form.nombre.trim()) return "El nombre de la parroquia es obligatorio.";
    if (!form.direccion.trim()) return "La dirección es obligatoria.";
    if (!form.telefono.trim()) return "El teléfono es obligatorio.";
    if (!form.latitud?.trim() || !form.longitud?.trim())
      return "Debes marcar la ubicación en el mapa (latitud y longitud son obligatorias).";
    if (form.correo.trim() && !EMAIL_RE.test(form.correo.trim()))
      return "El correo no tiene un formato válido.";
    return null;
  }

  function handleSubmit() {
    const error = validate();
    if (error) { toast.error(error); return; }

    startTransition(async () => {
      const result = editing
        ? await updateParroquia(editing.id, form)
        : await createParroquia(form);
      if (result?.message) { toast.error(result.message); return; }
      toast.success(editing ? "Parroquia actualizada" : "Parroquia registrada");
      onClose();
    });
  }

  const initialLat = editing?.latitud ? parseFloat(editing.latitud) : null;
  const initialLng = editing?.longitud ? parseFloat(editing.longitud) : null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <h3 className="font-bold text-gray-900">
            {editing ? `Editar — ${editing.nombre}` : "Registrar parroquia"}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded text-gray-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className={labelCls}>Nombre <span className="text-red-500">*</span></label>
            <input type="text" value={form.nombre} onChange={(e) => set("nombre", e.target.value)}
              placeholder="Ej: Parroquia San Juan Bautista" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Dirección <span className="text-red-500">*</span></label>
            <input type="text" value={form.direccion} onChange={(e) => set("direccion", e.target.value)}
              placeholder="Ej: Av. Principal 123, Lima" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Referencia</label>
            <input type="text" value={form.referencia} onChange={(e) => set("referencia", e.target.value)}
              placeholder="Ej: A una cuadra del parque central" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Teléfono <span className="text-red-500">*</span></label>
              <input type="tel" value={form.telefono}
                onChange={(e) => set("telefono", e.target.value.replace(/\D/g, "").slice(0, 9))}
                placeholder="Ej: 987654321" maxLength={9} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Correo</label>
              <input type="email" value={form.correo} onChange={(e) => set("correo", e.target.value)}
                placeholder="parroquia@ejemplo.com" className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>
              Ubicación en el mapa <span className="text-red-500">*</span>
              <span className="ml-1 text-gray-400 font-normal">(busca la dirección o haz clic para marcar)</span>
            </label>
            <LocationPicker lat={initialLat} lng={initialLng} onLocationChange={handleLocationChange} />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-[#DDDDDD] rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancelar
            </button>
            <button onClick={handleSubmit} disabled={isPending}
              className="flex-1 px-4 py-2.5 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
              style={{ background: "#009850" }}>
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {editing ? "Guardando..." : "Registrando..."}
                </span>
              ) : editing ? "Guardar cambios" : "Registrar parroquia"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Modal eliminar parroquia (con lógica de cascada/reasignación) ─────────────

function DeleteParroquiaModal({
  parroquiaNombre,
  check,
  otrasParroquias,
  onConfirm,
  onCancel,
}: {
  parroquiaNombre: string;
  check: ParroquiaDeleteCheck;
  otrasParroquias: { id: string; nombre: string }[];
  onConfirm: (reassignToId?: string) => void;
  onCancel: () => void;
}) {
  const [reassignTo, setReassignTo] = useState("");
  const [isPending, startTransition] = useTransition();

  const totalBrigadistas =
    check.brigadistasSinRelaciones.length + check.brigadistasConRelaciones.length;
  const needsReassign = check.brigadistasConRelaciones.length > 0;

  function handleConfirm() {
    if (needsReassign && !reassignTo) {
      toast.error("Debes seleccionar la parroquia destino para reasignar los brigadistas.");
      return;
    }
    startTransition(() => onConfirm(reassignTo || undefined));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-900">Eliminar parroquia</h3>
            <p className="text-sm text-gray-500 mt-1">
              <span className="font-medium text-gray-700">{parroquiaNombre}</span>
            </p>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Información de impacto */}
        {totalBrigadistas === 0 ? (
          <p className="text-sm text-gray-600">
            Esta parroquia no tiene brigadistas asociados. Se eliminará permanentemente.
          </p>
        ) : (
          <div className="space-y-3">
            {check.brigadistasSinRelaciones.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-xs font-medium text-red-800 flex items-center gap-1 mb-1">
                  <UserX className="w-3.5 h-3.5" />
                  {check.brigadistasSinRelaciones.length} brigadista(s) se eliminarán:
                </p>
                <ul className="text-xs text-red-700 space-y-0.5 max-h-24 overflow-y-auto">
                  {check.brigadistasSinRelaciones.map((b) => (
                    <li key={b.id}>• {b.nombre}</li>
                  ))}
                </ul>
              </div>
            )}
            {needsReassign && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs font-medium text-amber-800 flex items-center gap-1 mb-1">
                  <ArrowRight className="w-3.5 h-3.5" />
                  {check.brigadistasConRelaciones.length} brigadista(s) se reasignarán (tienen registros vinculados):
                </p>
                <ul className="text-xs text-amber-700 space-y-0.5 max-h-24 overflow-y-auto">
                  {check.brigadistasConRelaciones.map((b) => (
                    <li key={b.id}>• {b.nombre} — {b.razones.join(", ")}</li>
                  ))}
                </ul>
              </div>
            )}
            {needsReassign && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Parroquia destino para reasignación <span className="text-red-500">*</span>
                </label>
                <select
                  value={reassignTo}
                  onChange={(e) => setReassignTo(e.target.value)}
                  className={inputCls}
                >
                  <option value="">Seleccionar parroquia...</option>
                  {otrasParroquias.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        <p className="text-xs text-gray-400">Esta acción no se puede deshacer.</p>

        <div className="flex gap-3 justify-end">
          <button onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isPending || (needsReassign && !reassignTo)}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 transition-colors"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Eliminando...
              </span>
            ) : needsReassign ? "Eliminar y reasignar" : "Eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal importar parroquias ────────────────────────────────────────────────

type ParsedParroquiaRow = ImportParroquiaRow & { _rowNum: number };

function ImportParroquiaModal({ onClose }: { onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [rows, setRows] = useState<ParsedParroquiaRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<{ created: number; errors: { row: number; reason: string }[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const raw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

    const parsed: ParsedParroquiaRow[] = raw.map((r, idx) => ({
      _rowNum: idx + 2,
      nombre: String(r["nombre"] ?? r["Nombre"] ?? ""),
      direccion: String(r["direccion"] ?? r["Dirección"] ?? r["Direccion"] ?? "") || undefined,
      referencia: String(r["referencia"] ?? r["Referencia"] ?? "") || undefined,
      telefono: String(r["telefono"] ?? r["Teléfono"] ?? r["Telefono"] ?? "") || undefined,
      correo: String(r["correo"] ?? r["Correo"] ?? "") || undefined,
      latitud: String(r["latitud"] ?? r["Latitud"] ?? "") || undefined,
      longitud: String(r["longitud"] ?? r["Longitud"] ?? "") || undefined,
    }));

    setRows(parsed);
    setFileName(file.name);
    setResult(null);
  }

  async function downloadTemplate() {
    const { exportarExcel } = await import("@/app/ui/shared/export-excel");
    const headers = ["nombre", "direccion", "referencia", "telefono", "correo", "latitud", "longitud"];
    const example = ["Parroquia San Juan Bautista", "Av. Principal 123", "Cerca al parque", "987654321", "parroquia@ejemplo.com", "-12.046374", "-77.042793"];
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = example[i]; });
    // Sin título: los encabezados quedan en la fila 1 para que la importación los lea.
    await exportarExcel({
      fileName: "plantilla_parroquias",
      sheets: [{ name: "Parroquias", columns: headers.map((h) => ({ header: h })), rows: [row] }],
    });
  }

  function handleImport() {
    if (rows.length === 0) return;
    startTransition(async () => {
      const res = await importParroquias(rows);
      setResult(res);
      if (res.created > 0) {
        toast.success(`${res.created} parroquia(s) importada(s) correctamente`);
      }
      if (res.errors.length === 0) onClose();
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full shadow-xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between shrink-0">
          <h3 className="font-bold text-gray-900">Importar parroquias desde Excel</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded text-gray-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
            <p className="font-medium mb-1">Columnas requeridas:</p>
            <p className="font-mono">nombre · direccion · telefono · latitud · longitud</p>
            <p className="mt-1 text-blue-600">Opcionales: referencia · correo</p>
          </div>

          <div className="flex gap-2">
            <button onClick={downloadTemplate}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 bg-[#F5F5F5] border border-[#DDDDDD] rounded-lg hover:bg-gray-200">
              <Download className="w-4 h-4" />
              Descargar plantilla
            </button>
            <button onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-white rounded-lg hover:opacity-90"
              style={{ background: "#009850" }}>
              <Upload className="w-4 h-4" />
              {fileName ? "Cambiar archivo" : "Seleccionar archivo Excel"}
            </button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv"
              className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </div>

          {fileName && (
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              {fileName} — {rows.length} fila(s) encontrada(s)
            </p>
          )}

          {result && (
            <div className="space-y-2">
              {result.created > 0 && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{result.created} parroquia(s) importada(s) correctamente.</span>
                </div>
              )}
              {result.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-red-800 mb-2 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {result.errors.length} fila(s) con errores:
                  </p>
                  <ul className="text-xs text-red-700 space-y-1 max-h-32 overflow-y-auto">
                    {result.errors.map((e) => (
                      <li key={e.row}>Fila {e.row}: {e.reason}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {rows.length > 0 && !result && (
            <div className="border border-[#DDDDDD] rounded-lg overflow-hidden">
              <div className="bg-[#F5F5F5] px-3 py-2 text-xs font-semibold text-gray-600">
                Vista previa ({rows.length} filas)
              </div>
              <div className="overflow-x-auto max-h-48 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b border-[#DDDDDD] sticky top-0">
                    <tr>
                      {["Fila", "Nombre", "Dirección", "Teléfono", "Correo"].map((h) => (
                        <th key={h} className="px-2 py-1.5 text-left text-gray-500 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DDDDDD]">
                    {rows.slice(0, 20).map((r) => (
                      <tr key={r._rowNum} className="hover:bg-gray-50">
                        <td className="px-2 py-1.5 text-gray-400">{r._rowNum}</td>
                        <td className="px-2 py-1.5 font-medium">{r.nombre}</td>
                        <td className="px-2 py-1.5 text-gray-500">{r.direccion ?? "—"}</td>
                        <td className="px-2 py-1.5 text-gray-500">{r.telefono ?? "—"}</td>
                        <td className="px-2 py-1.5 text-gray-500">{r.correo ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 20 && (
                  <p className="text-xs text-gray-400 text-center py-2">… y {rows.length - 20} filas más</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 flex gap-3 shrink-0">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-[#DDDDDD] rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
            {result ? "Cerrar" : "Cancelar"}
          </button>
          {!result && (
            <button onClick={handleImport} disabled={isPending || rows.length === 0}
              className="flex-1 px-4 py-2.5 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
              style={{ background: "#009850" }}>
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />Importando...
                </span>
              ) : rows.length > 0 ? `Importar ${rows.length} registro(s)` : "Importar"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function ParroquiasList({ parroquias, canEdit = false }: Props) {
  const [isPending, startTransition] = useTransition();
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editing, setEditing] = useState<ParroquiaDetalle | undefined>();
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState("all");
  const [filterTelefono, setFilterTelefono] = useState("all");
  const [filterCorreo, setFilterCorreo] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [exportando, setExportando] = useState(false);

  // Estado para el flujo de eliminación de parroquia
  const [deleteTarget, setDeleteTarget] = useState<ParroquiaDetalle | null>(null);
  const [deleteCheck, setDeleteCheck] = useState<ParroquiaDeleteCheck | null>(null);
  const [deleteCheckLoading, setDeleteCheckLoading] = useState(false);

  const { showConfirm, ConfirmModalJSX } = useConfirm();

  const filtered = parroquias.filter((p) => {
    if (filterEstado !== "all" && p.estado !== filterEstado) return false;
    if (filterTelefono === "con" && !p.telefono) return false;
    if (filterTelefono === "sin" && p.telefono) return false;
    if (filterCorreo === "con" && !p.correo) return false;
    if (filterCorreo === "sin" && p.correo) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !p.nombre.toLowerCase().includes(q) &&
        !(p.direccion ?? "").toLowerCase().includes(q) &&
        !(p.telefono ?? "").includes(q) &&
        !(p.correo ?? "").toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  async function handleExport() {
    setExportando(true);
    try {
      const { exportarExcel } = await import("@/app/ui/shared/export-excel");
      const rows = filtered.map((p) => ({
        Nombre: p.nombre,
        Estado: p.estado,
        "Teléfono": p.telefono ?? "",
        Correo: p.correo ?? "",
        "Dirección": p.direccion ?? "",
        Referencia: p.referencia ?? "",
        Brigadistas: p._count.brigadistas,
        Incidencias: p._count.incidencias,
        "Planes GRD": p._count.planesTrabajo,
      }));
      await exportarExcel({
        fileName: `parroquias_${new Date().toISOString().slice(0, 10)}`,
        title: "Parroquias — Cáritas Lima",
        sheets: [{ name: "Parroquias", rows }],
      });
    } finally {
      setExportando(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginated = filtered.slice(startIndex, startIndex + pageSize);
  const visibleFrom = filtered.length === 0 ? 0 : startIndex + 1;
  const visibleTo = Math.min(startIndex + pageSize, filtered.length);

  // Stats dinámicos según filtros activos
  const filtersActive = search !== "" || filterEstado !== "all";
  const statsSource = filtered;
  const totalActivas = statsSource.filter((p) => p.estado === "ACTIVO").length;
  const totalInactivas = statsSource.filter((p) => p.estado === "INACTIVO").length;
  const totalBrigadistas = statsSource.reduce((acc, p) => acc + p._count.brigadistas, 0);

  function openCreate() {
    setEditing(undefined);
    setShowModal(true);
  }
  function openEdit(p: ParroquiaDetalle) {
    setEditing(p);
    setShowModal(true);
  }

  async function handleToggleEstado(p: ParroquiaDetalle) {
    const nuevoEstado = p.estado === "ACTIVO" ? "inactiva" : "activa";
    const confirmed = await showConfirm({
      title: `${p.estado === "ACTIVO" ? "Desactivar" : "Activar"} parroquia`,
      message: `¿Deseas marcar "${p.nombre}" como ${nuevoEstado}?`,
      confirmLabel: p.estado === "ACTIVO" ? "Desactivar" : "Activar",
      variant: "warning",
    });
    if (!confirmed) return;
    startTransition(async () => {
      const result = await toggleEstadoParroquia(p.id, p.estado);
      if (result?.message) { toast.error(result.message); return; }
      toast.success(`Parroquia ${p.estado === "ACTIVO" ? "desactivada" : "activada"}`);
    });
  }

  async function handleDeleteClick(p: ParroquiaDetalle) {
    setDeleteCheckLoading(true);
    setDeleteTarget(p);

    const result = await checkParroquiaDelete(p.id);

    if ("message" in result) {
      setDeleteCheckLoading(false);
      setDeleteTarget(null);
      toast.error(result.message);
      return;
    }

    setDeleteCheckLoading(false);

    // Si tiene relaciones bloqueantes, mostrar error
    if (result.blockingReasons.length > 0) {
      setDeleteTarget(null);
      await showConfirm({
        title: "No se puede eliminar",
        message: `"${p.nombre}" no puede eliminarse porque tiene: ${result.blockingReasons.join(", ")}.`,
        confirmLabel: "Entendido",
        cancelLabel: "Cerrar",
        variant: "warning",
      });
      return;
    }

    // Si no tiene brigadistas, confirmación simple
    const totalBrig = result.brigadistasSinRelaciones.length + result.brigadistasConRelaciones.length;
    if (totalBrig === 0) {
      const confirmed = await showConfirm({
        title: "Eliminar parroquia",
        message: `¿Eliminar permanentemente "${p.nombre}"? Esta acción no se puede deshacer.`,
        confirmLabel: "Eliminar",
        variant: "danger",
      });
      setDeleteTarget(null);
      if (!confirmed) return;
      startTransition(async () => {
        const res = await deleteParroquia(p.id);
        if (res?.message) toast.error(res.message);
        else toast.success("Parroquia eliminada");
      });
      return;
    }

    // Tiene brigadistas → abrir modal complejo
    setDeleteCheck(result);
  }

  function handleDeleteConfirm(reassignToId?: string) {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    setDeleteCheck(null);
    startTransition(async () => {
      const res = await deleteParroquia(id, reassignToId ? { reassignToId } : undefined);
      if (res?.message) toast.error(res.message);
      else toast.success("Parroquia eliminada");
    });
  }

  // Lista de otras parroquias activas para reasignación
  const otrasParroquias = parroquias
    .filter((p) => p.id !== deleteTarget?.id && p.estado === "ACTIVO")
    .map((p) => ({ id: p.id, nombre: p.nombre }));

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Parroquias</h1>
          <p className="text-sm text-gray-500 mt-0.5">Directorio de parroquias — Cáritas Lima</p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-[#DDDDDD] rounded-lg hover:bg-gray-50 transition-all"
            >
              <Upload className="w-4 h-4" />
              Importar Excel
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-all"
              style={{ background: "#009850" }}
              suppressHydrationWarning
            >
              <Plus className="w-4 h-4" />
              Registrar parroquia
            </button>
          </div>
        )}
      </div>

      {/* Stats dinámicos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: filtersActive ? "Filtradas" : "Total", value: statsSource.length, icon: Church, color: "bg-gray-600" },
          { label: "Activas", value: totalActivas, icon: Church, color: "bg-[#009850]" },
          { label: "Inactivas", value: totalInactivas, icon: Church, color: "bg-gray-400" },
          { label: "Brigadistas asignados", value: totalBrigadistas, icon: Users, color: "bg-blue-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-[#DDDDDD] rounded-xl p-4 flex items-center gap-3">
            <div className={`w-10 h-10 ${s.color} rounded-xl flex items-center justify-center shrink-0`}>
              <s.icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white border border-[#DDDDDD] rounded-xl p-3 flex flex-col md:flex-row flex-wrap gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, dirección, correo..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-3 py-2 text-sm bg-[#F5F5F5] border border-[#DDDDDD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009850]/20 focus:border-[#009850]"
            suppressHydrationWarning
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400 shrink-0" />
          <select
            value={filterEstado}
            onChange={(e) => { setFilterEstado(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 text-sm bg-[#F5F5F5] border border-[#DDDDDD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009850]/20 focus:border-[#009850]"
            suppressHydrationWarning
          >
            <option value="all">Todos los estados</option>
            <option value="ACTIVO">Activas</option>
            <option value="INACTIVO">Inactivas</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-gray-400 shrink-0" />
          <select
            value={filterTelefono}
            onChange={(e) => { setFilterTelefono(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 text-sm bg-[#F5F5F5] border border-[#DDDDDD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009850]/20 focus:border-[#009850]"
            suppressHydrationWarning
          >
            <option value="all">Todos (teléfono)</option>
            <option value="con">Con teléfono</option>
            <option value="sin">Sin teléfono</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-gray-400 shrink-0" />
          <select
            value={filterCorreo}
            onChange={(e) => { setFilterCorreo(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 text-sm bg-[#F5F5F5] border border-[#DDDDDD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009850]/20 focus:border-[#009850]"
            suppressHydrationWarning
          >
            <option value="all">Todos (correo)</option>
            <option value="con">Con correo</option>
            <option value="sin">Sin correo</option>
          </select>
        </div>
        {(search || filterEstado !== "all" || filterTelefono !== "all" || filterCorreo !== "all") && (
          <button
            onClick={() => { setSearch(""); setFilterEstado("all"); setFilterTelefono("all"); setFilterCorreo("all"); setCurrentPage(1); }}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-[#009850] hover:bg-gray-50 rounded-lg transition-colors"
            suppressHydrationWarning
          >
            <X className="w-3.5 h-3.5" /> Limpiar
          </button>
        )}
        <button
          onClick={handleExport}
          disabled={exportando || filtered.length === 0}
          suppressHydrationWarning
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 bg-[#F5F5F5] border border-[#DDDDDD] rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          {exportando ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
          Excel
        </button>
      </div>

      {/* Tabla desktop */}
      <div className="hidden md:block bg-white border border-[#DDDDDD] rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">Sin parroquias que mostrar</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F5F5F5] border-b border-[#DDDDDD]">
                <tr>
                  {([
                    "Parroquia", "Contacto", "Ubicación", "Brigadistas", "Incidencias",
                    "Planes", "Estado", ...(canEdit ? ["Acciones"] : []),
                  ] as string[]).map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDDDDD]">
                {paginated.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#009850]/10 flex items-center justify-center shrink-0">
                          <Church className="w-4 h-4 text-[#009850]" />
                        </div>
                        <span className="text-sm font-medium text-gray-900">{p.nombre}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        {p.telefono && (
                          <p className="text-xs text-gray-600 flex items-center gap-1">
                            <Phone className="w-3 h-3" />{p.telefono}
                          </p>
                        )}
                        {p.correo && (
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Mail className="w-3 h-3" />{p.correo}
                          </p>
                        )}
                        {!p.telefono && !p.correo && <span className="text-xs text-gray-400">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        {p.direccion && (
                          <p className="text-xs text-gray-700 flex items-center gap-1">
                            <MapPin className="w-3 h-3 shrink-0" />{p.direccion}
                          </p>
                        )}
                        {p.referencia && <p className="text-xs text-gray-400">{p.referencia}</p>}
                        {p.latitud && p.longitud && (
                          <a href={`https://www.openstreetmap.org/?mlat=${p.latitud}&mlon=${p.longitud}&zoom=16`}
                            target="_blank" rel="noopener noreferrer"
                            className="text-xs text-[#009850] flex items-center gap-0.5 hover:underline">
                            <MapPin className="w-3 h-3" />Ver en mapa
                          </a>
                        )}
                        {!p.direccion && !p.referencia && !p.latitud && (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-sm font-semibold text-gray-900">{p._count.brigadistas}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
                        <span className="text-sm font-semibold text-gray-900">{p._count.incidencias}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <ClipboardList className="w-3.5 h-3.5 text-purple-500" />
                        <span className="text-sm font-semibold text-gray-900">{p._count.planesTrabajo}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {canEdit ? (
                        <button onClick={() => handleToggleEstado(p)} disabled={isPending}
                          className="flex items-center gap-1.5 text-xs font-medium hover:opacity-80 transition-opacity disabled:opacity-50"
                          title="Clic para cambiar estado" suppressHydrationWarning>
                          {p.estado === "ACTIVO" ? (
                            <><ToggleRight className="w-5 h-5 text-[#009850]" /><span className="text-[#009850]">Activa</span></>
                          ) : (
                            <><ToggleLeft className="w-5 h-5 text-gray-400" /><span className="text-gray-500">Inactiva</span></>
                          )}
                        </button>
                      ) : (
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${p.estado === "ACTIVO" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {p.estado === "ACTIVO" ? "Activa" : "Inactiva"}
                        </span>
                      )}
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(p)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
                            title="Editar" suppressHydrationWarning>
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(p)}
                            disabled={isPending || deleteCheckLoading}
                            className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 transition-colors disabled:opacity-40"
                            title="Eliminar"
                            suppressHydrationWarning
                          >
                            {deleteCheckLoading && deleteTarget?.id === p.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cards mobile */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">Sin parroquias que mostrar</div>
        ) : (
          paginated.map((p) => (
            <div key={p.id} className="bg-white border border-[#DDDDDD] rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#009850]/10 flex items-center justify-center shrink-0">
                    <Church className="w-5 h-5 text-[#009850]" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{p.nombre}</p>
                    {p.direccion && <p className="text-xs text-gray-500 mt-0.5">{p.direccion}</p>}
                    {p.latitud && p.longitud && (
                      <a href={`https://www.openstreetmap.org/?mlat=${p.latitud}&mlon=${p.longitud}&zoom=16`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-xs text-[#009850] flex items-center gap-0.5 hover:underline mt-0.5">
                        <MapPin className="w-3 h-3" />Ver en mapa
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {canEdit && (
                    <>
                      <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600" suppressHydrationWarning>
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteClick(p)} disabled={isPending || deleteCheckLoading}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 disabled:opacity-40" suppressHydrationWarning>
                        {deleteCheckLoading && deleteTarget?.id === p.id
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Trash2 className="w-4 h-4" />}
                      </button>
                    </>
                  )}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${p.estado === "ACTIVO" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {p.estado === "ACTIVO" ? "Activa" : "Inactiva"}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-gray-600">
                {p.telefono && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{p.telefono}</span>}
                {p.correo && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{p.correo}</span>}
              </div>
              <div className="flex gap-4 pt-1 border-t border-[#DDDDDD]">
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <Users className="w-3.5 h-3.5 text-blue-500" />
                  <span><strong>{p._count.brigadistas}</strong> brigadistas</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
                  <span><strong>{p._count.incidencias}</strong> incidencias</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <ClipboardList className="w-3.5 h-3.5 text-purple-500" />
                  <span><strong>{p._count.planesTrabajo}</strong> planes</span>
                </div>
              </div>
              {canEdit && (
                <button onClick={() => handleToggleEstado(p)} disabled={isPending}
                  className="w-full py-2 border border-[#DDDDDD] rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  suppressHydrationWarning>
                  {p.estado === "ACTIVO" ? "Marcar como inactiva" : "Marcar como activa"}
                </button>
              )}
            </div>
          ))
        )}
      </div>

      <PaginationControls
        total={filtered.length}
        start={visibleFrom}
        end={visibleTo}
        page={safePage}
        totalPages={totalPages}
        onPrevious={() => setCurrentPage((p) => Math.max(1, p - 1))}
        onNext={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
        pageSize={pageSize}
        onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }}
      />

      {showModal && (
        <ParroquiaModal
          editing={editing}
          onClose={() => { setShowModal(false); setEditing(undefined); }}
        />
      )}

      {showImportModal && (
        <ImportParroquiaModal onClose={() => setShowImportModal(false)} />
      )}

      {/* Modal eliminación con brigadistas */}
      {deleteTarget && deleteCheck && (
        <DeleteParroquiaModal
          parroquiaNombre={deleteTarget.nombre}
          check={deleteCheck}
          otrasParroquias={otrasParroquias}
          onConfirm={handleDeleteConfirm}
          onCancel={() => { setDeleteTarget(null); setDeleteCheck(null); }}
        />
      )}

      {ConfirmModalJSX}
    </div>
  );
}
