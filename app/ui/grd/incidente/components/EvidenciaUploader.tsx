"use client";

import { Camera, Upload, X, Loader2 } from "lucide-react";

interface Props {
  /** Callback cuando el usuario selecciona archivos (cámara o galería). */
  onFiles: (files: FileList | null) => void;
  /** Tipos aceptados. Default: imágenes, video y PDF. */
  accept?: string;
  /** Muestra spinner de carga. */
  loading?: boolean;
  loadingCount?: number;
  /** Si `true`, oculta los botones y muestra `disabledMessage`. */
  disabled?: boolean;
  disabledMessage?: string;
  /** Archivos pendientes (aún no subidos) para mostrar como chips removibles. */
  pendingFiles?: File[];
  onRemove?: (index: number) => void;
}

/**
 * Botones estándar "Cámara / Galería" para adjuntar evidencias en los steps de incidentes.
 * - Cámara: abre la cámara del dispositivo (`capture="environment"`).
 * - Galería: abre el selector de archivos normal.
 */
export function EvidenciaUploader({
  onFiles,
  accept = "image/*,video/*,.pdf",
  loading = false,
  loadingCount,
  disabled = false,
  disabledMessage,
  pendingFiles,
  onRemove,
}: Props) {
  if (disabled) {
    return (
      <p className="text-xs text-gray-400 italic text-center py-1">
        {disabledMessage ?? "No tienes permiso para cargar archivos."}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#91D723] text-[#009850] rounded-lg cursor-pointer hover:bg-[#91D723]/10 text-xs font-medium transition-colors">
          <Upload className="w-3.5 h-3.5" /> Adjuntar archivo
          <input
            type="file"
            accept={accept}
            multiple
            className="hidden"
            onChange={(e) => onFiles(e.target.files)}
          />
        </label>
      </div>

      {loading && (
        <p className="text-xs text-blue-600 flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          Subiendo{loadingCount != null ? ` ${loadingCount} archivo(s)` : ""}…
        </p>
      )}

      {pendingFiles && pendingFiles.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {pendingFiles.map((f, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 text-[10px] bg-gray-100 border border-gray-200 rounded-full pl-2 pr-1 py-0.5 text-gray-700"
            >
              {f.name}
              {onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(i)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
