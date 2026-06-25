"use client";
import { useState } from "react";
import type React from "react";
import { ChevronDown, ChevronUp, type LucideIcon } from "lucide-react";

type SeccionColor = "green" | "orange" | "purple";

const COLORS: Record<SeccionColor, {
  border: string; header: string; iconBox: string; iconText: string;
  numBg: string; numText: string; badge: string; badgeText: string; chevron: string;
}> = {
  green: {
    border: "border-[#009850]/20",
    header: "bg-[#009850]/8 border-[#009850]/15 hover:bg-[#009850]/12",
    iconBox: "bg-[#009850]/15",
    iconText: "text-[#009850]",
    numBg: "bg-[#009850]/15",
    numText: "text-[#009850]",
    badge: "bg-[#009850]/10 text-[#009850]",
    badgeText: "text-[#009850]",
    chevron: "text-[#009850]/60",
  },
  orange: {
    border: "border-orange-200",
    header: "bg-orange-50 border-orange-100 hover:bg-orange-100",
    iconBox: "bg-orange-100",
    iconText: "text-orange-600",
    numBg: "bg-orange-100",
    numText: "text-orange-700",
    badge: "bg-orange-100 text-orange-700",
    badgeText: "text-orange-600",
    chevron: "text-orange-400",
  },
  purple: {
    border: "border-purple-200",
    header: "bg-purple-50 border-purple-100 hover:bg-purple-100",
    iconBox: "bg-purple-100",
    iconText: "text-purple-600",
    numBg: "bg-purple-100",
    numText: "text-purple-700",
    badge: "bg-purple-100 text-purple-700",
    badgeText: "text-purple-600",
    chevron: "text-purple-400",
  },
};

/** Sección numerada colapsable — estándar unificado para todos los pasos del incidente. */
export function Seccion({
  num,
  titulo,
  icon: Icon,
  contador,
  color = "green",
  children,
  defaultOpen = true,
}: {
  num: string;
  titulo: string;
  icon?: LucideIcon;
  contador?: string;
  color?: SeccionColor;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const c = COLORS[color];
  return (
    <div className={`border ${c.border} rounded-xl overflow-hidden`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full px-4 py-3 ${c.header} border-b flex items-center gap-2 transition-colors text-left`}
      >
        {Icon && (
          <div className={`w-7 h-7 rounded-lg ${c.iconBox} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-4 h-4 ${c.iconText}`} />
          </div>
        )}
        <span className={`w-6 h-6 rounded-full ${c.numBg} ${c.numText} text-xs font-bold flex items-center justify-center flex-shrink-0`}>
          {num}
        </span>
        <span className="text-sm font-bold text-gray-800 uppercase tracking-wide flex-1">
          {titulo}
        </span>
        {contador && (
          <span className={`text-[11px] font-medium ${c.badge} px-2 py-0.5 rounded-full flex-shrink-0`}>
            {contador}
          </span>
        )}
        {open ? (
          <ChevronUp className={`w-4 h-4 ${c.chevron} flex-shrink-0`} />
        ) : (
          <ChevronDown className={`w-4 h-4 ${c.chevron} flex-shrink-0`} />
        )}
      </button>
      {open && <div className="p-5 space-y-4 bg-white">{children}</div>}
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
