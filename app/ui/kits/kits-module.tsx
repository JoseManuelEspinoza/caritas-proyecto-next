"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Package,
  Plus,
  ArrowDownCircle,
  ArrowUpCircle,
  RefreshCw,
  X,
  ListChecks,
  Upload,
  Trash2,
  Archive,
  ChevronDown,
  ChevronLeft,
  PanelLeftClose,
  PanelLeftOpen,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  crearKit,
  archivarKit,
  eliminarKit,
  registrarMovimientoKit,
  listarMovimientosKit,
  listarArticulosKit,
  type ArticuloKit,
} from "@/app/actions/kits";
import { registrarEvidenciaKit, listarEvidenciasKit } from "@/app/actions/evidencias";
import { subirArchivoS3 } from "@/app/ui/shared/file-upload";
import { PaginationControls } from "@/app/ui/shared/pagination-controls";

type Kit = {
  id: string;
  tipoKit: string;
  descripcion: string | null;
  stockActual: number;
  estadoKit: string;
  codigoAlmacen: string | null;
  ubicacionAlmacen: string | null;
  fechaRegistro: string | null;
  ultimoMovimiento: string | null;
};
type SortKey = "nombre" | "stock-desc" | "stock-asc" | "actividad" | "creacion";
type Parroquia = { id: string; nombre: string };
type Evidencia = { idEvidenciaGRD: string; nombreArchivo: string; urlArchivo: string; fechaCarga: string };
type Movimiento = {
  id: string;
  tipo: string;
  cantidad: number;
  fecha: string;
  responsable: string | null;
  motivoMovimiento: string | null;
  observaciones: string | null;
};

const TIPOS = ["INGRESO", "ENTREGA"] as const;

// ─── Sección colapsable del detalle ──────────────────────────────────────────

