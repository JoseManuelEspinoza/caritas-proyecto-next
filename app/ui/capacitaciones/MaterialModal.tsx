"use client";

import { useState } from "react";
import { Upload, Link as LinkIcon, X } from "lucide-react";
import { FileUpload, type ArchivoSubido } from "@/app/ui/shared/file-upload";

function detectarTipo(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (["pdf", "doc", "docx", "xls", "xlsx"].includes(ext)) return "Documento (PDF, Word, Excel)";
  if (["ppt", "pptx"].includes(ext)) return "Presentación";
  if (["mp4", "mov", "avi", "mkv", "webm"].includes(ext)) return "Video";
  return "Otro";
}

interface Props {
  title?: string;
  inicial?: { titulo: string; tipoMaterial: string; enlaceMaterial: string };
  onConfirm: (data: { titulo: string; tipoMaterial: string; enlaceMaterial: string }) => Promise<void>;
  onClose: () => void;
  loading?: boolean;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function MaterialModal({ title = "Agregar Material", inicial, onConfirm, onClose, loading }: Props) {
  const [titulo, setTitulo] = useState(inicial?.titulo ?? "");
  const [enlaceMaterial, setEnlaceMaterial] = useState(inicial?.enlaceMaterial ?? "");
  const [tipoMaterial, setTipoMaterial] = useState(inicial?.tipoMaterial ?? "Enlace web");
  const [modo, setModo] = useState<"enlace" | "archivo">("enlace");
  const [archivos, setArchivos] = useState<ArchivoSubido[]>([]);

  const cambiarModo = (nuevoModo: "enlace" | "archivo") => {
    setTipoMaterial(nuevoModo === "enlace" ? "Enlace web" : "Documento (PDF, Word, Excel)");
    setEnlaceMaterial("");
    setArchivos([]);
    setModo(nuevoModo);
  };

  // Al subir un archivo se guarda un enlace ESTABLE (/api/archivos?key=...):
  // nunca expira, a diferencia de las URLs prefirmadas.
  const handleArchivos = (nuevos: ArchivoSubido[]) => {
    setArchivos(nuevos);
    const archivo = nuevos[0];
    if (archivo) {
      setEnlaceMaterial(`/api/archivos?key=${encodeURIComponent(archivo.key)}`);
      setTipoMaterial(detectarTipo(archivo.nombre));
      if (!titulo) setTitulo(archivo.nombre.replace(/\.[^.]+$/, ""));
    } else {
      setEnlaceMaterial("");
      setTipoMaterial("Documento (PDF, Word, Excel)");
    }
  };

  const puedeAgregar = titulo.trim() && enlaceMaterial.trim();

  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-4">
        {/* Título */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Título *</label>
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ej. Presentación - Introducción GRD"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[var(--caritas-green)]"
            autoFocus
          />
        </div>

        {/* Toggle enlace / archivo */}
        <div>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-3">
            <button
              onClick={() => cambiarModo("enlace")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${modo === "enlace" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              <LinkIcon className="w-3.5 h-3.5" /> Enlace externo
            </button>
            <button
              onClick={() => cambiarModo("archivo")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${modo === "archivo" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              <Upload className="w-3.5 h-3.5" /> Subir archivo
            </button>
          </div>

          {modo === "enlace" ? (
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                value={enlaceMaterial}
                onChange={(e) => setEnlaceMaterial(e.target.value)}
                placeholder="https://drive.google.com/..."
                className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[var(--caritas-green)]"
              />
              <p className="text-[11px] text-gray-400 mt-1">Google Drive, YouTube, Dropbox u otro enlace externo.</p>
            </div>
          ) : (
            <FileUpload
              tipo="material-capacitacion"
              multiple={false}
              value={archivos}
              onChange={handleArchivos}
              label="Arrastra el material aquí o haz clic para seleccionar"
            />
          )}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
            Cancelar
          </button>
          <button
            disabled={loading || !puedeAgregar}
            onClick={() => onConfirm({ titulo, tipoMaterial, enlaceMaterial })}
            className="px-4 py-2 text-sm bg-[var(--caritas-green)] text-white rounded-lg disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            {title === "Editar Material" ? "Guardar cambios" : "Agregar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
