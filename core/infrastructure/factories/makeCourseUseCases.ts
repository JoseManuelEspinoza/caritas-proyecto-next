import { PrismaCourseRepository } from '../database/PrismaCourseRepository'
import {
  CrearCursoUseCase,
  ListarCursosUseCase,
  InscribirParticipanteUseCase,
  RegistrarAsistenciaUseCase,
  EvaluarParticipanteUseCase,
} from '../../application/use-cases/courses/GestionarCursos.usecase'

/** Composition root del módulo de Capacitaciones. */
export function makeCourseUseCases() {
  const repo = new PrismaCourseRepository()
  return {
    crear: new CrearCursoUseCase(repo),
    listar: new ListarCursosUseCase(repo),
    inscribir: new InscribirParticipanteUseCase(repo),
    registrarAsistencia: new RegistrarAsistenciaUseCase(repo),
    evaluar: new EvaluarParticipanteUseCase(repo),
  }
}
