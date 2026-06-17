export type EstadoRonda =
  | "ABIERTA"
  | "CERRADA_APROBADA"
  | "CERRADA_RECHAZADA"
  | "CERRADA_OBSERVADA";

export interface RondaVotacion {
  idRonda: string;
  idIncidencia: string;
  numeroRonda: number;
  estado: EstadoRonda;
}

export interface CierreRonda {
  estado: Exclude<EstadoRonda, "ABIERTA">;
  nSnapshot: number;
  umbralSnapshot: number;
  idUsuarioCierre?: string;
  observaciones?: string;
}
