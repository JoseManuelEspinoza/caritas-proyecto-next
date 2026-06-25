"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import {
  FileText,
  ExternalLink,
  Image as ImageIcon,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { EvidenciaDetalle } from "@/core/application/dtos/IncidenciaDetalleDTO";
import { fmtDate, fmtBytes } from "@/app/ui/grd/incidente/lib/format";
import { eliminarEvidencia } from "@/app/actions/evidencias";
import { useRouter } from "next/navigation";

const esImagenEv = (ev: EvidenciaDetalle) =>
  (ev.formato ?? "").startsWith("image/") && !!ev.urlArchivo;

/** Registro completo de evidencias cargadas (tarjetas + visor de imágenes). */
export function EvidenciasRegistro({ evidencias }: { evidencias: EvidenciaDetalle[] }) {
  // Solo las imágenes son navegables en el visor.
  const imagenes = evidencias.filter(esImagenEv);
  const [viewerIdx, setViewerIdx] = useState<number | null>(null);

  const abrirVisor = (ev: EvidenciaDetalle) => {
    const i = imagenes.findIndex((x) => x.id === ev.id);
    if (i >= 0) setViewerIdx(i);
  };

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
            const esImagen = esImagenEv(ev);
            const Icono = esImagen ? ImageIcon : FileText;
            const peso = fmtBytes(ev.tamano);
            return (
              <EvidenciaCardConBorrar
                key={ev.id}
                ev={ev}
                Icono={Icono}
                peso={peso}
                compacto={false}
                onView={esImagen ? () => abrirVisor(ev) : undefined}
              />
            );
          })}
        </div>
      )}

      {viewerIdx !== null && imagenes.length > 0 && (
        <Lightbox
          imagenes={imagenes}
          idx={viewerIdx}
          onIdx={setViewerIdx}
          onClose={() => setViewerIdx(null)}
        />
      )}
    </div>
  );
}

/** Chip compacto de una evidencia (usado dentro del informe y CampoStep). */
export function EvidenciaChip({ ev }: { ev: EvidenciaDetalle }) {
  const esImagen = esImagenEv(ev);
  const Icono = esImagen ? ImageIcon : FileText;
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <EvidenciaCardConBorrar
        ev={ev}
        Icono={Icono}
        peso={null}
        compacto
        onView={esImagen ? () => setAbierto(true) : undefined}
      />
      {abierto && (
        <Lightbox imagenes={[ev]} idx={0} onIdx={() => {}} onClose={() => setAbierto(false)} />
      )}
    </>
  );
}

function EvidenciaCardConBorrar({
  ev,
  Icono,
  peso,
  compacto,
  onView,
}: {
  ev: EvidenciaDetalle;
  Icono: React.ElementType;
  peso: string | null;
  compacto: boolean;
  /** Si está presente, la tarjeta abre el visor en vez de un enlace externo. */
  onView?: () => void;
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

  const contenido = (
    <>
      <div
        className={`${compacto ? "w-8 h-8" : "w-9 h-9"} rounded-lg bg-[#009850]/10 flex items-center justify-center flex-shrink-0`}
      >
        <Icono className="w-4 h-4 text-[#009850]" />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={`${compacto ? "text-xs" : "text-sm"} font-medium text-gray-800 truncate`}
        >
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
      {onView ? (
        <ImageIcon className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#009850] flex-shrink-0" />
      ) : (
        <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#009850] flex-shrink-0" />
      )}
    </>
  );

  return (
    <div className="group flex items-center gap-2 p-2 border border-[#DDDDDD] rounded-lg hover:border-[#009850]/50 hover:bg-[#009850]/5 transition-colors">
      {onView ? (
        <button
          type="button"
          onClick={onView}
          className="flex items-center gap-2 flex-1 min-w-0 text-left cursor-pointer"
        >
          {contenido}
        </button>
      ) : (
        <a
          href={ev.urlArchivo}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 flex-1 min-w-0"
        >
          {contenido}
        </a>
      )}
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

/** Visor de imágenes a pantalla (modal) con navegación anterior/siguiente. */
function Lightbox({
  imagenes,
  idx,
  onIdx,
  onClose,
}: {
  imagenes: EvidenciaDetalle[];
  idx: number;
  onIdx: (i: number) => void;
  onClose: () => void;
}) {
  const total = imagenes.length;
  const prev = useCallback(() => onIdx((idx - 1 + total) % total), [idx, total, onIdx]);
  const next = useCallback(() => onIdx((idx + 1) % total), [idx, total, onIdx]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [prev, next, onClose]);

  const ev = imagenes[idx];
  if (!ev) return null;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        title="Cerrar (Esc)"
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
      >
        <X className="w-5 h-5" />
      </button>

      {total > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            prev();
          }}
          title="Anterior (←)"
          className="absolute left-2 sm:left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      <figure
        className="max-w-[92vw] max-h-[88vh] flex flex-col items-center gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ev.urlArchivo}
          alt={ev.nombreArchivo}
          className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl bg-black/20"
        />
        <figcaption className="text-white/90 text-sm text-center max-w-[80vw] truncate">
          {ev.nombreArchivo}
          {total > 1 ? ` · ${idx + 1} / ${total}` : ""}
        </figcaption>
      </figure>

      {total > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            next();
          }}
          title="Siguiente (→)"
          className="absolute right-2 sm:right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
