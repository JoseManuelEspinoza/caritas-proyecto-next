"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, ChevronDown, Search } from "lucide-react";
import { toast } from "sonner";
import type { PersonaForm, FamiliaForm } from "@/app/actions/incidents";

export const PARENTESCOS_MODAL = [
  "Jefe(a) de Hogar",
  "Padre",
  "Madre",
  "Hijo(a)",
  "Nieto(a)",
  "Abuelo(a)",
  "Tío(a)",
  "Cónyuge",
  "Otro",
];

export const SITUACIONES_ESPECIALES_MODAL = [
  "Gestante",
  "Discapacitado",
  "Con Lactancia",
  "Enfermo",
  "Herido",
  "Enfermo crónico",
  "Adulto mayor",
];

// ─── SearchableSelect ─────────────────────────────────────────────────────────

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Seleccionar",
  className = "",
  error = false,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
  error?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = query.trim()
    ? options.filter((o) => o.toLowerCase().includes(query.toLowerCase()))
    : options;

  const select = useCallback(
    (opt: string) => {
      onChange(opt);
      setQuery("");
      setOpen(false);
      setCursor(-1);
    },
    [onChange]
  );

  const clear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
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
      if (cursor >= 0 && filtered[cursor]) select(filtered[cursor]);
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

  const displayValue = !open && value ? value : undefined;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div
        className={`w-full flex items-center px-3 py-2.5 bg-white border rounded-lg text-sm focus-within:ring-2 focus-within:ring-[#009850]/20 focus-within:border-[#009850] transition-colors cursor-text ${
          error ? "border-red-500 ring-1 ring-red-300" : "border-[#DDDDDD]"
        }`}
        onClick={() => {
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
            placeholder={open ? "Escribe para filtrar…" : placeholder}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor(-1);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            className="flex-1 outline-none bg-transparent placeholder:text-gray-400 min-w-0"
            autoComplete="off"
          />
        )}
        {value ? (
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
                  select(opt);
                }}
                onMouseEnter={() => setCursor(i)}
                className={`px-4 py-2.5 cursor-pointer border-b border-gray-50 last:border-0 ${
                  i === cursor ? "bg-[#009850]/10 text-[#009850] font-medium" : "hover:bg-gray-50"
                } ${opt === value ? "font-semibold" : ""}`}
              >
                {opt}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

// ─── Modal de persona ─────────────────────────────────────────────────────────

