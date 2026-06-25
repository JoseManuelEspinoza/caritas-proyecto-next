import type React from "react";

/** Etiqueta + valor en formato campo de solo lectura. */
export function InfoField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2.5">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="text-sm font-medium text-gray-800">{value}</p>
    </div>
  );
}
