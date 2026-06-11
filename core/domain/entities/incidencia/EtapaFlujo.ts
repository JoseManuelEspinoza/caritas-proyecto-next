import { EstadoIncidencia } from "./EstadoIncidencia";

/**
 * Etapas del flujo GRD de una incidencia. Son datos PUROS de dominio: definen
 * qué estados pertenecen a cada etapa y el orden del flujo. La decoración visual
 * (label, icono, color) vive en la capa de presentación, no aquí.
 */
export type Etapa =
  | "REGISTRO"
  | "ASIGNACION"
  | "RECOPILACION"
  | "REVISION"
  | "ATENCION"
  | "SEGUIMIENTO"
  | "CIERRE";

/** Orden canónico del flujo. */
export const ETAPAS_ORDEN: readonly Etapa[] = [
  "REGISTRO",
  "ASIGNACION",
  "RECOPILACION",
  "REVISION",
  "ATENCION",
  "SEGUIMIENTO",
  "CIERRE",
];

/** Estados que pertenecen a cada etapa (única definición — antes duplicada en la UI). */
export const ESTADOS_POR_ETAPA: Record<Etapa, readonly EstadoIncidencia[]> = {
  REGISTRO: ["ABIERTO"],
  ASIGNACION: ["ASIGNADO"],
  RECOPILACION: ["DATA RECOPILADA"],
  REVISION: ["EN EVALUACION", "OBSERVADO", "APROBADO", "RECHAZADO"],
  ATENCION: ["ATENDIDO"],
  SEGUIMIENTO: ["SEGUIMIENTO ABIERTO"],
  CIERRE: ["CERRADO"],
};

/** Etapa a la que pertenece un estado. */
export function etapaDeEstado(estado: EstadoIncidencia): Etapa {
  return ETAPAS_ORDEN.find((e) => ESTADOS_POR_ETAPA[e].includes(estado)) ?? "REGISTRO";
}

/** Índice de una etapa dentro del orden del flujo. */
export function indiceEtapa(etapa: Etapa): number {
  return ETAPAS_ORDEN.indexOf(etapa);
}

/** Índice de la etapa correspondiente a un estado. */
export function indiceEtapaDeEstado(estado: EstadoIncidencia): number {
  return indiceEtapa(etapaDeEstado(estado));
}