function KitSeccion({
  titulo,
  icon,
  children,
  defaultOpen = true,
  badge,
}: {
  titulo: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-gray-100">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-semibold text-gray-700">{titulo}</span>
          {badge !== undefined && (
            <span className="text-[10px] bg-gray-200 text-gray-600 rounded-full px-1.5 py-0.5 font-medium">
              {badge}
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export function KitsModule({ kits, parroquias }: { kits: Kit[]; parroquias: Parroquia[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string | null>(kits[0]?.id ?? null);
  const [showDetail, setShowDetail] = useState(false);
  const [panelAbierto, setPanelAbierto] = useState(true);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [evidencias, setEvidencias] = useState<Evidencia[]>([]);
  const [articulos, setArticulos] = useState<ArticuloKit[]>([]);
  const [evidenciaFile, setEvidenciaFile] = useState<File | null>(null);
  const [showKitForm, setShowKitForm] = useState(false);
  const [showMovForm, setShowMovForm] = useState(false);
  const [kitPage, setKitPage] = useState(1);
  const [movementPage, setMovementPage] = useState(1);
  const [kitPageSize, setKitPageSize] = useState(10);
  const [movPageSize, setMovPageSize] = useState(5);
  const [sortBy, setSortBy] = useState<SortKey>("nombre");

  const [kitForm, setKitForm] = useState({ tipoKit: "", descripcion: "", stockInicial: 0, codigoAlmacen: "", ubicacionAlmacen: "" });
  const [kitFormArt, setKitFormArt] = useState<ArticuloKit[]>([{ codigo: "", descripcion: "", cantidad: 1 }]);
  const [movForm, setMovForm] = useState({
    tipo: "ENTREGA" as (typeof TIPOS)[number],
    cantidad: 1,
    idParroquiaDestino: parroquias[0]?.id ?? "",
    destinatario: "",
    incidenciaId: "",
    motivoMovimiento: "",
    observaciones: "",
  });

  const current = kits.find((k) => k.id === selected) ?? null;

  const totalKitPages = Math.max(1, Math.ceil(kits.length / kitPageSize));
  const safeKitPage = Math.min(kitPage, totalKitPages);
  const kitStart = (safeKitPage - 1) * kitPageSize;
  const sortedKits = useMemo(() => {
    const arr = [...kits];
    switch (sortBy) {
      case "stock-desc": return arr.sort((a, b) => b.stockActual - a.stockActual);
      case "stock-asc": return arr.sort((a, b) => a.stockActual - b.stockActual);
      case "actividad": return arr.sort((a, b) => (b.ultimoMovimiento ?? "").localeCompare(a.ultimoMovimiento ?? ""));
      case "creacion": return arr.sort((a, b) => (b.fechaRegistro ?? "").localeCompare(a.fechaRegistro ?? ""));
      default: return arr.sort((a, b) => a.tipoKit.localeCompare(b.tipoKit));
    }
  }, [kits, sortBy]);
  const visibleKits = sortedKits.slice(kitStart, kitStart + kitPageSize);
  const kitFrom = kits.length === 0 ? 0 : kitStart + 1;
  const kitTo = Math.min(kitStart + kitPageSize, kits.length);

  const totalMovementPages = Math.max(1, Math.ceil(movimientos.length / movPageSize));
  const safeMovementPage = Math.min(movementPage, totalMovementPages);
  const movementStart = (safeMovementPage - 1) * movPageSize;
  const visibleMovimientos = movimientos.slice(movementStart, movementStart + movPageSize);
  const movementFrom = movimientos.length === 0 ? 0 : movementStart + 1;
  const movementTo = Math.min(movementStart + movPageSize, movimientos.length);

  useEffect(() => { if (kitPage > totalKitPages) setKitPage(totalKitPages); }, [kitPage, totalKitPages]);
  useEffect(() => { if (movementPage > totalMovementPages) setMovementPage(totalMovementPages); }, [movementPage, totalMovementPages]);

  const selectKit = (id: string) => {
    setSelected(id);
    setShowDetail(true);
    setShowMovForm(false);
    setMovementPage(1);
  };

  useEffect(() => {
    let active = true;
    if (!selected) { setMovimientos([]); setEvidencias([]); setArticulos([]); return; }
    listarMovimientosKit(selected).then((i) => { if (active) setMovimientos(i); }).catch(() => { if (active) setMovimientos([]); });
    listarEvidenciasKit(selected).then((i) => { if (active) setEvidencias(i); }).catch(() => { if (active) setEvidencias([]); });
    listarArticulosKit(selected).then((i) => { if (active) setArticulos(i); }).catch(() => { if (active) setArticulos([]); });
    return () => { active = false; };
  }, [selected]);

  function validarKitForm(): string | null {
    const tipoKit = kitForm.tipoKit.trim();
    const stock = Number(kitForm.stockInicial);
    if (!tipoKit) return "Indica el tipo de kit.";
    if (tipoKit.length < 3) return "El tipo de kit debe tener al menos 3 caracteres.";
    if (!Number.isFinite(stock) || !Number.isInteger(stock)) return "El stock inicial debe ser un número entero válido.";
    if (stock < 0) return "El stock inicial no puede ser negativo.";
    if (kitFormArt.filter((a) => a.descripcion.trim()).length === 0) return "Define al menos un artículo en el contenido del kit.";
    return null;
  }

  function validarMovimientoForm(): string | null {
    if (!current) return "Selecciona un kit.";
    const cantidad = Number(movForm.cantidad);
    if (!TIPOS.includes(movForm.tipo)) return "Selecciona un tipo de movimiento válido.";
    if (!Number.isFinite(cantidad) || !Number.isInteger(cantidad)) return "La cantidad debe ser un número entero válido.";
    if (cantidad <= 0) return "La cantidad debe ser mayor que cero.";
    if (movForm.tipo === "ENTREGA" && !movForm.idParroquiaDestino.trim()) return "Selecciona la parroquia destino.";
    if (movForm.tipo === "ENTREGA" && cantidad > current.stockActual) return `Stock insuficiente: hay ${current.stockActual} y se intentan entregar ${cantidad}.`;
    return null;
  }

  function handleArchivar() {
    if (!current) return;
    startTransition(async () => {
      const res = await archivarKit(current.id);
      if (res?.message) { toast.error(res.message); return; }
      toast.success("Kit archivado.");
      router.refresh();
    });
  }

  function handleEliminar() {
    if (!current) return;
    if (!window.confirm(`¿Eliminar el kit "${current.tipoKit}"? Esta acción no se puede deshacer.`)) return;
    startTransition(async () => {
      const res = await eliminarKit(current.id);
      if (res?.message) { toast.error(res.message); return; }
      toast.success("Kit eliminado.");
      setSelected(null);
      router.refresh();
    });
  }

  const submitKit = () => {
    const err = validarKitForm();
    if (err) { toast.error(err); return; }
    startTransition(async () => {
      const res = await crearKit({
        tipoKit: kitForm.tipoKit.trim(),
        descripcion: kitForm.descripcion.trim(),
        stockInicial: Number(kitForm.stockInicial),
        codigoAlmacen: kitForm.codigoAlmacen.trim() || undefined,
        ubicacionAlmacen: kitForm.ubicacionAlmacen.trim() || undefined,
        articulos: kitFormArt,
      });
      if (res?.message) toast.error(res.message);
      else {
        toast.success("Kit creado con su contenido.");
        setShowKitForm(false);
        setKitForm({ tipoKit: "", descripcion: "", stockInicial: 0, codigoAlmacen: "", ubicacionAlmacen: "" });
        setKitFormArt([{ codigo: "", descripcion: "", cantidad: 1 }]);
        router.refresh();
      }
    });
  };

  const submitMov = () => {
    const err = validarMovimientoForm();
    if (err) { toast.error(err); return; }
    if (!current) return;
    startTransition(async () => {
      const extras: string[] = [];
      if (movForm.tipo === "ENTREGA" && movForm.destinatario.trim()) extras.push(`Destinatario: ${movForm.destinatario.trim()}`);
      if (movForm.tipo === "ENTREGA" && movForm.incidenciaId.trim()) extras.push(`Incidencia: ${movForm.incidenciaId.trim()}`);
      if (movForm.observaciones.trim()) extras.push(movForm.observaciones.trim());

      const res = await registrarMovimientoKit(current.id, {
        tipo: movForm.tipo,
        cantidad: Number(movForm.cantidad),
        idParroquiaDestino: movForm.tipo === "ENTREGA" ? movForm.idParroquiaDestino || undefined : undefined,
        motivoMovimiento: movForm.motivoMovimiento.trim() || undefined,
        observaciones: extras.join(" | ") || undefined,
      });

      if (res?.message && /insuficiente|no se pudo|no tiene|válid|obligatori|selecciona/i.test(res.message)) {
        toast.error(res.message); return;
      }

      if (evidenciaFile) {
        try {
          const archivo = await subirArchivoS3(evidenciaFile, { tipo: "evidencia-kit", entidadId: current.id });
          await registrarEvidenciaKit(current.id, archivo);
          setEvidencias(await listarEvidenciasKit(current.id));
        } catch (e) {
          toast.error(`Evidencia: ${e instanceof Error ? e.message : "Error al subir"}`);
        }
        setEvidenciaFile(null);
      }

      toast.success(res?.message ?? "Movimiento registrado.");
      setShowMovForm(false);
      setMovForm({ ...movForm, cantidad: 1, destinatario: "", incidenciaId: "", motivoMovimiento: "", observaciones: "" });
      setMovimientos(await listarMovimientosKit(current.id));
      router.refresh();
    });
  };

  // Clases responsivas lista/detalle
  const listClasses = [
    "flex-shrink-0 flex-col",
    "w-full md:w-[280px] xl:w-[320px]",
    showDetail ? "hidden md:flex" : "flex",
    !panelAbierto ? "md:hidden" : "md:flex",
  ].join(" ");

  const detailClasses = [
    "flex-1 min-w-0 flex-col",
    showDetail ? "flex" : "hidden md:flex",
  ].join(" ");

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 md:mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[var(--caritas-green)]/10 rounded-lg flex items-center justify-center">
            <Package className="w-5 h-5 text-[var(--caritas-green)]" />
          </div>
          <div>
            <h1 className="text-[var(--caritas-text)] font-semibold text-lg">Kits y Mochilas de Emergencia</h1>
            <p className="text-sm text-gray-500">Logística · control de stock</p>
          </div>
        </div>
        <button
          onClick={() => setShowKitForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--caritas-green)] text-white rounded-lg text-sm font-medium hover:bg-[var(--caritas-green)]/90 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Nuevo kit
        </button>
      </div>

      {/* Modal nuevo kit */}
      {showKitForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowKitForm(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            {/* Cabecera modal */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-[var(--caritas-green)]" />
                <h2 className="text-sm font-semibold text-gray-900">Nuevo kit de emergencia</h2>
              </div>
              <button onClick={() => setShowKitForm(false)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Cuerpo modal con scroll */}
            <div className="overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input label="Tipo de kit" value={kitForm.tipoKit} onChange={(v) => setKitForm({ ...kitForm, tipoKit: v })} required />
              <Input label="Stock inicial" type="number" value={String(kitForm.stockInicial)} onChange={(v) => setKitForm({ ...kitForm, stockInicial: Number(v) })} required />
              <Input label="Código de almacén" value={kitForm.codigoAlmacen} onChange={(v) => setKitForm({ ...kitForm, codigoAlmacen: v })} />
              <Input label="Ubicación de almacén" value={kitForm.ubicacionAlmacen} onChange={(v) => setKitForm({ ...kitForm, ubicacionAlmacen: v })} />
              <label className="block md:col-span-2">
                <span className="text-xs text-gray-600">Descripción</span>
                <textarea value={kitForm.descripcion} onChange={(e) => setKitForm({ ...kitForm, descripcion: e.target.value })} rows={2} className="mt-1 w-full px-3 py-2 border border-[var(--caritas-border)] rounded text-sm" />
              </label>
              <div className="md:col-span-2">
                <span className="text-xs text-gray-600">Contenido del kit <span className="text-red-500">*</span></span>
                <div className="mt-1 border border-[var(--caritas-border)] rounded p-3 space-y-2">
                  {kitFormArt.map((a, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <input value={a.descripcion} onChange={(e) => setKitFormArt((p) => p.map((x, j) => j === i ? { ...x, descripcion: e.target.value } : x))} placeholder="Elemento (ej. Arroz 1kg, Frazada...)" className="flex-1 px-2 py-1.5 text-xs border border-[var(--caritas-border)] rounded" />
                      <input type="number" min={1} value={a.cantidad} onChange={(e) => setKitFormArt((p) => p.map((x, j) => j === i ? { ...x, cantidad: parseInt(e.target.value, 10) || 1 } : x))} className="w-16 px-2 py-1.5 text-xs border border-[var(--caritas-border)] rounded" />
                      <button type="button" onClick={() => setKitFormArt((p) => p.length > 1 ? p.filter((_, j) => j !== i) : p)} disabled={kitFormArt.length === 1} className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setKitFormArt((p) => [...p, { codigo: "", descripcion: "", cantidad: 1 }])} className="text-xs text-[var(--caritas-green)] flex items-center gap-1 cursor-pointer">
                    <Plus className="w-3.5 h-3.5" /> Agregar artículo
                  </button>
                </div>
              </div>
            </div>
            {/* Footer modal */}
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100">
              <button onClick={() => setShowKitForm(false)} className="px-4 py-2 border border-[var(--caritas-border)] rounded-lg text-sm cursor-pointer hover:bg-gray-50 transition-colors">Cancelar</button>
              <button onClick={submitKit} disabled={pending} className="px-4 py-2 bg-[var(--caritas-green)] text-white rounded-lg text-sm disabled:opacity-50 cursor-pointer hover:bg-[var(--caritas-green)]/90 transition-colors font-medium">Guardar kit</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Layout principal ── */}
      <div className="flex gap-4 h-[calc(100vh-200px)]">

        {/* ── Panel lista ── */}
        <div className={listClasses}>
          <div className="flex-1 flex flex-col bg-white border border-[var(--caritas-border)] rounded-xl overflow-hidden">
            {/* Ordenar + colapsar */}
            <div className="flex items-center gap-1 px-3 py-2.5 border-b border-gray-100 shrink-0">
              <div className="flex-1 flex items-center gap-1.5 min-w-0">
                <span className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">Ordenar:</span>
                <select
                  value={sortBy}
                  onChange={(e) => { setSortBy(e.target.value as SortKey); setKitPage(1); }}
                  className="flex-1 min-w-0 text-xs border border-[var(--caritas-border)] rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-[var(--caritas-green)]"
                >
                  <option value="nombre">Nombre (A–Z)</option>
                  <option value="stock-desc">Stock (mayor a menor)</option>
                  <option value="stock-asc">Stock (menor a mayor)</option>
                  <option value="actividad">Actividad reciente</option>
                  <option value="creacion">Fecha de creación</option>
                </select>
              </div>
              <button onClick={() => setPanelAbierto(false)} title="Colapsar panel" className="hidden md:flex shrink-0 w-8 h-8 items-center justify-center rounded-lg text-gray-400 border border-transparent hover:border-gray-200 hover:text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer">
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>

            {/* Lista con scroll */}
            <div className="flex-1 overflow-y-auto">
              {kits.length === 0 ? (
                <div className="p-8 text-center">
                  <Package className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No hay kits registrados.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {visibleKits.map((k) => (
                    <button
                      key={k.id}
                      onClick={() => selectKit(k.id)}
                      className={`w-full text-left px-4 py-3 transition-colors cursor-pointer ${
                        selected === k.id
                          ? "bg-[var(--caritas-green)]/5 border-r-4 border-r-[var(--caritas-green)]"
                          : "hover:bg-gray-50"
                      } ${k.estadoKit === "ARCHIVADO" ? "opacity-60" : ""}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-gray-900 leading-tight truncate">{k.tipoKit}</p>
                        {k.estadoKit === "ARCHIVADO" && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-500 rounded flex-shrink-0">
                            <Archive className="w-3 h-3" /> Archivado
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Stock: <span className={`font-semibold ${k.stockActual < 5 ? "text-red-600" : "text-green-700"}`}>{k.stockActual}</span>
                      </p>
                      {k.fechaRegistro && (
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          Creado el {new Date(k.fechaRegistro).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Lima" })}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Paginación */}
            <div className="border-t border-gray-100 p-2 shrink-0">
              <PaginationControls
                total={kits.length}
                start={kitFrom}
                end={kitTo}
                page={safeKitPage}
                totalPages={totalKitPages}
                onPrevious={() => setKitPage((p) => Math.max(1, p - 1))}
                onNext={() => setKitPage((p) => Math.min(totalKitPages, p + 1))}
                pageSize={kitPageSize}
                onPageSizeChange={(s) => { setKitPageSize(s); setKitPage(1); }}
              />
            </div>
          </div>
        </div>

        {/* ── Panel detalle ── */}
        <div className={detailClasses}>
          {/* Volver — solo móvil */}
          <button onClick={() => setShowDetail(false)} className="md:hidden flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 font-medium mb-3 cursor-pointer transition-colors shrink-0">
            <ChevronLeft className="w-4 h-4" /> Volver a la lista
          </button>

          {/* Expandir panel — desktop colapsado */}
          {!panelAbierto && (
            <button onClick={() => setPanelAbierto(true)} title="Expandir panel" className="hidden md:flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors cursor-pointer shrink-0 mb-3">
              <PanelLeftOpen className="w-4 h-4" /> Mostrar lista de kits
            </button>
          )}

          {/* Scroll del detalle */}
          <div className="flex-1 overflow-y-auto">
            {!current ? (
              <div className="bg-white border border-[var(--caritas-border)] rounded-xl p-12 text-center flex flex-col items-center justify-center min-h-64">
                <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm font-medium">Selecciona un kit para ver el detalle</p>
              </div>
            ) : (
              <div className="bg-white border border-[var(--caritas-border)] rounded-xl overflow-hidden">
                {/* Cabecera del kit */}
                <div className="p-4 border-b border-gray-100 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-bold text-gray-900">{current.tipoKit}</h2>
                      {current.estadoKit === "ARCHIVADO" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-500 rounded-full">
                          <Archive className="w-3 h-3" /> Archivado
                        </span>
                      )}
                    </div>
                    {current.descripcion && <p className="text-sm text-gray-600 mt-0.5">{current.descripcion}</p>}
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                      <p className="text-sm text-gray-600">
                        Stock: <span className={`font-bold ${current.stockActual < 5 ? "text-red-600" : "text-green-700"}`}>{current.stockActual}</span>
                      </p>
                      {current.codigoAlmacen && <p className="text-sm text-gray-600">Cód. almacén: <span className="font-semibold">{current.codigoAlmacen}</span></p>}
                      {current.ubicacionAlmacen && <p className="text-sm text-gray-600">Ubicación: <span className="font-semibold">{current.ubicacionAlmacen}</span></p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {current.estadoKit !== "ARCHIVADO" && (
                      <>
                        <button onClick={() => setShowMovForm((s) => !s)} className="flex items-center gap-1.5 px-3 py-2 bg-[var(--caritas-green)] text-white text-sm rounded-lg hover:bg-[var(--caritas-green)]/90 transition-colors cursor-pointer">
                          <RefreshCw className="w-4 h-4" /> Movimiento
                        </button>
                        {movimientos.length === 0 ? (
                          <button onClick={handleEliminar} disabled={pending} className="flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 text-sm rounded-lg hover:bg-red-50 disabled:opacity-50 cursor-pointer transition-colors">
                            <Trash2 className="w-4 h-4" /> Eliminar
                          </button>
                        ) : (
                          <button onClick={handleArchivar} disabled={pending} className="flex items-center gap-1.5 px-3 py-2 border border-[var(--caritas-border)] text-gray-700 text-sm rounded-lg hover:bg-gray-50 disabled:opacity-50 cursor-pointer transition-colors">
                            <Archive className="w-4 h-4" /> Archivar
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Formulario de movimiento */}
                {showMovForm && (
                  <div className="border-t border-gray-100 bg-gray-50 p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Select label="Tipo" value={movForm.tipo} options={TIPOS as unknown as string[]} onChange={(v) => setMovForm({ ...movForm, tipo: v as (typeof TIPOS)[number] })} />
                    <Input label="Cantidad" type="number" value={String(movForm.cantidad)} onChange={(v) => setMovForm({ ...movForm, cantidad: Number(v) })} />
                    {movForm.tipo === "ENTREGA" && (
                      <>
                        <label className="block">
                          <span className="text-xs text-gray-600">Parroquia destino</span>
                          <select value={movForm.idParroquiaDestino} onChange={(e) => setMovForm({ ...movForm, idParroquiaDestino: e.target.value })} className="mt-1 w-full px-3 py-2 border border-[var(--caritas-border)] rounded text-sm bg-white">
                            <option value="">— Selecciona —</option>
                            {parroquias.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                          </select>
                        </label>
                        <Input label="Destinatario (persona que recibe)" value={movForm.destinatario} onChange={(v) => setMovForm({ ...movForm, destinatario: v })} />
                        <Input label="Código de incidencia (opcional)" value={movForm.incidenciaId} onChange={(v) => setMovForm({ ...movForm, incidenciaId: v })} />
                      </>
                    )}
                    <Input label="Motivo" value={movForm.motivoMovimiento} onChange={(v) => setMovForm({ ...movForm, motivoMovimiento: v })} />
                    <label className="md:col-span-2 block">
                      <span className="text-xs text-gray-600">Notas</span>
                      <textarea value={movForm.observaciones} onChange={(e) => setMovForm({ ...movForm, observaciones: e.target.value })} rows={2} className="mt-1 w-full px-3 py-2 border border-[var(--caritas-border)] rounded text-sm" />
                    </label>
                    <div className="md:col-span-2">
                      <span className="text-xs text-gray-600 block mb-1">Evidencia fotográfica <span className="text-gray-400">(opcional)</span></span>
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#91D723] text-[#009850] rounded-lg cursor-pointer hover:bg-[#91D723]/10 text-xs font-medium transition-colors">
                        <Upload className="w-3.5 h-3.5" /> Adjuntar archivo
                        <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setEvidenciaFile(e.target.files?.[0] ?? null)} />
                      </label>
                      {evidenciaFile && (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-gray-100 border border-gray-200 rounded-full pl-2 pr-1 py-0.5 text-gray-700 mt-2 ml-2">
                          {evidenciaFile.name}
                          <button type="button" onClick={() => setEvidenciaFile(null)} className="text-gray-400 hover:text-red-500 cursor-pointer"><X className="w-3 h-3" /></button>
                        </span>
                      )}
                    </div>
                    <div className="md:col-span-2 flex justify-end gap-2">
                      <button onClick={() => { setShowMovForm(false); setEvidenciaFile(null); }} className="px-3 py-2 border border-[var(--caritas-border)] rounded text-sm cursor-pointer hover:bg-gray-50 transition-colors">Cancelar</button>
                      <button onClick={submitMov} disabled={pending} className="px-3 py-2 bg-[var(--caritas-green)] text-white rounded text-sm disabled:opacity-50 cursor-pointer hover:bg-[var(--caritas-green)]/90 transition-colors">Registrar</button>
                    </div>
                  </div>
                )}

                {/* Composición del kit — colapsable */}
                <KitSeccion
                  titulo="Composición del kit"
                  icon={<ListChecks className="w-4 h-4 text-[var(--caritas-green)]" />}
                  badge={articulos.length}
                >
                  {articulos.length === 0 ? (
                    <p className="text-xs text-gray-400 border border-dashed border-gray-200 rounded p-3">
                      Este kit no tiene contenido definido. La composición se define al crear el kit.
                    </p>
                  ) : (
                    <ul className="border border-[var(--caritas-border)] rounded divide-y divide-gray-100">
                      {articulos.map((a, i) => (
                        <li key={i} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                          {a.codigo && <span className="text-[10px] font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">{a.codigo}</span>}
                          <span className="flex-1 text-gray-700">{a.descripcion}</span>
                          <span className="text-xs font-semibold text-gray-500">x{a.cantidad}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </KitSeccion>

                {/* Historial de movimientos — colapsable */}
                <KitSeccion
                  titulo="Historial de movimientos"
                  icon={<RefreshCw className="w-4 h-4 text-gray-500" />}
                  badge={movimientos.length}
                >
                  {movimientos.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">Sin movimientos registrados.</p>
                  ) : (
                    <>
                      <ul className="space-y-2">
                        {visibleMovimientos.map((m) => (
                          <li key={m.id} className="flex items-start gap-3 p-3 border border-[var(--caritas-border)] rounded-lg">
                            {m.tipo === "ENTREGA" ? (
                              <ArrowUpCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                            ) : (
                              <ArrowDownCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-800">
                                {m.tipo} · <span className="text-[var(--caritas-green)]">{m.cantidad}</span> unidades
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(m.fecha).toLocaleDateString("es-PE")}{m.responsable ? ` · ${m.responsable}` : ""}
                              </p>
                              {m.motivoMovimiento && <p className="text-xs text-gray-600 mt-0.5">{m.motivoMovimiento}</p>}
                              {m.observaciones && <p className="text-xs text-gray-500 italic mt-0.5">{m.observaciones}</p>}
                            </div>
                          </li>
                        ))}
                      </ul>
                      <PaginationControls
                        total={movimientos.length}
                        start={movementFrom}
                        end={movementTo}
                        page={safeMovementPage}
                        totalPages={totalMovementPages}
                        onPrevious={() => setMovementPage((p) => Math.max(1, p - 1))}
                        onNext={() => setMovementPage((p) => Math.min(totalMovementPages, p + 1))}
                        pageSize={movPageSize}
                        onPageSizeChange={(s) => { setMovPageSize(s); setMovementPage(1); }}
                        className="mt-3"
                      />
                    </>
                  )}
                </KitSeccion>

                {/* Evidencias — colapsable, solo si hay */}
                {evidencias.length > 0 && (
                  <KitSeccion
                    titulo="Evidencias adjuntas"
                    icon={<span className="text-sm">📎</span>}
                    badge={evidencias.length}
                    defaultOpen={false}
                  >
                    <ul className="space-y-1">
                      {evidencias.map((ev) => (
                        <li key={ev.idEvidenciaGRD} className="flex items-center gap-2 text-xs border border-gray-100 rounded p-2 bg-gray-50">
                          <span className="flex-1 truncate text-gray-700">{ev.nombreArchivo}</span>
                          <span className="text-gray-400 flex-shrink-0">{new Date(ev.fechaCarga).toLocaleDateString("es-PE")}</span>
                          <a href={`/api/archivos?key=${encodeURIComponent(ev.urlArchivo)}`} target="_blank" rel="noopener noreferrer" className="text-green-700 hover:underline font-medium flex-shrink-0 cursor-pointer">Ver</a>
                        </li>
                      ))}
                    </ul>
                  </KitSeccion>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-xs text-gray-600">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full px-3 py-2 border border-[var(--caritas-border)] rounded text-sm" />
    </label>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs text-gray-600">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full px-3 py-2 border border-[var(--caritas-border)] rounded text-sm bg-white">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
