import { FileText, ExternalLink, Image as ImageIcon } from "lucide-react";
import type { EvidenciaDetalle } from "@/core/application/dtos/IncidenciaDetalleDTO";
import { fmtDate, fmtBytes } from "@/app/ui/grd/incidente/lib/format";

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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {evidencias.map((ev) => {
            const esImagen = (ev.formato ?? "").startsWith("image/");
            const Icono = esImagen ? ImageIcon : FileText;
            const peso = fmtBytes(ev.tamano);
            return (
              <a
                key={ev.id}
                href={ev.urlArchivo}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 p-2.5 border border-[#DDDDDD] rounded-lg hover:border-[#009850]/50 hover:bg-[#009850]/5 transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-[#009850]/10 flex items-center justify-center flex-shrink-0">
                  <Icono className="w-4 h-4 text-[#009850]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{ev.nombreArchivo}</p>
                  {ev.descripcion && (
                    <p className="text-xs text-gray-500 truncate">{ev.descripcion}</p>
                  )}
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {fmtDate(ev.fecha)}
                    {peso ? ` · ${peso}` : ""}
                    {ev.cargadoPor ? ` · ${ev.cargadoPor}` : ""}
                  </p>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-[#009850] flex-shrink-0" />
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Chip compacto de una evidencia (usado dentro del informe). */
export function EvidenciaChip({ ev }: { ev: EvidenciaDetalle }) {
  const esImagen = (ev.formato ?? "").startsWith("image/");
  const Icono = esImagen ? ImageIcon : FileText;
  return (
    <a
      href={ev.urlArchivo}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-2 p-2 border border-[#DDDDDD] rounded-lg hover:border-[#009850]/50 hover:bg-[#009850]/5 transition-colors"
    >
      <div className="w-8 h-8 rounded-lg bg-[#009850]/10 flex items-center justify-center flex-shrink-0">
        <Icono className="w-4 h-4 text-[#009850]" />
      </div>
      <span className="text-xs text-gray-800 truncate flex-1">{ev.nombreArchivo}</span>
      <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#009850] flex-shrink-0" />
    </a>
  );
}
