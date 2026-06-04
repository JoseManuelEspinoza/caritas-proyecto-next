"use client";

import { useState, useTransition, useRef, useEffect, useCallback, type ChangeEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  FileText,
  X,
  MessageSquare,
  Users,
  ChevronDown,
  UserCircle,
  Info,
  Upload,
  Trash2,
  Plus,
  Edit3,
  Calendar,
  Search,
  MapPin,
} from "lucide-react";
import {
  parsePersonasTxt,
  parsePersonasRows,
  parsePersonasFlexible,
  validarPersona,
  GENEROS,
  PARENTESCOS as PARENTESCOS_CAT,
  SITUACIONES as SITUACIONES_CAT,
  TIPOS_DOC,
  type PersonaImportada,
} from "@/app/lib/import-personas";
import { extraerTextoPdf } from "@/app/lib/pdf-text";
import { consultarDni } from "@/app/actions/reniec";
// xlsx se carga de forma dinámica para no aumentar el bundle inicial.
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { CategorySelector } from "./category-selector";
import { LocationPicker } from "./location-picker";
import {
  createIncidente,
  updateIncidente,
  type PersonaForm,
  type FamiliaForm,
  type CreateIncidenteData,
} from "@/app/actions/incidents";

// ─── Catálogos ────────────────────────────────────────────────────────────────

const FUENTES_ALERTA = [
  "Párroco",
  "Agente Pastoral",
  "Líder Comunitario",
  "Brigadista parroquial",
  "Comunidad / Vecinos",
  "Defensa Civil",
  "Municipalidad",
  "Bomberos",
  "INDECI",
  "Policía Nacional",
  "Otro",
];

const DISTRITOS_LIMA = [
  "Ancón",
  "Ate",
  "Barranco",
  "Breña",
  "Carabayllo",
  "Chaclacayo",
  "Chorrillos",
  "Cieneguilla",
  "Comas",
  "El Agustino",
  "Independencia",
  "Jesús María",
  "La Molina",
  "La Victoria",
  "Lince",
  "Los Olivos",
  "Lurigancho",
  "Lurín",
  "Magdalena del Mar",
  "Miraflores",
  "Pachacámac",
  "Pueblo Libre",
  "Puente Piedra",
  "Rímac",
  "San Borja",
  "San Isidro",
  "San Juan de Lurigancho",
  "San Juan de Miraflores",
  "San Luis",
  "San Martín de Porres",
  "San Miguel",
  "Santa Anita",
  "Santiago de Surco",
  "Surquillo",
  "Villa El Salvador",
  "Villa María del Triunfo",
  "Lima Cercado",
];

const PARROQUIAS_LIMA = [
  "Parroquia San Juan Bautista",
  "Parroquia Nuestra Señora del Carmen",
  "Parroquia Santa Rosa",
  "Parroquia San Pedro",
  "Parroquia San José Obrero",
  "Parroquia Cristo Salvador",
  "Parroquia Sagrado Corazón de Jesús",
  "Parroquia Santa María de Fátima",
  "Parroquia Nuestra Señora del Pilar",
  "Parroquia San Francisco de Asís",
];

