"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { buildConstanciaDoc, generarConstanciaPdf, type ConstanciaData } from "@/app/lib/constancia-pdf";

export function ConstanciaViewer({ datos }: { datos: ConstanciaData }) {
  const router = useRouter();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    const doc = buildConstanciaDoc(datos);
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    setPdfUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [datos]);

  return (
    <div className="w-full h-screen flex flex-col">
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Regresar
        </button>
        <button
          onClick={() => generarConstanciaPdf(datos)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--caritas-green)] text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
        >
          <Download className="w-4 h-4" />
          Descargar PDF
        </button>
      </div>
      <div className="flex-1 bg-gray-200">
        {pdfUrl ? (
          <iframe src={pdfUrl} className="w-full h-full border-0" title="Constancia PDF" />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            Generando constancia…
          </div>
        )}
      </div>
    </div>
  );
}
