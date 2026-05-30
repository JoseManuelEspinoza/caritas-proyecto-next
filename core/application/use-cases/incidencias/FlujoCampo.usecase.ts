import { IIncidenciaRepository } from '../../../domain/repositories/IIncidenciaRepository'
import { Incidencia } from '../../../domain/entities/incidencia/Incidencia'
import { NotFoundError } from '../../../domain/errors/DomainError'
import { InfoCampoData, InformeEvaluacionData, CorreccionData } from '../../dtos/IncidenciaDTO'

async function cargar(repo: IIncidenciaRepository, id: string): Promise<Incidencia> {
  const inc = await repo.findById(id)
  if (!inc) throw new NotFoundError('Incidencia no encontrada.')
  return inc
}

/** Asigna un brigadista; transiciona ABIERTO → ASIGNADO solo si está ABIERTO. */
export class AsignarBrigadistaUseCase {
  constructor(private readonly repo: IIncidenciaRepository) {}
  async execute(idIncidencia: string, idBrigadista: string): Promise<void> {
    const inc = await cargar(this.repo, idIncidencia)
    await this.repo.registrarAsignacion(idIncidencia, idBrigadista)
    if (inc.estadoActual === 'ABIERTO') {
      inc.asignar()
      await this.repo.guardarTransicion(inc, 'Brigadista asignado al incidente')
    }
  }
}

/** ASIGNADO → DATA RECOPILADA: guarda el levantamiento de campo. */
export class RegistrarLevantamientoUseCase {
  constructor(private readonly repo: IIncidenciaRepository) {}
  async execute(idIncidencia: string, data: InfoCampoData, responsable: string): Promise<void> {
    const inc = await cargar(this.repo, idIncidencia)
    inc.registrarCampo()
    await this.repo.guardarInforme(idIncidencia, {
      titulo: 'Levantamiento de campo',
      tipo: 'CAMPO',
      resumen: data.recomendacion,
      contenido: JSON.stringify({ ...data, responsable }),
      estado: 'APROBADO',
    })
    await this.repo.guardarTransicion(inc, 'Levantamiento de campo completado')
  }
}

/** DATA RECOPILADA → EN EVALUACION: emite el informe social y abre la solicitud. */
export class GenerarInformeEvaluacionUseCase {
  constructor(private readonly repo: IIncidenciaRepository) {}
  async execute(idIncidencia: string, data: InformeEvaluacionData, elaboradoPor: string): Promise<void> {
    const inc = await cargar(this.repo, idIncidencia)
    inc.enviarEvaluacion()
    await this.repo.guardarInforme(idIncidencia, {
      titulo: 'Informe de Evaluación Social',
      tipo: 'EVALUACION',
      resumen: data.analisisSituacion,
      contenido: JSON.stringify({ ...data, elaboradoPor }),
      estado: 'BORRADOR',
    })
    await this.repo.upsertSolicitudEnEvaluacion(idIncidencia, {
      motivo: data.analisisSituacion,
      descripcion: data.hallazgosTexto,
      tipoAyuda: data.tipoIntervencion,
    })
    await this.repo.guardarTransicion(inc, 'Informe de evaluación enviado al Comité')
  }
}

/** OBSERVADO → EN EVALUACION: corrige y reenvía el informe al Comité. */
export class CorregirYReenviarUseCase {
  constructor(private readonly repo: IIncidenciaRepository) {}
  async execute(idIncidencia: string, data: CorreccionData, elaboradoPor: string): Promise<void> {
    const inc = await cargar(this.repo, idIncidencia)
    inc.enviarEvaluacion()
    await this.repo.guardarInforme(idIncidencia, {
      titulo: 'Informe de Evaluación Social (corregido)',
      tipo: 'EVALUACION',
      resumen: data.analisisSituacion,
      contenido: JSON.stringify({ ...data, elaboradoPor }),
      estado: 'BORRADOR',
    })
    await this.repo.resolverSolicitud(idIncidencia, 'EN_EVALUACION')
    await this.repo.guardarTransicion(inc, 'Informe corregido y reenviado al Comité')
  }
}
