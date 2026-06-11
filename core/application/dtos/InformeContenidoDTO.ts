import type { InformeEvaluacionData } from "./IncidenciaDTO";

/**
 * Tipado del JSON almacenado en `Informe.contenido`. Evita los `JSON.parse`
 * crudos dispersos por la UI y centraliza la forma de cada tipo de informe.
 */

export type NotaFamilia = { id: string; nota: string };

/** Contenido del informe de levantamiento de campo (tipo CAMPO). */
export type InformeCampoContenido = {
  fechaVisita?: string;
  responsable?: string;
  descripcionEvento?: string;
  nivelVulnerabilidad?: string;
  observaciones?: string;
  recomendacion?: string;
  necesidadesPrioritarias?: string[];
  notasFamilias?: NotaFamilia[];
  condHabitabilidad?: Record<string, boolean>;
};

/** Contenido del informe de evaluación enviado al Comité (tipo EVALUACION). */
export type InformeEvaluacionContenido = InformeEvaluacionData;

/** Parseo seguro del contenido JSON de un informe. Devuelve null si no es válido. */
export function parseInforme<T>(contenido: string | null | undefined): T | null {
  if (!contenido) return null;
  try {
    return JSON.parse(contenido) as T;
  } catch {
    return null;
  }
}
