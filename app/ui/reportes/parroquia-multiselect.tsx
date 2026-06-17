"use client";

import { useState, useRef, useEffect } from "react";
import { Map, ChevronDown, Check, X } from "lucide-react";

interface ParroquiaMultiSelectProps {
  parroquias: { id: string; nombre: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
}

export function ParroquiaMultiSelect({ parroquias, selected, onChange }: ParroquiaMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  const labelText =
    selected.length === 0
      ? "Todas las parroquias"
      : selected.length === 1
      ? parroquias.find((p) => p.id === selected[0])?.nombre ?? "1 seleccionada"
      : `${selected.length} parroquias`;

  return (
    <div ref={ref} className="relative">
      <label className="block text-xs font-semibold text-gray-600 mb-1">Parroquia</label>
      <div className="relative">
        <Map className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none z-10" />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          suppressHydrationWarning
          className={`cursor-pointer flex items-center justify-between gap-2 pl-9 pr-3 py-2 border rounded-lg text-sm bg-white min-w-[200px] w-full transition-colors ${
            open ? "border-[#009850] ring-2 ring-[#009850]/20" : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <span className={selected.length > 0 ? "text-gray-800 font-medium" : "text-gray-400"}>
            {labelText}
          </span>
          <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1 min-w-[220px] max-h-60 overflow-y-auto">
          {parroquias.map((p) => {
            const sel = selected.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggle(p.id)}
                className={`cursor-pointer w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors ${
                  sel ? "bg-[#009850]/8 text-[#009850] font-medium" : "text-gray-700 hover:bg-[#009850]/5"
                }`}
              >
                <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                  sel ? "bg-[#009850] border-[#009850]" : "border-gray-300"
                }`}>
                  {sel && <Check className="w-3 h-3 text-white" />}
                </span>
                <span className="truncate">{p.nombre}</span>
              </button>
            );
          })}
          {selected.length > 0 && (
            <>
              <div className="mx-3 my-1 border-t border-gray-100" />
              <button
                type="button"
                onClick={() => { onChange([]); setOpen(false); }}
                className="cursor-pointer w-full flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-[#009850]"
              >
                <X className="w-3 h-3" /> Limpiar selección
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
