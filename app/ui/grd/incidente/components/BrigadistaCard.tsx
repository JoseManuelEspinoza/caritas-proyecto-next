import type React from "react";
import { X } from "lucide-react";
import { avatarColor, iniciales } from "@/app/ui/grd/incidente/lib/avatar";

/** Tarjeta de brigadista (avatar + nombre + parroquia/celular), opcionalmente arrastrable. */
export function BrigCard({
  id,
  nombres,
  apellidos,
  parroquia,
  celular,
  badge,
  onRemove,
  draggable,
  onDragStart,
  onDragEnd,
}: {
  id: string;
  nombres: string;
  apellidos: string | null;
  parroquia: string | null;
  celular: string | null;
  badge?: string;
  onRemove?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}) {
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`flex items-center gap-2 p-2 bg-white border border-[#DDDDDD] rounded-lg ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${avatarColor(id)}`}
      >
        <span className="text-white text-[10px] font-bold">{iniciales(nombres, apellidos)}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-medium text-gray-900 truncate">
            {nombres} {apellidos ?? ""}
          </p>
          {badge && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#00C8B4]/15 text-[#009850]">
              {badge}
            </span>
          )}
        </div>
        <p className="text-[10px] text-gray-500 truncate">
          {parroquia ?? "—"}
          {celular ? ` · ${celular}` : ""}
        </p>
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="p-1 text-gray-400 hover:text-red-500"
          aria-label="Quitar"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
