'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Plus, Power } from 'lucide-react'
import { toast } from 'sonner'
import { crearUsuario, toggleUsuarioActivo } from '@/app/actions/usuarios'

type Usuario = { id: string; email: string; name: string; role: string; estado: string }

const ROLES: { value: string; label: string }[] = [
  { value: 'ADMINISTRADOR', label: 'Administrador' },
  { value: 'ESPECIALISTAGRD', label: 'Especialista GRD' },
  { value: 'BRIGADISTA', label: 'Brigadista' },
  { value: 'COMITEDONACIONES', label: 'Comité de Donaciones' },
  { value: 'JEFAOGP', label: 'Jefa OGP' },
]
const ROLE_LABEL = Object.fromEntries(ROLES.map((r) => [r.value, r.label]))
const ROLE_BADGE: Record<string, string> = {
  ADMINISTRADOR: 'bg-purple-50 text-purple-700',
  ESPECIALISTAGRD: 'bg-green-50 text-green-700',
  BRIGADISTA: 'bg-blue-50 text-blue-700',
  COMITEDONACIONES: 'bg-orange-50 text-orange-700',
  JEFAOGP: 'bg-cyan-50 text-cyan-700',
}

export function UsuariosModule({ usuarios }: { usuarios: Usuario[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ email: '', name: '', role: 'BRIGADISTA', password: '' })

  const submit = () => {
    if (!form.email.trim() || !form.name.trim() || form.password.length < 8) {
      toast.error('Completa nombre, email y una contraseña de 8+ caracteres.')
      return
    }
    startTransition(async () => {
      const res = await crearUsuario(form)
      if (res?.message) toast.error(res.message)
      else { toast.success('Usuario creado.'); setShowForm(false); setForm({ email: '', name: '', role: 'BRIGADISTA', password: '' }); router.refresh() }
    })
  }

  const toggle = (u: Usuario) =>
    startTransition(async () => {
      const res = await toggleUsuarioActivo(u.id, u.estado)
      if (res?.message) toast.error(res.message)
      else { toast.success('Estado actualizado.'); router.refresh() }
    })

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[var(--caritas-green)]/10 rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5 text-[var(--caritas-green)]" />
          </div>
          <div>
            <h1 className="text-[var(--caritas-text)]">Gestión de Usuarios</h1>
            <p className="text-sm text-gray-600">Credenciales y roles del sistema</p>
          </div>
        </div>
        <button onClick={() => setShowForm((s) => !s)} className="flex items-center gap-2 px-4 py-2 bg-[var(--caritas-green)] text-white rounded">
          <Plus className="w-4 h-4" /> Nuevo usuario
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-[var(--caritas-border)] rounded-xl p-5 mb-6 grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-gray-600">Nombre completo</span>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 w-full px-3 py-2 border border-[var(--caritas-border)] rounded text-sm" />
          </label>
          <label className="block">
            <span className="text-xs text-gray-600">Email</span>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1 w-full px-3 py-2 border border-[var(--caritas-border)] rounded text-sm" />
          </label>
          <label className="block">
            <span className="text-xs text-gray-600">Rol</span>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="mt-1 w-full px-3 py-2 border border-[var(--caritas-border)] rounded text-sm bg-white">
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-gray-600">Contraseña (8+ caracteres)</span>
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="mt-1 w-full px-3 py-2 border border-[var(--caritas-border)] rounded text-sm" />
          </label>
          <div className="md:col-span-2 flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-[var(--caritas-border)] rounded">Cancelar</button>
            <button onClick={submit} disabled={pending} className="px-4 py-2 bg-[var(--caritas-green)] text-white rounded disabled:opacity-50">Guardar</button>
          </div>
        </div>
      )}

      <div className="bg-white border border-[var(--caritas-border)] rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-2">Usuario</th>
              <th className="text-left px-4 py-2">Email</th>
              <th className="text-left px-4 py-2">Rol</th>
              <th className="text-left px-4 py-2">Estado</th>
              <th className="text-right px-4 py-2">Acción</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id} className="border-t border-[var(--caritas-border)]">
                <td className="px-4 py-2 font-medium text-[var(--caritas-text)]">{u.name}</td>
                <td className="px-4 py-2 text-gray-600">{u.email}</td>
                <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded text-xs ${ROLE_BADGE[u.role] ?? 'bg-gray-100 text-gray-700'}`}>{ROLE_LABEL[u.role] ?? u.role}</span></td>
                <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded text-xs ${u.estado === 'ACTIVO' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{u.estado}</span></td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => toggle(u)} disabled={pending} className={`p-1.5 rounded ${u.estado === 'ACTIVO' ? 'text-gray-500 hover:bg-gray-100' : 'text-green-600 hover:bg-green-50'} disabled:opacity-50`} title={u.estado === 'ACTIVO' ? 'Desactivar' : 'Activar'}>
                    <Power className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {usuarios.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-gray-500">Sin usuarios.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
