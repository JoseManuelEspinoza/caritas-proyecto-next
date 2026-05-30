import { IBrigadistaRepository } from '../../../domain/repositories/IBrigadistaRepository'
import { BrigadistaOutput, toBrigadistaOutput } from '../../dtos/BrigadistaDTO'

/**
 * Caso de uso: listar todos los brigadistas.
 *
 * Un caso de uso de lectura sencillo. Aun así pasa por aquí (y no directo desde
 * la UI a Prisma) para que la presentación nunca dependa de la base de datos y
 * para tener un único punto donde aplicar, a futuro, filtros/permisos/paginación.
 */
export class ListarBrigadistasUseCase {
  constructor(private readonly repo: IBrigadistaRepository) {}

  async execute(): Promise<BrigadistaOutput[]> {
    const brigadistas = await this.repo.findAll()
    return brigadistas.map(toBrigadistaOutput)
  }
}
