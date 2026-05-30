import { NotFoundError } from '../../../domain/errors/DomainError'
import { CertificacionBrigadista } from '../../../domain/entities/Brigadista'
import { IBrigadistaRepository } from '../../../domain/repositories/IBrigadistaRepository'
import { BrigadistaOutput, toBrigadistaOutput } from '../../dtos/BrigadistaDTO'

async function cargar(repo: IBrigadistaRepository, id: string) {
  const b = await repo.findById(id)
  if (!b) throw new NotFoundError('No se encontró el brigadista solicitado.')
  return b
}

/** Activa o desactiva a un brigadista del padrón. */
export class ToggleActivoBrigadistaUseCase {
  constructor(private readonly repo: IBrigadistaRepository) {}

  async execute(id: string): Promise<BrigadistaOutput> {
    const b = await cargar(this.repo, id)
    b.toggleActivo()
    await this.repo.update(b)
    return toBrigadistaOutput(b)
  }
}

/** Marca o quita la disponibilidad de un brigadista para asignaciones. */
export class MarcarDisponibilidadUseCase {
  constructor(private readonly repo: IBrigadistaRepository) {}

  async execute(id: string, disponible: boolean): Promise<BrigadistaOutput> {
    const b = await cargar(this.repo, id)
    b.marcarDisponible(disponible)
    await this.repo.update(b)
    return toBrigadistaOutput(b)
  }
}

/** Registra una certificación obtenida y habilita al brigadista. */
export class CertificarBrigadistaUseCase {
  constructor(private readonly repo: IBrigadistaRepository) {}

  async execute(id: string, cert: CertificacionBrigadista, horas = 0): Promise<BrigadistaOutput> {
    const b = await cargar(this.repo, id)
    b.certificar(cert, horas)
    await this.repo.update(b)
    return toBrigadistaOutput(b)
  }
}
