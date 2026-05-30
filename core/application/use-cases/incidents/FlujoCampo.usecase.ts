import { IIncidentRepository } from '../../../domain/repositories/IIncidentRepository'
import { NotFoundError } from '../../../domain/errors/DomainError'
import { Incident } from '../../../domain/entities/incident/Incident'
import {
  AffectedPerson,
  BrigadistaAsignado,
  InfoPrimeraVisita,
  InformeEvaluacion,
} from '../../../domain/entities/incident/types'
import { IncidentDetail, toIncidentDetail } from '../../dtos/IncidentDTO'

/** Helper compartido: carga el incidente o lanza NotFound. */
async function cargar(repo: IIncidentRepository, id: string): Promise<Incident> {
  const incident = await repo.findById(id)
  if (!incident) throw new NotFoundError(`No existe el incidente ${id}.`)
  return incident
}

/** ABIERTO → ASIGNADO: el especialista asigna un brigadista. */
export class AsignarBrigadistaUseCase {
  constructor(private readonly repo: IIncidentRepository) {}

  async execute(
    id: string,
    brig: Omit<BrigadistaAsignado, 'fechaAsignacion' | 'asignadoPor'>,
    asignadoPor: string,
    notas?: string,
  ): Promise<IncidentDetail> {
    const incident = await cargar(this.repo, id)
    incident.asignarBrigadista(brig, asignadoPor, notas)
    await this.repo.update(incident)
    return toIncidentDetail(incident)
  }
}

/** ASIGNADO → DATA_RECOPILADA: brigadista/especialista registra el levantamiento. */
export class RegistrarLevantamientoUseCase {
  constructor(private readonly repo: IIncidentRepository) {}

  async execute(
    id: string,
    info: InfoPrimeraVisita,
    triggeredBy: string,
    extras?: { affectedPeople?: AffectedPerson[]; uploadedFiles?: string[]; numFamiliasAfectadas?: number },
  ): Promise<IncidentDetail> {
    const incident = await cargar(this.repo, id)
    incident.registrarLevantamiento(info, triggeredBy, extras)
    await this.repo.update(incident)
    return toIncidentDetail(incident)
  }
}

/** DATA_RECOPILADA → EN_EVALUACION (o reenvío desde OBSERVADO): informe social. */
export class GenerarInformeEvaluacionUseCase {
  constructor(private readonly repo: IIncidentRepository) {}

  async execute(id: string, informe: InformeEvaluacion, triggeredBy: string): Promise<IncidentDetail> {
    const incident = await cargar(this.repo, id)
    if (incident.status === 'OBSERVADO') {
      incident.corregirYReenviar(informe, triggeredBy)
    } else {
      incident.generarInformeEvaluacion(informe, triggeredBy)
    }
    await this.repo.update(incident)
    return toIncidentDetail(incident)
  }
}
