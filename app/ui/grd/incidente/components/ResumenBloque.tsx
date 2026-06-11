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
    <details open className="border border-gray-200 rounded-xl overflow-hidden group">
      <summary className="cursor-pointer list-none px-4 py-3 bg-gray-50 flex items-center gap-2 hover:bg-gray-100">
        <Icon className="w-4 h-4 text-[#009850] flex-shrink-0" />
        <span className="text-sm font-bold text-gray-800 flex-1">{titulo}</span>
        {contador && <span className="text-[11px] text-gray-400">{contador}</span>}
        <ChevronDown className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-180" />
      </summary>
      <div className="p-4 space-y-3">{children}</div>
    </details>
  );
}
