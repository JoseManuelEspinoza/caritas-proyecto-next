"use client";

import { useEffect, useState, useTransition } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import {
  createBrigadista,
  updateBrigadista,
  toggleEstadoBrigadista,
  toggleDisponibilidadBrigadista,
  type BrigadistaFormData,
} from "@/app/actions/brigadistas";
import { PaginationControls } from "@/app/ui/shared/pagination-controls";

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

const PAGE_SIZE = 10;

const inputCls =
  "w-full px-3 py-2 text-sm bg-[#F5F5F5] border border-[#DDDDDD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009850]/20 focus:border-[#009850] transition-colors";
const labelCls = "block text-xs font-medium text-gray-700 mb-1";

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
    celular: editing?.celular ?? "",
    correo: editing?.correo ?? "",
    idParroquia: editing?.parroquia?.id ?? "",
    disponibilidad: editing?.disponibilidad ?? "DISPONIBLE",
  });

  function set(k: keyof BrigadistaFormData, v: string) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = editing
        ? await updateBrigadista(editing.id, form)
        : await createBrigadista(form);

      if (result?.message) {
        toast.error(result.message);
        return;
      }
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
          {/* Nombres y apellidos */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>
                Nombres <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.nombres}
                onChange={(e) => set("nombres", e.target.value)}
                placeholder="Ej: Ana María"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Apellidos</label>
              <input
                type="text"
                value={form.apellidos}
                onChange={(e) => set("apellidos", e.target.value)}
                placeholder="Ej: Torres Quispe"
                className={inputCls}
              />
            </div>
          </div>

          {/* DNI */}
          <div>
            <label className={labelCls}>DNI</label>
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

          {/* Contacto */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Celular</label>
              <input
                type="tel"
                value={form.celular}
                onChange={(e) => set("celular", e.target.value)}
                placeholder="9XXXXXXXX"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Correo</label>
              <input
                type="email"
                value={form.correo}
                onChange={(e) => set("correo", e.target.value)}
                placeholder="correo@ejemplo.com"
                className={inputCls}
              />
            </div>
          </div>

          {/* Parroquia */}
          <div>
            <label className={labelCls}>
              Parroquia <span className="text-red-500">*</span>
            </label>
            <select
              value={form.idParroquia}
              onChange={(e) => set("idParroquia", e.target.value)}
              className={inputCls}
            >
              <option value="">Seleccionar parroquia...</option>
              {parroquias.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Disponibilidad */}
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

          {/* Botones */}
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
              ) : editing ? (
                "Guardar cambios"
              ) : (
                "Registrar brigadista"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface Props {
  brigadistas: BrigadistaItem[];
  parroquias: ParroquiaItem[];
  stats: { total: number; activos: number; disponibles: number; enCampo: number };
}

export function BrigadistasList({ brigadistas, parroquias, stats }: Props) {
  const [isPending, startTransition] = useTransition();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<BrigadistaItem | undefined>();
  const [search, setSearch] = useState("");
  const [filterParroquia, setFilterParroquia] = useState("all");
  const [filterEstado, setFilterEstado] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

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

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const paginated = filtered.slice(startIndex, startIndex + PAGE_SIZE);
  const visibleFrom = filtered.length === 0 ? 0 : startIndex + 1;
  const visibleTo = Math.min(startIndex + PAGE_SIZE, filtered.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterParroquia, filterEstado]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  function openCreate() {
    setEditing(undefined);
    setShowModal(true);
  }
  function openEdit(b: BrigadistaItem) {
    setEditing(b);
    setShowModal(true);
  }

  function handleToggleEstado(b: BrigadistaItem) {
    startTransition(async () => {
      await toggleEstadoBrigadista(b.id, b.estado);
      toast.success(`Brigadista ${b.estado === "ACTIVO" ? "desactivado" : "activado"}`);
    });
  }

  function handleToggleDisponibilidad(b: BrigadistaItem) {
    if (b.estado !== "ACTIVO") {
      toast.error("Activa al brigadista primero");
      return;
    }
    startTransition(async () => {
      await toggleDisponibilidadBrigadista(b.id, b.disponibilidad ?? "NO DISPONIBLE");
      toast.success("Disponibilidad actualizada");
    });
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Brigadistas Parroquiales</h1>
          <p className="text-sm text-gray-500 mt-0.5">Padrón de brigadistas — Cáritas Lima</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-all"
          style={{ background: "#009850" }}
        >
          <Plus className="w-4 h-4" />
          Registrar brigadista
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, icon: Users, color: "bg-gray-600" },
          { label: "Activos", value: stats.activos, icon: UserCheck, color: "bg-[#009850]" },
          {
            label: "Disponibles",
            value: stats.disponibles,
            icon: ShieldCheck,
            color: "bg-blue-600",
          },
          { label: "En campo", value: stats.enCampo, icon: MapPin, color: "bg-[#FF823C]" },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white border border-[#DDDDDD] rounded-xl p-4 flex items-center gap-3"
          >
            <div
              className={`w-10 h-10 ${s.color} rounded-xl flex items-center justify-center flex-shrink-0`}
            >
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
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-[#F5F5F5] border border-[#DDDDDD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009850]/20 focus:border-[#009850]"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <select
            value={filterParroquia}
            onChange={(e) => setFilterParroquia(e.target.value)}
            className="flex-1 px-3 py-2 text-sm bg-[#F5F5F5] border border-[#DDDDDD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009850]/20 focus:border-[#009850]"
          >
            <option value="all">Todas las parroquias</option>
            {parroquias.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            className="flex-1 px-3 py-2 text-sm bg-[#F5F5F5] border border-[#DDDDDD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#009850]/20 focus:border-[#009850]"
          >
            <option value="all">Todos los estados</option>
            <option value="ACTIVO">Activos</option>
            <option value="INACTIVO">Inactivos</option>
          </select>
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
                    "Brigadista",
                    "Contacto",
                    "Parroquia",
                    "Disponibilidad",
                    "Estado",
                    "Acciones",
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
                          <div className="w-9 h-9 rounded-full bg-[#009850]/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-[#009850] text-xs font-bold">
                              {b.nombres[0]}
                              {b.apellidos?.[0] ?? ""}
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
                              <Phone className="w-3 h-3" />
                              {b.celular}
                            </p>
                          )}
                          {b.correo && (
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {b.correo}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-700">{b.parroquia?.nombre ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleDisponibilidad(b)}
                          disabled={isPending || b.estado !== "ACTIVO"}
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer hover:opacity-80 transition-opacity disabled:cursor-not-allowed ${dispCfg.badge}`}
                          title="Clic para cambiar disponibilidad"
                        >
                          {dispCfg.label}
                        </button>
                      </td>
                      <td className="px-4 py-3">
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
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openEdit(b)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
                          title="Editar"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </td>
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
                    <div className="w-10 h-10 rounded-full bg-[#009850]/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-[#009850] text-sm font-bold">
                        {b.nombres[0]}
                        {b.apellidos?.[0] ?? ""}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {b.nombres} {b.apellidos ?? ""}
                      </p>
                      {b.dni && <p className="text-xs text-gray-400">DNI: {b.dni}</p>}
                    </div>
                  </div>
                  <button
                    onClick={() => openEdit(b)}
                    className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold ${dispCfg.badge}`}
                  >
                    {dispCfg.label}
                  </span>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold ${b.estado === "ACTIVO" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                  >
                    {b.estado === "ACTIVO" ? "Activo" : "Inactivo"}
                  </span>
                  {b.parroquia && (
                    <span className="px-2.5 py-1 rounded-full text-xs bg-blue-50 text-blue-700">
                      {b.parroquia.nombre}
                    </span>
                  )}
                </div>
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
        onPrevious={() => setCurrentPage((page) => Math.max(1, page - 1))}
        onNext={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
      />

      {/* Modal */}
      {showModal && (
        <BrigadistaModal
          parroquias={parroquias}
          editing={editing}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
