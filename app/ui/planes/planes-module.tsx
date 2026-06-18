"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Plus, Calendar, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { crearPlan, cambiarAprobacionPlan } from "@/app/actions/planes";
import { PaginationControls } from "@/app/ui/shared/pagination-controls";

type Plan = {
  id: string;
  codigoPlan: string | null;
  idParroquia: string;
  parroquiaNombre: string;
  nombrePlan: string;
  objetivos: string | null;
  estadoAprobacion: string;
  fechaInicio: string | null;
  fechaFin: string | null;
  observaciones: string | null;
};
type Parroquia = { id: string; nombre: string };

const ESTADO_BADGE: Record<string, string> = {
  BORRADOR: "bg-gray-100 text-gray-700",
  EN_REVISION: "bg-blue-50 text-blue-700",
  APROBADO: "bg-green-50 text-green-700",
  OBSERVADO: "bg-orange-50 text-orange-700",
};

export function PlanesModule({ planes, parroquias }: { planes: Plan[]; parroquias: Parroquia[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [form, setForm] = useState({
    idParroquia: parroquias[0]?.id ?? "",
    nombrePlan: "",
    objetivos: "",
    diagnosticoRiesgo: "",
    fechaInicio: new Date().toISOString().slice(0, 10),
    fechaFin: "",
  });

  const run = (fn: () => Promise<{ message?: string } | void>, ok: string) =>
    startTransition(async () => {
      const res = await fn();
      if (res?.message && /no se pudo|obligatori|no tiene|no permitida|al menos/i.test(res.message))
        toast.error(res.message);
      else {
        toast.success(ok);
        router.refresh();
      }
    });

  const totalPages = Math.max(1, Math.ceil(planes.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginated = planes.slice(startIndex, startIndex + pageSize);
  const visibleFrom = planes.length === 0 ? 0 : startIndex + 1;
  const visibleTo = Math.min(startIndex + pageSize, planes.length);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const submit = () => {
    if (!form.nombrePlan.trim() || !form.idParroquia) {
      toast.error("Completa parroquia y título.");
      return;
    }
    run(async () => {
      const res = await crearPlan(form);
      if (!res?.message) {
        setShowForm(false);
        setForm({ ...form, nombrePlan: "", objetivos: "", diagnosticoRiesgo: "" });
      }
      return res;
    }, "Plan creado.");
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[var(--caritas-green)]/10 rounded-lg flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-[var(--caritas-green)]" />
          </div>
          <div>
            <h1 className="text-[var(--caritas-text)]">Planes GRD por Parroquia</h1>
            <p className="text-sm text-gray-600">Planes de trabajo y su aprobación</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowForm((s) => !s)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--caritas-green)] text-white rounded"
          >
            <Plus className="w-4 h-4" /> Nuevo plan
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white border border-[var(--caritas-border)] rounded-xl p-5 mb-6 grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-gray-600">Parroquia <span className="text-red-500">*</span></span>
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
            <span className="text-xs text-gray-600">Título del plan <span className="text-red-500">*</span></span>
            <input
              value={form.nombrePlan}
              onChange={(e) => setForm({ ...form, nombrePlan: e.target.value })}
              className="mt-1 w-full px-3 py-2 border border-[var(--caritas-border)] rounded text-sm"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="text-xs text-gray-600">Objetivos</span>
            <textarea
              value={form.objetivos}
              onChange={(e) => setForm({ ...form, objetivos: e.target.value })}
              rows={2}
              className="mt-1 w-full px-3 py-2 border border-[var(--caritas-border)] rounded text-sm"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="text-xs text-gray-600">Diagnóstico de riesgo</span>
            <textarea
              value={form.diagnosticoRiesgo}
              onChange={(e) => setForm({ ...form, diagnosticoRiesgo: e.target.value })}
              rows={2}
              className="mt-1 w-full px-3 py-2 border border-[var(--caritas-border)] rounded text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs text-gray-600">Fecha inicio</span>
            <input
              type="date"
              value={form.fechaInicio}
              onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })}
              className="mt-1 w-full px-3 py-2 border border-[var(--caritas-border)] rounded text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs text-gray-600">Fecha fin</span>
            <input
              type="date"
              value={form.fechaFin}
              onChange={(e) => setForm({ ...form, fechaFin: e.target.value })}
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
              onClick={submit}
              disabled={pending}
              className="px-4 py-2 bg-[var(--caritas-green)] text-white rounded disabled:opacity-50"
            >
              Guardar
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {planes.length === 0 && <p className="text-sm text-gray-500">No hay planes registrados.</p>}
        {paginated.map((p) => (
          <div key={p.id} className="bg-white border border-[var(--caritas-border)] rounded-xl p-5">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
              <div>
                <div className="text-xs text-gray-500">{p.codigoPlan}</div>
                <h2 className="text-[var(--caritas-text)]">{p.nombrePlan}</h2>
                <div className="text-sm text-gray-600 flex flex-wrap items-center gap-3 mt-1">
                  <span>{p.parroquiaNombre}</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {p.fechaInicio?.slice(0, 10) ?? "—"} →{" "}
                    {p.fechaFin?.slice(0, 10) ?? "—"}
                  </span>
                </div>
              </div>
              <span
                className={`text-xs px-2 py-1 rounded ${ESTADO_BADGE[p.estadoAprobacion] ?? "bg-gray-100 text-gray-700"}`}
              >
                {p.estadoAprobacion.replace("_", " ")}
              </span>
            </div>
            {p.objetivos && <p className="text-sm text-gray-700 mb-3">{p.objetivos}</p>}
            {p.observaciones && p.estadoAprobacion === "OBSERVADO" && (
              <p className="text-sm text-orange-700 bg-orange-50 rounded p-2 mb-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5" /> {p.observaciones}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              {(p.estadoAprobacion === "BORRADOR" || p.estadoAprobacion === "OBSERVADO") && (
                <button
                  onClick={() =>
                    run(() => cambiarAprobacionPlan(p.id, "ENVIAR"), "Plan enviado a revisión.")
                  }
                  disabled={pending}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" /> Enviar a revisión
                </button>
              )}
              {p.estadoAprobacion === "EN_REVISION" && (
                <>
                  <button
                    onClick={() =>
                      run(() => cambiarAprobacionPlan(p.id, "APROBAR"), "Plan aprobado.")
                    }
                    disabled={pending}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[var(--caritas-green)] text-white rounded disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Aprobar
                  </button>
                  <button
                    onClick={() => {
                      const obs = window.prompt("Observaciones:");
                      if (obs)
                        run(() => cambiarAprobacionPlan(p.id, "OBSERVAR", obs), "Plan observado.");
                    }}
                    disabled={pending}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-orange-500 text-white rounded disabled:opacity-50"
                  >
                    <AlertCircle className="w-3.5 h-3.5" /> Observar
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <PaginationControls
        total={planes.length}
        start={visibleFrom}
        end={visibleTo}
        page={safePage}
        totalPages={totalPages}
        onPrevious={() => setCurrentPage((p) => Math.max(1, p - 1))}
        onNext={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
        pageSize={pageSize}
        onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }}
        className="mt-6"
      />
    </div>
  );
}
