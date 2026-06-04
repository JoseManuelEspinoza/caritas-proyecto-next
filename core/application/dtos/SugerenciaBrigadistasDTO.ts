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
}

export const CONFIG_DEFAULT: ConfigAlgoritmo = {
  pesoManual: 0.4,
  pesoAutomatico: 0.6,
  topN: 5,
};
