"use client";

import { useState, useTransition } from "react";
import { FileText, ExternalLink, Image as ImageIcon, Trash2 } from "lucide-react";
import type { EvidenciaDetalle } from "@/core/application/dtos/IncidenciaDetalleDTO";
import { fmtDate, fmtBytes } from "@/app/ui/grd/incidente/lib/format";
import { eliminarEvidencia } from "@/app/actions/evidencias";
import { useRouter } from "next/navigation";

/** Registro completo de evidencias cargadas (tarjetas con enlace de descarga). */
export function EvidenciasRegistro({ evidencias }: { evidencias: EvidenciaDetalle[] }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
        Evidencias cargadas ({evidencias.length})
      </p>
      {evidencias.length === 0 ? (
        <div className="text-center py-6 text-sm text-gray-400 bg-gray-50 border border-dashed border-gray-200 rounded-lg">
          Aún no se han cargado evidencias para este caso.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {evidencias.map((ev) => {
            const esImagen = (ev.formato ?? "").startsWith("image/");
            const Icono = esImagen ? ImageIcon : FileText;
            const peso = fmtBytes(ev.tamano);
            return (
              <EvidenciaCardConBorrar key={ev.id} ev={ev} Icono={Icono} peso={peso} compacto={false} />
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Chip compacto de una evidencia (usado dentro del informe y CampoStep). */
export function EvidenciaChip({ ev }: { ev: EvidenciaDetalle }) {
  const esImagen = (ev.formato ?? "").startsWith("image/");
  const Icono = esImagen ? ImageIcon : FileText;
  return <EvidenciaCardConBorrar ev={ev} Icono={Icono} peso={null} compacto />;
}

function EvidenciaCardConBorrar({
  ev,
  Icono,
  peso,
  compacto,
}: {
  ev: EvidenciaDetalle;
  Icono: React.ElementType;
  peso: string | null;
  compacto: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [eliminado, setEliminado] = useState(false);

  if (eliminado) return null;

  function handleBorrar(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`¿Eliminar "${ev.nombreArchivo}"?`)) return;
    startTransition(async () => {
      await eliminarEvidencia(ev.id);
      setEliminado(true);
      router.refresh();
    });
  }

  return (
    <div className="group flex items-center gap-2 p-2 border border-[#DDDDDD] rounded-lg hover:border-[#009850]/50 hover:bg-[#009850]/5 transition-colors">
      <a
        href={ev.urlArchivo}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 flex-1 min-w-0"
      >
        <div className={`${compacto ? "w-8 h-8" : "w-9 h-9"} rounded-lg bg-[#009850]/10 flex items-center justify-center flex-shrink-0`}>
          <Icono className="w-4 h-4 text-[#009850]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`${compacto ? "text-xs" : "text-sm"} font-medium text-gray-800 truncate`}>
            {ev.nombreArchivo}
          </p>
          {!compacto && ev.descripcion && (
            <p className="text-xs text-gray-500 truncate">{ev.descripcion}</p>
          )}
          {!compacto && (
            <p className="text-[11px] text-gray-400 mt-0.5">
              {fmtDate(ev.fecha)}
              {peso ? ` · ${peso}` : ""}
              {ev.cargadoPor ? ` · ${ev.cargadoPor}` : ""}
            </p>
          )}
        </div>
        <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#009850] flex-shrink-0" />
      </a>
      <button
        onClick={handleBorrar}
        disabled={pending}
        title="Eliminar evidencia"
        className="ml-1 p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 disabled:opacity-40"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
