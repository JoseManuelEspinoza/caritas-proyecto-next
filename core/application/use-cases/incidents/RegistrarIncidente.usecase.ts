import { Incident } from '../../../domain/entities/incident/Incident'
import { IIncidentRepository } from '../../../domain/repositories/IIncidentRepository'
import { IncidentDetail, RegistrarIncidenteInput, toIncidentDetail } from '../../dtos/IncidentDTO'

/** ABIERTO: registra un incidente nuevo con código correlativo GRD-YYYY-NNNN. */
export class RegistrarIncidenteUseCase {
  constructor(private readonly repo: IIncidentRepository) {}

  async execute(input: RegistrarIncidenteInput): Promise<IncidentDetail> {
    const id = await this.repo.nextCorrelativo()
    const incident = Incident.crear({ id, ...input })
    await this.repo.save(incident)
    return toIncidentDetail(incident)
  }
}
