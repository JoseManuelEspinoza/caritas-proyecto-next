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

// ─── Configuración por tipo de documento ──────────────────────────────────────

const DOC_CONFIG: Record<string, { max: number; onlyDigits: boolean; placeholder: string; hint: string }> = {
  DNI:       { max: 8,  onlyDigits: true,  placeholder: "12345678",  hint: "8 dígitos" },
  CE:        { max: 12, onlyDigits: true,  placeholder: "123456789", hint: "9 a 12 dígitos" },
  Pasaporte: { max: 12, onlyDigits: false, placeholder: "A12345678", hint: "6 a 12 caracteres alfanuméricos" },
  Otro:      { max: 20, onlyDigits: false, placeholder: "—",         hint: "" },
};

const PHONE_CODES = [
  { code: "+51", label: "PE", max: 9 },
  { code: "+52", label: "MX", max: 10 },
  { code: "+54", label: "AR", max: 10 },
  { code: "+56", label: "CL", max: 9 },
  { code: "+57", label: "CO", max: 10 },
];

const SOLO_NUMEROS_SIMBOLOS = /[\d!@#$%^&*()+=[\]{};:"\\|<>?/]/g;

// ─── Modal de persona ─────────────────────────────────────────────────────────

export function PersonaModal({
  onSave,
  onClose,
  editing,
  familias,
  activeFamiliaId,
  situaciones = SITUACIONES_ESPECIALES_MODAL,
}: {
  onSave: (p: PersonaForm) => void;
  onClose: () => void;
  editing?: PersonaForm;
  familias: FamiliaForm[];
  activeFamiliaId?: string;
  situaciones?: string[];
}) {
  // Separar código de país del celular al editar
  const _celStored = editing?.celular ?? "";
  const _celParsed = _celStored.match(/^(\+\d+)\s+(.*)$/);
  const [celCodigo, setCelCodigo] = useState(_celParsed?.[1] ?? "+51");
  const [celNumero, setCelNumero] = useState(
    _celParsed ? _celParsed[2].replace(/\D/g, "") : _celStored.replace(/\D/g, "")
  );

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
      comentario: "",
      familiaId: activeFamiliaId,
    }
  );

  function set(key: keyof PersonaForm, value: string) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  function handleDocChange(val: string) {
    const cfg = DOC_CONFIG[form.tipoDoc] ?? DOC_CONFIG.Otro;
    const clean = cfg.onlyDigits
      ? val.replace(/\D/g, "").slice(0, cfg.max)
      : val.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, cfg.max);
    set("dni", clean);
  }

  function handleTipoDocChange(tipo: string) {
    set("tipoDoc", tipo);
    set("dni", ""); // limpiar al cambiar tipo
  }

  function handleNombreChange(val: string) {
    set("nombre", val.replace(SOLO_NUMEROS_SIMBOLOS, "").slice(0, 60));
  }

  function handleApellidoChange(key: "apellidoPaterno" | "apellidoMaterno", val: string) {
    set(key, val.replace(SOLO_NUMEROS_SIMBOLOS, "").slice(0, 40));
  }

  function handleEdadChange(val: string) {
    const digits = val.replace(/\D/g, "").slice(0, 3);
    if (digits === "" || (Number(digits) >= 0 && Number(digits) <= 120)) {
      set("edad", digits);
    }
  }

  function handleCelChange(val: string) {
    const phoneEntry = PHONE_CODES.find((p) => p.code === celCodigo);
    const max = phoneEntry?.max ?? 12;
    const digits = val.replace(/\D/g, "").slice(0, max);
    setCelNumero(digits);
    set("celular", digits ? `${celCodigo} ${digits}` : "");
  }

  function handleCelCodigoChange(code: string) {
    setCelCodigo(code);
    const phoneEntry = PHONE_CODES.find((p) => p.code === code);
    const max = phoneEntry?.max ?? 12;
    const trimmed = celNumero.slice(0, max);
    setCelNumero(trimmed);
    set("celular", trimmed ? `${code} ${trimmed}` : "");
  }

  function validateDocumento(tipo: string, valor: string): string | null {
    const v = (valor ?? "").trim();
    if (!v) return null; // documento opcional
    if (tipo === "DNI") {
      if (v.length < 8) return "El DNI debe tener 8 dígitos.";
      return null;
    }
    if (tipo === "CE") {
      if (v.length < 9) return "El CE debe tener al menos 9 dígitos.";
      return null;
    }
    if (tipo === "Pasaporte") {
      if (v.length < 6) return "El pasaporte debe tener al menos 6 caracteres.";
      return null;
    }
    return null;
  }

  function handleSubmit() {
    if (!form.nombre.trim()) { toast.error("Ingresa el nombre de la persona"); return; }
    if (!form.edad) { toast.error("Ingresa la edad"); return; }
    const docErr = validateDocumento(form.tipoDoc, form.dni);
    if (docErr) { toast.error(docErr); return; }
    onSave({ ...form, id: editing?.id || `PER-${Date.now()}` });
    onClose();
  }

  const familiaActual = familias.find((f) => f.id === activeFamiliaId);
  const docCfg = DOC_CONFIG[form.tipoDoc] ?? DOC_CONFIG.Otro;
  const celMax = PHONE_CODES.find((p) => p.code === celCodigo)?.max ?? 12;

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
          {/* Documento */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Tipo Doc.</label>
              <select
                value={form.tipoDoc}
                onChange={(e) => handleTipoDocChange(e.target.value)}
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
                inputMode={docCfg.onlyDigits ? "numeric" : "text"}
                value={form.dni}
                onChange={(e) => handleDocChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
                placeholder={docCfg.placeholder}
                maxLength={docCfg.max}
              />
              {docCfg.hint && (
                <p className="text-[10px] text-gray-400 mt-0.5">{docCfg.hint}</p>
              )}
            </div>
          </div>

          {/* Nombres */}
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">
              Nombres <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => handleNombreChange(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
              placeholder="Ej: María Elena"
              maxLength={60}
            />
          </div>

          {/* Apellidos */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Apellido Paterno</label>
              <input
                type="text"
                value={form.apellidoPaterno}
                onChange={(e) => handleApellidoChange("apellidoPaterno", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
                maxLength={40}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Apellido Materno</label>
              <input
                type="text"
                value={form.apellidoMaterno}
                onChange={(e) => handleApellidoChange("apellidoMaterno", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
                maxLength={40}
              />
            </div>
          </div>

          {/* Edad y Género */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">
                Edad <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={form.edad}
                onChange={(e) => handleEdadChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
                placeholder="0"
                maxLength={3}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Género</label>
              <select
                value={form.genero}
                onChange={(e) => set("genero", e.target.value)}
                className="w-full px-2 py-2 text-sm border border-gray-200 rounded-lg"
              >
                {["Femenino", "Masculino"].map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Celular y Parentesco */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Celular</label>
              <div className="flex items-stretch gap-1.5">
                <div className="relative flex-shrink-0">
                  <select
                    value={celCodigo}
                    onChange={(e) => handleCelCodigoChange(e.target.value)}
                    className="h-full px-2 py-2 text-xs border border-gray-200 rounded-lg appearance-none pr-5 bg-white"
                    aria-label="Código de país"
                  >
                    {PHONE_CODES.map((p) => (
                      <option key={p.code} value={p.code}>{p.label} {p.code}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={celNumero}
                  onChange={(e) => handleCelChange(e.target.value)}
                  className="flex-1 min-w-0 px-2 py-2 text-sm border border-gray-200 rounded-lg"
                  placeholder="987654321"
                  maxLength={celMax}
                />
              </div>
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

          {/* Situación especial */}
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Situación especial</label>
            <SearchableSelect
              value={form.situacionActual}
              onChange={(v) => set("situacionActual", v)}
              options={situaciones}
              placeholder="Ninguna / buscar…"
            />
          </div>

          {/* Comentario individual */}
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Comentario</label>
            <textarea
              rows={2}
              value={form.comentario ?? ""}
              onChange={(e) => set("comentario", e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#009850]/20 focus:border-[#009850]"
              placeholder="Comentario u observación de esta persona (opcional)"
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
