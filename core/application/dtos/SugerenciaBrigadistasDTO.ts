// SugerenciaBrigadistasDTO.ts — Contratos de entrada/salida del RF36
// (algoritmo de sugerencia de brigadistas parroquiales).

import type { EstadoCertificacion } from "../../domain/services/confianza";

export type Disponibilidad = "DISPONIBLE" | "EN_CAMPO" | "NO_DISPONIBLE";
export type EstadoBrigadista = "ACTIVO" | "INACTIVO";
export type FaseResultado = "F1" | "F2" | "F2B" | "F3";

export type TipoIncidente =
  | "INCENDIO"
  | "INUNDACION"
  | "DERRUMBE"
  | "TSUNAMI"
  | "COLAPSO_INFRAESTRUCTURA"
  | "PERDIDA_VIVIENDA";

/** Parroquia de referencia del incidente (la que devuelve el repositorio). */
export interface ParroquiaRef {
  idParroquia: string;
  latitud: number | null;
  longitud: number | null;
  // ⚠️ `idZonaPastoral` aún NO existe en el schema (no hay modelo ZonaPastoral).
  // El repo Prisma devuelve null; el indicador `mismaZonaPastoral` saldrá null en
  // producción hasta que exista. La lógica del algoritmo no cambia.
  idZonaPastoral: string | null;
}

/**
 * Forma "cruda" de un brigadista candidato tal como la entrega el repositorio.
 * Estructuralmente compatible con lo que consumen confianzaMixta() y el algoritmo.
 */
export interface BrigadistaCandidatoRaw {
  idBrigadistaParroquial: string;
  nombres: string;
  apellidos: string;
  celular: string | null;
  correo: string | null;
  idParroquia: string;
  disponibilidad: string;
  certificacionCurso?: { estadoCertificacion: EstadoCertificacion } | null;
  parroquia: {
    nombre: string;
    latitud: number | null;
    longitud: number | null;
    idZonaPastoral: string | null;
  };
}

/** Entrada del algoritmo: el incidente a atender. */
export interface EntradaAlgoritmo {
  idParroquia: string;
  latitud: number | null;
  longitud: number | null;
  tipoIncidente: TipoIncidente;
}

/** Un brigadista sugerido en la lista de salida. */
export interface CandidatoSugerido {
  idBrigadistaParroquial: string;
  nombres: string;
  apellidos: string;
  celular: string | null;
  correo: string | null;
  idParroquia: string;
  nombreParroquia: string;
  tipo: "brigadista" | "voluntario";
  disponibilidad: string;
  distanciaKm: number | null;
  mismaZonaPastoral: boolean | null;
  scoreConfianza: number | null;
  // ── Opción híbrida: factores extra + score combinado ──
  /** Carga de trabajo actual (incidencias ASIGNADAS sin cerrar). */
  cargaActual?: number | null;
  /** Tiempo promedio de respuesta en horas (asignación → data recopilada). */
  tiempoRespuestaHoras?: number | null;
  /** Nivel del grafo de parroquias (1=incidente, 2=vecina, 3=cercana). */
  nivel?: number | null;
  /** Score combinado final 0–10 (confianza + disponibilidad + cercanía). */
  scoreFinal?: number | null;
}

/** Salida del algoritmo: hasta `topN` sugerencias + la fase alcanzada. */
export interface SalidaAlgoritmo {
  listaSugerida: CandidatoSugerido[];
  faseResultado: FaseResultado;
  mensaje: string | null;
}

/** Configuración del algoritmo (pesos 40/60 y tamaño de la lista, configurables). */
export interface ConfigAlgoritmo {
  pesoManual: number;
  pesoAutomatico: number;
  topN: number;
  // ── Opción híbrida (todos opcionales; tienen default) ──
  /** Radio (km) para conectar parroquias vecinas en el grafo de adyacencia. */
  radioAdyacenciaKm?: number;
  /** Distancia (km) a la que la cercanía vale 0 (para normalizar el score). */
  distanciaMaxKm?: number;
  /** Pesos del score combinado final. */
  pesoConfianza?: number;
  pesoDisponibilidad?: number;
  pesoCercania?: number;
}

export const CONFIG_DEFAULT: ConfigAlgoritmo = {
  pesoManual: 0.4,
  pesoAutomatico: 0.6,
  topN: 5,
  radioAdyacenciaKm: 3,
  distanciaMaxKm: 20,
  pesoConfianza: 0.5,
  pesoDisponibilidad: 0.2,
  pesoCercania: 0.3,
};
