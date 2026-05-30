import { PrismaCursoRepository } from '../database/PrismaCursoRepository'
import {
  CrearCursoUseCase,
  ListarCursosUseCase,
  CambiarEstadoCursoUseCase,
  InscribirParticipanteUseCase,
  RegistrarEvaluacionUseCase,
  CertificarUseCase,
} from '../../application/use-cases/capacitaciones/GestionarCapacitaciones.usecase'

/** Composition root del módulo de Capacitaciones. */
export function makeCursoUseCases() {
  const repo = new PrismaCursoRepository()
  return {
    crear: new CrearCursoUseCase(repo),
    listar: new ListarCursosUseCase(repo),
    cambiarEstado: new CambiarEstadoCursoUseCase(repo),
    inscribir: new InscribirParticipanteUseCase(repo),
    evaluar: new RegistrarEvaluacionUseCase(repo),
    certificar: new CertificarUseCase(repo),
  }
}