const NECESIDADES_CHIPS = [
  "Alimentos",
  "Ropa",
  "Atención médica",
  "Materiales de construcción",
  "Otros",
];
const SITUACIONES_ESPECIALES = [
  "Gestante",
  "Discapacitado",
  "Con Lactancia",
  "Enfermo",
  "Herido",
  "Enfermo crónico",
  "Adulto mayor",
];
const PARENTESCOS = [
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

// ─── SearchableSelect ─────────────────────────────────────────────────────────

function SearchableSelect({
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

  // Close on outside click
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

  // Scroll highlighted item into view
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

// ─── MultiSelect (desplegable con filtro + selección múltiple) ────────────────

function MultiSelect({
  values,
  onChange,
  options,
  placeholder = "Seleccionar…",
  accent = "orange",
  chips = "below",
}: {
  values: string[];
  onChange: (next: string[]) => void;
  options: string[];
  placeholder?: string;
  accent?: "orange" | "green";
  /** Dónde mostrar los seleccionados: 'below' (debajo) o 'none' (no mostrar). */
  chips?: "below" | "none";
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query.trim()
    ? options.filter((o) => o.toLowerCase().includes(query.toLowerCase()))
    : options;

  function toggle(opt: string) {
    onChange(values.includes(opt) ? values.filter((v) => v !== opt) : [...values, opt]);
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const chipCls =
    accent === "green"
      ? "bg-green-100 text-green-700 border-green-300"
      : "bg-orange-500 text-white border-orange-500";

  return (
    <div ref={containerRef} className="relative">
      <div
        className="w-full flex items-center gap-2 px-3 py-2.5 bg-white border border-[#DDDDDD] rounded-lg text-sm focus-within:ring-2 focus-within:ring-[#009850]/20 focus-within:border-[#009850] transition-colors cursor-text"
        onClick={() => {
          setOpen(true);
          inputRef.current?.focus();
        }}
      >
        <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="flex-1 min-w-0 outline-none bg-transparent placeholder:text-gray-400"
          autoComplete="off"
        />
        <ChevronDown
          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </div>

      {/* Chips seleccionados, debajo de la caja */}
      {chips === "below" && values.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {values.map((v) => (
            <span
              key={v}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${chipCls}`}
            >
              {v}
              <button type="button" onClick={() => toggle(v)} className="hover:opacity-70">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {open && (
        <ul className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-auto text-sm">
          {filtered.length === 0 ? (
            <li className="px-4 py-3 text-gray-400 text-center">Sin resultados</li>
          ) : (
            filtered.map((opt) => {
              const sel = values.includes(opt);
              return (
                <li
                  key={opt}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    toggle(opt);
                  }}
                  className={`px-4 py-2.5 cursor-pointer border-b border-gray-50 last:border-0 flex items-center gap-2 hover:bg-gray-50 ${sel ? "font-medium text-[#009850]" : ""}`}
                >
                  <span
                    className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${sel ? "bg-[#009850] border-[#009850]" : "border-gray-300"}`}
                  >
                    {sel && <span className="text-white text-[10px] leading-none">✓</span>}
                  </span>
                  {opt}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}

function nowLocal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

const inputCls =
  "w-full px-4 py-2.5 bg-white border border-[#DDDDDD] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#009850]/20 focus:border-[#009850] transition-colors";

// ─── Sección numerada ─────────────────────────────────────────────────────────

function FormSection({
  num,
  title,
  subtitle,
  children,
  action,
}: {
  num: number;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="pb-2 border-b-2 border-[#009850]/20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#009850] rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">{num}</span>
          </div>
          <h2 className="text-sm font-bold text-[#49494A] uppercase tracking-wide">{title}</h2>
          {action && <div className="ml-auto flex-shrink-0">{action}</div>}
        </div>
        {subtitle && <p className="text-xs text-gray-500 mt-1 ml-11">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

// ─── Modal de persona ─────────────────────────────────────────────────────────

function PersonaModal({
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
      if (digits.length > 9) return "El DNI no debe exceder 9 dígitos (8 + dígito verificador).";
      return null;
    }
    if (tipo === "CE") {
      const digits = v.replace(/\D/g, "");
      if (digits.length < 9) return "El Carnet de Extranjería debe tener al menos 9 dígitos.";
      if (digits.length > 12) return "El Carnet de Extranjería no debe exceder 12 dígitos.";
      return null;
    }
    if (tipo === "Pasaporte") {
      const alnum = v.replace(/[^A-Za-z0-9]/g, "");
      if (alnum.length < 6) return "El pasaporte debe tener al menos 6 caracteres alfanuméricos.";
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
    // Validación del documento según tipo
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
                    const digits = val.replace(/\D/g, "");
                    // limit to 12 digits for safety
                    set("dni", digits.slice(0, 12));
                  } else {
                    // pasaporte / otro → alfanumérico, mayúsculas
                    const a = val.toUpperCase().replace(/[^A-Z0-9]/g, "");
                    set("dni", a.slice(0, 12));
                  }
                }}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
                placeholder={
                  form.tipoDoc === "DNI"
                    ? "12345678"
                    : form.tipoDoc === "CE"
                      ? "123456789"
                      : "A12345678"
                }
                maxLength={12}
              />
              <p className="text-[11px] text-gray-400 mt-1">
                {form.tipoDoc === "DNI" &&
                  "DNI: 8 dígitos (opcionalmente seguido de dígito verificador)."}
                {form.tipoDoc === "Pasaporte" &&
                  "Pasaporte: código alfanumérico (usualmente 9 caracteres, hasta 12)."}
                {form.tipoDoc === "CE" && "Carnet de Extranjería: 9 a 12 dígitos numéricos."}
              </p>
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
              <label className="text-xs font-semibold text-gray-600 block mb-1">
                Apellido Paterno
              </label>
              <input
                type="text"
                value={form.apellidoPaterno}
                onChange={(e) => set("apellidoPaterno", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">
                Apellido Materno
              </label>
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
                options={PARENTESCOS}
                placeholder="Buscar parentesco…"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">
              Situación especial
            </label>
            <SearchableSelect
              value={form.situacionActual}
              onChange={(v) => set("situacionActual", v)}
              options={SITUACIONES_ESPECIALES}
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

function ObsFamiliaModal({
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

// ─── Props ────────────────────────────────────────────────────────────────────

interface IncidentFormProps {
  /** Datos iniciales cuando se edita un incidente existente */
  initialData?: CreateIncidenteData;
  /** ID del incidente a editar (ausente = modo creación) */
  incidenciaId?: string;
  /** Código de caso para mostrar en el header */
  codigoCaso?: string;
}

// ─── Formulario principal ─────────────────────────────────────────────────────

export function IncidentForm({ initialData, incidenciaId, codigoCaso }: IncidentFormProps = {}) {
  const isEdit = Boolean(incidenciaId);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const PHONE_COUNTRY_CODES = [
    { code: "+51", label: "PE" },
    { code: "+52", label: "MX" },
    { code: "+54", label: "AR" },
    { code: "+56", label: "CL" },
    { code: "+57", label: "CO" },
  ];

  // Sección 1
  const [fechaReporte] = useState(initialData?.fechaReporte ?? nowLocal());
  const [reportaDni, setReportaDni] = useState(initialData?.reportaDni ?? "");
  const [reportaNombre, setReportaNombre] = useState(initialData?.reportaNombre ?? "");
  const [reportaTel, setReportaTel] = useState(initialData?.reportaTel ?? "");
  const [reportaTelCodigo, setReportaTelCodigo] = useState("+51");
  const [reportaRol, setReportaRol] = useState(initialData?.reportaRol ?? "");

  // Sección 2
  const [fechaSuceso, setFechaSuceso] = useState(initialData?.fechaSuceso ?? "");
  const [horaSuceso, setHoraSuceso] = useState(initialData?.horaSuceso ?? "");
  const [categoria, setCategoria] = useState(initialData?.categoria ?? "");
  const [pais] = useState(initialData?.pais ?? "Perú");
  const [region] = useState(initialData?.region ?? "Lima Metropolitana");
  const [distrito, setDistrito] = useState(initialData?.distrito ?? "");
  const [parroquia, setParroquia] = useState(initialData?.parroquia ?? "");
  const [parroquiasCercanas, setParroquiasCercanas] = useState<string[] | null>(null);
  const [cargandoParroquias, setCargandoParroquias] = useState(false);
  const [direccion, setDireccion] = useState(initialData?.direccion ?? "");
  const [referencia, setReferencia] = useState(initialData?.referencia ?? "");
  const [mapSugerencias, setMapSugerencias] = useState<
    { desc: string; main: string; lat?: number; lon?: number }[]
  >([]);
  const [buscandoDir, setBuscandoDir] = useState(false);
  const dirDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, setMapSeleccionado] = useState(initialData?.direccion ?? "");
  const [lat, setLat] = useState<number | null>(initialData?.lat ?? null);
  const [lng, setLng] = useState<number | null>(initialData?.lng ?? null);

  // Sección 3
  const [descripcion, setDescripcion] = useState(initialData?.descripcion ?? "");
  const [causa, setCausa] = useState(initialData?.causa ?? "");

  // Sección 4
  const [familias, setFamilias] = useState<FamiliaForm[]>(initialData?.familias ?? []);
  const [personas, setPersonas] = useState<PersonaForm[]>(initialData?.personas ?? []);
  const [showPersonaModal, setShowPersonaModal] = useState(false);
  const [editingPersona, setEditingPersona] = useState<PersonaForm | undefined>();
  const [activeFamiliaId, setActiveFamiliaId] = useState<string | undefined>();
  const [editingFamiliaObs, setEditingFamiliaObs] = useState<FamiliaForm | null>(null);
  const [importPreview, setImportPreview] = useState<PersonaImportada[] | null>(null);

  // Sección 5
  const [necesidades, setNecesidades] = useState<string[]>(initialData?.necesidades ?? []);
  const [necesidadOtra, setNecesidadOtra] = useState(initialData?.necesidadOtra ?? "");
  const [necesidadesObs, setNecesidadesObs] = useState(initialData?.necesidadesObs ?? "");

  // Sección 6
  const [fuentesEvidencia, setFuentesEvidencia] = useState<
    { id: string; fuente: string; archivos: File[] }[]
  >([]);

  // Sección 7
  const [nivelAfectacion, setNivelAfectacion] = useState<"Leve" | "Moderado" | "Severo">(
    (initialData?.nivelAfectacion as "Leve" | "Moderado" | "Severo") ?? "Moderado"
  );

  // Alias autogenerado
  const parrShort = parroquia ? parroquia.split(" ").slice(-2).join(" ") : "";
  const alias = categoria
    ? parrShort
      ? `${categoria}-${distrito || "Lima"}-${parrShort}`
      : `${categoria}-${distrito || "Lima"}`
    : "";

  // Resumen personas (sección 7)
  const resumen = (() => {
    const ninos = personas.filter((p) => {
      const e = parseInt(p.edad);
      return !isNaN(e) && e >= 0 && e <= 12;
    }).length;
    const adolescentes = personas.filter((p) => {
      const e = parseInt(p.edad);
      return !isNaN(e) && e >= 13 && e <= 17;
    }).length;
    const adultos = personas.filter((p) => {
      const e = parseInt(p.edad);
      return !isNaN(e) && e >= 18 && e < 60;
    }).length;
    const mayores = personas.filter((p) => {
      const e = parseInt(p.edad);
      return !isNaN(e) && e >= 60;
    }).length;
    const numFamilias = familias.length + personas.filter((p) => !p.familiaId).length;
    const situaciones: Record<string, number> = {};
    personas.forEach((p) => {
      if (p.situacionActual)
        situaciones[p.situacionActual] = (situaciones[p.situacionActual] ?? 0) + 1;
    });
    return {
      ninos,
      adolescentes,
      adultos,
      mayores,
      total: personas.length,
      numFamilias,
      situaciones,
    };
  })();

  function handleDireccionChange(val: string) {
    setDireccion(val);
    setMapSeleccionado("");

    if (dirDebounceRef.current) clearTimeout(dirDebounceRef.current);
    const q = val.trim();
    if (q.length < 3) {
      setMapSugerencias([]);
      setBuscandoDir(false);
      return;
    }

    // Autocompletado tipo Uber/inDrive: busca sugerencias en Nominatim,
    // sesgado por el distrito seleccionado (y Lima, Perú).
    setBuscandoDir(true);
    dirDebounceRef.current = setTimeout(async () => {
      try {
        const consulta = [q, distrito, "Lima", "Perú"].filter(Boolean).join(", ");
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&countrycodes=pe&accept-language=es&q=${encodeURIComponent(consulta)}`
        );
        const data = await res.json();
        if (Array.isArray(data)) {
          setMapSugerencias(
            data.map((d: { display_name: string; lat: string; lon: string }) => {
              const partes = d.display_name.split(",");
              return {
                main: partes.slice(0, 2).join(",").trim(),
                desc: d.display_name,
                lat: Number(d.lat),
                lon: Number(d.lon),
              };
            })
          );
        }
      } catch {
        setMapSugerencias([]);
      } finally {
        setBuscandoDir(false);
      }
    }, 350);
  }

  /** Conserva el número de puerta que el usuario escribió si la sugerencia no lo trae. */
  function fusionarNumero(textoUsuario: string, sugerencia: string): string {
    const num = textoUsuario.match(/\b(\d{1,6}[A-Za-z]?)\b/)?.[1];
    if (!num || sugerencia.includes(num)) return sugerencia;
    // Inserta el número después del nombre de la calle (primer segmento antes de la coma).
    const partes = sugerencia.split(",");
    partes[0] = `${partes[0].trim()} ${num}`;
    return partes.join(",").trim();
  }

  function seleccionarSugerencia(s: { main: string; desc: string; lat?: number; lon?: number }) {
    const direccionFinal = fusionarNumero(direccion, s.main);
    setDireccion(direccionFinal);
    setMapSeleccionado(s.desc);
    setMapSugerencias([]);
    if (typeof s.lat === "number" && typeof s.lon === "number") {
      const la = Number(s.lat.toFixed(7));
      const lo = Number(s.lon.toFixed(7));
      setLat(la);
      setLng(lo);
      buscarParroquiasCercanas(la, lo);
    }
  }

  /** Enter en el campo de dirección: respeta el texto exacto y solo ubica el pin. */
  async function confirmarDireccionLibre() {
    setMapSugerencias([]);
    const q = direccion.trim();
    if (!q) return;
    try {
      const consulta = [q, distrito, "Lima", "Perú"].filter(Boolean).join(", ");
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=pe&accept-language=es&q=${encodeURIComponent(consulta)}`
      );
      const data = await res.json();
      if (Array.isArray(data) && data[0]) {
        const la = Number(Number(data[0].lat).toFixed(7));
        const lo = Number(Number(data[0].lon).toFixed(7));
        setLat(la);
        setLng(lo);
        buscarParroquiasCercanas(la, lo);
        toast.success("Dirección ubicada en el mapa.");
      } else {
        toast.error("No se encontró la ubicación exacta; ajusta el pin en el mapa.");
      }
    } catch {
      toast.error("No se pudo ubicar la dirección.");
    }
  }

  /** Distancia aproximada en metros entre dos coordenadas (Haversine). */
  function distanciaMetros(la1: number, lo1: number, la2: number, lo2: number): number {
    const R = 6371000;
    const rad = (g: number) => (g * Math.PI) / 180;
    const dLat = rad(la2 - la1);
    const dLon = rad(lo2 - lo1);
    const a =
      Math.sin(dLat / 2) ** 2 + Math.cos(rad(la1)) * Math.cos(rad(la2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  /**
   * Busca las parroquias/iglesias REALES más cercanas al punto vía Overpass (OSM)
   * y las deja como únicas opciones del desplegable de parroquia, ordenadas por cercanía.
   */
  async function buscarParroquiasCercanas(la: number, lo: number) {
    setCargandoParroquias(true);
    try {
      for (const radio of [2000, 5000, 12000]) {
        const query = `[out:json][timeout:25];(node["amenity"="place_of_worship"]["religion"="christian"](around:${radio},${la},${lo});way["amenity"="place_of_worship"]["religion"="christian"](around:${radio},${la},${lo}););out center tags;`;
        const res = await fetch("https://overpass-api.de/api/interpreter", {
          method: "POST",
          body: query,
        });
        if (!res.ok) continue;
        const data = await res.json();
        type El = {
          lat?: number;
          lon?: number;
          center?: { lat: number; lon: number };
          tags?: { name?: string };
        };
        const items = ((data.elements ?? []) as El[])
          .map((e) => {
            const elat = e.lat ?? e.center?.lat;
            const elon = e.lon ?? e.center?.lon;
            const name = e.tags?.name;
            if (!name || elat == null || elon == null) return null;
            return { name: name.trim(), dist: distanciaMetros(la, lo, elat, elon) };
          })
          .filter((x): x is { name: string; dist: number } => x !== null)
          .sort((a, b) => a.dist - b.dist);
        // Dedupe por nombre, conservando la más cercana
        const unicas = Array.from(new Map(items.map((i) => [i.name.toLowerCase(), i])).values());
        if (unicas.length > 0) {
          setParroquiasCercanas(unicas.slice(0, 12).map((u) => u.name));
          return;
        }
      }
      setParroquiasCercanas([]); // no se encontraron cercanas
    } catch {
      setParroquiasCercanas(null); // error → vuelve al catálogo general
    } finally {
      setCargandoParroquias(false);
    }
  }

  function handleNombreChange(val: string) {
    setReportaNombre(val.replace(/\d/g, ""));
  }

  const [buscandoDniReporta, setBuscandoDniReporta] = useState(false);
  // Validación: tras un intento de envío, los obligatorios vacíos se marcan en rojo.
  const [intentoEnvio, setIntentoEnvio] = useState(false);
  const errBorde = (vacio: boolean) =>
    intentoEnvio && vacio ? "!border-red-500 ring-1 ring-red-300" : "";

  async function buscarDniReporta() {
    const numero = reportaDni.replace(/\D/g, "");
    if (numero.length !== 8) {
      toast.error("Ingresa los 8 dígitos del DNI.");
      return;
    }
    setBuscandoDniReporta(true);
    try {
      const r = await consultarDni(numero);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      const completo = [r.datos.nombres, r.datos.apellidoPaterno, r.datos.apellidoMaterno]
        .filter(Boolean)
        .join(" ")
        .trim();
      if (completo) setReportaNombre(completo);
      toast.success("Datos obtenidos del DNI.");
    } finally {
      setBuscandoDniReporta(false);
    }
  }

  function handleTelefonoChange(val: string) {
    setReportaTel(val.replace(/\D/g, ""));
  }

  // Familia
  function createFamilia() {
    const id = `FAM-${Date.now()}`;
    const nombre = `Grupo Familiar ${familias.length + 1}`;
    setFamilias((prev) => [...prev, { id, nombre }]);
    setActiveFamiliaId(id);
    toast.success(`${nombre} creado`);
  }

  // ─── Importación de padrón: UN solo botón que detecta el tipo de archivo ──────
  const importRef = useRef<HTMLInputElement>(null);
  const [estadoImport, setEstadoImport] = useState("");
  const importando = estadoImport !== "";

  async function handleImportArchivo(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite reimportar el mismo archivo
    if (!file) return;

    const ext = (file.name.split(".").pop() ?? "").toLowerCase();
    setEstadoImport("Procesando…");
    try {
      let parsed: PersonaImportada[] = [];

      if (ext === "txt") {
        parsed = parsePersonasTxt(await file.text()).personas;
      } else if (ext === "xlsx" || ext === "xls" || ext === "csv") {
        const XLSX = await import("xlsx");
        const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        if (!sheet) {
          toast.error("El archivo no tiene ninguna hoja.");
          return;
        }
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
        parsed = parsePersonasRows(rows).personas;
      } else if (ext === "pdf") {
        const { texto, usoOcr, tabla } = await extraerTextoPdf(file, ({ fase, pagina, total }) => {
          setEstadoImport(
            fase === "ocr" ? `OCR pág. ${pagina}/${total}…` : `Leyendo pág. ${pagina}/${total}…`
          );
        });
        parsed =
          tabla.length > 0
            ? parsePersonasRows(tabla).personas
            : parsePersonasFlexible(texto).personas;
        if (usoOcr && parsed.length > 0)
          toast.info("PDF escaneado: se usó OCR. Revisa bien los datos.");
      } else {
        toast.error(`Formato no soportado (.${ext}). Usa .txt, .xlsx, .xls, .csv o .pdf.`);
        return;
      }

      if (parsed.length === 0) {
        toast.error(
          "No se detectaron personas. Revisa que el archivo siga el formato/plantilla esperado."
        );
        return;
      }
      setImportPreview(parsed);
    } catch {
      toast.error(
        "No se pudo leer el archivo. Si es un PDF escaneado, asegúrate de que sea legible."
      );
    } finally {
      setEstadoImport("");
    }
  }

  /** Inserta las personas confirmadas en la vista previa, creando los grupos. */
  function commitImport(confirmadas: PersonaImportada[]) {
    const familiasNuevas: FamiliaForm[] = [];
    const nombreAId = new Map(familias.map((f) => [f.nombre.toLowerCase(), f.id]));
    const personasNuevas: PersonaForm[] = confirmadas.map((p, i) => {
      let familiaId: string | undefined;
      const grupo = p.grupoFamiliar.trim();
      if (grupo) {
        const key = grupo.toLowerCase();
        familiaId = nombreAId.get(key);
        if (!familiaId) {
          familiaId = `FAM-${Date.now()}-${i}`;
          familiasNuevas.push({ id: familiaId, nombre: grupo });
          nombreAId.set(key, familiaId);
        }
      }
      return {
        id: `PER-${Date.now()}-${i}`,
        tipoDoc: p.tipoDoc,
        dni: p.dni,
        nombre: p.nombre,
        apellidoPaterno: p.apellidoPaterno,
        apellidoMaterno: p.apellidoMaterno,
        edad: p.edad,
        genero: p.genero,
        celular: p.celular,
        parentesco: p.parentesco,
        situacionActual: p.situacionActual,
        familiaId,
      };
    });

    if (familiasNuevas.length) setFamilias((prev) => [...prev, ...familiasNuevas]);
    setPersonas((prev) => [...prev, ...personasNuevas]);
    setImportPreview(null);
    toast.success(`Se importaron ${personasNuevas.length} persona(s) correctamente.`);
  }

  function deleteFamilia(familiaId: string) {
    const hasPersonas = personas.some((p) => p.familiaId === familiaId);
    if (
      hasPersonas &&
      !confirm("Esta familia tiene personas registradas. ¿Eliminar junto con sus integrantes?")
    )
      return;
    if (hasPersonas) setPersonas((prev) => prev.filter((p) => p.familiaId !== familiaId));
    setFamilias((prev) => prev.filter((f) => f.id !== familiaId));
  }

  // Evidencias
  function deleteFuente(id: string) {
    const f = fuentesEvidencia.find((f) => f.id === id);
    if (
      f &&
      f.archivos.length > 0 &&
      !confirm(`¿Eliminar "${f.fuente}" y sus ${f.archivos.length} evidencia(s)?`)
    )
      return;
    setFuentesEvidencia((prev) => prev.filter((f) => f.id !== id));
  }

  /** Sincroniza la selección múltiple del desplegable con fuentesEvidencia. */
  function setFuentesSeleccion(next: string[]) {
    // Confirmar si se va a quitar una fuente que ya tiene archivos subidos.
    const aQuitar = fuentesEvidencia.filter((f) => !next.includes(f.fuente));
    for (const f of aQuitar) {
      if (
        f.archivos.length > 0 &&
        !confirm(`¿Quitar "${f.fuente}" y sus ${f.archivos.length} evidencia(s)?`)
      )
        return;
    }
    setFuentesEvidencia((prev) => {
      const conservadas = prev.filter((f) => next.includes(f.fuente));
      const existentes = new Set(conservadas.map((f) => f.fuente));
      const nuevas = next
        .filter((n) => !existentes.has(n))
        .map((n, i) => ({ id: `EV-${Date.now()}-${i}`, fuente: n, archivos: [] as File[] }));
      // Mantiene el orden del catálogo
      return [...conservadas, ...nuevas];
    });
  }

  function uploadArchivos(fuenteId: string, files: FileList | null) {
    if (!files) return;
    setFuentesEvidencia((prev) =>
      prev.map((f) =>
        f.id === fuenteId ? { ...f, archivos: [...f.archivos, ...Array.from(files)] } : f
      )
    );
  }

  // ─── Guardar (crear o actualizar) ─────────────────────────────────────────

  function handleSave() {
    // Validación de campos obligatorios.
    setIntentoEnvio(true);
    const faltan =
      !reportaDni.trim() ||
      !reportaNombre.trim() ||
      !reportaTel.trim() ||
      !reportaRol.trim() ||
      !fechaSuceso ||
      !categoria.trim() ||
      !distrito.trim() ||
      !direccion.trim();
    if (faltan) {
      toast.error("Completa los campos obligatorios marcados en rojo.");
      return;
    }

    const payload: CreateIncidenteData = {
      reportaDni,
      reportaNombre,
      reportaTel: `${reportaTelCodigo} ${reportaTel}`.trim(),
      reportaRol,
      fechaReporte,
      fechaSuceso,
      horaSuceso,
      categoria,
      pais,
      region,
      distrito,
      parroquia,
      direccion,
      referencia,
      descripcion,
      causa,
      familias,
      personas,
      necesidades,
      necesidadOtra,
      necesidadesObs,
      nivelAfectacion,
      lat,
      lng,
    };

    startTransition(async () => {
      const result =
        isEdit && incidenciaId
          ? await updateIncidente(incidenciaId, payload)
          : await createIncidente(payload);

      if (result?.message) toast.error(result.message);
    });
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-56">
      {/* Header sticky */}
      <div className="bg-white border-b border-[#DDDDDD] sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-3">
          <Link
            href={isEdit && incidenciaId ? `/grd/${incidenciaId}` : "/grd"}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-[#49494A]">
              {isEdit ? `Editar Evento — ${codigoCaso}` : "Registrar Nuevo Evento"}
            </h1>
            <p className="text-xs text-gray-500">
              {isEdit
                ? "Actualiza los datos del evento"
                : "Completa los datos del evento reportado"}
            </p>
          </div>
          <span className="flex-shrink-0 text-[10px] font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
            {isEdit ? "EDICIÓN" : "ETAPA 1 — REGISTRO"}
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-4 space-y-6">
        <div className="bg-white border border-[#DDDDDD] rounded-xl p-5 md:p-6 space-y-8">
          {/* ── SECCIÓN 1: Datos Generales ─────────────────────────────────── */}
          <FormSection num={1} title="Datos Generales">
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-600">Persona que reportó el evento</p>
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-12 sm:col-span-3">
                  <label className="text-xs text-gray-500 mb-1.5 block">
                    DNI <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={8}
                      placeholder="12345678"
                      value={reportaDni}
                      onChange={(e) => setReportaDni(e.target.value.replace(/\D/g, ""))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          buscarDniReporta();
                        }
                      }}
                      className={`${inputCls} flex-1 min-w-0 ${errBorde(!reportaDni.trim())}`}
                    />
                    <button
                      type="button"
                      onClick={buscarDniReporta}
                      disabled={buscandoDniReporta}
                      title="Consultar datos por DNI"
                      className="flex items-center gap-1 px-3 bg-[#009850] text-white rounded-lg text-xs font-medium hover:opacity-90 disabled:opacity-50 flex-shrink-0"
                    >
                      <Search className="w-3.5 h-3.5" />
                      {buscandoDniReporta ? "…" : "Buscar"}
                    </button>
                  </div>
                </div>
                <div className="col-span-12 sm:col-span-9">
                  <label className="text-xs text-gray-500 mb-1.5 block">
                    Nombre y apellidos completos <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Juan Carlos Rodríguez Mamani"
                    value={reportaNombre}
                    onChange={(e) => handleNombreChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (/^[0-9]$/.test(e.key)) e.preventDefault();
                    }}
                    className={`${inputCls} ${errBorde(!reportaNombre.trim())}`}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block">
                    Número de celular <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-stretch gap-2">
                    <div className="relative flex-shrink-0 w-24">
                      <select
                        value={reportaTelCodigo}
                        onChange={(e) => setReportaTelCodigo(e.target.value)}
                        className={`${inputCls} appearance-none pr-7`}
                        aria-label="Código de país"
                      >
                        {PHONE_COUNTRY_CODES.map((item) => (
                          <option key={item.code} value={item.code}>
                            {item.label} {item.code}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                    <input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="987654321"
                      maxLength={12}
                      value={reportaTel}
                      onChange={(e) => handleTelefonoChange(e.target.value)}
                      className={`${inputCls} flex-1 ${errBorde(!reportaTel.trim())}`}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block">
                    Rol / Institución <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    value={reportaRol}
                    onChange={setReportaRol}
                    options={FUENTES_ALERTA}
                    placeholder="Buscar rol / institución…"
                    error={intentoEnvio && !reportaRol.trim()}
                  />
                </div>
              </div>
            </div>
          </FormSection>

          {/* ── SECCIONES 2 y 3: lado a lado en desktop ────────────────────── */}
          <div className="space-y-6">
            {/* SECCIÓN 2 */}
            <FormSection num={2} title="Datos del Evento">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div className="grid grid-cols-2 gap-3 max-w-md">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
                      Fecha del suceso <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={fechaSuceso}
                      onChange={(e) => setFechaSuceso(e.target.value)}
                      max={new Date().toISOString().split("T")[0]}
                      className={`${inputCls} ${errBorde(!fechaSuceso)}`}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
                      Hora <span className="text-gray-400 font-normal">(aprox.)</span>
                    </label>
                    <input
                      type="time"
                      value={horaSuceso}
                      onChange={(e) => setHoraSuceso(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-2 block">
                    Categoría del evento <span className="text-red-500">*</span>
                  </label>
                  <CategorySelector
                    value={categoria}
                    onChange={setCategoria}
                    error={intentoEnvio && !categoria.trim()}
                  />
                </div>
              </div>

              <div className="pt-1 grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-gray-600">Ubicación del suceso</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1.5 block">País</label>
                      <input
                        value={pais}
                        disabled
                        className={`${inputCls} bg-gray-50 cursor-not-allowed`}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1.5 block">Región</label>
                      <input
                        value={region}
                        disabled
                        className={`${inputCls} bg-gray-50 cursor-not-allowed`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">
                      Distrito <span className="text-red-500">*</span>
                    </label>
                    <SearchableSelect
                      value={distrito}
                      onChange={setDistrito}
                      options={DISTRITOS_LIMA}
                      placeholder="Buscar distrito…"
                      error={intentoEnvio && !distrito.trim()}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">
                      Dirección <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Empieza a escribir la dirección…"
                        value={direccion}
                        onChange={(e) => handleDireccionChange(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            confirmarDireccionLibre();
                          }
                        }}
                        autoComplete="off"
                        className={`${inputCls} ${errBorde(!direccion.trim())}`}
                      />
                      {buscandoDir && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-gray-400">
                          Buscando…
                        </span>
                      )}
                      {mapSugerencias.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-auto">
                          {mapSugerencias.map((s, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => seleccionarSugerencia(s)}
                              className="w-full px-4 py-2.5 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0 flex items-start gap-2"
                            >
                              <MapPin className="w-4 h-4 text-[#009850] flex-shrink-0 mt-0.5" />
                              <span className="min-w-0">
                                <span className="block text-sm font-medium text-gray-900 truncate">
                                  {s.main}
                                </span>
                                <span className="block text-xs text-gray-500 truncate">
                                  {s.desc}
                                </span>
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Sugerencias basadas en el distrito seleccionado.
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">
                      Parroquia de referencia
                      {cargandoParroquias && (
                        <span className="ml-2 text-[11px] text-[#009850]">buscando cercanas…</span>
                      )}
                    </label>
                    <SearchableSelect
                      value={parroquia}
                      onChange={setParroquia}
                      options={
                        parroquiasCercanas && parroquiasCercanas.length > 0
                          ? parroquiasCercanas
                          : PARROQUIAS_LIMA
                      }
                      placeholder="Buscar parroquia (opcional)…"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">
                      {parroquiasCercanas && parroquiasCercanas.length > 0
                        ? "Mostrando solo las parroquias más cercanas al punto seleccionado."
                        : parroquiasCercanas?.length === 0
                          ? "No se encontraron parroquias cercanas; se muestra el listado general."
                          : "Marca un punto en el mapa para ver las parroquias más cercanas."}
                    </p>
                  </div>

                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">
                      Referencia / Indicaciones
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Al costado del mercado central, frente al colegio..."
                      value={referencia}
                      onChange={(e) => setReferencia(e.target.value)}
                      className={`${inputCls} resize-none`}
                    />
                  </div>
                </div>

                <div className="self-start">
                  <p className="text-xs font-semibold text-gray-600 mb-2">Ubicación en el mapa</p>
                  <div className="h-[26rem] border border-gray-200 rounded-lg overflow-hidden">
                    <LocationPicker
                      lat={lat}
                      lng={lng}
                      onChange={(la, lo) => {
                        setLat(la);
                        setLng(lo);
                        if (la != null && lo != null) buscarParroquiasCercanas(la, lo);
                      }}
                      onAddressResolved={({ direccion: dir, candidatosDistrito }) => {
                        setDireccion(dir);
                        setMapSugerencias([]);
                        const match = DISTRITOS_LIMA.find((d) =>
                          candidatosDistrito.some((c) => c.toLowerCase() === d.toLowerCase())
                        );
                        if (match) setDistrito(match);
                      }}
                    />
                  </div>
                </div>
              </div>
            </FormSection>

            {/* COLUMNA DERECHA: Descripción (Sección 3) + Mapa al costado */}
            <div className="space-y-6">
              <FormSection num={3} title="Descripción del Evento">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
                      Descripción breve del evento
                    </label>
                    <textarea
                      rows={5}
                      placeholder="Describe lo que se reportó: tipo de afectación, magnitud aproximada, situación actual..."
                      value={descripcion}
                      onChange={(e) => setDescripcion(e.target.value)}
                      className={`${inputCls} resize-none`}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
                      Causa o posible causa del suceso
                    </label>
                    <textarea
                      rows={5}
                      placeholder="¿Qué originó el evento según la información disponible?"
                      value={causa}
                      onChange={(e) => setCausa(e.target.value)}
                      className={`${inputCls} resize-none`}
                    />
                  </div>
                </div>
              </FormSection>

              {/* Sección 3 sin mapa para mantener mejor jerarquía visual */}
            </div>
          </div>

          {/* ── SECCIÓN 4: Personas Afectadas ───────────────────────────────── */}
          <FormSection
            num={4}
            title="Personas Afectadas"
            subtitle={`${familias.length} Grupo${familias.length !== 1 ? "s" : ""} Familiar${familias.length !== 1 ? "es" : ""} · ${personas.length} Persona${personas.length !== 1 ? "s" : ""}`}
            action={
              <div className="flex items-center gap-2">
                <input
                  ref={importRef}
                  type="file"
                  accept=".txt,.xlsx,.xls,.csv,.pdf,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                  onChange={handleImportArchivo}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => importRef.current?.click()}
                  disabled={importando}
                  title="Importar padrón desde .txt, Excel (.xlsx/.csv) o PDF"
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-[#009850] text-[#009850] rounded-lg hover:bg-[#009850]/5 transition-colors text-xs font-medium disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {importando ? estadoImport : "Importar padrón"}
                </button>
              </div>
            }
          >
            {/* Grupos familiares */}
            {familias.map((familia) => (
              <div
                key={familia.id}
                className="border border-blue-200 rounded-lg bg-blue-50 overflow-hidden"
              >
                <div className="bg-blue-100 px-3 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-semibold text-blue-900">{familia.nombre}</span>
                    <span className="text-xs text-blue-600">
                      ({personas.filter((p) => p.familiaId === familia.id).length} integrantes)
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      title="Agregar integrante"
                      onClick={() => {
                        setActiveFamiliaId(familia.id);
                        setShowPersonaModal(true);
                      }}
                      className="p-1 hover:bg-blue-200 rounded text-blue-600"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      title="Observaciones"
                      onClick={() => setEditingFamiliaObs(familia)}
                      className="p-1 hover:bg-blue-200 rounded text-blue-600"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      title="Eliminar grupo"
                      onClick={() => deleteFamilia(familia.id)}
                      className="p-1 hover:bg-red-100 rounded text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {familia.observaciones && (
                  <div className="bg-blue-50 border-t border-blue-200 px-3 py-2">
                    <p className="text-[10px] text-blue-600 uppercase font-semibold">
                      Observaciones
                    </p>
                    <p className="text-xs text-blue-900 italic">{familia.observaciones}</p>
                  </div>
                )}
                <div className="p-2 space-y-1">
                  {personas
                    .filter((p) => p.familiaId === familia.id)
                    .map((p) => (
                      <PersonaRow
                        key={p.id}
                        persona={p}
                        onEdit={() => {
                          setEditingPersona(p);
                          setShowPersonaModal(true);
                        }}
                        onDelete={() => setPersonas((prev) => prev.filter((x) => x.id !== p.id))}
                      />
                    ))}
                  {personas.filter((p) => p.familiaId === familia.id).length === 0 && (
                    <p className="text-xs text-blue-400 text-center py-2">Sin integrantes aún</p>
                  )}
                </div>
              </div>
            ))}

            {/* Personas individuales */}
            {personas.filter((p) => !p.familiaId).length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-gray-500 font-semibold">Personas individuales</p>
                {personas
                  .filter((p) => !p.familiaId)
                  .map((p) => (
                    <PersonaRow
                      key={p.id}
                      persona={p}
                      onEdit={() => {
                        setEditingPersona(p);
                        setShowPersonaModal(true);
                      }}
                      onDelete={() => setPersonas((prev) => prev.filter((x) => x.id !== p.id))}
                    />
                  ))}
              </div>
            )}

            {personas.length === 0 && familias.length === 0 && (
              <div className="text-center py-6 text-gray-400 text-sm">
                No hay personas o familias registradas
              </div>
            )}

            {/* Botones de acción (al final) */}
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="button"
                onClick={createFamilia}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Registrar Grupo Familiar
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveFamiliaId(undefined);
                  setShowPersonaModal(true);
                }}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed border-green-300 text-green-600 rounded-lg hover:bg-green-50 transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Agregar Persona
              </button>
            </div>
          </FormSection>

          {/* ── SECCIONES 5 y 6: lado a lado en desktop ─────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* ── SECCIÓN 5: Necesidades ──────────────────────────────────────── */}
            <FormSection num={5} title="Necesidades Identificadas">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-2 block">
                  Selecciona las necesidades identificadas
                </label>
                <MultiSelect
                  values={necesidades}
                  onChange={setNecesidades}
                  options={NECESIDADES_CHIPS}
                  placeholder="Buscar y seleccionar necesidades…"
                  accent="orange"
                />
              </div>
              {necesidades.includes("Otros") && (
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block">
                    Especificar otra necesidad
                  </label>
                  <input
                    type="text"
                    placeholder="Describe la necesidad..."
                    value={necesidadOtra}
                    onChange={(e) => setNecesidadOtra(e.target.value)}
                    className={inputCls}
                  />
                </div>
              )}
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">
                  Observaciones (opcional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Detalles adicionales sobre las necesidades..."
                  value={necesidadesObs}
                  onChange={(e) => setNecesidadesObs(e.target.value)}
                  className={`${inputCls} resize-none`}
                />
              </div>
            </FormSection>

            {/* ── SECCIÓN 6: Evidencias Iniciales ────────────────────────────── */}
            <FormSection num={6} title="Evidencias Iniciales">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-2 block">
                  Selecciona fuentes para subir evidencias (opcional)
                </label>
                <MultiSelect
                  values={fuentesEvidencia.map((f) => f.fuente)}
                  onChange={setFuentesSeleccion}
                  options={FUENTES_ALERTA}
                  placeholder="Seleccionar fuentes…"
                  accent="green"
                  chips="none"
                />
              </div>
              {fuentesEvidencia.map((fuente) => (
                <div
                  key={fuente.id}
                  className="border border-gray-200 rounded-lg bg-gray-50 overflow-hidden"
                >
                  <div className="bg-gray-100 px-3 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Upload className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-semibold text-gray-900">{fuente.fuente}</span>
                      <span className="text-xs text-gray-500">
                        ({fuente.archivos.length} evidencias)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteFuente(fuente.id)}
                      className="p-1 hover:bg-red-100 rounded text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-3 space-y-2">
                    {fuente.archivos.map((archivo, i) => (
                      <div
                        key={i}
                        className="bg-white border border-gray-200 rounded px-3 py-2 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                          <span className="text-xs text-gray-900 truncate">{archivo.name}</span>
                          <span className="text-[10px] text-gray-400">
                            ({(archivo.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setFuentesEvidencia((prev) =>
                              prev.map((f) =>
                                f.id === fuente.id
                                  ? { ...f, archivos: f.archivos.filter((_, j) => j !== i) }
                                  : f
                              )
                            )
                          }
                          className="p-1 hover:bg-red-100 rounded text-red-600 ml-2"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <label className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:bg-white hover:border-blue-400 transition-colors cursor-pointer">
                      <Upload className="w-4 h-4 text-gray-500" />
                      <span className="text-xs text-gray-600">
                        Subir evidencias (fotos, videos, documentos)
                      </span>
                      <input
                        type="file"
                        multiple
                        accept="image/*,video/*,.pdf,.doc,.docx"
                        onChange={(e) => uploadArchivos(fuente.id, e.target.files)}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              ))}
              {fuentesEvidencia.length === 0 && (
                <div className="text-center py-4 text-gray-400 text-sm">
                  No hay fuentes de evidencia agregadas
                </div>
              )}
            </FormSection>
          </div>

          {/* ── SECCIÓN 7: Estimación Inicial ───────────────────────────────── */}
          <FormSection num={7} title="Estimación Inicial de Afectación">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-700 uppercase">Resumen del reporte</p>

              <div className="bg-white/70 rounded-lg p-3 text-center border-2 border-blue-300">
                <p className="text-xs text-gray-500 mb-1">Total de Personas Afectadas</p>
                <p className="text-2xl font-bold text-blue-900">{resumen.total}</p>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[
                  {
                    label: "Niños",
                    value: resumen.ninos,
                    sub: "0-12 años",
                    color: "text-blue-700",
                  },
                  {
                    label: "Adolesc.",
                    value: resumen.adolescentes,
                    sub: "13-17 años",
                    color: "text-cyan-700",
                  },
                  {
                    label: "Adultos",
                    value: resumen.adultos,
                    sub: "18-59 años",
                    color: "text-teal-700",
                  },
                  {
                    label: "A. Mayores",
                    value: resumen.mayores,
                    sub: "60+ años",
                    color: "text-purple-700",
                  },
                ].map((g) => (
                  <div key={g.label} className="bg-white/70 rounded-lg p-2 text-center">
                    <p className="text-xs text-gray-500">{g.label}</p>
                    <p className={`text-lg font-bold ${g.color}`}>{g.value}</p>
                    <p className="text-[10px] text-gray-400">{g.sub}</p>
                  </div>
                ))}
              </div>

              {resumen.numFamilias > 0 && (
                <div className="flex items-center gap-2 bg-white/70 rounded-lg px-3 py-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-semibold text-blue-900">
                    {resumen.numFamilias} grupo(s) familiar(es) afectado(s)
                  </span>
                </div>
              )}

              {Object.keys(resumen.situaciones).length > 0 && (
                <div className="bg-white/70 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-500 mb-1">Situaciones especiales:</p>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(resumen.situaciones).map(([sit, qty]) => (
                      <span
                        key={sit}
                        className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-medium"
                      >
                        {sit}: {qty}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {necesidades.length > 0 && (
                <div className="bg-white/70 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-500 mb-1">Necesidades identificadas:</p>
                  <div className="flex flex-wrap gap-1">
                    {necesidades
                      .filter((n) => n !== "Otros")
                      .map((n) => (
                        <span
                          key={n}
                          className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-[10px] font-medium"
                        >
                          {n}
                        </span>
                      ))}
                    {necesidadOtra.trim() && (
                      <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-[10px] font-medium">
                        {necesidadOtra.trim()}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 mb-2 block">
                Nivel de afectación estimado
              </label>
              <div className="flex gap-2">
                {(["Leve", "Moderado", "Severo"] as const).map((nivel) => (
                  <button
                    key={nivel}
                    type="button"
                    onClick={() => setNivelAfectacion(nivel)}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 font-semibold text-sm transition-all ${
                      nivelAfectacion === nivel
                        ? nivel === "Leve"
                          ? "bg-yellow-100 text-yellow-800 border-yellow-500"
                          : nivel === "Moderado"
                            ? "bg-orange-100 text-orange-800 border-orange-500"
                            : "bg-red-100 text-red-800 border-red-500"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    {nivel}
                  </button>
                ))}
              </div>
            </div>
          </FormSection>

          {/* Acciones (en el flujo del formulario, no flotante) */}
          <div className="flex items-center gap-3 pt-2 pb-8 border-t border-[#DDDDDD] mt-2">
            <Link
              href={isEdit && incidenciaId ? `/grd/${incidenciaId}` : "/grd"}
              className="px-5 py-3 border border-[#DDDDDD] rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="flex-1 sm:flex-none sm:px-10 flex items-center justify-center gap-2 py-3 bg-[#009850] text-white rounded-xl hover:opacity-90 transition-all font-bold text-sm shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {isPending
                ? isEdit
                  ? "Guardando..."
                  : "Registrando..."
                : isEdit
                  ? "Guardar Cambios"
                  : "Registrar Evento"}
            </button>
          </div>
        </div>
      </div>

      {/* Modales */}
      {showPersonaModal && (
        <PersonaModal
          onSave={(p) => {
            if (editingPersona) setPersonas((prev) => prev.map((x) => (x.id === p.id ? p : x)));
            else setPersonas((prev) => [...prev, p]);
            setEditingPersona(undefined);
          }}
          onClose={() => {
            setShowPersonaModal(false);
            setEditingPersona(undefined);
            setActiveFamiliaId(undefined);
          }}
          editing={editingPersona}
          familias={familias}
          activeFamiliaId={activeFamiliaId}
        />
      )}
      {editingFamiliaObs && (
        <ObsFamiliaModal
          familia={editingFamiliaObs}
          onSave={(obs) =>
            setFamilias((prev) =>
              prev.map((f) => (f.id === editingFamiliaObs.id ? { ...f, observaciones: obs } : f))
            )
          }
          onClose={() => setEditingFamiliaObs(null)}
        />
      )}
      {importPreview && (
        <ImportPreviewModal
          personas={importPreview}
          onConfirm={commitImport}
          onClose={() => setImportPreview(null)}
        />
      )}
    </div>
  );
}

// ─── Fila de persona (reutilizable) ──────────────────────────────────────────

function PersonaRow({
  persona,
  onEdit,
  onDelete,
}: {
  persona: PersonaForm;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded px-3 py-2 w-full">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <UserCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-900 truncate">
              {[persona.nombre, persona.apellidoPaterno, persona.apellidoMaterno]
                .filter(Boolean)
                .join(" ")}
            </span>
            {persona.parentesco && (
              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-medium flex-shrink-0">
                {persona.parentesco}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500 ml-6">
            <span>
              Edad: <strong className="text-gray-700">{persona.edad || "—"}</strong> años
            </span>
            <span>
              {persona.tipoDoc}: <strong className="text-gray-700">{persona.dni || "—"}</strong>
            </span>
            <span>
              Género: <strong className="text-gray-700">{persona.genero || "—"}</strong>
            </span>
            {persona.celular && (
              <span>
                Cel: <strong className="text-gray-700">{persona.celular}</strong>
              </span>
            )}
            {persona.situacionActual && (
              <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-[10px] font-medium">
                {persona.situacionActual}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={onEdit}
            className="p-1 hover:bg-gray-100 rounded text-gray-600"
          >
            <Edit3 className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1 hover:bg-red-100 rounded text-red-600"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal de vista previa de importación (.txt) ─────────────────────────────
// Muestra cada persona detectada en tarjetas editables. Los campos que faltan
// o son inválidos se pintan en ROJO; no se puede confirmar hasta corregir los
// obligatorios. Permite eliminar filas que no se quieran importar.

function ImportPreviewModal({
  personas,
  onConfirm,
  onClose,
}: {
  personas: PersonaImportada[];
  onConfirm: (p: PersonaImportada[]) => void;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<PersonaImportada[]>(personas);

  function update(i: number, key: keyof PersonaImportada, value: string) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));
  }
  function removeRow(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  // Validación por fila (campos problemáticos → mensaje)
  const erroresPorFila = rows.map((r) => validarPersona(r));
  const totalErrores = erroresPorFila.reduce((acc, e) => acc + Object.keys(e).length, 0);
  const filasConError = erroresPorFila.filter((e) => Object.keys(e).length > 0).length;
  const puedeConfirmar = rows.length > 0 && totalErrores === 0;

  const baseInput = "w-full px-2 py-1.5 text-xs border rounded-md";
  const cls = (bad?: string) =>
    `${baseInput} ${bad ? "border-red-400 bg-red-50 text-red-900" : "border-gray-200"}`;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-xl">
        {/* Encabezado */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900">Vista previa de importación</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {rows.length} persona(s) detectada(s)
              {filasConError > 0
                ? ` · ${filasConError} con campos por corregir (en rojo)`
                : " · todo listo para importar"}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:bg-gray-100 rounded p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Aviso */}
        {totalErrores > 0 && (
          <div className="bg-red-50 border-b border-red-100 px-4 py-2 text-xs text-red-700">
            Corrige los campos marcados en <strong>rojo</strong> (nombre y edad son obligatorios)
            antes de confirmar.
          </div>
        )}

        {/* Lista editable */}
        <div className="overflow-auto p-4 space-y-3">
          {rows.map((r, i) => {
            const errs = erroresPorFila[i];
            return (
              <div key={i} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-gray-400">
                    Bloque {r._bloque}{" "}
                    {r.grupoFamiliar ? `· ${r.grupoFamiliar}` : "· Persona individual"}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    className="p-1 hover:bg-red-100 rounded text-red-600"
                    title="Quitar de la importación"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-[10px] text-gray-500 block mb-0.5">Grupo familiar</label>
                    <input
                      value={r.grupoFamiliar}
                      onChange={(e) => update(i, "grupoFamiliar", e.target.value)}
                      placeholder="(individual)"
                      className={cls()}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-0.5">Tipo Doc.</label>
                    <select
                      value={r.tipoDoc}
                      onChange={(e) => update(i, "tipoDoc", e.target.value)}
                      className={cls()}
                    >
                      {TIPOS_DOC.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-0.5">N° Documento</label>
                    <input
                      value={r.dni}
                      onChange={(e) => update(i, "dni", e.target.value)}
                      className={cls(errs.dni)}
                    />
                    {errs.dni && <p className="text-[10px] text-red-600 mt-0.5">{errs.dni}</p>}
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-0.5">
                      Nombres <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={r.nombre}
                      onChange={(e) => update(i, "nombre", e.target.value)}
                      className={cls(errs.nombre)}
                    />
                    {errs.nombre && (
                      <p className="text-[10px] text-red-600 mt-0.5">{errs.nombre}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-0.5">
                      Apellido Paterno
                    </label>
                    <input
                      value={r.apellidoPaterno}
                      onChange={(e) => update(i, "apellidoPaterno", e.target.value)}
                      className={cls()}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-0.5">
                      Apellido Materno
                    </label>
                    <input
                      value={r.apellidoMaterno}
                      onChange={(e) => update(i, "apellidoMaterno", e.target.value)}
                      className={cls()}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-0.5">
                      Edad <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={r.edad}
                      onChange={(e) => update(i, "edad", e.target.value.replace(/\D/g, ""))}
                      className={cls(errs.edad)}
                    />
                    {errs.edad && <p className="text-[10px] text-red-600 mt-0.5">{errs.edad}</p>}
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-0.5">Género</label>
                    <select
                      value={r.genero}
                      onChange={(e) => update(i, "genero", e.target.value)}
                      className={cls()}
                    >
                      <option value="">(sin especificar)</option>
                      {GENEROS.map((g) => (
                        <option key={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-0.5">Celular</label>
                    <input
                      value={r.celular}
                      onChange={(e) => update(i, "celular", e.target.value.replace(/\D/g, ""))}
                      className={cls(errs.celular)}
                    />
                    {errs.celular && (
                      <p className="text-[10px] text-red-600 mt-0.5">{errs.celular}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-0.5">Parentesco</label>
                    <select
                      value={r.parentesco}
                      onChange={(e) => update(i, "parentesco", e.target.value)}
                      className={cls()}
                    >
                      <option value="">Seleccionar...</option>
                      {PARENTESCOS_CAT.map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-0.5">
                      Situación especial
                    </label>
                    <select
                      value={r.situacionActual}
                      onChange={(e) => update(i, "situacionActual", e.target.value)}
                      className={cls()}
                    >
                      <option value="">Ninguna</option>
                      {SITUACIONES_CAT.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
          {rows.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-8">
              No quedan personas para importar.
            </p>
          )}
        </div>

        {/* Pie */}
        <div className="p-4 border-t border-gray-200 flex items-center justify-between gap-2">
          <span className="text-xs text-gray-500">
            {puedeConfirmar
              ? `${rows.length} persona(s) listas`
              : totalErrores > 0
                ? `${totalErrores} campo(s) por corregir`
                : ""}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={() => onConfirm(rows)}
              disabled={!puedeConfirmar}
              className="px-4 py-2 bg-[#009850] text-white rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Importar {rows.length > 0 ? `(${rows.length})` : ""}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
