"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type React from "react";

/** Sección numerada con cabecera colapsable (usada en el formulario de evaluación). */
export function Seccion({
  num,
  titulo,
  children,
  defaultOpen = true,
}: {
  num: string;
  titulo: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center gap-2 cursor-pointer hover:bg-gray-100 transition-colors text-left"
      >
        <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
          {num}
        </span>
        <span className="flex-1 text-sm font-semibold text-gray-800 uppercase tracking-wide">{titulo}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        )}
      </button>
      {open && <div className="p-4 space-y-3">{children}</div>}
    </div>
  );
}

/** Sección de solo lectura (A, B, C…) para el informe que revisa el Comité. */
export function ReadSeccion({
  letra,
  titulo,
  children,
}: {
  letra: string;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[11px] font-bold text-purple-700 uppercase tracking-wider mb-2">
        {letra}) {titulo}
      </p>
      {children}
    </div>
  );
}

/** Campo etiqueta/valor compacto para el informe de solo lectura. */
export function ReadCampo({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg border border-gray-100 px-2.5 py-1.5">
      <p className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-xs font-medium text-gray-800">{value}</p>
    </div>
  );
}
