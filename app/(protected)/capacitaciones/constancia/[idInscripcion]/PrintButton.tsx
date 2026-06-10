"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="flex items-center gap-2 px-5 py-2.5 bg-[var(--caritas-green)] text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity"
    >
      <Printer className="w-4 h-4" />
      Imprimir / Guardar como PDF
    </button>
  );
}
