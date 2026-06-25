"use client";

import { useMemo, useState } from "react";
import { Users, ExternalLink } from "lucide-react";
import { NuevoUsuarioModal } from "./nuevo-usuario-modal";
import { PaginationControls } from "@/app/ui/shared/pagination-controls";

type Usuario = { id: string; email: string; name: string; role: string; estado: string };

const ROLE_LABEL: Record<string, string> = {
  ADMINISTRADOR: "Administrador",
  ESPECIALISTAGRD: "Especialista GRD",
  BRIGADISTA: "Brigadista",
  COMITEDONACIONES: "Comité de Donaciones",
  JEFAOGP: "Jefa OGP",
};
const ROLE_BADGE: Record<string, string> = {
  ADMINISTRADOR: "bg-purple-50 text-purple-700",
  ESPECIALISTAGRD: "bg-green-50 text-green-700",
  BRIGADISTA: "bg-blue-50 text-blue-700",
  COMITEDONACIONES: "bg-orange-50 text-orange-700",
  JEFAOGP: "bg-cyan-50 text-cyan-700",
};

/**
 * Gestión de usuarios. La creación se hace con "Nuevo usuario" (Keycloak Admin API);
 * la gestión avanzada (contraseñas, desactivar) en el "Panel avanzado" de Keycloak.
 * La tabla espeja los usuarios de la app y permite filtrar por rol y paginar.
 */
export function UsuariosModule({
  usuarios,
  keycloakAdminUrl,
}: {
  usuarios: Usuario[];
  keycloakAdminUrl?: string;
}) {
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = useMemo(
    () => (roleFilter === "all" ? usuarios : usuarios.filter((u) => u.role === roleFilter)),
    [usuarios, roleFilter]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const visible = filtered.slice(start, start + pageSize);
  const from = filtered.length === 0 ? 0 : start + 1;
  const to = Math.min(start + pageSize, filtered.length);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[var(--caritas-green)]/10 rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5 text-[var(--caritas-green)]" />
          </div>
          <div>
            <h1 className="text-[var(--caritas-text)]">Gestión de Usuarios</h1>
            <p className="text-sm text-gray-600">Credenciales y roles del sistema</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <NuevoUsuarioModal />
          {keycloakAdminUrl && (
            <a
              href={keycloakAdminUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 border border-[var(--caritas-border)] text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              title="Gestión avanzada: restablecer contraseñas, desactivar, etc."
            >
              Panel avanzado
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </a>
          )}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-5 flex items-start gap-2">
        <Users className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-800">
          Crea especialistas, comité o administradores con <strong>Nuevo usuario</strong>. Para
          gestión avanzada (restablecer contraseñas, desactivar cuentas) usa el{" "}
          <strong>Panel avanzado</strong>. Los <strong>brigadistas</strong> se registran desde su
          propio módulo.
        </p>
      </div>

      {/* Filtro por rol */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-xs text-gray-500 whitespace-nowrap">Filtrar por rol:</span>
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
          className="text-xs border border-[var(--caritas-border)] rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#009850]/20 focus:border-[#009850]"
        >
          <option value="all">Todos los roles</option>
          {Object.entries(ROLE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <span className="text-xs text-gray-400">
          {filtered.length} usuario{filtered.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="bg-white border border-[var(--caritas-border)] rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-2">Usuario</th>
              <th className="text-left px-4 py-2">Email</th>
              <th className="text-left px-4 py-2">Rol</th>
              <th className="text-left px-4 py-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((u) => (
              <tr key={u.id} className="border-t border-[var(--caritas-border)]">
                <td className="px-4 py-2 font-medium text-[var(--caritas-text)]">{u.name}</td>
                <td className="px-4 py-2 text-gray-600">{u.email}</td>
                <td className="px-4 py-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${ROLE_BADGE[u.role] ?? "bg-gray-100 text-gray-700"}`}
                  >
                    {ROLE_LABEL[u.role] ?? u.role}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${u.estado === "ACTIVO" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}
                  >
                    {u.estado}
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-8 text-gray-500">
                  {roleFilter === "all"
                    ? "Aún no hay usuarios que hayan iniciado sesión."
                    : "No hay usuarios con ese rol."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <PaginationControls
        total={filtered.length}
        start={from}
        end={to}
        page={safePage}
        totalPages={totalPages}
        onPrevious={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
        pageSize={pageSize}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setPage(1);
        }}
        className="mt-4"
      />
    </div>
  );
}
