'use client'

import { useState } from 'react'

const CATEGORIES = [
  'Incendios',
  'Inundaciones',
  'Derrumbes',
  'Deslizamientos',
  'Sismos',
  'Tsunamis',
  'Vendaval / Vientos fuertes',
  'Colapso de infraestructura',
  'Pérdida parcial de la vivienda',
  'Lluvias intensas',
  'Otros',
]

interface Props {
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}

export function CategorySelector({ value, onChange, disabled }: Props) {
  const [showCustom, setShowCustom] = useState(false)
  const isOtros = value && !CATEGORIES.includes(value)

  const handleChange = (v: string) => {
    if (disabled) return
    if (v === 'Otros') { setShowCustom(true); onChange('') }
    else { setShowCustom(false); onChange(v) }
  }

  return (
    <div className="space-y-2">
      <div>
        <select
          value={isOtros ? 'Otros' : value}
          onChange={(e) => handleChange(e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 bg-white border border-[#DDDDDD] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009850]/20 focus:border-[#009850]"
        >
          <option value="">Seleccionar categoría...</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>
      {(showCustom || isOtros) && (
        <input
          type="text"
          placeholder="Especificar otro tipo de incidente"
          value={isOtros || showCustom ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          maxLength={60}
          className="w-full px-4 py-2.5 bg-white border border-[#DDDDDD] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009850]/20 focus:border-[#009850] transition-colors"
        />
      )}
    </div>
  )
}
