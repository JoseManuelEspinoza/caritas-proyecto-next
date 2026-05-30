import { IIncidentRepository, IncidentFilter } from '../../../domain/repositories/IIncidentRepository'
import { NotFoundError } from '../../../domain/errors/DomainError'
import {
  IncidentDetail,
  IncidentSummary,
  toIncidentDetail,
  toIncidentSummary,
} from '../../dtos/IncidentDTO'

/** Lista incidentes aplicando filtros opcionales (estado, categoría, búsqueda, brigadista). */
export class ListarIncidentesUseCase {
  constructor(private readonly repo: IIncidentRepository) {}

  async execute(filter?: IncidentFilter): Promise<IncidentSummary[]> {
    const incidents = await this.repo.findAll(filter)
    return incidents.map(toIncidentSummary)
  }
}

/** Obtiene el detalle de un incidente por su código. */
export class ObtenerIncidenteUseCase {
  constructor(private readonly repo: IIncidentRepository) {}

  async execute(id: string): Promise<IncidentDetail> {
    const incident = await this.repo.findById(id)
    if (!incident) throw new NotFoundError(`No existe el incidente ${id}.`)
    return toIncidentDetail(incident)
  }
}
