import type React from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";

/** Bloque colapsable con icono + título + contador, usado en el Resumen Final. */
export function ResumenBloque({
  icon: Icon,
  titulo,
  contador,
  children,
}: {
  icon: LucideIcon;
  titulo: string;
  contador?: string;
  children: React.ReactNode;
}) {
  return (
    <details open className="border border-[#009850]/20 rounded-xl overflow-hidden group">
      <summary className="cursor-pointer list-none px-4 py-3 bg-[#009850]/8 border-b border-[#009850]/15 flex items-center gap-2 hover:bg-[#009850]/12 transition-colors">
        <div className="w-7 h-7 rounded-lg bg-[#009850]/15 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-[#009850]" />
        </div>
        <span className="text-sm font-bold text-gray-800 flex-1">{titulo}</span>
        {contador && (
          <span className="text-[11px] font-medium text-[#009850] bg-[#009850]/10 px-2 py-0.5 rounded-full">
            {contador}
          </span>
        )}
        <ChevronDown className="w-4 h-4 text-[#009850]/60 transition-transform group-open:rotate-180" />
      </summary>
      <div className="p-5 space-y-3 bg-white">{children}</div>
    </details>
  );
}
