"use client";

import { forwardRef, useState, useTransition, useRef } from "react";
import {
  Plus,
  Search,
  Users,
  ShieldCheck,
  UserCheck,
  UserX,
  Edit3,
  ToggleLeft,
  ToggleRight,
  X,
  Loader2,
  Phone,
  Mail,
  MapPin,
  Filter,
  FileSpreadsheet,
  Upload,
  Download,
  Trash2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import PhoneInput, { type Value as PhoneValue } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { toast } from "sonner";
import {
  createBrigadista,
  updateBrigadista,
  toggleEstadoBrigadista,
  toggleDisponibilidadBrigadista,
  deleteBrigadista,
  importBrigadistas,
  type BrigadistaFormData,
  type ImportBrigadistaRow,
} from "@/app/actions/brigadistas";
import { PaginationControls } from "@/app/ui/shared/pagination-controls";
import { useConfirm, ConfirmModal } from "@/app/ui/shared/confirm-modal";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type BrigadistaItem = {
  id: string;
  nombres: string;
  apellidos: string | null;
  dni: string | null;
  celular: string | null;
  correo: string | null;
  disponibilidad: string | null;
  estado: string;
  parroquia: { id: string; nombre: string } | null;
  fechaRegistro: string;
};

export type ParroquiaItem = {
  id: string;
  nombre: string;
};

// ─── Config visual ────────────────────────────────────────────────────────────

const DISPONIBILIDAD_CFG: Record<string, { label: string; badge: string }> = {
  DISPONIBLE: { label: "Disponible", badge: "bg-green-100 text-green-700" },
  "EN CAMPO": { label: "En campo", badge: "bg-blue-100 text-blue-700" },
  "NO DISPONIBLE": { label: "No disponible", badge: "bg-gray-100 text-gray-600" },
};

const inputCls =
  "w-full px-3 py-2 text-sm bg-[#F5F5F5] border border-[#DDDDDD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009850]/20 focus:border-[#009850] transition-colors";
const labelCls = "block text-xs font-medium text-gray-700 mb-1";

// Restringe el input a números peruanos: primer dígito = 9, máximo 9 dígitos.
const PeruvianPhoneInput = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function PeruvianPhoneInput(props, ref) {
  return (
    <input
      {...props}
      ref={ref}
      onKeyDown={(e) => {
        const CONTROL = ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab", "Home", "End"];
        if (CONTROL.includes(e.key)) {
          props.onKeyDown?.(e);
          return;
        }
        if (!/^\d$/.test(e.key)) {
          e.preventDefault();
          return;
        }

        const input = e.currentTarget;
        const hasSelection = (input.selectionStart ?? 0) !== (input.selectionEnd ?? 0);

        if (hasSelection) {
          const beforeSel = (input.value ?? "")
            .slice(0, input.selectionStart ?? 0)
            .replace(/\D/g, "")
            .replace(/^51/, "");
          if (beforeSel.length === 0 && e.key !== "9") {
            e.preventDefault();
            return;
          }
          props.onKeyDown?.(e);
          return;
        }

        const digits = (input.value ?? "").replace(/\D/g, "").replace(/^51/, "");
        if (digits.length === 0 && e.key !== "9") {
          e.preventDefault();
          return;
        }
        if (digits.length >= 9) {
          e.preventDefault();
          return;
        }
        props.onKeyDown?.(e);
      }}
    />
  );
});

// ─── Modal formulario ─────────────────────────────────────────────────────────

