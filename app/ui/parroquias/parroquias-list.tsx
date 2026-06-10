"use client";

import { useState, useTransition } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import {
  createParroquia,
  updateParroquia,
  toggleEstadoParroquia,
  type ParroquiaFormData,
} from "@/app/actions/parroquias";
import { PaginationControls } from "@/app/ui/shared/pagination-controls";

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

const PAGE_SIZE = 10;

const inputCls =
  "w-full px-3 py-2 text-sm bg-[#F5F5F5] border border-[#DDDDDD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009850]/20 focus:border-[#009850] transition-colors";
const labelCls = "block text-xs font-medium text-gray-700 mb-1";

// ─── Modal ────────────────────────────────────────────────────────────────────

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
          {/* Nombre */}
          <div>
            <label className={labelCls}>Nombre <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => set("nombre", e.target.value)}
              placeholder="Ej: Parroquia San Juan Bautista"
              className={inputCls}
            />
          </div>

          {/* Dirección */}
          <div>
            <label className={labelCls}>Dirección</label>
            <input
              type="text"
              value={form.direccion}
              onChange={(e) => set("direccion", e.target.value)}
              placeholder="Ej: Av. Principal 123, Lima"
              className={inputCls}
            />
          </div>

          {/* Referencia */}
          <div>
            <label className={labelCls}>Referencia</label>
            <input
              type="text"
              value={form.referencia}
              onChange={(e) => set("referencia", e.target.value)}
              placeholder="Ej: A una cuadra del parque central"
              className={inputCls}
            />
          </div>

          {/* Teléfono + Correo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Teléfono</label>
              <input
                type="text"
                value={form.telefono}
                onChange={(e) => set("telefono", e.target.value.replace(/[^\d+\-() ]/g, ""))}
                placeholder="Ej: 01-234-5678"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Correo</label>
              <input
                type="email"
                value={form.correo}
                onChange={(e) => set("correo", e.target.value)}
                placeholder="parroquia@ejemplo.com"
                className={inputCls}
              />
            </div>
          </div>

          {/* Mapa de coordenadas */}
          <div>
            <label className={labelCls}>
              Ubicación en el mapa
              <span className="ml-1 text-gray-400 font-normal">(opcional — busca la dirección o haz clic para marcar)</span>
            </label>
            <LocationPicker
              lat={initialLat}
              lng={initialLng}
              onLocationChange={handleLocationChange}
            />
          </div>

          {/* Acciones */}
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
              ) : editing ? "Guardar cambios" : "Registrar parroquia"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function ParroquiasList({ parroquias, canEdit = false }: Props) {
  const [isPending, startTransition] = useTransition();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ParroquiaDetalle | undefined>();
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = parroquias.filter((p) => {
    if (filterEstado !== "all" && p.estado !== filterEstado) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !p.nombre.toLowerCase().includes(q) &&
        !(p.direccion ?? "").toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const paginated = filtered.slice(startIndex, startIndex + PAGE_SIZE);
  const visibleFrom = filtered.length === 0 ? 0 : startIndex + 1;
  const visibleTo = Math.min(startIndex + PAGE_SIZE, filtered.length);

  const totalActivas = parroquias.filter((p) => p.estado === "ACTIVO").length;
  const totalInactivas = parroquias.filter((p) => p.estado === "INACTIVO").length;
  const totalBrigadistas = parroquias.reduce((acc, p) => acc + p._count.brigadistas, 0);

  function openCreate() {
    setEditing(undefined);
    setShowModal(true);
  }

  function openEdit(p: ParroquiaDetalle) {
    setEditing(p);
    setShowModal(true);
  }

  function handleToggleEstado(p: ParroquiaDetalle) {
    startTransition(async () => {
      const result = await toggleEstadoParroquia(p.id, p.estado);
      if (result?.message) { toast.error(result.message); return; }
      toast.success(`Parroquia ${p.estado === "ACTIVO" ? "desactivada" : "activada"}`);
    });
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Parroquias</h1>
          <p className="text-sm text-gray-500 mt-0.5">Directorio de parroquias — Cáritas Lima</p>
        </div>
        {canEdit && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-all"
            style={{ background: "#009850" }}
          >
            <Plus className="w-4 h-4" />
            Registrar parroquia
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: parroquias.length, icon: Church, color: "bg-gray-600" },
          { label: "Activas", value: totalActivas, icon: Church, color: "bg-[#009850]" },
          { label: "Inactivas", value: totalInactivas, icon: Church, color: "bg-gray-400" },
          { label: "Brigadistas asignados", value: totalBrigadistas, icon: Users, color: "bg-blue-600" },
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
            placeholder="Buscar por nombre o dirección..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-3 py-2 text-sm bg-[#F5F5F5] border border-[#DDDDDD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009850]/20 focus:border-[#009850]"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400 shrink-0" />
          <select
            value={filterEstado}
            onChange={(e) => { setFilterEstado(e.target.value); setCurrentPage(1); }}
            className="flex-1 px-3 py-2 text-sm bg-[#F5F5F5] border border-[#DDDDDD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009850]/20 focus:border-[#009850]"
          >
            <option value="all">Todos los estados</option>
            <option value="ACTIVO">Activas</option>
            <option value="INACTIVO">Inactivas</option>
          </select>
        </div>
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
                  {(["Parroquia", "Contacto", "Ubicación", "Brigadistas", "Incidencias", "Planes", "Estado", ...(canEdit ? ["Acciones"] : [])] as string[]).map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap"
                      >
                        {h}
                      </th>
                    )
                  )}
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
                          <a
                            href={`https://www.openstreetmap.org/?mlat=${p.latitud}&mlon=${p.longitud}&zoom=16`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[#009850] flex items-center gap-0.5 hover:underline"
                          >
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
                        <button
                          onClick={() => handleToggleEstado(p)}
                          disabled={isPending}
                          className="flex items-center gap-1.5 text-xs font-medium hover:opacity-80 transition-opacity disabled:opacity-50"
                          title="Clic para cambiar estado"
                        >
                          {p.estado === "ACTIVO" ? (
                            <>
                              <ToggleRight className="w-5 h-5 text-[#009850]" />
                              <span className="text-[#009850]">Activa</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-5 h-5 text-gray-400" />
                              <span className="text-gray-500">Inactiva</span>
                            </>
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
                        <button
                          onClick={() => openEdit(p)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
                          title="Editar"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
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
                      <a
                        href={`https://www.openstreetmap.org/?mlat=${p.latitud}&mlon=${p.longitud}&zoom=16`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#009850] flex items-center gap-0.5 hover:underline mt-0.5"
                      >
                        <MapPin className="w-3 h-3" />Ver en mapa
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {canEdit && (
                    <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600">
                      <Edit3 className="w-4 h-4" />
                    </button>
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
                <button
                  onClick={() => handleToggleEstado(p)}
                  disabled={isPending}
                  className="w-full py-2 border border-[#DDDDDD] rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
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
        onPrevious={() => setCurrentPage((page) => Math.max(1, page - 1))}
        onNext={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
      />

      {showModal && (
        <ParroquiaModal
          editing={editing}
          onClose={() => { setShowModal(false); setEditing(undefined); }}
        />
      )}
    </div>
  );
}
