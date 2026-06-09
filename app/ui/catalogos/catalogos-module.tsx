"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Database, Plus, Pencil, Power, FolderPlus } from "lucide-react";
import { toast } from "sonner";
import {
  crearCatalogo,
  agregarItemCatalogo,
  editarItemCatalogo,
  toggleItemCatalogo,
} from "@/app/actions/catalogos";

type Detalle = {
  id: string;
  codigo: string;
  valor: string;
  descripcion: string | null;
  estado: string;
};
type Catalogo = { id: string; nombreCatalogo: string; descripcion: string | null; estado: string };

interface Props {
  catalogos: Catalogo[];
  detallesByCatalogo: Record<string, Detalle[]>;
}

/** Genera un código corto a partir del valor (el DER exige código en cada detalle). */
function slugCodigo(valor: string): string {
  return (
    valor
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 30) || `IT_${Date.now()}`
  );
}

export function CatalogosModule({ catalogos, detallesByCatalogo }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<string | null>(catalogos[0]?.id ?? null);
  const [newValue, setNewValue] = useState("");
  const [newCatalog, setNewCatalog] = useState("");
  const [showNewCatalog, setShowNewCatalog] = useState(false);
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(null);

  const items = activeId ? (detallesByCatalogo[activeId] ?? []) : [];
  const activeCatalogo = catalogos.find((c) => c.id === activeId) ?? null;

  const run = (fn: () => Promise<{ message?: string } | void>, ok: string) =>
    startTransition(async () => {
      const res = await fn();
      if (res?.message && /no se pudo|ya existe|obligatori|no tiene/i.test(res.message))
        toast.error(res.message);
      else toast.success(ok);
      router.refresh();
    });

  const submitNew = () => {
    if (!newValue.trim() || !activeId) return;
    const valor = newValue.trim();
    setNewValue("");
    run(
      () => agregarItemCatalogo({ idCatalogoGRD: activeId, codigo: slugCodigo(valor), valor }),
      "Ítem agregado."
    );
  };

  const submitEdit = () => {
    if (!editing || !editing.value.trim()) return;
    const { id, value } = editing;
    setEditing(null);
    run(() => editarItemCatalogo(id, value.trim()), "Ítem actualizado.");
  };

  const submitNewCatalog = () => {
    if (!newCatalog.trim()) return;
    const nombre = newCatalog.trim();
    setNewCatalog("");
    setShowNewCatalog(false);
    run(() => crearCatalogo(nombre), "Catálogo creado.");
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[var(--caritas-green)]/10 rounded-lg flex items-center justify-center">
            <Database className="w-5 h-5 text-[var(--caritas-green)]" />
          </div>
          <div>
            <h1 className="text-[var(--caritas-text)]">Catálogos del Sistema</h1>
            <p className="text-sm text-gray-600">Datos maestros del GRD</p>
          </div>
        </div>
        <button
          onClick={() => setShowNewCatalog((s) => !s)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-[var(--caritas-border)] text-gray-700 rounded text-sm hover:bg-gray-50"
        >
          <FolderPlus className="w-4 h-4" /> Nuevo catálogo
        </button>
      </div>

      {showNewCatalog && (
        <div className="bg-white border border-[var(--caritas-border)] rounded-xl p-4 mb-5 flex flex-wrap gap-2">
          <input
            value={newCatalog}
            onChange={(e) => setNewCatalog(e.target.value)}
            placeholder="Nombre del nuevo catálogo (ej. Tipos de Evento)"
            className="flex-1 min-w-[220px] px-3 py-2 border border-[var(--caritas-border)] rounded text-sm"
          />
          <button
            onClick={submitNewCatalog}
            disabled={pending}
            className="px-4 py-2 bg-[var(--caritas-green)] text-white rounded text-sm disabled:opacity-50"
          >
            Crear
          </button>
        </div>
      )}

      {catalogos.length === 0 ? (
        <div className="bg-white border border-[var(--caritas-border)] rounded-xl p-8 text-center text-gray-500">
          No hay catálogos aún. Crea el primero con &quot;Nuevo catálogo&quot;.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-5">
            {catalogos.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={`px-3 py-1.5 text-sm rounded ${activeId === c.id ? "bg-[var(--caritas-green)] text-white" : "bg-white border border-[var(--caritas-border)] text-gray-700 hover:bg-gray-50"}`}
              >
                {c.nombreCatalogo}
              </button>
            ))}
          </div>

          <div className="bg-white border border-[var(--caritas-border)] rounded-xl p-5">
            <div className="flex flex-wrap gap-2 mb-4">
              <input
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitNew()}
                placeholder={
                  activeCatalogo
                    ? `Nuevo valor para ${activeCatalogo.nombreCatalogo}`
                    : "Nuevo valor"
                }
                className="flex-1 min-w-[200px] px-3 py-2 border border-[var(--caritas-border)] rounded text-sm"
              />
              <button
                onClick={submitNew}
                disabled={pending}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--caritas-green)] text-white rounded text-sm disabled:opacity-50"
              >
                <Plus className="w-4 h-4" /> Agregar
              </button>
            </div>

            <ul className="divide-y divide-[var(--caritas-border)]">
              {items.map((it) => (
                <li key={it.id} className="py-2 flex items-center justify-between gap-2">
                  {editing?.id === it.id ? (
                    <>
                      <input
                        value={editing.value}
                        onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                        className="flex-1 px-2 py-1 border border-[var(--caritas-border)] rounded text-sm"
                      />
                      <button onClick={submitEdit} className="text-sm text-[var(--caritas-green)]">
                        Guardar
                      </button>
                      <button onClick={() => setEditing(null)} className="text-sm text-gray-500">
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      <span
                        className={`flex-1 text-sm ${it.estado === "ACTIVO" ? "text-[var(--caritas-text)]" : "text-gray-400 line-through"}`}
                      >
                        {it.valor}
                      </span>
                      <span className="text-xs text-gray-400">{it.codigo}</span>
                      <button
                        onClick={() => setEditing({ id: it.id, value: it.valor })}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => run(() => toggleItemCatalogo(it.id), "Estado actualizado.")}
                        className={`p-1.5 rounded ${it.estado === "ACTIVO" ? "text-gray-500 hover:bg-gray-100" : "text-green-600 hover:bg-green-50"}`}
                      >
                        <Power className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </li>
              ))}
              {items.length === 0 && (
                <li className="py-3 text-sm text-gray-500">Sin ítems en este catálogo.</li>
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
