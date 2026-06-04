'use client'

import { useMemo, useState } from 'react'
import { History, Search } from 'lucide-react'

export type AuditEntry = {
  id: string
  fecha: string
  usuario: string
  estadoAnterior: string | null
  estadoNuevo: string
  motivo: string | null
  casoCodigo: string | null
  casoTitulo: string | null
}

export function AuditoriaModule({ entries }: { entries: AuditEntry[] }) {
  const [query, setQuery] = useState('')
  const [estadoFilter, setEstadoFilter] = useState('')

  const estados = useMemo(() => Array.from(new Set(entries.map((e) => e.estadoNuevo))), [entries])

  const filtered = entries.filter((e) => {
    const q = query.toLowerCase()
    const text = `${e.casoCodigo ?? ''} ${e.casoTitulo ?? ''} ${e.usuario} ${e.motivo ?? ''}`.toLowerCase()
    return (!q || text.includes(q)) && (!estadoFilter || e.estadoNuevo === estadoFilter)
  })

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-[var(--caritas-green)]/10 rounded-lg flex items-center justify-center">
          <History className="w-5 h-5 text-[var(--caritas-green)]" />
        </div>
        <div>
          <h1 className="text-[var(--caritas-text)]">Auditoría / Trazabilidad</h1>
          <p className="text-sm text-gray-600">Historial de cambios de estado de las incidencias</p>
        </div>
      </div>

      <div className="bg-white border border-[var(--caritas-border)] rounded-xl">
        <div className="p-4 border-b border-[var(--caritas-border)] flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por incidencia, usuario o motivo"
              className="pl-9 pr-3 py-2 w-full border border-[var(--caritas-border)] rounded text-sm"
            />
          </div>
          <select value={estadoFilter} onChange={(e) => setEstadoFilter(e.target.value)} className="px-3 py-2 border border-[var(--caritas-border)] rounded text-sm bg-white">
            <option value="">Todos los estados</option>
            {estados.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-2">Fecha</th>
                <th className="text-left px-4 py-2">Usuario</th>
                <th className="text-left px-4 py-2">Incidencia</th>
                <th className="text-left px-4 py-2">Cambio</th>
                <th className="text-left px-4 py-2">Motivo</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-t border-[var(--caritas-border)]">
                  <td className="px-4 py-2 text-xs text-gray-500">{new Date(e.fecha).toLocaleString('es-PE')}</td>
                  <td className="px-4 py-2">{e.usuario}</td>
                  <td className="px-4 py-2"><div className="text-xs text-gray-500">{e.casoCodigo}</div><div>{e.casoTitulo}</div></td>
                  <td className="px-4 py-2 text-xs">
                    {e.estadoAnterior ? <>{e.estadoAnterior} → <span className="font-medium">{e.estadoNuevo}</span></> : <span className="font-medium">{e.estadoNuevo}</span>}
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-600">{e.motivo ?? ''}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-gray-500">Sin entradas de auditoría.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
