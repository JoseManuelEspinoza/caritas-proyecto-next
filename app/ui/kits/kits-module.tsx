"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Package, Plus, ArrowDownCircle, ArrowUpCircle, RefreshCw, X, ListChecks, Camera, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  crearKit,
  registrarMovimientoKit,
  listarMovimientosKit,
  listarArticulosKit,
  guardarArticulosKit,
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
};
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

export function KitsModule({ kits, parroquias }: { kits: Kit[]; parroquias: Parroquia[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string | null>(kits[0]?.id ?? null);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [evidencias, setEvidencias] = useState<Evidencia[]>([]);
  const [articulos, setArticulos] = useState<ArticuloKit[]>([]);
  const [editandoComposicion, setEditandoComposicion] = useState(false);
  const [artDraft, setArtDraft] = useState<ArticuloKit[]>([]);
  const [evidenciaFile, setEvidenciaFile] = useState<File | null>(null);
  const [showKitForm, setShowKitForm] = useState(false);
  const [showMovForm, setShowMovForm] = useState(false);
  const [kitPage, setKitPage] = useState(1);
  const [movementPage, setMovementPage] = useState(1);
  const [kitPageSize, setKitPageSize] = useState(5);
  const [movPageSize, setMovPageSize] = useState(5);

  const [kitForm, setKitForm] = useState({ tipoKit: "", descripcion: "", stockInicial: 0, codigoAlmacen: "", ubicacionAlmacen: "" });
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
  const visibleKits = kits.slice(kitStart, kitStart + kitPageSize);
  const kitFrom = kits.length === 0 ? 0 : kitStart + 1;
  const kitTo = Math.min(kitStart + kitPageSize, kits.length);

  const totalMovementPages = Math.max(1, Math.ceil(movimientos.length / movPageSize));
  const safeMovementPage = Math.min(movementPage, totalMovementPages);
  const movementStart = (safeMovementPage - 1) * movPageSize;
  const visibleMovimientos = movimientos.slice(movementStart, movementStart + movPageSize);
  const movementFrom = movimientos.length === 0 ? 0 : movementStart + 1;
  const movementTo = Math.min(movementStart + movPageSize, movimientos.length);

  useEffect(() => {
    if (kitPage > totalKitPages) setKitPage(totalKitPages);
  }, [kitPage, totalKitPages]);

  useEffect(() => {
    if (movementPage > totalMovementPages) setMovementPage(totalMovementPages);
  }, [movementPage, totalMovementPages]);

  const selectKit = (id: string) => {
    setSelected(id);
    setShowMovForm(false);
    setMovementPage(1);
  };

  useEffect(() => {
    let active = true;

    if (!selected) {
      setMovimientos([]);
      setEvidencias([]);
      setArticulos([]);
      setEditandoComposicion(false);
      return () => {
        active = false;
      };
    }

    listarMovimientosKit(selected)
      .then((items) => { if (active) setMovimientos(items); })
      .catch(() => { if (active) setMovimientos([]); });

    listarEvidenciasKit(selected)
      .then((items) => { if (active) setEvidencias(items); })
      .catch(() => { if (active) setEvidencias([]); });

    setEditandoComposicion(false);
    listarArticulosKit(selected)
      .then((items) => { if (active) setArticulos(items); })
      .catch(() => { if (active) setArticulos([]); });

    return () => {
      active = false;
    };
  }, [selected]);

  function guardarComposicion() {
    if (!selected) return;
    startTransition(async () => {
      const res = await guardarArticulosKit(selected, artDraft);
      if (res && "message" in res) {
        toast.error(res.message);
        return;
      }
      setArticulos(await listarArticulosKit(selected));
      setEditandoComposicion(false);
      toast.success("Composición del kit guardada.");
    });
  }

  function validarKitForm(): string | null {
    const tipoKit = kitForm.tipoKit.trim();
    const stockInicial = Number(kitForm.stockInicial);

    if (!tipoKit) return "Indica el tipo de kit.";
    if (tipoKit.length < 3) return "El tipo de kit debe tener al menos 3 caracteres.";

    if (!Number.isFinite(stockInicial)) {
      return "El stock inicial debe ser un número válido.";
    }

    if (!Number.isInteger(stockInicial)) {
      return "El stock inicial debe ser un número entero.";
    }

    if (stockInicial < 0) {
      return "El stock inicial no puede ser negativo.";
    }

    return null;
  }

  function validarMovimientoForm(): string | null {
    if (!current) return "Selecciona un kit.";

    const cantidad = Number(movForm.cantidad);

    if (!TIPOS.includes(movForm.tipo)) {
      return "Selecciona un tipo de movimiento válido.";
    }

    if (!Number.isFinite(cantidad)) {
      return "La cantidad debe ser un número válido.";
    }

    if (!Number.isInteger(cantidad)) {
      return "La cantidad debe ser un número entero.";
    }

    if (cantidad <= 0) {
      return "La cantidad debe ser mayor que cero.";
    }

    if (movForm.tipo === "ENTREGA" && !movForm.idParroquiaDestino.trim()) {
      return "Selecciona la parroquia destino para la entrega.";
    }

    if (movForm.tipo === "ENTREGA" && cantidad > current.stockActual) {
      return `Stock insuficiente: hay ${current.stockActual} y se intentan entregar ${cantidad}.`;
    }

    return null;
  }

  const submitKit = () => {
    const errorValidacion = validarKitForm();

    if (errorValidacion) {
      toast.error(errorValidacion);
      return;
    }

    startTransition(async () => {
      const res = await crearKit({
        tipoKit: kitForm.tipoKit.trim(),
        descripcion: kitForm.descripcion.trim(),
        stockInicial: Number(kitForm.stockInicial),
        codigoAlmacen: kitForm.codigoAlmacen.trim() || undefined,
        ubicacionAlmacen: kitForm.ubicacionAlmacen.trim() || undefined,
      });

      if (res?.message) toast.error(res.message);
      else {
        toast.success("Kit creado.");
        setShowKitForm(false);
        setKitForm({ tipoKit: "", descripcion: "", stockInicial: 0, codigoAlmacen: "", ubicacionAlmacen: "" });
        router.refresh();
      }
    });
  };

  const submitMov = () => {
    const errorValidacion = validarMovimientoForm();

    if (errorValidacion) {
      toast.error(errorValidacion);
      return;
    }

    if (!current) return;

    startTransition(async () => {
      const extras: string[] = [];
      if (movForm.tipo === "ENTREGA" && movForm.destinatario.trim())
        extras.push(`Destinatario: ${movForm.destinatario.trim()}`);
      if (movForm.tipo === "ENTREGA" && movForm.incidenciaId.trim())
        extras.push(`Incidencia: ${movForm.incidenciaId.trim()}`);
      if (movForm.observaciones.trim()) extras.push(movForm.observaciones.trim());

      const res = await registrarMovimientoKit(current.id, {
        tipo: movForm.tipo,
        cantidad: Number(movForm.cantidad),
        idParroquiaDestino:
          movForm.tipo === "ENTREGA" ? movForm.idParroquiaDestino || undefined : undefined,
        motivoMovimiento: movForm.motivoMovimiento.trim() || undefined,
        observaciones: extras.join(" | ") || undefined,
      });

      if (res?.message && /insuficiente|no se pudo|no tiene|válid|obligatori|selecciona/i.test(res.message)) {
        toast.error(res.message);
        return;
      }

      if (evidenciaFile) {
        try {
          const archivo = await subirArchivoS3(evidenciaFile, { tipo: "evidencia-kit", entidadId: current.id });
          await registrarEvidenciaKit(current.id, archivo);
          const updated = await listarEvidenciasKit(current.id);
          setEvidencias(updated);
        } catch (e) {
          toast.error(`Evidencia: ${e instanceof Error ? e.message : "Error al subir"}`);
        }
        setEvidenciaFile(null);
      }

      toast.success(res?.message ?? "Movimiento registrado.");
      setShowMovForm(false);
      setMovForm({ ...movForm, cantidad: 1, destinatario: "", incidenciaId: "", motivoMovimiento: "", observaciones: "" });
      const movs = await listarMovimientosKit(current.id);
      setMovimientos(movs);
      router.refresh();
    });
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[var(--caritas-green)]/10 rounded-lg flex items-center justify-center">
            <Package className="w-5 h-5 text-[var(--caritas-green)]" />
          </div>
          <div>
            <h1 className="text-[var(--caritas-text)]">Kits y Mochilas de Emergencia</h1>
            <p className="text-sm text-gray-600">Logística · control de stock</p>
          </div>
        </div>
        <button
          onClick={() => setShowKitForm((s) => !s)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--caritas-green)] text-white rounded"
        >
          <Plus className="w-4 h-4" /> Nuevo kit
        </button>
      </div>

      {showKitForm && (
        <div className="bg-white border border-[var(--caritas-border)] rounded-xl p-5 mb-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            label="Tipo de kit"
            value={kitForm.tipoKit}
            onChange={(v) => setKitForm({ ...kitForm, tipoKit: v })}
            required
          />
          <Input
            label="Stock inicial"
            type="number"
            value={String(kitForm.stockInicial)}
            onChange={(v) => setKitForm({ ...kitForm, stockInicial: Number(v) })}
            required
          />
          <Input
            label="Código de almacén"
            value={kitForm.codigoAlmacen}
            onChange={(v) => setKitForm({ ...kitForm, codigoAlmacen: v })}
          />
          <Input
            label="Ubicación de almacén"
            value={kitForm.ubicacionAlmacen}
            onChange={(v) => setKitForm({ ...kitForm, ubicacionAlmacen: v })}
          />
          <label className="block md:col-span-2">
            <span className="text-xs text-gray-600">Contenido / descripción</span>
            <textarea
              value={kitForm.descripcion}
              onChange={(e) => setKitForm({ ...kitForm, descripcion: e.target.value })}
              rows={2}
              className="mt-1 w-full px-3 py-2 border border-[var(--caritas-border)] rounded text-sm"
            />
          </label>
          <div className="md:col-span-2 flex justify-end gap-2">
            <button
              onClick={() => setShowKitForm(false)}
              className="px-4 py-2 border border-[var(--caritas-border)] rounded"
            >
              Cancelar
            </button>
            <button
              onClick={submitKit}
              disabled={pending}
              className="px-4 py-2 bg-[var(--caritas-green)] text-white rounded disabled:opacity-50"
            >
              Guardar
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1 space-y-3">
          {kits.length === 0 && <p className="text-sm text-gray-500">No hay kits registrados.</p>}
          {visibleKits.map((k) => (
            <button
              key={k.id}
              onClick={() => selectKit(k.id)}
              className={`w-full text-left p-4 border rounded-xl transition-colors ${selected === k.id ? "border-[var(--caritas-green)] bg-[var(--caritas-green)]/5" : "border-[var(--caritas-border)] hover:bg-gray-50"}`}
            >
              <div className="text-sm font-medium text-[var(--caritas-text)]">{k.tipoKit}</div>
              <div className="text-xs text-gray-600 mt-1">
                Stock:{" "}
                <span
                  className={`font-semibold ${k.stockActual < 5 ? "text-red-600" : "text-green-700"}`}
                >
                  {k.stockActual}
                </span>
              </div>
            </button>
          ))}
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
            className="mt-4"
          />
        </div>

        <div className="lg:col-span-2 bg-white border border-[var(--caritas-border)] rounded-xl p-5">
          {!current ? (
            <p className="text-gray-500">Selecciona un kit.</p>
          ) : (
            <>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="text-[var(--caritas-text)]">{current.tipoKit}</h2>
                  <p className="text-sm text-gray-700 mt-1">{current.descripcion}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                    <p className="text-sm text-gray-600">
                      Stock actual: <span className="font-semibold">{current.stockActual}</span>
                    </p>
                    {current.codigoAlmacen && (
                      <p className="text-sm text-gray-600">
                        Cód. almacén: <span className="font-semibold">{current.codigoAlmacen}</span>
                      </p>
                    )}
                    {current.ubicacionAlmacen && (
                      <p className="text-sm text-gray-600">
                        Ubicación: <span className="font-semibold">{current.ubicacionAlmacen}</span>
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setShowMovForm((s) => !s)}
                  className="flex items-center gap-2 px-3 py-2 bg-[var(--caritas-green)] text-white text-sm rounded"
                >
                  <RefreshCw className="w-4 h-4" /> Movimiento
                </button>
              </div>

              {showMovForm && (
                <div className="bg-gray-50 border border-[var(--caritas-border)] rounded p-4 mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Select
                    label="Tipo"
                    value={movForm.tipo}
                    options={TIPOS as unknown as string[]}
                    onChange={(v) => setMovForm({ ...movForm, tipo: v as (typeof TIPOS)[number] })}
                  />
                  <Input
                    label="Cantidad"
                    type="number"
                    value={String(movForm.cantidad)}
                    onChange={(v) => setMovForm({ ...movForm, cantidad: Number(v) })}
                  />
                  {movForm.tipo === "ENTREGA" && (
                    <>
                      <label className="block">
                        <span className="text-xs text-gray-600">Parroquia destino</span>
                        <select
                          value={movForm.idParroquiaDestino}
                          onChange={(e) =>
                            setMovForm({ ...movForm, idParroquiaDestino: e.target.value })
                          }
                          className="mt-1 w-full px-3 py-2 border border-[var(--caritas-border)] rounded text-sm bg-white"
                        >
                          <option value="">— Selecciona —</option>
                          {parroquias.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nombre}
                            </option>
                          ))}
                        </select>
                      </label>
                      <Input
                        label="Destinatario (persona que recibe)"
                        value={movForm.destinatario}
                        onChange={(v) => setMovForm({ ...movForm, destinatario: v })}
                      />
                      <Input
                        label="Código de incidencia (opcional)"
                        value={movForm.incidenciaId}
                        onChange={(v) => setMovForm({ ...movForm, incidenciaId: v })}
                      />
                    </>
                  )}
                  <Input
                    label="Motivo"
                    value={movForm.motivoMovimiento}
                    onChange={(v) => setMovForm({ ...movForm, motivoMovimiento: v })}
                  />
                  <label className="md:col-span-2 block">
                    <span className="text-xs text-gray-600">Notas</span>
                    <textarea
                      value={movForm.observaciones}
                      onChange={(e) => setMovForm({ ...movForm, observaciones: e.target.value })}
                      rows={2}
                      className="mt-1 w-full px-3 py-2 border border-[var(--caritas-border)] rounded text-sm"
                    />
                  </label>
                  <div className="md:col-span-2">
                    <span className="text-xs text-gray-600 block mb-1">Evidencia fotográfica <span className="text-gray-400">(opcional)</span></span>
                    <div className="flex gap-2">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#91D723] text-[#009850] rounded-lg cursor-pointer hover:bg-[#91D723]/10 text-xs font-medium transition-colors">
                        <Camera className="w-3.5 h-3.5" /> Cámara
                        <input type="file" accept="image/*,application/pdf" capture="environment" className="hidden"
                          onChange={(e) => setEvidenciaFile(e.target.files?.[0] ?? null)} />
                      </label>
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 text-xs font-medium transition-colors">
                        <Upload className="w-3.5 h-3.5" /> Galería
                        <input type="file" accept="image/*,application/pdf" className="hidden"
                          onChange={(e) => setEvidenciaFile(e.target.files?.[0] ?? null)} />
                      </label>
                    </div>
                    {evidenciaFile && (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-gray-100 border border-gray-200 rounded-full pl-2 pr-1 py-0.5 text-gray-700 mt-2">
                        {evidenciaFile.name}
                        <button type="button" onClick={() => setEvidenciaFile(null)} className="text-gray-400 hover:text-red-500 transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                  </div>
                  <div className="md:col-span-2 flex justify-end gap-2">
                    <button
                      onClick={() => { setShowMovForm(false); setEvidenciaFile(null); }}
                      className="px-3 py-2 border border-[var(--caritas-border)] rounded"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={submitMov}
                      disabled={pending}
                      className="px-3 py-2 bg-[var(--caritas-green)] text-white rounded disabled:opacity-50"
                    >
                      Registrar
                    </button>
                  </div>
                </div>
              )}

              {/* Composición del kit (contenido y cantidades) */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm text-gray-600 flex items-center gap-1.5">
                    <ListChecks className="w-4 h-4 text-[var(--caritas-green)]" />
                    Composición del kit
                  </h3>
                  {!editandoComposicion && (
                    <button
                      onClick={() => {
                        setArtDraft(
                          articulos.length
                            ? articulos.map((a) => ({ ...a }))
                            : [{ codigo: "", descripcion: "", cantidad: 1 }]
                        );
                        setEditandoComposicion(true);
                      }}
                      className="text-xs font-medium text-[var(--caritas-green)] hover:underline"
                    >
                      {articulos.length ? "Editar" : "Definir contenido"}
                    </button>
                  )}
                </div>

                {!editandoComposicion ? (
                  articulos.length === 0 ? (
                    <p className="text-xs text-gray-400 border border-dashed border-gray-200 rounded p-3">
                      Este kit aún no tiene contenido definido. Defínelo para que el informe de
                      ayuda humanitaria precargue sus artículos al asignarlo a una familia.
                    </p>
                  ) : (
                    <ul className="border border-[var(--caritas-border)] rounded divide-y divide-gray-100">
                      {articulos.map((a, i) => (
                        <li key={i} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                          {a.codigo && (
                            <span className="text-[10px] font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">
                              {a.codigo}
                            </span>
                          )}
                          <span className="flex-1 text-gray-700">{a.descripcion}</span>
                          <span className="text-xs font-semibold text-gray-500">x{a.cantidad}</span>
                        </li>
                      ))}
                    </ul>
                  )
                ) : (
                  <div className="border border-[var(--caritas-border)] rounded p-3 space-y-2">
                    {artDraft.map((a, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <input
                          value={a.descripcion}
                          onChange={(e) =>
                            setArtDraft((p) => p.map((x, j) => (j === i ? { ...x, descripcion: e.target.value } : x)))
                          }
                          placeholder="Elemento (ej. Arroz 1kg, Frazada...)"
                          className="flex-1 px-2 py-1.5 text-xs border border-[var(--caritas-border)] rounded"
                        />
                        <input
                          type="number"
                          min={1}
                          value={a.cantidad}
                          onChange={(e) =>
                            setArtDraft((p) =>
                              p.map((x, j) => (j === i ? { ...x, cantidad: parseInt(e.target.value, 10) || 1 } : x))
                            )
                          }
                          className="w-16 px-2 py-1.5 text-xs border border-[var(--caritas-border)] rounded"
                        />
                        <button
                          onClick={() => setArtDraft((p) => p.filter((_, j) => j !== i))}
                          className="p-1 text-gray-400 hover:text-red-500"
                          title="Quitar artículo"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setArtDraft((p) => [...p, { codigo: "", descripcion: "", cantidad: 1 }])}
                      className="text-xs text-[var(--caritas-green)] flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Agregar artículo
                    </button>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={() => setEditandoComposicion(false)}
                        className="px-3 py-1.5 text-xs border border-[var(--caritas-border)] rounded"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={guardarComposicion}
                        disabled={pending}
                        className="px-3 py-1.5 text-xs bg-[var(--caritas-green)] text-white rounded disabled:opacity-50"
                      >
                        Guardar composición
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <h3 className="text-sm text-gray-600 mb-2">Historial de movimientos</h3>
              <ul className="space-y-2">
                {visibleMovimientos.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-start gap-3 p-3 border border-[var(--caritas-border)] rounded"
                  >
                    {m.tipo === "ENTREGA" ? (
                      <ArrowUpCircle className="w-5 h-5 text-red-600" />
                    ) : (
                      <ArrowDownCircle className="w-5 h-5 text-green-600" />
                    )}
                    <div className="flex-1">
                      <div className="text-sm text-[var(--caritas-text)]">
                        {m.tipo} · <span className="font-medium">{m.cantidad}</span> unidades
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(m.fecha).toLocaleDateString()}{" "}
                        {m.responsable ? `· ${m.responsable}` : ""}
                      </div>
                      {m.motivoMovimiento && (
                        <div className="text-xs text-gray-600">{m.motivoMovimiento}</div>
                      )}
                      {m.observaciones && (
                        <div className="text-xs text-gray-500 italic mt-1">{m.observaciones}</div>
                      )}
                    </div>
                  </li>
                ))}
                {movimientos.length === 0 && (
                  <p className="text-sm text-gray-500">Sin movimientos.</p>
                )}
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
                className="mt-4"
              />

              {/* Evidencias del kit */}
              {evidencias.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm text-gray-600 mb-2">Evidencias adjuntas</h3>
                  <ul className="space-y-1">
                    {evidencias.map((ev) => (
                      <li key={ev.idEvidenciaGRD} className="flex items-center gap-2 text-xs border border-gray-100 rounded p-2 bg-gray-50">
                        <span className="text-gray-500">📎</span>
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
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs text-gray-600">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-3 py-2 border border-[var(--caritas-border)] rounded text-sm"
      />
    </label>
  );
}
function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs text-gray-600">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-3 py-2 border border-[var(--caritas-border)] rounded text-sm bg-white"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
