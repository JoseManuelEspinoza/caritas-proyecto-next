// confianza.ts — Servicio de dominio: función confianza_mixta() del RF36.
//
// Calcula un score de confianza (0–10) para un brigadista, combinando una
// valoración manual del especialista con una componente automática (capacitaciones
// + incidencias atendidas). Es lógica de dominio PURA: no conoce Prisma ni HTTP.
//
// Se mantiene autocontenido (define sus propios tipos mínimos) para no acoplar el
// dominio a capas superiores.

export type EstadoCertificacion = 'GENERADA' | 'PENDIENTE' | 'ENVIADA' | 'ANULADA'

/** Datos mínimos que el scoring necesita de un brigadista. */
export interface ConfianzaInput {
  certificacionCurso?: { estadoCertificacion: EstadoCertificacion } | null
}

/** Pesos de la combinación manual/automática (configurables, no hardcodeados). */
export interface PesosConfianza {
  pesoManual: number
  pesoAutomatico: number
}

export const PESOS_DEFAULT: PesosConfianza = {
  pesoManual: 0.4,
  pesoAutomatico: 0.6,
}

const MAX_INCIDENCIAS_REFERENCIA = 10
const VALOR_NEUTRO_MANUAL = 5.0

// ⚠️ El campo `valoracionEspecialista` aún NO existe en el schema Prisma
// (BrigadistaParroquial). Hasta que se agregue, la valoración manual usa 5.0
// (valor neutro) para no penalizar ni premiar al brigadista.
// → Cuando exista, recibir el brigadista aquí y devolver
//   `brigadista.valoracionEspecialista ?? VALOR_NEUTRO_MANUAL`.
function scoreManual(): number {
  return VALOR_NEUTRO_MANUAL
}

function scoreCapacitaciones(brigadista: ConfianzaInput): number {
  if (!brigadista.certificacionCurso) return 0
  switch (brigadista.certificacionCurso.estadoCertificacion) {
    case 'GENERADA':
    case 'ENVIADA':
      return 10
    case 'PENDIENTE':
      return 5
    default:
      return 0
  }
}

function scoreIncidencias(incidenciasAtendidas: number): number {
  if (incidenciasAtendidas <= 0) return 0
  return Math.min((incidenciasAtendidas / MAX_INCIDENCIAS_REFERENCIA) * 10, 10)
}

/**
 * confianza_mixta() — solo se usa en la Fase 1 del algoritmo.
 *
 *   score = pesoManual · valoracionManual(5.0) + pesoAutomatico · auto
 *
 * donde `auto`:
 *   - si incidenciasAtendidas > 0 → promedio(scoreCapacitaciones, scoreIncidencias)
 *   - si incidenciasAtendidas = 0 → solo scoreCapacitaciones (sin penalizar).
 */
export function confianzaMixta(
  brigadista: ConfianzaInput,
  incidenciasAtendidas: number,
  pesos: PesosConfianza = PESOS_DEFAULT,
): number {
  const base = scoreManual()
  const cap = scoreCapacitaciones(brigadista)

  const auto =
    incidenciasAtendidas > 0
      ? (cap + scoreIncidencias(incidenciasAtendidas)) / 2
      : cap // sin penalización si no hubo incidencias atendidas

  const score = pesos.pesoManual * base + pesos.pesoAutomatico * auto
  return parseFloat(Math.min(Math.max(score, 0), 10).toFixed(2))
}
