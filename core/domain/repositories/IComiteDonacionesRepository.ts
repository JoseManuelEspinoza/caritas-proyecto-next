import { RondaVotacion, CierreRonda } from "../entities/comite-donaciones/RondaVotacion";
import { DecisionVoto, TallyRonda } from "../entities/comite-donaciones/VotoComite";

export interface IComiteDonacionesRepository {
  /** Devuelve la ronda ABIERTA de la incidencia o null. */
  findRondaAbierta(idIncidencia: string): Promise<RondaVotacion | null>;

  /** Crea una nueva ronda con numeroRonda = max + 1. */
  abrirRonda(idIncidencia: string): Promise<RondaVotacion>;

  /** Inserta o actualiza el voto del miembro en la ronda. */
  upsertVoto(idRonda: string, idUsuarioGRD: string, decision: DecisionVoto): Promise<void>;

  /** Cuenta usuarios con User.role = COMITEDONACIONES y estado = ACTIVO. */
  contarMiembrosActivos(): Promise<number>;

  /** Valida que el UsuarioGRD pertenezca a un User activo con rol COMITEDONACIONES. */
  esMiembroActivo(idUsuarioGRD: string): Promise<boolean>;

  /** Suma A_FAVOR / EN_CONTRA de los votos de la ronda. */
  contarVotos(idRonda: string): Promise<{ aFavor: number; enContra: number }>;

  /** Cierra la ronda con snapshot y, si aplica, observaciones y usuario que cerró. */
  cerrarRonda(idRonda: string, cierre: CierreRonda): Promise<void>;

  /** Devuelve el tally completo de la ronda abierta (null si no hay ninguna). */
  tally(idIncidencia: string): Promise<TallyRonda | null>;

  /**
   * Al APROBAR: valida y descuenta el stock de los elementos de los kits del
   * sistema asignados en el informe, y registra las salidas (MovimientoKit).
   * Lanza BusinessRuleError listando los elementos faltantes (y su stock
   * disponible) si no hay stock suficiente; en ese caso no descuenta nada.
   */
  descontarInventarioAprobacion(idIncidencia: string, idUsuarioGRD: string): Promise<void>;
}
