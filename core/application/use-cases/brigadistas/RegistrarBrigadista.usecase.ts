import { randomUUID } from 'crypto'
import { Brigadista } from '../../../domain/entities/Brigadista'
import { Dni } from '../../../domain/value-objects/Dni'
import { ValidationError } from '../../../domain/errors/DomainError'
import { IBrigadistaRepository } from '../../../domain/repositories/IBrigadistaRepository'
import { BrigadistaOutput, RegistrarBrigadistaInput, toBrigadistaOutput } from '../../dtos/BrigadistaDTO'

/** Registra un brigadista nuevo en el padrón (DNI único). */
export class RegistrarBrigadistaUseCase {
  constructor(private readonly repo: IBrigadistaRepository) {}

  async execute(input: RegistrarBrigadistaInput): Promise<BrigadistaOutput> {
    const dni = new Dni(input.dni)

    const existente = await this.repo.findByDni(dni.toString())
    if (existente) {
      throw new ValidationError('Ya existe un brigadista registrado con ese DNI.')
    }

    const brigadista = Brigadista.crear({
      id: randomUUID(),
      dni,
      nombres: input.nombres,
      apellidoPaterno: input.apellidoPaterno,
      apellidoMaterno: input.apellidoMaterno,
      celular: input.celular,
      parroquia: input.parroquia,
      rolPastoral: input.rolPastoral,
      email: input.email,
    })

    await this.repo.save(brigadista)
    return toBrigadistaOutput(brigadista)
  }
}
