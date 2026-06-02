'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Database, Plus, Pencil, Power, FolderPlus, Check, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

// Acciones del servidor (Backend)
import {
  crearCatalogo,
  agregarItemCatalogo,
  editarItemCatalogo,
  toggleItemCatalogo,
} from '@/app/actions/catalogos'

// Tipos definidos por tu equipo
type Detalle = { id: string; codigo: string; valor: string; descripcion: string | null; estado: string }
type Catalogo = { id: string; nombreCatalogo: string; descripcion: string | null; estado: string }

interface Props {
  catalogos: Catalogo[]
  detallesByCatalogo: Record<string, Detalle[]>
}

/** Genera un código corto a partir del valor (el DER exige código en cada detalle). */
function slugCodigo(valor: string): string {
  return valor.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30) || `IT_${Date.now()}`
}

// Nombres amigables para las pestañas
const CATALOG_LABELS: Record<string, string> = {
  "TIPOS_EVENTO": "Tipos de Evento",
  "FUENTES_ALERTA": "Fuentes de Alerta",
  "GRUPOS_VULNERABLES": "Grupos Vulnerables",
  "NECESIDADES": "Necesidades Urgentes",
  "NIVELES_AFECTACION": "Niveles de Afectación"
};

export function CatalogosModule({ catalogos, detallesByCatalogo }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  
  const [activeId, setActiveId] = useState<string | null>(catalogos[0]?.id ?? null)
  const [newValue, setNewValue] = useState('')
  const [newCatalog, setNewCatalog] = useState('')
  const [showNewCatalog, setShowNewCatalog] = useState(false)
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(null)

  const items = activeId ? detallesByCatalogo[activeId] ?? [] : []
  const activeCatalogo = catalogos.find((c) => c.id === activeId) ?? null

  // Envoltorio para manejar estados de carga y notificaciones
  const run = (fn: () => Promise<{ message?: string } | void>, ok: string) =>
    startTransition(async () => {
      const res = await fn()
      if (res?.message && /no se pudo|ya existe|obligatori|no tiene/i.test(res.message)) {
        toast.error(res.message)
      } else {
        toast.success(ok)
        setEditing(null)
      }
      router.refresh()
    })

  const submitNew = () => {
    if (!newValue.trim() || !activeId) return
    const valor = newValue.trim()
    setNewValue('')
    run(() => agregarItemCatalogo({ idCatalogoGRD: activeId, codigo: slugCodigo(valor), valor }), 'Ítem agregado.')
  }

  const submitEdit = () => {
    if (!editing || !editing.value.trim()) return
    const { id, value } = editing
    run(() => editarItemCatalogo(id, value.trim()), 'Ítem actualizado.')
  }

  const submitNewCatalog = () => {
    if (!newCatalog.trim()) return
    const nombre = newCatalog.trim()
    setNewCatalog('')
    setShowNewCatalog(false)
    run(() => crearCatalogo(nombre), 'Catálogo creado.')
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      
      {/* 1. Encabezado y Botones Principales */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[var(--caritas-green)]/10 rounded-xl flex items-center justify-center">
            <Database className="w-6 h-6 text-[var(--caritas-green)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--caritas-text)]">Catálogos del Sistema</h1>
            <p className="text-sm text-gray-500">Datos maestros sincronizados con AWS RDS</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {pending && (
            <div className="flex items-center text-sm font-medium text-[var(--caritas-green)] bg-green-50 px-3 py-1.5 rounded-full border border-green-200 shadow-sm">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Procesando...
            </div>
          )}
          <button
            onClick={() => setShowNewCatalog((s) => !s)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-[var(--caritas-border)] text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors shadow-sm font-medium"
          >
            <FolderPlus className="w-4 h-4" /> Nuevo catálogo
          </button>
        </div>
      </div>

      {/* 2. Formulario: Crear Catálogo Maestro */}
      {showNewCatalog && (
        <div className="bg-gray-50 border border-[var(--caritas-border)] rounded-xl p-4 flex flex-wrap gap-3 items-center shadow-sm">
          <input
            value={newCatalog}
            onChange={(e) => setNewCatalog(e.target.value)}
            placeholder="Nombre del nuevo catálogo (ej. Tipos de Evento)"
            className="flex-1 min-w-[220px] px-3 py-2 border border-[var(--caritas-border)] rounded-lg text-sm outline-none focus:border-[var(--caritas-green)] shadow-sm"
            onKeyDown={(e) => e.key === 'Enter' && submitNewCatalog()}
            disabled={pending}
            autoFocus
          />
          <button 
            onClick={submitNewCatalog} 
            disabled={pending || !newCatalog.trim()} 
            className="px-5 py-2 bg-[var(--caritas-green)] text-white font-medium rounded-lg text-sm disabled:opacity-50 hover:bg-green-700 transition-colors shadow-sm"
          >
            Crear Catálogo
          </button>
        </div>
      )}

      {/* 3. Área Principal: Pestañas y Tablas */}
      {catalogos.length === 0 ? (
        <div className="bg-white border border-[var(--caritas-border)] rounded-xl p-12 text-center text-gray-500 shadow-sm">
          No hay catálogos aún. Crea el primero haciendo clic en "Nuevo catálogo".
        </div>
      ) : (
        <>
          {/* Fila de Pestañas */}
          <div className="flex flex-wrap gap-2">
            {catalogos.map((c) => {
              const label = CATALOG_LABELS[c.nombreCatalogo] || c.nombreCatalogo.replace(/_/g, ' ');
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setActiveId(c.id);
                    setNewValue('');
                    setEditing(null);
                  }}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all shadow-sm ${
                    activeId === c.id 
                      ? 'bg-[var(--caritas-green)] text-white' 
                      : 'bg-white border border-[var(--caritas-border)] text-gray-700 hover:bg-gray-50'
                  }`}
                  disabled={pending}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Tarjeta con Contenido de la Pestaña Activa */}
          {activeCatalogo && (
            <div className="bg-white border border-[var(--caritas-border)] rounded-xl p-5 md:p-6 shadow-sm">
              
              <div className="mb-6">
                <h2 className="text-xl font-bold text-[var(--caritas-text)]">
                  {CATALOG_LABELS[activeCatalogo.nombreCatalogo] || activeCatalogo.nombreCatalogo}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {activeCatalogo.descripcion || "Administra los ítems disponibles para este catálogo."}
                </p>
              </div>

              {/* Formulario Agregar Ítem */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6 bg-gray-50 p-4 rounded-lg border border-[var(--caritas-border)]">
                <input
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitNew()}
                  placeholder="Escribe un nuevo valor..."
                  className="flex-1 px-3 py-2 border border-[var(--caritas-border)] rounded-lg text-sm outline-none focus:border-[var(--caritas-green)] bg-white shadow-sm"
                  disabled={pending}
                />
                <button 
                  onClick={submitNew} 
                  disabled={pending || !newValue.trim()} 
                  className="flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-2 bg-[var(--caritas-green)] hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" /> Agregar
                </button>
              </div>

              {/* Tabla de Registros */}
              <div className="rounded-lg border border-[var(--caritas-border)] overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 border-b border-[var(--caritas-border)]">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-gray-700 w-[150px]">Código</th>
                      <th className="px-4 py-3 font-semibold text-gray-700">Valor Mostrado</th>
                      <th className="px-4 py-3 font-semibold text-gray-700 text-center w-[120px]">Estado</th>
                      <th className="px-4 py-3 font-semibold text-gray-700 text-right w-[120px]">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--caritas-border)] bg-white">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                          No hay registros en este catálogo.
                        </td>
                      </tr>
                    ) : (
                      items.map((it) => (
                        <tr key={it.id} className="hover:bg-gray-50/50 transition-colors">
                          
                          {/* Código Técnico */}
                          <td className="px-4 py-3 font-mono text-xs text-gray-500 align-middle">
                            {it.codigo}
                          </td>

                          {/* Valor (Editable o Texto) */}
                          <td className="px-4 py-3 align-middle">
                            {editing?.id === it.id ? (
                              <input 
                                value={editing.value} 
                                onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                                onKeyDown={(e) => e.key === 'Enter' && submitEdit()}
                                className="w-full max-w-sm px-2 py-1 border border-[var(--caritas-border)] rounded focus:border-[var(--caritas-green)] outline-none"
                                autoFocus
                                disabled={pending}
                              />
                            ) : (
                              <span className={`font-medium ${it.estado !== 'ACTIVO' ? "text-gray-400 line-through" : "text-gray-900"}`}>
                                {it.valor}
                              </span>
                            )}
                          </td>

                          {/* Badge de Estado */}
                          <td className="px-4 py-3 text-center align-middle">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${
                              it.estado === 'ACTIVO' 
                                ? "bg-green-50 text-green-700 border-green-200" 
                                : "bg-gray-50 text-gray-500 border-gray-200"
                            }`}>
                              {it.estado === 'ACTIVO' ? "Activo" : "Inactivo"}
                            </span>
                          </td>

                          {/* Botones de Acción */}
                          <td className="px-4 py-3 text-right align-middle">
                            {editing?.id === it.id ? (
                              <div className="flex justify-end gap-1">
                                <button 
                                  onClick={submitEdit} 
                                  disabled={pending} 
                                  className="p-1.5 text-green-600 hover:bg-green-100 rounded transition-colors"
                                  title="Guardar"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => setEditing(null)} 
                                  disabled={pending} 
                                  className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                                  title="Cancelar"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex justify-end gap-1">
                                <button 
                                  onClick={() => setEditing({ id: it.id, value: it.valor })}
                                  disabled={it.estado !== 'ACTIVO' || pending}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                                  title="Editar"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => run(() => toggleItemCatalogo(it.id), 'Estado actualizado.')}
                                  disabled={pending}
                                  className={`p-1.5 rounded transition-colors ${
                                    it.estado === 'ACTIVO' 
                                      ? "text-gray-400 hover:text-red-600 hover:bg-red-50" 
                                      : "text-green-600 hover:bg-green-50"
                                  }`}
                                  title={it.estado === 'ACTIVO' ? "Desactivar" : "Activar"}
                                >
                                  <Power className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}