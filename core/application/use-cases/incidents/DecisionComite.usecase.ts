import { IIncidentRepository } from '../../../domain/repositories/IIncidentRepository'
import { NotFoundError } from '../../../domain/errors/DomainError'
import { IncidentDetail, toIncidentDetail } from '../../dtos/IncidentDTO'

export type DecisionComite = 'APROBAR' | 'OBSERVAR' | 'RECHAZAR'

/**
 * EN_EVALUACION → APROBADO | OBSERVADO | RECHAZADO.
 *
 * El Comité de Donaciones decide sobre el caso. Un único caso de uso concentra
 * las tres decisiones porque comparten precondición (estado EN_EVALUACION) y
 * actor (el Comité); la regla de qué transición es válida la impone la entidad.
 */
export class DecisionComiteUseCase {
  constructor(private readonly repo: IIncidentRepository) {}

  async execute(id: string, decision: DecisionComite, user: string, notas: string): Promise<IncidentDetail> {
    const incident = await this.repo.findById(id)
    if (!incident) throw new NotFoundError(`No existe el incidente ${id}.`)

    switch (decision) {
      case 'APROBAR':
        incident.aprobar(user, notas)
        break
      case 'OBSERVAR':
        incident.observar(user, notas)
        break
      case 'RECHAZAR':
        incident.rechazar(user, notas)
        break
    }

    await this.repo.update(incident)
    return toIncidentDetail(incident)
  }
}
