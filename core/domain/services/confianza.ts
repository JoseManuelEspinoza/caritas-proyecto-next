// confianza.ts — Servicio de dominio: función confianza_mixta() del RF36.
//
// Calcula un score de confianza (0–10) para un brigadista, combinando una
// valoración manual del especialista con una componente automática (capacitaciones
// + incidencias atendidas). Es lógica de dominio PURA: no conoce Prisma ni HTTP.
//
// Se mantiene autocontenido (define sus propios tipos mínimos) para no acoplar el
// dominio a capas superiores.

export type EstadoCertificacion = "GENERADA" | "PENDIENTE" | "ENVIADA" | "ANULADA";

/** Datos mínimos que el scoring necesita de un brigadista. */
export interface ConfianzaInput {
  certificacionCurso?: { estadoCertificacion: EstadoCertificacion } | null;
}

/** Pesos de la combinación manual/automática (configurables, no hardcodeados). */
export interface PesosConfianza {
  pesoManual: number;
  pesoAutomatico: number;
}

export const PESOS_DEFAULT: PesosConfianza = {
  pesoManual: 0.4,
  pesoAutomatico: 0.6,
};

const MAX_INCIDENCIAS_REFERENCIA = 10;
const VALOR_NEUTRO_MANUAL = 5.0;

// ⚠️ El campo `valoracionEspecialista` aún NO existe en el schema Prisma
// (BrigadistaParroquial). Hasta que se agregue, la valoración manual usa 5.0
// (valor neutro) para no penalizar ni premiar al brigadista.
// → Cuando exista, recibir el brigadista aquí y devolver
//   `brigadista.valoracionEspecialista ?? VALOR_NEUTRO_MANUAL`.
function scoreManual(): number {
  return VALOR_NEUTRO_MANUAL;
}

function scoreCapacitaciones(brigadista: ConfianzaInput): number {
  if (!brigadista.certificacionCurso) return 0;
  switch (brigadista.certificacionCurso.estadoCertificacion) {
    case "GENERADA":
    case "ENVIADA":
      return 10;
    case "PENDIENTE":
      return 5;
    default:
      return 0;
  }
}

function scoreIncidencias(incidenciasAtendidas: number): number {
  if (incidenciasAtendidas <= 0) return 0;
  return Math.min((incidenciasAtendidas / MAX_INCIDENCIAS_REFERENCIA) * 10, 10);
}

// Umbrales del tiempo de respuesta (horas): ≤2h → 10 · ≥48h → 0 · lineal en medio.
const TR_OPTIMO_H = 2;
const TR_MAXIMO_H = 48;

/**
 * Score (0–10) del tiempo promedio de respuesta del brigadista
 * (fechaAsignación → fecha en que subió la data recopilada). Menor tiempo = mayor score.
 * Devuelve `null` si no hay historial (no se penaliza).
 */
export function scoreTiempoRespuesta(horas: number | null): number | null {
  if (horas == null) return null;
  if (horas <= TR_OPTIMO_H) return 10;
  if (horas >= TR_MAXIMO_H) return 0;
  return parseFloat((10 * (1 - (horas - TR_OPTIMO_H) / (TR_MAXIMO_H - TR_OPTIMO_H))).toFixed(2));
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
  tiempoRespuestaHoras: number | null = null
): number {
  const base = scoreManual();
  const cap = scoreCapacitaciones(brigadista);

  // Componente automático = promedio de los factores DISPONIBLES, en orden de
  // prioridad (capacitaciones > tiempo de respuesta > incidencias). Si un factor
  // no tiene dato (sin historial), no entra y no penaliza.
  const factores: number[] = [cap];
  const st = scoreTiempoRespuesta(tiempoRespuestaHoras);
  if (st != null) factores.push(st);
  if (incidenciasAtendidas > 0) factores.push(scoreIncidencias(incidenciasAtendidas));
  const auto = factores.reduce((a, b) => a + b, 0) / factores.length;

  const score = pesos.pesoManual * base + pesos.pesoAutomatico * auto;
  return parseFloat(Math.min(Math.max(score, 0), 10).toFixed(2));
}
