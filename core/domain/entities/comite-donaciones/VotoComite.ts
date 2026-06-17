export type DecisionVoto = "A_FAVOR" | "EN_CONTRA";

export interface VotoComite {
  idVoto: string;
  idRonda: string;
  idUsuarioGRD: string;
  decision: DecisionVoto;
}

export interface TallyRonda {
  n: number;
  umbral: number;
  aFavor: number;
  enContra: number;
  pendientes: number;
  votos: Array<{ idUsuarioGRD: string; decision: DecisionVoto; fecha: Date }>;
}
