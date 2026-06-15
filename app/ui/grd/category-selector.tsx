"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Search, ChevronDown, X } from "lucide-react";

// Respaldo cuando el catálogo "Tipos de Evento" (módulo Catálogos) está vacío.
const CATEGORIES_FALLBACK = [
  "Incendios",
  "Inundaciones",
  "Derrumbes",
  "Deslizamientos",
  "Sismos",
  "Tsunamis",
  "Vendaval / Vientos fuertes",
  "Colapso de infraestructura",
  "Pérdida parcial de la vivienda",
  "Lluvias intensas",
  "Otros",
];

interface Props {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  error?: boolean;
  /** Catálogo "Tipos de Evento"; si viene vacío se usa el respaldo estático. */
  categorias?: string[];
}

export function CategorySelector({ value, onChange, disabled, error, categorias }: Props) {
  const CATEGORIES = categorias?.length
    ? categorias.includes("Otros")
      ? categorias
      : [...categorias, "Otros"]
    : CATEGORIES_FALLBACK;
  const [showCustom, setShowCustom] = useState(false);
  const isOtros = !!value && !CATEGORIES.includes(value);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Valor mostrado en la caja del desplegable
  const selectedLabel = isOtros ? "Otros" : value;

  const filtered = query.trim()
    ? CATEGORIES.filter((c) => c.toLowerCase().includes(query.toLowerCase()))
    : CATEGORIES;

  const handleSelect = useCallback(
    (v: string) => {
      if (v === "Otros") {
        setShowCustom(true);
        onChange("");
      } else {
        setShowCustom(false);
        onChange(v);
      }
      setQuery("");
      setOpen(false);
      setCursor(-1);
    },
    [onChange]
  );

  const clear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setShowCustom(false);
      onChange("");
      setQuery("");
      setCursor(-1);
      inputRef.current?.focus();
    },
    [onChange]
  );

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
        setCursor(-1);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (cursor >= 0 && listRef.current) {
      const item = listRef.current.children[cursor] as HTMLElement | undefined;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [cursor]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setCursor((c) => Math.min(c + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (cursor >= 0 && filtered[cursor]) handleSelect(filtered[cursor]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
      setCursor(-1);
    } else if (e.key === "Tab") {
      setOpen(false);
      setQuery("");
      setCursor(-1);
    }
  }

  const displayValue = !open && selectedLabel ? selectedLabel : undefined;

  return (
    <div className="space-y-2">
      <div ref={containerRef} className="relative">
        <div
          className={`w-full flex items-center px-3 py-2.5 bg-white border rounded-lg text-sm focus-within:ring-2 focus-within:ring-[#009850]/20 focus-within:border-[#009850] transition-colors ${error ? "border-red-500 ring-1 ring-red-300" : "border-[#DDDDDD]"} ${disabled ? "bg-gray-50 cursor-not-allowed" : "cursor-text"}`}
          onClick={() => {
            if (disabled) return;
            setOpen((o) => !o);
            if (!open) inputRef.current?.focus();
          }}
        >
          {open && <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mr-2" />}
          {displayValue ? (
            <span className="flex-1 text-gray-800 truncate">{displayValue}</span>
          ) : (
            <input
              ref={inputRef}
              type="text"
              value={query}
              placeholder={open ? "Escribe para filtrar…" : "Seleccionar categoría..."}
              onChange={(e) => {
                setQuery(e.target.value);
                setCursor(-1);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              className="flex-1 outline-none bg-transparent placeholder:text-gray-400 min-w-0"
              autoComplete="off"
            />
          )}
          {selectedLabel && !disabled ? (
            <button
              type="button"
              onClick={clear}
              className="ml-1 text-gray-400 hover:text-gray-600 flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <ChevronDown
              className={`w-4 h-4 text-gray-400 flex-shrink-0 ml-1 transition-transform ${open ? "rotate-180" : ""}`}
            />
          )}
        </div>

        {open && (
          <ul
            ref={listRef}
            className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-auto text-sm"
          >
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-gray-400 text-center">Sin resultados</li>
            ) : (
              filtered.map((opt, i) => (
                <li
                  key={opt}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(opt);
                  }}
                  onMouseEnter={() => setCursor(i)}
                  className={`px-4 py-2.5 cursor-pointer border-b border-gray-50 last:border-0 ${
                    i === cursor ? "bg-[#009850]/10 text-[#009850] font-medium" : "hover:bg-gray-50"
                  } ${opt === selectedLabel ? "font-semibold" : ""}`}
                >
                  {opt}
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      {(showCustom || isOtros) && (
        <input
          type="text"
          placeholder="Especificar otro tipo de incidente"
          value={isOtros || showCustom ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          maxLength={60}
          className="w-full px-4 py-2.5 bg-white border border-[#DDDDDD] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009850]/20 focus:border-[#009850] transition-colors"
        />
      )}
    </div>
  );
}
