import { Users, Info } from 'lucide-react'

type Usuario = { id: string; email: string; name: string; role: string; estado: string }

const ROLE_LABEL: Record<string, string> = {
  ADMINISTRADOR: 'Administrador',
  ESPECIALISTAGRD: 'Especialista GRD',
  BRIGADISTA: 'Brigadista',
  COMITEDONACIONES: 'Comité de Donaciones',
  JEFAOGP: 'Jefa OGP',
}
const ROLE_BADGE: Record<string, string> = {
  ADMINISTRADOR: 'bg-purple-50 text-purple-700',
  ESPECIALISTAGRD: 'bg-green-50 text-green-700',
  BRIGADISTA: 'bg-blue-50 text-blue-700',
  COMITEDONACIONES: 'bg-orange-50 text-orange-700',
  JEFAOGP: 'bg-cyan-50 text-cyan-700',
}

/**
 * Gestión de usuarios — SOLO LECTURA.
 * Con Keycloak como proveedor único, los usuarios (altas, contraseñas, roles) se
 * administran en la consola de Keycloak. Esta tabla espeja los usuarios que ya
 * han iniciado sesión en la app.
 */
export function UsuariosModule({ usuarios }: { usuarios: Usuario[] }) {
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-[var(--caritas-green)]/10 rounded-lg flex items-center justify-center">
          <Users className="w-5 h-5 text-[var(--caritas-green)]" />
        </div>
        <div>
          <h1 className="text-[var(--caritas-text)]">Gestión de Usuarios</h1>
          <p className="text-sm text-gray-600">Credenciales y roles del sistema</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-5 flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-800">
          La autenticación está gestionada por <strong>Keycloak</strong>. Para crear usuarios, asignar roles o
          restablecer contraseñas, usa la <strong>consola de administración de Keycloak</strong>
          (<code className="bg-white px-1 rounded">http://localhost:8080/admin</code>). Esta lista muestra los
          usuarios que ya han ingresado a la aplicación.
        </p>
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
            {usuarios.map((u) => (
              <tr key={u.id} className="border-t border-[var(--caritas-border)]">
                <td className="px-4 py-2 font-medium text-[var(--caritas-text)]">{u.name}</td>
                <td className="px-4 py-2 text-gray-600">{u.email}</td>
                <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded text-xs ${ROLE_BADGE[u.role] ?? 'bg-gray-100 text-gray-700'}`}>{ROLE_LABEL[u.role] ?? u.role}</span></td>
                <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded text-xs ${u.estado === 'ACTIVO' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{u.estado}</span></td>
              </tr>
            ))}
            {usuarios.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-gray-500">Aún no hay usuarios que hayan iniciado sesión.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
