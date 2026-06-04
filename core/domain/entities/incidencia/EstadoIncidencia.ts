import { BusinessRuleError } from "../../errors/DomainError";

/**
 * Estados del flujo GRD. Se usan exactamente como los persiste intermedia
 * (cadenas con espacios), para mapear 1:1 con `Incidencia.estadoActual`.
 */
export type EstadoIncidencia =
  | "ABIERTO"
  | "ASIGNADO"
  | "DATA RECOPILADA"
  | "EN EVALUACION"
  | "APROBADO"
  | "OBSERVADO"
  | "RECHAZADO"
  | "ATENDIDO"
  | "SEGUIMIENTO ABIERTO"
  | "CERRADO";

/** Tabla de transiciones permitidas (la regla del flujo). */
export const TRANSICIONES: Record<EstadoIncidencia, EstadoIncidencia[]> = {
  ABIERTO: ["ASIGNADO"],
  ASIGNADO: ["DATA RECOPILADA"],
  "DATA RECOPILADA": ["EN EVALUACION"],
  "EN EVALUACION": ["APROBADO", "OBSERVADO", "RECHAZADO"],
  OBSERVADO: ["EN EVALUACION", "RECHAZADO"],
  APROBADO: ["ATENDIDO"],
  ATENDIDO: ["SEGUIMIENTO ABIERTO"],
  "SEGUIMIENTO ABIERTO": ["SEGUIMIENTO ABIERTO", "CERRADO"],
  RECHAZADO: ["CERRADO"],
  CERRADO: [],
};

export function assertTransicion(actual: EstadoIncidencia, destino: EstadoIncidencia): void {
  if (!TRANSICIONES[actual].includes(destino)) {
    throw new BusinessRuleError(
      `Transición no permitida: ${actual} → ${destino}. ` +
        `Desde ${actual} solo se puede pasar a: ${TRANSICIONES[actual].join(", ") || "(ninguno)"}.`
    );
  }
}
