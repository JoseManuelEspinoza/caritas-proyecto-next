import type {
  ParroquiaRef,
  BrigadistaCandidatoRaw,
} from "../../application/dtos/SugerenciaBrigadistasDTO";

/**
 * Contrato de consulta del algoritmo de sugerencia de brigadistas (RF36).
 *
 * El caso de uso `SugerirBrigadistasUseCase` depende de esta interfaz, no de
 * Prisma. Así el algoritmo es testeable inyectando un mock (ver los tests) y la
 * implementación real (`PrismaSugerenciaBrigadistasRepository`) vive en infra.
 */
export interface ISugerenciaBrigadistasRepository {
  /** Parroquia del incidente (para coords de respaldo y zona pastoral). */
  getParroquia(idParroquia: string): Promise<ParroquiaRef | null>;

  /** Brigadistas DISPONIBLES y ACTIVOS de una parroquia (Fase 1). */
  getBrigadistasDisponiblesPorParroquia(idParroquia: string): Promise<BrigadistaCandidatoRaw[]>;

  /** Brigadistas DISPONIBLES y ACTIVOS de TODAS las demás parroquias (Fase 2). */
  getTodosBrigadistasDisponibles(excluirParroquia: string): Promise<BrigadistaCandidatoRaw[]>;

  /** Nº de incidencias atendidas por un brigadista (componente del score). */
  getIncidenciasAtendidas(idBrigadistaParroquial: string): Promise<number>;

  /** Carga actual: incidencias ASIGNADAS sin cerrar (menos carga = mejor). */
  getCargaActual(idBrigadistaParroquial: string): Promise<number>;

  /**
   * Tiempo promedio de respuesta en HORAS: desde `fechaAsignacion` hasta la fecha
   * en que se subió la data recopilada (informe CAMPO). `null` si no hay historial.
   */
  getTiempoRespuestaPromedioHoras(idBrigadistaParroquial: string): Promise<number | null>;

  /** Todas las parroquias con coordenadas (para construir el grafo de adyacencia). */
  getParroquiasConCoords(): Promise<
    { idParroquia: string; latitud: number | null; longitud: number | null }[]
  >;

  /** Registra que no se hallaron candidatos (Fase 3) para trazabilidad. */
  registrarIntentoFallido(idParroquia: string, tipoIncidente: string): Promise<void>;
}
