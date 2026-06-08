"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export function PaginationControls({
  total,
  start,
  end,
  page,
  totalPages,
  onPrevious,
  onNext,
  className = "",
}: {
  total: number;
  start: number;
  end: number;
  page: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
  className?: string;
}) {
  if (total === 0 || totalPages <= 1) return null;

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white border border-[var(--caritas-border)] rounded-xl px-4 py-3 ${className}`.trim()}
    >
      <p className="text-xs text-gray-500">
        Mostrando {start}-{end} de {total}
      </p>
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
