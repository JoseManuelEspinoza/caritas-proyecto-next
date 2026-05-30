import { PrismaIncidentRepository } from '../database/PrismaIncidentRepository'
import { RegistrarIncidenteUseCase } from '../../application/use-cases/incidents/RegistrarIncidente.usecase'
import {
  ListarIncidentesUseCase,
  ObtenerIncidenteUseCase,
} from '../../application/use-cases/incidents/ConsultarIncidentes.usecase'
import {
  AsignarBrigadistaUseCase,
  RegistrarLevantamientoUseCase,
  GenerarInformeEvaluacionUseCase,
} from '../../application/use-cases/incidents/FlujoCampo.usecase'
import { DecisionComiteUseCase } from '../../application/use-cases/incidents/DecisionComite.usecase'
import {
  MarcarAtendidoUseCase,
  AsignarSeguimientoUseCase,
  RegistrarSeguimientoUseCase,
  CerrarCasoUseCase,
} from '../../application/use-cases/incidents/AtencionYSeguimiento.usecase'

/**
 * Composition root del módulo de Incidentes: instancia el repositorio Prisma
 * una vez y arma todos los casos de uso del flujo GRD.
 */
export function makeIncidentUseCases() {
  const repo = new PrismaIncidentRepository()
  return {
    registrar: new RegistrarIncidenteUseCase(repo),
    listar: new ListarIncidentesUseCase(repo),
    obtener: new ObtenerIncidenteUseCase(repo),
    asignarBrigadista: new AsignarBrigadistaUseCase(repo),
    registrarLevantamiento: new RegistrarLevantamientoUseCase(repo),
    generarInforme: new GenerarInformeEvaluacionUseCase(repo),
    decisionComite: new DecisionComiteUseCase(repo),
    marcarAtendido: new MarcarAtendidoUseCase(repo),
    asignarSeguimiento: new AsignarSeguimientoUseCase(repo),
    registrarSeguimiento: new RegistrarSeguimientoUseCase(repo),
    cerrar: new CerrarCasoUseCase(repo),
  }
}
