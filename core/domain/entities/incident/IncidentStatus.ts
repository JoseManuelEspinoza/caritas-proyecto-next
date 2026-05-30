import { BusinessRuleError } from '../../errors/DomainError'

/**
 * Estados del flujo GRD (Diagrama de Estados v2).
 *
 * Se usa la forma con guion bajo (DATA_RECOPILADA) para que el mapeo con el
 * enum de Prisma sea 1:1. Las etiquetas legibles ("Data Recopilada") son
 * responsabilidad de la capa de presentación.
 */
export type IncidentStatus =
  | 'ABIERTO'
  | 'ASIGNADO'
  | 'DATA_RECOPILADA'
  | 'EN_EVALUACION'
  | 'APROBADO'
  | 'OBSERVADO'
  | 'RECHAZADO'
  | 'ATENDIDO'
  | 'SEGUIMIENTO_ABIERTO'
  | 'CERRADO'

/**
 * Transiciones permitidas. La clave es el estado actual; el valor, los estados
 * a los que se puede pasar. Esta tabla ES la regla de negocio del flujo: si una
 * transición no está aquí, está prohibida.
 */
export const TRANSICIONES: Record<IncidentStatus, IncidentStatus[]> = {
  ABIERTO: ['ASIGNADO'],
  ASIGNADO: ['DATA_RECOPILADA'],
  DATA_RECOPILADA: ['EN_EVALUACION'],
  EN_EVALUACION: ['APROBADO', 'OBSERVADO', 'RECHAZADO'],
  OBSERVADO: ['EN_EVALUACION', 'RECHAZADO'],
  APROBADO: ['ATENDIDO'],
  ATENDIDO: ['SEGUIMIENTO_ABIERTO'],
  SEGUIMIENTO_ABIERTO: ['SEGUIMIENTO_ABIERTO', 'CERRADO'],
  RECHAZADO: ['CERRADO'],
  CERRADO: [],
}

/**
 * Verifica que `destino` sea alcanzable desde `actual`. Lanza
 * BusinessRuleError con un mensaje claro si la transición no está permitida.
 */
export function assertTransicion(actual: IncidentStatus, destino: IncidentStatus): void {
  if (!TRANSICIONES[actual].includes(destino)) {
    throw new BusinessRuleError(
      `Transición no permitida: ${actual} → ${destino}. ` +
        `Desde ${actual} solo se puede pasar a: ${TRANSICIONES[actual].join(', ') || '(ninguno)'}.`,
    )
  }
}
