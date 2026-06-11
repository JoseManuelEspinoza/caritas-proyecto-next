import {
  FileText,
  UserCheck,
  ClipboardList,
  BarChart3,
  Package,
  ShieldCheck,
  FileCheck,
  type LucideIcon,
} from "lucide-react";
import {
  type Etapa,
  ETAPAS_ORDEN,
  ESTADOS_POR_ETAPA,
  etapaDeEstado,
  indiceEtapa,
} from "@/core/domain/entities/incidencia/EtapaFlujo";
import type { EstadoIncidencia } from "@/core/domain/entities/incidencia/EstadoIncidencia";

/** Decoración de cada etapa del flujo para la barra de pasos. Solo UI. */
export const PASO_UI: Record<Etapa, { label: string; icon: LucideIcon }> = {
  REGISTRO: { label: "Registrar", icon: FileText },
  ASIGNACION: { label: "Asignar Equipo", icon: UserCheck },
  RECOPILACION: { label: "Recopilar Info", icon: ClipboardList },
  REVISION: { label: "Revisar Caso", icon: BarChart3 },
  ATENCION: { label: "Atender Caso", icon: Package },
  SEGUIMIENTO: { label: "Seguimiento", icon: ShieldCheck },
  CIERRE: { label: "Resumen Final", icon: FileCheck },
};

/** Pasos en orden, listos para renderizar la barra de progreso. */
export const PASOS = ETAPAS_ORDEN.map((etapa) => ({
  etapa,
  ...PASO_UI[etapa],
  estados: ESTADOS_POR_ETAPA[etapa],
}));

/**
 * Índice del paso activo para un estado dado.
 * Caso especial: un incidente recién ABIERTO aterriza en "Asignar Equipo" (paso 1),
 * porque el registro ya está hecho y la siguiente acción es asignar el equipo.
 */
export function indicePaso(estado: string): number {
  if (estado === "ABIERTO") return 1;
  const i = indiceEtapa(etapaDeEstado(estado as EstadoIncidencia));
  return i < 0 ? 0 : i;
}
