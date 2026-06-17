import { IComiteDonacionesRepository } from "../../../domain/repositories/IComiteDonacionesRepository";
import { RondaVotacion } from "../../../domain/entities/comite-donaciones/RondaVotacion";

/**
 * Abre la ronda de votación del Comité para una incidencia que entra a EN EVALUACION.
 * Idempotente: si ya existe una ronda ABIERTA, la devuelve sin crear otra.
 */
export class AbrirRondaVotacionUseCase {
  constructor(private readonly repo: IComiteDonacionesRepository) {}

  async execute(idIncidencia: string): Promise<RondaVotacion> {
    const abierta = await this.repo.findRondaAbierta(idIncidencia);
    if (abierta) return abierta;
    return this.repo.abrirRonda(idIncidencia);
  }
}