export function PersonaModal({
  onSave,
  onClose,
  editing,
  familias,
  activeFamiliaId,
}: {
  onSave: (p: PersonaForm) => void;
  onClose: () => void;
  editing?: PersonaForm;
  familias: FamiliaForm[];
  activeFamiliaId?: string;
}) {
  const [form, setForm] = useState<PersonaForm>(
    editing ?? {
      id: `PER-${Date.now()}`,
      tipoDoc: "DNI",
      dni: "",
      nombre: "",
      apellidoPaterno: "",
      apellidoMaterno: "",
      edad: "",
      genero: "Femenino",
      celular: "",
      parentesco: "",
      situacionActual: "",
      familiaId: activeFamiliaId,
    }
  );

  function set(key: keyof PersonaForm, value: string) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  function validateDocumento(tipo: string, valor: string): string | null {
    const v = (valor ?? "").trim();
    if (tipo === "DNI") {
      const digits = v.replace(/\D/g, "");
      if (digits.length < 8) return "El DNI debe tener al menos 8 dígitos.";
      if (digits.length > 9) return "El DNI no debe exceder 9 dígitos.";
      return null;
    }
    if (tipo === "CE") {
      const digits = v.replace(/\D/g, "");
      if (digits.length < 9) return "El CE debe tener al menos 9 dígitos.";
      if (digits.length > 12) return "El CE no debe exceder 12 dígitos.";
      return null;
    }
    if (tipo === "Pasaporte") {
      const alnum = v.replace(/[^A-Za-z0-9]/g, "");
      if (alnum.length < 6) return "El pasaporte debe tener al menos 6 caracteres.";
      if (alnum.length > 12) return "El pasaporte no debe exceder 12 caracteres.";
      return null;
    }
    return null;
  }

  function handleSubmit() {
    if (!form.nombre.trim()) {
      toast.error("Ingresa el nombre de la persona");
      return;
    }
    if (!form.edad) {
      toast.error("Ingresa la edad");
      return;
    }
    const docErr = validateDocumento(form.tipoDoc, form.dni);
    if (docErr) {
      toast.error(docErr);
      return;
    }
    onSave({ ...form, id: editing?.id || `PER-${Date.now()}` });
    onClose();
  }

  const familiaActual = familias.find((f) => f.id === activeFamiliaId);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-auto shadow-xl">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">
            {editing
              ? "Editar persona"
              : activeFamiliaId
                ? `Agregar integrante — ${familiaActual?.nombre ?? ""}`
                : "Agregar persona afectada"}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:bg-gray-100 rounded p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {activeFamiliaId && (
          <div className="bg-blue-50 border-b border-blue-100 px-4 py-2 text-xs text-blue-800">
            Integrante de: <strong>{familiaActual?.nombre}</strong>
          </div>
        )}

        <div className="p-4 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Tipo Doc.</label>
              <select
                value={form.tipoDoc}
                onChange={(e) => set("tipoDoc", e.target.value)}
                className="w-full px-2 py-2 text-sm border border-gray-200 rounded-lg"
              >
                {["DNI", "CE", "Pasaporte", "Otro"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-600 block mb-1">N° Documento</label>
              <input
                type="text"
                value={form.dni}
                onChange={(e) => {
                  const val = e.target.value;
                  if (form.tipoDoc === "DNI" || form.tipoDoc === "CE") {
                    set("dni", val.replace(/\D/g, "").slice(0, 12));
                  } else {
                    set("dni", val.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12));
                  }
                }}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
                placeholder={
                  form.tipoDoc === "DNI" ? "12345678" : form.tipoDoc === "CE" ? "123456789" : "A12345678"
                }
                maxLength={12}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">
              Nombres <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => set("nombre", e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
              placeholder="Ej: María Elena"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Apellido Paterno</label>
              <input
                type="text"
                value={form.apellidoPaterno}
                onChange={(e) => set("apellidoPaterno", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Apellido Materno</label>
              <input
                type="text"
                value={form.apellidoMaterno}
                onChange={(e) => set("apellidoMaterno", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">
                Edad <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={form.edad}
                onChange={(e) => set("edad", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
                placeholder="0"
                min="0"
                max="120"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Género</label>
              <select
                value={form.genero}
                onChange={(e) => set("genero", e.target.value)}
                className="w-full px-2 py-2 text-sm border border-gray-200 rounded-lg"
              >
                {["Femenino", "Masculino", "Otro", "Prefiere no decir"].map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Celular</label>
              <input
                type="tel"
                value={form.celular}
                onChange={(e) => set("celular", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
                placeholder="987654321"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Parentesco</label>
              <SearchableSelect
                value={form.parentesco}
                onChange={(v) => set("parentesco", v)}
                options={PARENTESCOS_MODAL}
                placeholder="Buscar parentesco…"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Situación especial</label>
            <SearchableSelect
              value={form.situacionActual}
              onChange={(v) => set("situacionActual", v)}
              options={SITUACIONES_ESPECIALES_MODAL}
              placeholder="Ninguna / buscar…"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 px-4 py-2 bg-[#009850] text-white rounded-lg text-sm font-medium"
            >
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Modal observaciones familia ──────────────────────────────────────────────

export function ObsFamiliaModal({
  familia,
  onSave,
  onClose,
}: {
  familia: FamiliaForm;
  onSave: (obs: string) => void;
  onClose: () => void;
}) {
  const [obs, setObs] = useState(familia.observaciones ?? "");
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full shadow-xl">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Observaciones — {familia.nombre}</h3>
          <button onClick={onClose} className="text-gray-500 hover:bg-gray-100 rounded p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <textarea
            rows={4}
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            placeholder="Ej: La familia vive en condición de hacinamiento, requieren apoyo urgente..."
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#009850]/20 focus:border-[#009850]"
          />
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                onSave(obs);
                onClose();
              }}
              className="flex-1 px-4 py-2 bg-[#009850] text-white rounded-lg text-sm font-medium"
            >
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
