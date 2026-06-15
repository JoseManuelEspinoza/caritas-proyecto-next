"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];

/** Selector de filas por página — va en la barra de filtros (arriba). */
export function PageSizeSelector({
  pageSize,
  onPageSizeChange,
  className = "",
}: {
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`.trim()}>
      <span className="text-xs text-gray-500 whitespace-nowrap">Filas:</span>
      <select
        value={pageSize}
        onChange={(e) => onPageSizeChange(Number(e.target.value))}
        className="text-xs border border-[var(--caritas-border)] rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#009850]/20 focus:border-[#009850]"
      >
        {PAGE_SIZE_OPTIONS.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Barra de navegación de páginas — va debajo de la tabla/lista. */
export function PaginationControls({
  total,
  start,
  end,
  page,
  totalPages,
  onPrevious,
  onNext,
  pageSize,
  onPageSizeChange,
  className = "",
}: {
  total: number;
  start: number;
  end: number;
  page: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  className?: string;
}) {
  if (total === 0) return null;

  return (
    <div
      className={`sticky bottom-0 z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white border border-[var(--caritas-border)] rounded-xl px-4 py-3 shadow-[0_-2px_8px_rgba(0,0,0,0.06)] ${className}`.trim()}
    >
      <div className="flex items-center gap-3">
        {pageSize !== undefined && onPageSizeChange && (
          <PageSizeSelector pageSize={pageSize} onPageSizeChange={onPageSizeChange} />
        )}
        <p className="text-xs text-gray-500">
          Mostrando {start}–{end} de {total}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrevious}
          disabled={page === 1}
          className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium border border-[var(--caritas-border)] rounded-lg bg-white text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Anterior
        </button>
        <span className="text-xs text-gray-500 font-medium">
          Página {page} de {totalPages}
        </span>
        <button
          type="button"
          onClick={onNext}
          disabled={page === totalPages}
          className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium border border-[var(--caritas-border)] rounded-lg bg-white text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Siguiente <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
