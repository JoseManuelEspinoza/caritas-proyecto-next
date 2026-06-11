"use client";

import { useEffect, useState } from "react";
import { X, Download } from "lucide-react";
import { obtenerDatosConstancia } from "@/app/actions/capacitaciones";
import { buildConstanciaDoc, generarConstanciaPdf, type ConstanciaData } from "@/app/lib/constancia-pdf";

export function ConstanciaModal({
  idInscripcion,
  onClose,
}: {
  idInscripcion: string;
  onClose: () => void;
}) {
  const [datos, setDatos] = useState<ConstanciaData | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    obtenerDatosConstancia(idInscripcion).then((d) => {
      if (!d) return;
      setDatos(d);
      const doc = buildConstanciaDoc(d);
      objectUrl = URL.createObjectURL(doc.output("blob"));
      setPdfUrl(objectUrl);
    });
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [idInscripcion]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden"
        style={{ height: "90vh" }}>
        {/* Barra superior */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 shrink-0">
          <span className="text-sm font-medium text-gray-700">Constancia de Capacitación</span>
          <div className="flex items-center gap-2">
            {datos && (
              <button
                onClick={() => generarConstanciaPdf(datos)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--caritas-green)] text-white text-xs font-medium rounded-lg hover:opacity-90 transition-opacity"
              >
                <Download className="w-3.5 h-3.5" />
                Descargar PDF
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 bg-gray-100 overflow-hidden">
          {pdfUrl ? (
            <iframe src={pdfUrl} className="w-full h-full border-0" title="Constancia PDF" />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              Generando constancia…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
