"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export function SeccionAcordeon({
  titulo,
  badge,
  accion,
  defaultOpen = true,
  onOpen,
  children,
}: {
  titulo: string;
  badge?: number;
  accion?: React.ReactNode;
  defaultOpen?: boolean;
  onOpen?: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) onOpen?.();
  };

  return (
    <div className="border border-[var(--caritas-border)] rounded-xl overflow-hidden mb-4">
      <div
        role="button"
        tabIndex={0}
        onClick={toggle}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") toggle(); }}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[var(--caritas-text)]">{titulo}</span>
          {badge !== undefined && (
            <span className="text-[10px] bg-gray-200 text-gray-600 rounded-full px-1.5 py-0.5 font-medium">
              {badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {accion && <div onClick={(e) => e.stopPropagation()}>{accion}</div>}
          <ChevronDown
            className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </div>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}
