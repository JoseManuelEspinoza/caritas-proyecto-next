import { IIncidentRepository } from '../../../domain/repositories/IIncidentRepository'
import { NotFoundError } from '../../../domain/errors/DomainError'
import { Incident } from '../../../domain/entities/incident/Incident'
import { BrigadistaAsignado, InfoSeguimiento, InformeAtencion } from '../../../domain/entities/incident/types'
import { IncidentDetail, toIncidentDetail } from '../../dtos/IncidentDTO'

async function cargar(repo: IIncidentRepository, id: string): Promise<Incident> {
  const incident = await repo.findById(id)
  if (!incident) throw new NotFoundError(`No existe el incidente ${id}.`)
  return incident
}

/** APROBADO → ATENDIDO: el especialista registra la entrega de la donación. */
export class MarcarAtendidoUseCase {
  constructor(private readonly repo: IIncidentRepository) {}

  async execute(id: string, informe: InformeAtencion, triggeredBy: string): Promise<IncidentDetail> {
    const incident = await cargar(this.repo, id)
    incident.marcarAtendido(informe, triggeredBy)
    await this.repo.update(incident)
    return toIncidentDetail(incident)
  }
}

/** ATENDIDO → SEGUIMIENTO_ABIERTO: asigna el equipo de seguimiento. */
export class AsignarSeguimientoUseCase {
  constructor(private readonly repo: IIncidentRepository) {}

  async execute(
    id: string,
    brigadistas: Omit<BrigadistaAsignado, 'fechaAsignacion' | 'asignadoPor'>[],
    asignadoPor: string,
    notas?: string,
  ): Promise<IncidentDetail> {
    const incident = await cargar(this.repo, id)
    incident.asignarSeguimiento(brigadistas, asignadoPor, notas)
    await this.repo.update(incident)
    return toIncidentDetail(incident)
  }
}

/** Registra una visita de seguimiento (el caso permanece en SEGUIMIENTO_ABIERTO). */
export class RegistrarSeguimientoUseCase {
  constructor(private readonly repo: IIncidentRepository) {}

  async execute(id: string, seg: Omit<InfoSeguimiento, 'id'>): Promise<IncidentDetail> {
    const incident = await cargar(this.repo, id)
    incident.registrarSeguimiento(seg)
    await this.repo.update(incident)
    return toIncidentDetail(incident)
  }
}

/** SEGUIMIENTO_ABIERTO → CERRADO: cierre definitivo del caso. */
export class CerrarCasoUseCase {
  constructor(private readonly repo: IIncidentRepository) {}

  async execute(id: string, user: string, notas: string): Promise<IncidentDetail> {
    const incident = await cargar(this.repo, id)
    incident.cerrar(user, notas)
    await this.repo.update(incident)
    return toIncidentDetail(incident)
  }
}
