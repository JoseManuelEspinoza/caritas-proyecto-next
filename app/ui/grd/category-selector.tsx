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

  const handleChip = (cat: string) => {
    if (disabled) return
    if (cat === 'Otros') { setShowCustom(true); onChange('') }
    else { setShowCustom(false); onChange(cat) }
  }

  const isSelected = (cat: string) =>
    cat === 'Otros' ? isOtros || showCustom : value === cat

  const base = 'px-3 py-1.5 text-xs rounded-full border-2 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed'

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => handleChip(cat)}
            disabled={disabled}
            className={`${base} ${
              isSelected(cat)
                ? 'bg-[#009850] text-white border-[#009850]'
                : 'bg-white text-gray-600 border-gray-200 hover:border-[#009850]/50'
            }`}
          >
            {cat}
          </button>
        ))}
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
