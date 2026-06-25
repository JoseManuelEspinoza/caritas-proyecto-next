"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { AuditEntry } from "@/app/actions/auditoria";
import { PaginationControls } from "@/app/ui/shared/pagination-controls";

const SOURCE_LABELS: Record<string, string> = {
  grd: "GRD",
  estado: "Incidencia",
};

const ACTION_COLORS: Record<string, string> = {
  cambio_estado: "bg-blue-100 text-blue-700",
  creación: "bg-green-100 text-green-700",
  edición: "bg-yellow-100 text-yellow-700",
  asignación: "bg-purple-100 text-purple-700",
  aprobacion: "bg-emerald-100 text-emerald-700",
  rechazo: "bg-red-100 text-red-700",
  cierre: "bg-gray-200 text-gray-700",
};

function ActionBadge({ action }: { action: string }) {
  const cls = ACTION_COLORS[action] ?? "bg-gray-100 text-gray-600";
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{action}</span>;
}

export function AuditoriaTable({ entries }: { entries: AuditEntry[] }) {
  const [query, setQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const actions = useMemo(
    () => Array.from(new Set(entries.map((e) => e.action))).sort(),
    [entries]
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return entries.filter((e) => {
      const text =
        `${e.entityId} ${e.entityName} ${e.user} ${e.notes ?? ""} ${e.field ?? ""}`.toLowerCase();
      return (
        (!q || text.includes(q)) &&
        (!actionFilter || e.action === actionFilter) &&
        (!sourceFilter || e.source === sourceFilter)
      );
    });
  }, [entries, query, actionFilter, sourceFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const paginated = filtered.slice(startIndex, startIndex + pageSize);
  const visibleFrom = filtered.length === 0 ? 0 : startIndex + 1;
  const visibleTo = Math.min(startIndex + pageSize, filtered.length);

  return (
    <div className="bg-white border border-[#DDDDDD] rounded-xl">
      {/* Filtros */}
      <div className="p-4 border-b border-[#DDDDDD] flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar por registro, usuario o nota…"
            className="pl-9 pr-3 py-2 w-full border border-[#DDDDDD] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009850]/30"
          />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border border-[#DDDDDD] rounded-lg text-sm bg-white focus:outline-none"
        >
          <option value="">Todas las acciones</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select
          value={sourceFilter}
          onChange={(e) => {
            setSourceFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border border-[#DDDDDD] rounded-lg text-sm bg-white focus:outline-none"
        >
          <option value="">Todos los módulos</option>
          <option value="estado">Incidencias</option>
          <option value="grd">GRD</option>
        </select>
        <span className="text-xs text-gray-400">
          {filtered.length} registro{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-4 py-3">Fecha</th>
              <th className="text-left px-4 py-3">Usuario</th>
              <th className="text-left px-4 py-3">Acción</th>
              <th className="text-left px-4 py-3">Módulo / Registro</th>
              <th className="text-left px-4 py-3">Cambio</th>
              <th className="text-left px-4 py-3">Nota</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#DDDDDD]">
            {paginated.map((e) => (
              <tr key={`${e.source}-${e.id}`} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                  {new Date(e.timestamp).toLocaleString("es-PE", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "America/Lima",
                  })}
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-800">{e.user}</div>
                  {e.userRole && <div className="text-xs text-gray-400">{e.userRole}</div>}
                </td>
                <td className="px-4 py-3">
                  <ActionBadge action={e.action} />
                </td>
                <td className="px-4 py-3">
                  <div className="text-xs text-gray-400">
                    {e.entity !== "GRD" ? e.entity : (SOURCE_LABELS[e.source] ?? e.entity)}
                  </div>
                  <div className="text-gray-800 max-w-[200px] truncate" title={e.entityName}>
                    {e.entityName}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs">
                  {e.field ? (
                    <div>
                      <span className="font-medium text-gray-600">{e.field}:</span>{" "}
                      {e.prevValue && (
                        <span className="line-through text-gray-400">{e.prevValue}</span>
                      )}
                      {e.prevValue && " → "}
                      <span className="font-medium text-gray-800">{e.newValue}</span>
                    </div>
                  ) : e.prevStatus || e.newStatus ? (
                    <div>
                      {e.prevStatus && <span className="text-gray-400">{e.prevStatus} → </span>}
                      <span className="font-semibold text-[#009850]">{e.newStatus}</span>
                    </div>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td
                  className="px-4 py-3 text-xs text-gray-500 max-w-[180px] truncate"
                  title={e.notes}
                >
                  {e.notes ?? ""}
                </td>
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400">
                  Sin entradas de auditoría.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <PaginationControls
        total={filtered.length}
        start={visibleFrom}
        end={visibleTo}
        page={currentPage}
        totalPages={totalPages}
        onPrevious={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
        pageSize={pageSize}
        onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
        className="rounded-t-none border-t border-x-0 border-b-0 rounded-b-xl"
      />
    </div>
  );
}
