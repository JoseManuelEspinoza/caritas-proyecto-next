import { Flame, Waves, Mountain, Zap, TrendingDown, MapPin, type LucideIcon } from "lucide-react";
import type { EstadoIncidencia } from "@/core/domain/entities/incidencia/EstadoIncidencia";

/** Decoración visual de cada estado (label + clases de badge/punto). Solo UI. */
export const ESTADO_UI: Record<EstadoIncidencia, { label: string; badge: string; dot: string }> = {
  ABIERTO: {
    label: "Abierto",
    badge: "bg-yellow-100 text-yellow-800 border-yellow-200",
    dot: "bg-yellow-500",
  },
  ASIGNADO: {
    label: "Asignado",
    badge: "bg-blue-100 text-blue-800 border-blue-200",
    dot: "bg-blue-500",
  },
  "DATA RECOPILADA": {
    label: "Data Recopilada",
    badge: "bg-orange-100 text-orange-800 border-orange-200",
    dot: "bg-orange-500",
  },
  "EN EVALUACION": {
    label: "En Evaluación",
    badge: "bg-purple-100 text-purple-800 border-purple-200",
    dot: "bg-purple-500",
  },
  OBSERVADO: {
    label: "Observado",
    badge: "bg-amber-100 text-amber-800 border-amber-200",
    dot: "bg-amber-500",
  },
  APROBADO: {
    label: "Aprobado",
    badge: "bg-green-100 text-green-800 border-green-200",
    dot: "bg-green-500",
  },
  ATENDIDO: {
    label: "Atendido",
    badge: "bg-cyan-100 text-cyan-800 border-cyan-200",
    dot: "bg-cyan-500",
  },
  "SEGUIMIENTO ABIERTO": {
    label: "Seguimiento",
    badge: "bg-teal-100 text-teal-800 border-teal-200",
    dot: "bg-teal-500",
  },
  CERRADO: {
    label: "Cerrado",
    badge: "bg-gray-100 text-gray-700 border-gray-200",
    dot: "bg-gray-400",
  },
  RECHAZADO: {
    label: "Rechazado",
    badge: "bg-red-100 text-red-700 border-red-200",
    dot: "bg-red-500",
  },
};

/** Estado de respaldo cuando el valor no está mapeado. */
export const ESTADO_UI_FALLBACK = ESTADO_UI.ABIERTO;

/** Acceso seguro a la decoración de un estado (acepta string, aplica respaldo). */
export function estadoUI(estado: string): { label: string; badge: string; dot: string } {
  return ESTADO_UI[estado as EstadoIncidencia] ?? ESTADO_UI_FALLBACK;
}

/** Icono por categoría de evento (con respaldo en MapPin). */
export const CAT_ICONS: Record<string, LucideIcon> = {
  Incendios: Flame,
  Inundaciones: Waves,
  Derrumbes: Mountain,
  Tsunamis: Waves,
  Sismos: Zap,
  Deslizamientos: TrendingDown,
};

export function iconoCategoria(tipoEvento: string | null): LucideIcon {
  return (tipoEvento && CAT_ICONS[tipoEvento]) || MapPin;
}
