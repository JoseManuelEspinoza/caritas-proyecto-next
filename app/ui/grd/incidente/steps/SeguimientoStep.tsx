import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CheckCircle, ShieldCheck, Loader2 } from "lucide-react";
import { EvidenciaUploader } from "@/app/ui/grd/incidente/components/EvidenciaUploader";
import { registrarSeguimientoYCerrar } from "@/app/actions/incidents";
import type { IncidenciaDetalleOutput } from "@/core/application/dtos/IncidenciaDetalleDTO";
import { permisosDeDetalle } from "@/app/lib/permisos-incidencia";
import { subirEvidencia } from "@/app/ui/grd/incidente/lib/subir-evidencia";
import { fmtDate } from "@/app/ui/grd/incidente/lib/format";
import { inputCls, textareaCls } from "@/app/ui/grd/incidente/lib/ui-classes";

/** Paso "Seguimiento": registra (una sola vez) el seguimiento post-atención y cierra el caso. */
export function SeguimientoStep({
  data,
  onDone,
  onNavigate,
}: {
  data: IncidenciaDetalleOutput;
  onDone: () => void;
  onNavigate: (step: number) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const hoy = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    fecha: hoy,
    medio: "Presencial",
    situacion: "Mejoró",
    usoAyuda: "Adecuado",
    recomendacion: "Acompañamiento",
    notas: "",
  });
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const [fotos, setFotos] = useState<File[]>([]);
  const [subiendo, setSubiendo] = useState(false);

  // El especialista/admin, o el responsable asignado al seguimiento (brigadista o GRD), puede registrar.
  const { puedeSeguir: canAct } = permisosDeDetalle(data);
  const yaRegistrado = data.seguimientos.length > 0;
  const finalizado = data.estadoActual === "CERRADO" || data.estadoActual === "RECHAZADO";

  const responsables =
    data.responsableGRD?.nombre ??
    (() => {
      const r = data.asignaciones.find((a) => a.esResponsable);
      return r ? `${r.nombres} ${r.apellidos ?? ""}`.trim() : "Especialista GRD";
    })();

  const subirArchivo = (file: File) => subirEvidencia(file, data.idIncidencia);

  function agregarFotos(files: FileList | null) {
    if (!files) return;
    setFotos((prev) => [...prev, ...Array.from(files)]);
  }

  async function enviar() {
    if (!form.fecha) {
      toast.error("Indica la fecha de seguimiento.");
      return;
    }
    if (!form.notas.trim()) {
      toast.error("Escribe las notas del seguimiento.");
      return;
    }
    setSubiendo(true);
    try {
      for (const f of fotos) {
        try {
          await subirArchivo(f);
        } catch {
          toast.error(`No se pudo subir ${f.name}, se continuará sin ese archivo.`);
        }
      }
    } finally {
      setSubiendo(false);
    }
    startTransition(async () => {
      const res = await registrarSeguimientoYCerrar(data.idIncidencia, {
        situacion: form.situacion,
        descripcion: form.notas,
        recomendaciones: form.recomendacion,
        observaciones: `Medio: ${form.medio} · Uso de la ayuda: ${form.usoAyuda} · Fotos/videos: ${fotos.length}`,
        fecha: new Date(form.fecha).toISOString(),
      });
      if (res && "message" in res) {
        toast.error(res.message);
        return;
      }
      toast.success("Seguimiento registrado. Caso cerrado.");
      onNavigate(6);
      onDone();
    });
  }

  // ── Vista de solo lectura: ya se registró el seguimiento o el caso está cerrado ──
  if (yaRegistrado || finalizado) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span className="text-sm font-medium text-green-800">
            {finalizado ? "Caso cerrado tras el seguimiento." : "Seguimiento registrado."}
          </span>
        </div>
        {data.seguimientos.length > 0 ? (
          <div className="space-y-2">
            {data.seguimientos.map((s) => (
              <div key={s.id} className="p-3 bg-gray-50 border border-[#DDDDDD] rounded-lg text-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-gray-800">{s.situacion ?? "—"}</span>
                  <span className="text-xs text-gray-400">{fmtDate(s.fecha)}</span>
                </div>
                <p className="text-gray-600 whitespace-pre-line">{s.descripcion ?? "—"}</p>
                {s.recomendaciones && (
                  <p className="text-xs text-gray-500 mt-1">Recomendación: {s.recomendaciones}</p>
                )}
                {s.necesidadesPendientes && (
                  <p className="text-xs text-amber-700 mt-1">
                    Necesidades: {s.necesidadesPendientes}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-2">No hay seguimiento registrado.</p>
        )}
      </div>
    );
  }

  if (!canAct) {
    return (
      <p className="text-sm text-gray-500 text-center py-4">
        El seguimiento será registrado por el responsable asignado.
      </p>
    );
  }

  // ── Formulario de seguimiento (se realiza una sola vez) ──
  return (
    <div className="rounded-xl border border-[#91D723]/40 overflow-hidden">
      <div className="bg-[#91D723] text-white p-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold">Seguimiento Activo</p>
            <p className="text-sm text-white/90">Responsable(s): {responsables}</p>
          </div>
        </div>
        <span className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded-full uppercase flex-shrink-0">
          Seguimiento
        </span>
      </div>

      <div className="p-4 space-y-4 bg-white">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Fecha de seguimiento <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              className={inputCls}
              value={form.fecha}
              onChange={(e) => set("fecha", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Medio</label>
            <select className={inputCls} value={form.medio} onChange={(e) => set("medio", e.target.value)}>
              {["Presencial", "Telefónico", "Virtual", "Visita domiciliaria"].map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Situación actual de la familia
            </label>
            <select
              className={inputCls}
              value={form.situacion}
              onChange={(e) => set("situacion", e.target.value)}
            >
              {["Mejoró", "Se mantiene igual", "Empeoró"].map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Uso de la ayuda entregada
            </label>
            <select
              className={inputCls}
              value={form.usoAyuda}
              onChange={(e) => set("usoAyuda", e.target.value)}
            >
              {["Adecuado", "Parcial", "Inadecuado", "No utilizada"].map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Recomendación técnica</label>
          <select
            className={inputCls}
            value={form.recomendacion}
            onChange={(e) => set("recomendacion", e.target.value)}
          >
            {["Acompañamiento", "Cierre del caso", "Nueva intervención", "Derivación"].map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Notas del seguimiento <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={4}
            className={textareaCls}
            value={form.notas}
            onChange={(e) => set("notas", e.target.value)}
            placeholder="¿Cómo está la familia? ¿Usaron bien la ayuda? ¿Qué acciones se tomaron?"
          />
        </div>

        {/* Fotos / videos del seguimiento */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Fotos del seguimiento</label>
          <EvidenciaUploader
            onFiles={agregarFotos}
            accept="image/*,video/*"
            pendingFiles={fotos}
            onRemove={(i) => setFotos((prev) => prev.filter((_, j) => j !== i))}
          />
        </div>

        <button
          onClick={enviar}
          disabled={isPending || subiendo}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold disabled:opacity-50"
          style={{ background: "var(--caritas-green)" }}
        >
          {isPending || subiendo ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Enviando…
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4" /> Enviar
            </>
          )}
        </button>
        <p className="text-[11px] text-gray-400 text-center">
          El seguimiento se registra una sola vez y, al enviarlo, el caso se cierra definitivamente.
        </p>
      </div>
    </div>
  );
}
