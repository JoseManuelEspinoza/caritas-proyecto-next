"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Plus,
  Calendar,
  MapPin,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { programarSimulacro, ejecutarSimulacro, cancelarSimulacro } from "@/app/actions/simulacros";

type Actividad = {
  id: string;
  codigoActividad: string | null;
  idParroquia: string;
  idTipoActividadPreventiva: string;
  parroquiaNombre: string;
  nombreActividad: string;
  estadoActividad: string;
  fechaProgramada: string | null;
  fechaEjecucion: string | null;
  resultadoGeneral: string | null;
  lugarActividad?: string | null;
};
type Parroquia = { id: string; nombre: string };

const TIPOS = [
  "Simulacro de Sismo",
  "Simulacro de Incendio",
  "Simulacro de Inundación",
  "Charla de Prevención",
  "Taller",
  "Campaña",
];
const ESTADOS = ["PROGRAMADA", "EJECUTADA", "CANCELADA"];

const PAGE_SIZE = 10;

const ESTADO_BADGE: Record<string, { cls: string; icon: React.ReactNode }> = {
  PROGRAMADA: { cls: "bg-blue-50 text-blue-700", icon: <Clock className="w-3.5 h-3.5" /> },
  EJECUTADA: { cls: "bg-green-50 text-green-700", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  CANCELADA: { cls: "bg-gray-100 text-gray-500", icon: <XCircle className="w-3.5 h-3.5" /> },
};

export function SimulacrosModule({
  actividades,
  parroquias,
}: {
  actividades: Actividad[];
  parroquias: Parroquia[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [ejecutando, setEjecutando] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("all");
  const [parroquiaFilter, setParroquiaFilter] = useState("all");
  const [tipoFilter, setTipoFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [form, setForm] = useState({
    idParroquia: parroquias[0]?.id ?? "",
    idTipoActividadPreventiva: TIPOS[0],
    nombreActividad: "",
    fechaProgramada: new Date().toISOString().slice(0, 10),
    lugarActividad: "",
    numeroParticipantesEstimado: 0,
    descripcionActividad: "",
  });
  const [ejec, setEjec] = useState({
    resultadoGeneral: "",
    numeroParticipantesReal: 0,
    recomendaciones: "",
  });

  const run = (fn: () => Promise<{ message?: string } | void>, ok: string, after?: () => void) =>
    startTransition(async () => {
      const res = await fn();
      if (res?.message && /no se pudo|obligatori|no tiene|no permitida|estado/i.test(res.message))
        toast.error(res.message);
      else {
        toast.success(ok);
        after?.();
        router.refresh();
      }
    });

  useEffect(() => {
    setCurrentPage(1);
  }, [search, estadoFilter, parroquiaFilter, tipoFilter]);

  const filtered = actividades.filter((a) => {
    if (estadoFilter !== "all" && a.estadoActividad !== estadoFilter) return false;
    if (parroquiaFilter !== "all" && a.idParroquia !== parroquiaFilter) return false;
    if (tipoFilter !== "all" && a.idTipoActividadPreventiva !== tipoFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const hayCoincidencia =
        (a.codigoActividad?.toLowerCase().includes(q) ?? false) ||
        a.nombreActividad.toLowerCase().includes(q) ||
        a.parroquiaNombre.toLowerCase().includes(q) ||
        (a.lugarActividad?.toLowerCase().includes(q) ?? false) ||
        (a.resultadoGeneral?.toLowerCase().includes(q) ?? false) ||
        a.estadoActividad.toLowerCase().includes(q) ||
        a.idTipoActividadPreventiva.toLowerCase().includes(q);
      if (!hayCoincidencia) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const paginated = filtered.slice(startIndex, startIndex + PAGE_SIZE);
  const visibleFrom = filtered.length === 0 ? 0 : startIndex + 1;
  const visibleTo = Math.min(startIndex + PAGE_SIZE, filtered.length);


 function hoyLocalISO(): string {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  }

  function validarProgramacion(): string | null {
    const nombre = form.nombreActividad.trim();
    const lugar = form.lugarActividad.trim();
    const participantes = Number(form.numeroParticipantesEstimado);

    if (!form.idParroquia?.trim()) {
      return "Selecciona la parroquia.";
    }

    if (!form.idTipoActividadPreventiva?.trim()) {
      return "Selecciona el tipo de actividad.";
    }

    if (!TIPOS.includes(form.idTipoActividadPreventiva)) {
      return "Selecciona un tipo de actividad válido.";
    }

    if (!nombre) {
      return "Ingresa el nombre de la actividad.";
    }

    if (nombre.length < 3) {
      return "El nombre de la actividad debe tener al menos 3 caracteres.";
    }

    if (!form.fechaProgramada) {
      return "Selecciona la fecha programada.";
    }

    if (form.fechaProgramada < hoyLocalISO()) {
      return "La fecha programada no puede ser anterior a hoy.";
    }

    if (!lugar) {
      return "Ingresa el lugar de la actividad.";
    }

    if (lugar.length < 3) {
      return "El lugar debe tener al menos 3 caracteres.";
    }

    if (!Number.isFinite(participantes)) {
      return "El número de participantes estimados debe ser válido.";
    }

    if (!Number.isInteger(participantes)) {
      return "El número de participantes estimados debe ser entero.";
    }

    if (participantes < 0) {
      return "El número de participantes estimados no puede ser negativo.";
    }

    if (form.descripcionActividad.trim() && form.descripcionActividad.trim().length < 5) {
      return "La descripción debe tener al menos 5 caracteres si se ingresa.";
    }

    return null;
  }

  function validarEjecucion(): string | null {
    const resultado = ejec.resultadoGeneral.trim();
    const participantes = Number(ejec.numeroParticipantesReal);

    if (!resultado) {
      return "Indica el resultado general.";
    }

    if (resultado.length < 5) {
      return "El resultado general debe tener al menos 5 caracteres.";
    }

    if (!Number.isFinite(participantes)) {
      return "El número de participantes reales debe ser válido.";
    }

    if (!Number.isInteger(participantes)) {
      return "El número de participantes reales debe ser entero.";
    }

    if (participantes < 0) {
      return "El número de participantes reales no puede ser negativo.";
    }

    if (ejec.recomendaciones.trim() && ejec.recomendaciones.trim().length < 5) {
      return "Las recomendaciones deben tener al menos 5 caracteres si se ingresan.";
    }

    return null;
  }
  
  
  const submitNew = () => {
    const errorValidacion = validarProgramacion();

    if (errorValidacion) {
      toast.error(errorValidacion);
      return;
    }

    run(
      () =>
        programarSimulacro({
          ...form,
          nombreActividad: form.nombreActividad.trim(),
          lugarActividad: form.lugarActividad.trim(),
          descripcionActividad: form.descripcionActividad.trim(),
          numeroParticipantesEstimado: Number(form.numeroParticipantesEstimado),
        }),
      "Simulacro programado.",
      () => {
        setShowForm(false);
        setForm({
          ...form,
          nombreActividad: "",
          lugarActividad: "",
          descripcionActividad: "",
          numeroParticipantesEstimado: 0,
        });
      }
    );
  };

  const submitEjecutar = (id: string) => {
    const errorValidacion = validarEjecucion();

    if (errorValidacion) {
      toast.error(errorValidacion);
      return;
    }

    run(
      () =>
        ejecutarSimulacro(id, {
          resultadoGeneral: ejec.resultadoGeneral.trim(),
          numeroParticipantesReal: Number(ejec.numeroParticipantesReal),
          recomendaciones: ejec.recomendaciones.trim(),
        }),
      "Ejecución registrada.",
      () => {
        setEjecutando(null);
        setEjec({ resultadoGeneral: "", numeroParticipantesReal: 0, recomendaciones: "" });
      }
    );
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[var(--caritas-green)]/10 rounded-lg flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-[var(--caritas-green)]" />
          </div>
          <div>
            <h1 className="text-[var(--caritas-text)]">Simulacros y Acciones Preventivas</h1>
            <p className="text-sm text-gray-600">Prevención · actividades por parroquia</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--caritas-green)] text-white rounded"
        >
          <Plus className="w-4 h-4" /> Programar
        </button>
      </div>

      <div className="bg-white border border-[var(--caritas-border)] rounded-xl p-4 mb-6 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1 lg:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por código, nombre, lugar o resultado..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-[var(--caritas-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--caritas-green)]/20 focus:border-[var(--caritas-green)]"
            />
          </div>

          <div className="flex flex-1 flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={estadoFilter}
                onChange={(e) => setEstadoFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-[var(--caritas-border)] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[var(--caritas-green)]/20 focus:border-[var(--caritas-green)]"
              >
                <option value="all">Todos los estados</option>
                {ESTADOS.map((estado) => (
                  <option key={estado} value={estado}>
                    {estado}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative flex-1">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={parroquiaFilter}
                onChange={(e) => setParroquiaFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-[var(--caritas-border)] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[var(--caritas-green)]/20 focus:border-[var(--caritas-green)]"
              >
                <option value="all">Todas las parroquias</option>
                {parroquias.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative flex-1">
              <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={tipoFilter}
                onChange={(e) => setTipoFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-[var(--caritas-border)] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[var(--caritas-green)]/20 focus:border-[var(--caritas-green)]"
              >
                <option value="all">Todos los tipos</option>
                {TIPOS.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-xs text-gray-500">
            Mostrando {visibleFrom}-{visibleTo} de {filtered.length} actividades
          </p>
          {(search ||
            estadoFilter !== "all" ||
            parroquiaFilter !== "all" ||
            tipoFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setEstadoFilter("all");
                setParroquiaFilter("all");
                setTipoFilter("all");
              }}
              className="text-xs font-medium text-[var(--caritas-green)] hover:underline self-start sm:self-auto"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <div className="bg-white border border-[var(--caritas-border)] rounded-xl p-5 mb-6 grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-gray-600">Parroquia</span>
            <select
              value={form.idParroquia}
              onChange={(e) => setForm({ ...form, idParroquia: e.target.value })}
              className="mt-1 w-full px-3 py-2 border border-[var(--caritas-border)] rounded text-sm bg-white"
            >
              <option value="">— Selecciona —</option>
              {parroquias.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-gray-600">Tipo</span>
            <select
              value={form.idTipoActividadPreventiva}
              onChange={(e) => setForm({ ...form, idTipoActividadPreventiva: e.target.value })}
              className="mt-1 w-full px-3 py-2 border border-[var(--caritas-border)] rounded text-sm bg-white"
            >
              {TIPOS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="block md:col-span-2">
            <span className="text-xs text-gray-600">Nombre de la actividad</span>
            <input
              value={form.nombreActividad}
              onChange={(e) => setForm({ ...form, nombreActividad: e.target.value })}
              className="mt-1 w-full px-3 py-2 border border-[var(--caritas-border)] rounded text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs text-gray-600">Fecha programada</span>
            <input
              type="date"
              value={form.fechaProgramada}
              onChange={(e) => setForm({ ...form, fechaProgramada: e.target.value })}
              className="mt-1 w-full px-3 py-2 border border-[var(--caritas-border)] rounded text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs text-gray-600">Lugar</span>
            <input
              value={form.lugarActividad}
              onChange={(e) => setForm({ ...form, lugarActividad: e.target.value })}
              className="mt-1 w-full px-3 py-2 border border-[var(--caritas-border)] rounded text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs text-gray-600">Participantes estimados</span>
            <input
              type="number"
              value={String(form.numeroParticipantesEstimado)}
              onChange={(e) =>
                setForm({ ...form, numeroParticipantesEstimado: Number(e.target.value) })
              }
              className="mt-1 w-full px-3 py-2 border border-[var(--caritas-border)] rounded text-sm"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="text-xs text-gray-600">Descripción</span>
            <textarea
              value={form.descripcionActividad}
              onChange={(e) => setForm({ ...form, descripcionActividad: e.target.value })}
              rows={2}
              className="mt-1 w-full px-3 py-2 border border-[var(--caritas-border)] rounded text-sm"
            />
          </label>
          <div className="md:col-span-2 flex justify-end gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-[var(--caritas-border)] rounded"
            >
              Cancelar
            </button>
            <button
              onClick={submitNew}
              disabled={pending}
              className="px-4 py-2 bg-[var(--caritas-green)] text-white rounded disabled:opacity-50"
            >
              Guardar
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {filtered.length === 0 && (
          <p className="text-sm text-gray-500">No hay actividades para mostrar.</p>
        )}
        {paginated.map((a) => {
          const badge = ESTADO_BADGE[a.estadoActividad] ?? ESTADO_BADGE.PROGRAMADA;
          return (
            <div
              key={a.id}
              className="bg-white border border-[var(--caritas-border)] rounded-xl p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-gray-500">{a.codigoActividad}</div>
                  <h2 className="text-[var(--caritas-text)]">{a.nombreActividad}</h2>
                  <div className="text-sm text-gray-600 flex flex-wrap items-center gap-3 mt-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {a.parroquiaNombre}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {a.fechaProgramada?.slice(0, 10) ?? "—"}
                    </span>
                  </div>
                  {a.resultadoGeneral && (
                    <p className="text-sm text-gray-700 mt-2">Resultado: {a.resultadoGeneral}</p>
                  )}
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded ${badge.cls}`}
                >
                  {badge.icon} {a.estadoActividad}
                </span>
              </div>

              {a.estadoActividad === "PROGRAMADA" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => setEjecutando(ejecutando === a.id ? null : a.id)}
                    className="px-3 py-1.5 text-sm bg-[var(--caritas-green)] text-white rounded"
                  >
                    Registrar ejecución
                  </button>
                  <button
                    onClick={() =>
                      run(
                        () => cancelarSimulacro(a.id, "Cancelado por el responsable"),
                        "Actividad cancelada."
                      )
                    }
                    disabled={pending}
                    className="px-3 py-1.5 text-sm border border-[var(--caritas-border)] rounded text-gray-700 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                </div>
              )}

              {ejecutando === a.id && (
                <div className="mt-3 bg-gray-50 border border-[var(--caritas-border)] rounded p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="block md:col-span-2">
                    <span className="text-xs text-gray-600">Resultado general</span>
                    <textarea
                      value={ejec.resultadoGeneral}
                      onChange={(e) => setEjec({ ...ejec, resultadoGeneral: e.target.value })}
                      rows={2}
                      className="mt-1 w-full px-3 py-2 border border-[var(--caritas-border)] rounded text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs text-gray-600">Participantes reales</span>
                    <input
                      type="number"
                      value={String(ejec.numeroParticipantesReal)}
                      onChange={(e) =>
                        setEjec({ ...ejec, numeroParticipantesReal: Number(e.target.value) })
                      }
                      className="mt-1 w-full px-3 py-2 border border-[var(--caritas-border)] rounded text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs text-gray-600">Recomendaciones</span>
                    <input
                      value={ejec.recomendaciones}
                      onChange={(e) => setEjec({ ...ejec, recomendaciones: e.target.value })}
                      className="mt-1 w-full px-3 py-2 border border-[var(--caritas-border)] rounded text-sm"
                    />
                  </label>
                  <div className="md:col-span-2 flex justify-end gap-2">
                    <button
                      onClick={() => setEjecutando(null)}
                      className="px-3 py-1.5 text-sm border border-[var(--caritas-border)] rounded"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => submitEjecutar(a.id)}
                      disabled={pending}
                      className="px-3 py-1.5 text-sm bg-[var(--caritas-green)] text-white rounded disabled:opacity-50"
                    >
                      Guardar ejecución
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white border border-[var(--caritas-border)] rounded-xl px-4 py-3">
            <p className="text-xs text-gray-500">
              Página {safePage} de {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium border border-[var(--caritas-border)] rounded-lg bg-white text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Anterior
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium border border-[var(--caritas-border)] rounded-lg bg-white text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