function BrigadistaModal({
  parroquias,
  editing,
  onClose,
}: {
  parroquias: ParroquiaItem[];
  editing?: BrigadistaItem;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<BrigadistaFormData>({
    nombres: editing?.nombres ?? "",
    apellidos: editing?.apellidos ?? "",
    dni: editing?.dni ?? "",
    celular: editing?.celular
      ? editing.celular.startsWith("+")
        ? editing.celular
        : `+51${editing.celular}`
      : "",
    correo: editing?.correo ?? "",
    idParroquia: editing?.parroquia?.id ?? "",
    disponibilidad: editing?.disponibilidad ?? "DISPONIBLE",
  });

  function set(k: keyof BrigadistaFormData, v: string) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const DISPONIBILIDADES_VALIDAS = ["DISPONIBLE", "EN CAMPO", "NO DISPONIBLE"];

  function soloDigitos(value?: string | null): string {
    return (value ?? "").replace(/\D/g, "");
  }

  function celularPeruano(value?: string | null): string {
    const digits = soloDigitos(value);
    return digits.startsWith("51") ? digits.slice(2) : digits;
  }

  function validarFormularioBrigadista(): string | null {
    const nombres = form.nombres.trim();
    const apellidos = form.apellidos?.trim() ?? "";
    const dni = soloDigitos(form.dni);
    const celular = celularPeruano(form.celular);
    const correo = form.correo?.trim() ?? "";

    if (!nombres) return "Ingresa los nombres del brigadista.";
    if (nombres.length < 2) return "Los nombres deben tener al menos 2 caracteres.";
    if (!apellidos) return "Ingresa los apellidos del brigadista.";
    if (apellidos.length < 2) return "Los apellidos deben tener al menos 2 caracteres.";
    if (!dni) return "Ingresa el DNI del brigadista.";
    if (dni.length !== 8) return "El DNI debe tener exactamente 8 dígitos.";
    if (!celular) return "Ingresa el celular del brigadista.";
    if (!/^9\d{8}$/.test(celular)) return "El celular debe tener 9 dígitos y empezar con 9.";
    if (!editing && !correo) return "El correo es obligatorio para crear la cuenta de acceso.";
    if (correo && !EMAIL_RE.test(correo)) return "El correo no tiene un formato válido.";
    if (!form.idParroquia?.trim()) return "Selecciona la parroquia del brigadista.";
    if (!DISPONIBILIDADES_VALIDAS.includes(form.disponibilidad))
      return "Selecciona una disponibilidad válida.";
    return null;
  }

  function handleSubmit() {
    const errorValidacion = validarFormularioBrigadista();
    if (errorValidacion) { toast.error(errorValidacion); return; }
    startTransition(async () => {
      const result = editing
        ? await updateBrigadista(editing.id, form)
        : await createBrigadista(form);
      if (result?.message) { toast.error(result.message); return; }
      toast.success(editing ? "Brigadista actualizado" : "Brigadista registrado");
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full shadow-xl max-h-[90vh] overflow-auto">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">
            {editing ? `Editar — ${editing.nombres}` : "Registrar brigadista"}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded text-gray-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Nombres <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.nombres}
                onChange={(e) =>
                  set("nombres", e.target.value.replace(/[^a-záéíóúüñA-ZÁÉÍÓÚÜÑ ]/g, ""))
                }
                placeholder="Ej: Ana María"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Apellidos <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.apellidos}
                onChange={(e) =>
                  set("apellidos", e.target.value.replace(/[^a-záéíóúüñA-ZÁÉÍÓÚÜÑ ]/g, ""))
                }
                placeholder="Ej: Torres Quispe"
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>DNI <span className="text-red-500">*</span></label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={8}
              value={form.dni}
              onChange={(e) => set("dni", e.target.value.replace(/\D/g, ""))}
              placeholder="12345678"
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Celular <span className="text-red-500">*</span></label>
              <PhoneInput
                defaultCountry="PE"
                countries={["PE"]}
                international
                countryCallingCodeEditable={false}
                countrySelectProps={{ disabled: true, style: { cursor: "default" } }}
                inputComponent={PeruvianPhoneInput}
                value={form.celular as PhoneValue}
                onChange={(v) => set("celular", v ?? "")}
                placeholder="+51 987 654 321"
                className="phone-input-caritas"
              />
            </div>
            <div>
              <label className={labelCls}>
                Correo {!editing && <span className="text-red-500">*</span>}
              </label>
              <input
                type="email"
                value={form.correo}
                onChange={(e) => set("correo", e.target.value)}
                placeholder="correo@ejemplo.com"
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Parroquia <span className="text-red-500">*</span></label>
            <select
              value={form.idParroquia}
              onChange={(e) => set("idParroquia", e.target.value)}
              className={inputCls}
            >
              <option value="">Seleccionar parroquia...</option>
              {parroquias.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Disponibilidad</label>
            <select
              value={form.disponibilidad}
              onChange={(e) => set("disponibilidad", e.target.value)}
              className={inputCls}
            >
              <option value="DISPONIBLE">Disponible</option>
              <option value="EN CAMPO">En campo</option>
              <option value="NO DISPONIBLE">No disponible</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-[#DDDDDD] rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={isPending}
              className="flex-1 px-4 py-2.5 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
              style={{ background: "#009850" }}
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {editing ? "Guardando..." : "Registrando..."}
                </span>
              ) : editing ? "Guardar cambios" : "Registrar brigadista"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Modal importación Excel ──────────────────────────────────────────────────

type ParsedRow = ImportBrigadistaRow & { _rowNum: number; _error?: string };

function ImportBrigadistaModal({
  parroquias,
  onClose,
}: {
  parroquias: ParroquiaItem[];
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<{ created: number; errors: { row: number; reason: string }[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const raw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

    const parsed: ParsedRow[] = raw.map((r, idx) => ({
      _rowNum: idx + 2,
      nombres: String(r["nombres"] ?? r["Nombres"] ?? ""),
      apellidos: String(r["apellidos"] ?? r["Apellidos"] ?? ""),
      dni: String(r["dni"] ?? r["DNI"] ?? ""),
      celular: String(r["celular"] ?? r["Celular"] ?? ""),
      correo: String(r["correo"] ?? r["Correo"] ?? "") || undefined,
      parroquia: String(r["parroquia"] ?? r["Parroquia"] ?? ""),
      disponibilidad: String(r["disponibilidad"] ?? r["Disponibilidad"] ?? "DISPONIBLE") || "DISPONIBLE",
    }));

    setRows(parsed);
    setFileName(file.name);
    setResult(null);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  async function downloadTemplate() {
    const XLSX = await import("xlsx");
    const headers = ["nombres", "apellidos", "dni", "celular", "correo", "parroquia", "disponibilidad"];
    const example = ["Ana María", "Torres Quispe", "12345678", "987654321", "correo@ejemplo.com", parroquias[0]?.nombre ?? "Nombre de parroquia", "DISPONIBLE"];
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Brigadistas");
    XLSX.writeFile(wb, "plantilla_brigadistas.xlsx");
  }

  function handleImport() {
    if (rows.length === 0) return;
    startTransition(async () => {
      const res = await importBrigadistas(rows);
      setResult(res);
      if (res.created > 0) {
        toast.success(`${res.created} brigadista(s) importado(s) correctamente`);
      }
      if (res.errors.length === 0) {
        onClose();
      }
    });
  }

  const validRows = rows.length - (result?.errors.length ?? 0);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full shadow-xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between shrink-0">
          <h3 className="font-bold text-gray-900">Importar brigadistas desde Excel</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded text-gray-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
            <p className="font-medium mb-1">Columnas requeridas en el archivo Excel:</p>
            <p className="font-mono">nombres · apellidos · dni · celular · parroquia</p>
            <p className="mt-1 text-blue-600">Opcionales: correo · disponibilidad (DISPONIBLE / EN CAMPO / NO DISPONIBLE)</p>
            <p className="mt-1 text-amber-700 font-medium">Nota: Los brigadistas importados no tendrán cuenta de acceso al sistema. Se puede crear individualmente después.</p>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-2">
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 bg-[#F5F5F5] border border-[#DDDDDD] rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Download className="w-4 h-4" />
              Descargar plantilla
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-white rounded-lg hover:opacity-90 transition-colors"
              style={{ background: "#009850" }}
            >
              <Upload className="w-4 h-4" />
              {fileName ? "Cambiar archivo" : "Seleccionar archivo Excel"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {fileName && (
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              {fileName} — {rows.length} fila(s) encontrada(s)
            </p>
          )}

          {/* Resultado post-importación */}
          {result && (
            <div className="space-y-2">
              {result.created > 0 && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{result.created} brigadista(s) importado(s) correctamente.</span>
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

          {/* Vista previa */}
          {rows.length > 0 && !result && (
            <div className="border border-[#DDDDDD] rounded-lg overflow-hidden">
              <div className="bg-[#F5F5F5] px-3 py-2 text-xs font-semibold text-gray-600">
                Vista previa ({rows.length} filas)
              </div>
              <div className="overflow-x-auto max-h-48 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b border-[#DDDDDD] sticky top-0">
                    <tr>
                      {["Fila", "Nombres", "Apellidos", "DNI", "Celular", "Parroquia", "Disp."].map((h) => (
                        <th key={h} className="px-2 py-1.5 text-left text-gray-500 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DDDDDD]">
                    {rows.slice(0, 20).map((r) => (
                      <tr key={r._rowNum} className="hover:bg-gray-50">
                        <td className="px-2 py-1.5 text-gray-400">{r._rowNum}</td>
                        <td className="px-2 py-1.5">{r.nombres}</td>
                        <td className="px-2 py-1.5">{r.apellidos}</td>
                        <td className="px-2 py-1.5">{r.dni}</td>
                        <td className="px-2 py-1.5">{r.celular}</td>
                        <td className="px-2 py-1.5">{r.parroquia}</td>
                        <td className="px-2 py-1.5">{r.disponibilidad}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 20 && (
                  <p className="text-xs text-gray-400 text-center py-2">
                    … y {rows.length - 20} filas más
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 flex gap-3 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-[#DDDDDD] rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {result ? "Cerrar" : "Cancelar"}
          </button>
          {!result && (
            <button
              onClick={handleImport}
              disabled={isPending || rows.length === 0}
              className="flex-1 px-4 py-2.5 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
              style={{ background: "#009850" }}
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importando...
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

interface Props {
  brigadistas: BrigadistaItem[];
  parroquias: ParroquiaItem[];
  canEdit?: boolean;
}

export function BrigadistasList({ brigadistas, parroquias, canEdit = true }: Props) {
  const [isPending, startTransition] = useTransition();
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editing, setEditing] = useState<BrigadistaItem | undefined>();
  const [search, setSearch] = useState("");
  const [filterParroquia, setFilterParroquia] = useState("all");
  const [filterEstado, setFilterEstado] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(7);

  const { showConfirm, ConfirmModalJSX } = useConfirm();

  const filtered = brigadistas.filter((b) => {
    if (filterEstado !== "all" && b.estado !== filterEstado) return false;
    if (filterParroquia !== "all" && b.parroquia?.id !== filterParroquia) return false;
    if (search) {
      const q = search.toLowerCase();
      const nombre = `${b.nombres} ${b.apellidos ?? ""}`.toLowerCase();
      if (!nombre.includes(q) && !(b.dni ?? "").includes(q)) return false;
    }
    return true;
  });

  // Stats dinámicos según filtros activos
  const stats = {
    total: filtered.length,
    activos: filtered.filter((b) => b.estado === "ACTIVO").length,
    disponibles: filtered.filter(
      (b) => b.disponibilidad === "DISPONIBLE" && b.estado === "ACTIVO"
    ).length,
    enCampo: filtered.filter((b) => b.disponibilidad === "EN CAMPO").length,
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginated = filtered.slice(startIndex, startIndex + pageSize);
  const visibleFrom = filtered.length === 0 ? 0 : startIndex + 1;
  const visibleTo = Math.min(startIndex + pageSize, filtered.length);

  function openCreate() {
    setEditing(undefined);
    setShowModal(true);
  }
  function openEdit(b: BrigadistaItem) {
    setEditing(b);
    setShowModal(true);
  }

  async function handleToggleEstado(b: BrigadistaItem) {
    const nuevoEstado = b.estado === "ACTIVO" ? "inactivo" : "activo";
    const confirmed = await showConfirm({
      title: `${b.estado === "ACTIVO" ? "Desactivar" : "Activar"} brigadista`,
      message: `¿Deseas marcar a ${b.nombres} ${b.apellidos ?? ""} como ${nuevoEstado}?`,
      confirmLabel: b.estado === "ACTIVO" ? "Desactivar" : "Activar",
      variant: "warning",
    });
    if (!confirmed) return;
    startTransition(async () => {
      await toggleEstadoBrigadista(b.id, b.estado);
      toast.success(`Brigadista ${b.estado === "ACTIVO" ? "desactivado" : "activado"}`);
    });
  }

  async function handleToggleDisponibilidad(b: BrigadistaItem) {
    if (b.estado !== "ACTIVO") {
      toast.error("Activa al brigadista primero");
      return;
    }
    const nuevaDisp =
      b.disponibilidad === "DISPONIBLE" ? "No disponible" : "Disponible";
    const confirmed = await showConfirm({
      title: "Cambiar disponibilidad",
      message: `¿Cambiar disponibilidad de ${b.nombres} a "${nuevaDisp}"?`,
      confirmLabel: "Cambiar",
      variant: "warning",
    });
    if (!confirmed) return;
    startTransition(async () => {
      await toggleDisponibilidadBrigadista(b.id, b.disponibilidad ?? "NO DISPONIBLE");
      toast.success("Disponibilidad actualizada");
    });
  }

  async function handleDelete(b: BrigadistaItem) {
    const confirmed = await showConfirm({
      title: "Eliminar brigadista",
      message: `¿Eliminar permanentemente a ${b.nombres} ${b.apellidos ?? ""}? Esta acción no se puede deshacer.`,
      confirmLabel: "Eliminar",
      variant: "danger",
    });
    if (!confirmed) return;
    startTransition(async () => {
      const result = await deleteBrigadista(b.id);
      if (result?.message) {
        toast.error(result.message);
      } else {
        toast.success("Brigadista eliminado");
      }
    });
  }

  function buildExportData() {
    const headers = [
      "N°", "Nombres", "Apellidos", "DNI", "Celular", "Correo",
      "Parroquia", "Disponibilidad", "Estado", "Fecha de Registro",
    ];
    const rows = filtered.map((b, idx) => [
      String(idx + 1),
      b.nombres,
      b.apellidos ?? "",
      b.dni ?? "",
      b.celular ?? "",
      b.correo ?? "",
      b.parroquia?.nombre ?? "",
      b.disponibilidad ?? "",
      b.estado,
      new Date(b.fechaRegistro).toLocaleDateString("es-PE", { timeZone: "America/Lima" }),
    ]);
    return { headers, rows };
  }

  async function handleExportExcel() {
    const XLSX = await import("xlsx");
    const { headers, rows } = buildExportData();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Brigadistas");
    XLSX.writeFile(wb, `brigadistas_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  const filtersActive =
    search !== "" || filterParroquia !== "all" || filterEstado !== "all";

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Brigadistas Parroquiales</h1>
          <p className="text-sm text-gray-500 mt-0.5">Padrón de brigadistas — Cáritas Lima</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {canEdit && (
            <>
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
              >
                <Plus className="w-4 h-4" />
                Registrar brigadista
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats dinámicos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: filtersActive ? "Filtrados" : "Total", value: stats.total, icon: Users, color: "bg-gray-600" },
          { label: "Activos", value: stats.activos, icon: UserCheck, color: "bg-[#009850]" },
          { label: "Disponibles", value: stats.disponibles, icon: ShieldCheck, color: "bg-blue-600" },
          { label: "En campo", value: stats.enCampo, icon: MapPin, color: "bg-[#FF823C]" },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white border border-[#DDDDDD] rounded-xl p-4 flex items-center gap-3"
          >
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
      <div className="bg-white border border-[#DDDDDD] rounded-xl p-3 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1 md:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o DNI..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-3 py-2 text-sm bg-[#F5F5F5] border border-[#DDDDDD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009850]/20 focus:border-[#009850]"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400 shrink-0" />
          <select
            value={filterParroquia}
            onChange={(e) => { setFilterParroquia(e.target.value); setCurrentPage(1); }}
            className="flex-1 px-3 py-2 text-sm bg-[#F5F5F5] border border-[#DDDDDD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009850]/20 focus:border-[#009850]"
          >
            <option value="all">Todas las parroquias</option>
            {parroquias.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
          <select
            value={filterEstado}
            onChange={(e) => { setFilterEstado(e.target.value); setCurrentPage(1); }}
            className="flex-1 px-3 py-2 text-sm bg-[#F5F5F5] border border-[#DDDDDD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009850]/20 focus:border-[#009850]"
          >
            <option value="all">Todos los estados</option>
            <option value="ACTIVO">Activos</option>
            <option value="INACTIVO">Inactivos</option>
          </select>
          <button
            onClick={handleExportExcel}
            className="hidden md:flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 bg-[#F5F5F5] border border-[#DDDDDD] rounded-lg hover:bg-gray-200 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>
        </div>
      </div>

      {/* Tabla desktop */}
      <div className="hidden md:block bg-white border border-[#DDDDDD] rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">Sin brigadistas que mostrar</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F5F5F5] border-b border-[#DDDDDD]">
                <tr>
                  {[
                    "Brigadista", "Contacto", "Parroquia", "Disponibilidad", "Estado",
                    ...(canEdit ? ["Acciones"] : []),
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDDDDD]">
                {paginated.map((b) => {
                  const dispCfg =
                    DISPONIBILIDAD_CFG[b.disponibilidad ?? "NO DISPONIBLE"] ??
                    DISPONIBILIDAD_CFG["NO DISPONIBLE"];
                  return (
                    <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#009850]/10 flex items-center justify-center shrink-0">
                            <span className="text-[#009850] text-xs font-bold">
                              {b.nombres[0]}{b.apellidos?.[0] ?? ""}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {b.nombres} {b.apellidos ?? ""}
                            </p>
                            {b.dni && <p className="text-xs text-gray-400">DNI: {b.dni}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          {b.celular && (
                            <p className="text-xs text-gray-600 flex items-center gap-1">
                              <Phone className="w-3 h-3" />{b.celular}
                            </p>
                          )}
                          {b.correo && (
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <Mail className="w-3 h-3" />{b.correo}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-700">{b.parroquia?.nombre ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        {canEdit ? (
                          <button
                            onClick={() => handleToggleDisponibilidad(b)}
                            disabled={isPending || b.estado !== "ACTIVO"}
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer hover:opacity-80 transition-opacity disabled:cursor-not-allowed ${dispCfg.badge}`}
                            title="Clic para cambiar disponibilidad"
                          >
                            {dispCfg.label}
                          </button>
                        ) : (
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${dispCfg.badge}`}>
                            {dispCfg.label}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {canEdit ? (
                          <button
                            onClick={() => handleToggleEstado(b)}
                            disabled={isPending}
                            className="flex items-center gap-1.5 text-xs font-medium hover:opacity-80 transition-opacity disabled:opacity-50"
                            title="Clic para cambiar estado"
                          >
                            {b.estado === "ACTIVO" ? (
                              <>
                                <ToggleRight className="w-5 h-5 text-[#009850]" />
                                <span className="text-[#009850]">Activo</span>
                              </>
                            ) : (
                              <>
                                <ToggleLeft className="w-5 h-5 text-gray-400" />
                                <span className="text-gray-500">Inactivo</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <span className={`text-xs font-medium ${b.estado === "ACTIVO" ? "text-[#009850]" : "text-gray-500"}`}>
                            {b.estado === "ACTIVO" ? "Activo" : "Inactivo"}
                          </span>
                        )}
                      </td>
                      {canEdit && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEdit(b)}
                              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
                              title="Editar"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(b)}
                              disabled={isPending}
                              className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 transition-colors disabled:opacity-40"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cards mobile */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">Sin brigadistas que mostrar</div>
        ) : (
          paginated.map((b) => {
            const dispCfg =
              DISPONIBILIDAD_CFG[b.disponibilidad ?? "NO DISPONIBLE"] ??
              DISPONIBILIDAD_CFG["NO DISPONIBLE"];
            return (
              <div key={b.id} className="bg-white border border-[#DDDDDD] rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#009850]/10 flex items-center justify-center shrink-0">
                      <span className="text-[#009850] text-sm font-bold">
                        {b.nombres[0]}{b.apellidos?.[0] ?? ""}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{b.nombres} {b.apellidos ?? ""}</p>
                      {b.dni && <p className="text-xs text-gray-400">DNI: {b.dni}</p>}
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(b)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(b)}
                        disabled={isPending}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 disabled:opacity-40"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${dispCfg.badge}`}>
                    {dispCfg.label}
                  </span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${b.estado === "ACTIVO" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {b.estado === "ACTIVO" ? "Activo" : "Inactivo"}
                  </span>
                  {b.parroquia && (
                    <span className="px-2.5 py-1 rounded-full text-xs bg-blue-50 text-blue-700">
                      {b.parroquia.nombre}
                    </span>
                  )}
                </div>
                {canEdit && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleToggleEstado(b)}
                      disabled={isPending}
                      className="flex-1 py-2 border border-[#DDDDDD] rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {b.estado === "ACTIVO" ? "Desactivar" : "Activar"}
                    </button>
                    <button
                      onClick={() => handleToggleDisponibilidad(b)}
                      disabled={isPending || b.estado !== "ACTIVO"}
                      className="flex-1 py-2 border border-[#DDDDDD] rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {b.disponibilidad === "DISPONIBLE" ? "Marcar ocupado" : "Marcar disponible"}
                    </button>
                  </div>
                )}
              </div>
            );
          })
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
        pageSizeOptions={[7, 10, 25, 50]}
      />

      {showModal && (
        <BrigadistaModal
          parroquias={parroquias}
          editing={editing}
          onClose={() => setShowModal(false)}
        />
      )}

      {showImportModal && (
        <ImportBrigadistaModal
          parroquias={parroquias}
          onClose={() => setShowImportModal(false)}
        />
      )}

      {ConfirmModalJSX}
    </div>
  );
}
