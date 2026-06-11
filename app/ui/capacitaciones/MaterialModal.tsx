"use client";

import { useState, useRef } from "react";
import { Upload, Link as LinkIcon, X, FileText, CheckCircle2, Loader2 } from "lucide-react";
import { presignMaterial } from "@/app/actions/capacitaciones";
import { toast } from "sonner";

const TIPOS_MATERIAL = [
  "Documento (PDF, Word, Excel)",
  "Presentación",
  "Video",
  "Enlace web",
  "Otro",
];

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
  const [form, setForm] = useState({
    titulo: inicial?.titulo ?? "",
    tipoMaterial: inicial?.tipoMaterial ?? TIPOS_MATERIAL[0],
    enlaceMaterial: inicial?.enlaceMaterial ?? "",
  });
  const [modo, setModo] = useState<"enlace" | "archivo">("enlace");
  const [uploading, setUploading] = useState(false);
  const [uploadedName, setUploadedName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await presignMaterial(file.name, file.type);
      if (!res.ok) { toast.error(res.message); return; }
      await fetch(res.uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      setForm((f) => ({ ...f, enlaceMaterial: res.publicUrl, titulo: f.titulo || file.name.replace(/\.[^.]+$/, "") }));
      setUploadedName(file.name);
      toast.success("Archivo subido correctamente.");
    } catch {
      toast.error("Error al subir el archivo.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-4">
        {/* Tipo */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Tipo de material *</label>
          <select
            value={form.tipoMaterial}
            onChange={(e) => setForm({ ...form, tipoMaterial: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[var(--caritas-green)]"
          >
            {TIPOS_MATERIAL.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Título */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Título *</label>
          <input
            value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            placeholder="Ej. Presentación - Introducción GRD"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[var(--caritas-green)]"
            autoFocus
          />
        </div>

        {/* Toggle enlace / archivo */}
        <div>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-3">
            <button
              onClick={() => setModo("enlace")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${modo === "enlace" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              <LinkIcon className="w-3.5 h-3.5" /> Enlace externo
            </button>
            <button
              onClick={() => setModo("archivo")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${modo === "archivo" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              <Upload className="w-3.5 h-3.5" /> Subir archivo
            </button>
          </div>

          {modo === "enlace" ? (
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                value={form.enlaceMaterial}
                onChange={(e) => setForm({ ...form, enlaceMaterial: e.target.value })}
                placeholder="https://drive.google.com/..."
                className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[var(--caritas-green)]"
              />
              <p className="text-[11px] text-gray-400 mt-1">Google Drive, Dropbox u otro enlace externo.</p>
            </div>
          ) : (
            <div>
              <input ref={fileRef} type="file" className="hidden" onChange={handleFile}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.mp4,.mov,.avi,.png,.jpg,.jpeg" />
              {uploadedName ? (
                <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-green-800 truncate">{uploadedName}</p>
                    <p className="text-xs text-green-600">Archivo subido correctamente</p>
                  </div>
                  <button onClick={() => { setUploadedName(null); setForm((f) => ({ ...f, enlaceMaterial: "" })); if (fileRef.current) fileRef.current.value = ""; }}
                    className="text-green-500 hover:text-green-700">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="w-full flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-[var(--caritas-green)] hover:bg-[var(--caritas-green)]/5 transition-colors disabled:opacity-50"
                >
                  {uploading ? (
                    <><Loader2 className="w-6 h-6 text-[var(--caritas-green)] animate-spin" /><span className="text-xs text-gray-500">Subiendo...</span></>
                  ) : (
                    <><FileText className="w-6 h-6 text-gray-400" /><span className="text-sm text-gray-600 font-medium">Haz clic para seleccionar un archivo</span><span className="text-xs text-gray-400">PDF, Word, Excel, PowerPoint, Video, Imagen</span></>
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
            Cancelar
          </button>
          <button
            disabled={loading || uploading || !form.titulo.trim()}
            onClick={() => onConfirm(form)}
            className="px-4 py-2 text-sm bg-[var(--caritas-green)] text-white rounded-lg disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            {title === "Editar Material" ? "Guardar cambios" : "Agregar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
