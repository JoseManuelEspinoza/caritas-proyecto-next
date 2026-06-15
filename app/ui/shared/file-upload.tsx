"use client";

/**
 * Subida de archivos ESTÁNDAR del sistema (S3 vía URL prefirmada).
 *
 *  - `subirArchivoS3(file, opts)`: la única función de subida del cliente.
 *    Valida (upload-config), pide la URL prefirmada (actions/uploads) y sube
 *    con PUT directo a S3 reportando progreso. Para flujos que manejan su
 *    propio estado (p. ej. el formulario de incidentes).
 *
 *  - `<FileUpload />`: dropzone reutilizable con arrastrar-y-soltar, cola de
 *    archivos, barra de progreso, reintento y eliminación. Para el resto de
 *    vistas. Entrega/recibe `ArchivoSubido[]` (siempre keys, nunca URLs).
 */

import { useRef, useState } from "react";
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Film,
  X,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { presignUpload } from "@/app/actions/uploads";
import {
  ACCEPT,
  HINT,
  TIPOS_UPLOAD,
  validarArchivo,
  type TipoUpload,
} from "@/app/lib/upload-config";

export type ArchivoSubido = {
  key: string;
  nombre: string;
  formato: string | null;
  tamano: number | null;
};

/** Sube un archivo a S3 con el flujo estándar. Lanza Error con mensaje legible. */
export async function subirArchivoS3(
  file: File,
  opts: { tipo: TipoUpload; entidadId?: string | null; onProgress?: (pct: number) => void }
): Promise<ArchivoSubido> {
  const categoria = TIPOS_UPLOAD[opts.tipo].categoria;
  const invalido = validarArchivo(file, categoria);
  if (invalido) throw new Error(invalido);

  const ct = file.type || "application/octet-stream";
  const res = await presignUpload({
    tipo: opts.tipo,
    entidadId: opts.entidadId ?? null,
    nombreArchivo: file.name,
    contentType: ct,
    tamano: file.size,
  });
  if (!res.ok) throw new Error(res.message);

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", res.uploadUrl);
    xhr.setRequestHeader("Content-Type", ct);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) opts.onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Error al subir (${xhr.status})`));
    xhr.onerror = () => reject(new Error("Error de red al subir el archivo."));
    xhr.send(file);
  });

  return { key: res.key, nombre: file.name, formato: ct, tamano: file.size };
}

export function formatoTamano(bytes: number | null | undefined): string {
  if (bytes == null) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function IconoArchivo({ mime, className }: { mime?: string | null; className?: string }) {
  if (mime?.startsWith("image/")) return <ImageIcon className={className} />;
  if (mime?.startsWith("video/")) return <Film className={className} />;
  return <FileText className={className} />;
}

type ItemCola = {
  uid: string;
  file: File;
  nombre: string;
  tamano: number;
  estado: "subiendo" | "error";
  pct: number;
  error?: string;
};

let seq = 0;
const nuevoUid = () => `up-${Date.now()}-${seq++}`;

export function FileUpload({
  tipo,
  entidadId,
  value,
  onChange,
  multiple = true,
  disabled = false,
  label = "Arrastra archivos aquí o haz clic para seleccionar",
  hint,
  compact = false,
}: {
  tipo: TipoUpload;
  entidadId?: string | null;
  /** Archivos ya subidos (keys). El componente añade/quita sobre esta lista. */
  value: ArchivoSubido[];
  onChange: (archivos: ArchivoSubido[]) => void;
  multiple?: boolean;
  disabled?: boolean;
  label?: string;
  hint?: string;
  /** Versión compacta (botón en línea, sin dropzone grande). */
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [cola, setCola] = useState<ItemCola[]>([]);
  const [arrastrando, setArrastrando] = useState(false);

  const categoria = TIPOS_UPLOAD[tipo].categoria;
  const textoHint = hint ?? HINT[categoria];
  const ocupado = cola.some((i) => i.estado === "subiendo");

  function actualizar(uid: string, patch: Partial<ItemCola>) {
    setCola((prev) => prev.map((i) => (i.uid === uid ? { ...i, ...patch } : i)));
  }

  async function subir(uid: string, file: File) {
    try {
      const subido = await subirArchivoS3(file, {
        tipo,
        entidadId,
        onProgress: (pct) => actualizar(uid, { pct }),
      });
      setCola((prev) => prev.filter((i) => i.uid !== uid));
      onChange([...value, subido]);
    } catch (err) {
      actualizar(uid, {
        estado: "error",
        error: err instanceof Error ? err.message : "No se pudo subir el archivo.",
      });
    }
  }

  function procesar(files: FileList | File[] | null) {
    if (!files || disabled) return;
    let lista = Array.from(files);
    if (!multiple) {
      lista = lista.slice(0, 1);
      // En modo un-solo-archivo, el nuevo reemplaza al anterior.
      if (lista.length) onChange([]);
    }
    for (const file of lista) {
      const uid = nuevoUid();
      setCola((prev) => [
        ...prev,
        { uid, file, nombre: file.name, tamano: file.size, estado: "subiendo", pct: 0 },
      ]);
      void subir(uid, file);
    }
  }

  function reintentar(item: ItemCola) {
    actualizar(item.uid, { estado: "subiendo", pct: 0, error: undefined });
    void subir(item.uid, item.file);
  }

  const quitar = (key: string) => onChange(value.filter((a) => a.key !== key));

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        multiple={multiple}
        accept={ACCEPT[categoria]}
        onChange={(e) => {
          procesar(e.target.files);
          e.target.value = "";
        }}
      />

      {compact ? (
        <button
          type="button"
          disabled={disabled || ocupado}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-[var(--caritas-green)] border border-[var(--caritas-green)]/40 rounded-lg hover:bg-[var(--caritas-green)]/5 transition-colors disabled:opacity-50"
        >
          <UploadCloud className="w-4 h-4" />
          {label}
        </button>
      ) : (
        <div
          role="button"
          tabIndex={0}
          aria-disabled={disabled}
          onClick={() => !disabled && inputRef.current?.click()}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && !disabled) inputRef.current?.click();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setArrastrando(true);
          }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={(e) => {
            e.preventDefault();
            setArrastrando(false);
            procesar(e.dataTransfer.files);
          }}
          className={`w-full flex flex-col items-center justify-center gap-1.5 p-5 border-2 border-dashed rounded-lg transition-colors cursor-pointer select-none ${
            disabled
              ? "border-gray-200 bg-gray-50 cursor-not-allowed opacity-60"
              : arrastrando
                ? "border-[var(--caritas-green)] bg-[var(--caritas-green)]/10"
                : "border-gray-300 hover:border-[var(--caritas-green)] hover:bg-[var(--caritas-green)]/5"
          }`}
        >
          <UploadCloud className={`w-6 h-6 ${arrastrando ? "text-[var(--caritas-green)]" : "text-gray-400"}`} />
          <span className="text-sm text-gray-600 font-medium text-center">{label}</span>
          <span className="text-xs text-gray-400 text-center">{textoHint}</span>
        </div>
      )}

      {/* Archivos en cola (subiendo / con error) */}
      {cola.map((item) => (
        <div
          key={item.uid}
          className={`flex items-center gap-3 p-2.5 rounded-lg border ${
            item.estado === "error" ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-200"
          }`}
        >
          {item.estado === "error" ? (
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          ) : (
            <IconoArchivo mime={item.file.type} className="w-4 h-4 text-gray-400 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-gray-700 truncate">{item.nombre}</p>
              <span className="text-[11px] text-gray-400 shrink-0">
                {item.estado === "error" ? "Falló" : `${item.pct}%`}
              </span>
            </div>
            {item.estado === "error" ? (
              <p className="text-[11px] text-red-600 truncate">{item.error}</p>
            ) : (
              <div className="mt-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--caritas-green)] rounded-full transition-all"
                  style={{ width: `${item.pct}%` }}
                />
              </div>
            )}
          </div>
          {item.estado === "error" && (
            <>
              <button
                type="button"
                onClick={() => reintentar(item)}
                className="p-1 text-gray-500 hover:text-[var(--caritas-green)]"
                title="Reintentar"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setCola((prev) => prev.filter((i) => i.uid !== item.uid))}
                className="p-1 text-gray-400 hover:text-red-500"
                title="Quitar"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      ))}

      {/* Archivos ya subidos */}
      {value.map((a) => (
        <div
          key={a.key}
          className="flex items-center gap-3 p-2.5 bg-green-50 border border-green-200 rounded-lg"
        >
          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-green-800 truncate">{a.nombre}</p>
            <p className="text-[11px] text-green-600">{formatoTamano(a.tamano)}</p>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={() => quitar(a.key)}
              className="p-1 text-gray-400 hover:text-red-500"
              title="Quitar"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
