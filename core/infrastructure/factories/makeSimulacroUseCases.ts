import { PrismaSimulacroRepository } from '../database/PrismaSimulacroRepository'
import {
  CrearSimulacroUseCase,
  ListarSimulacrosUseCase,
  AsignarSimulacroUseCase,
  EnviarReporteSimulacroUseCase,
  RevisarSimulacroUseCase,
} from '../../application/use-cases/simulacros/GestionarSimulacros.usecase'

/** Composition root del módulo de Simulacros. */
export function makeSimulacroUseCases() {
  const repo = new PrismaSimulacroRepository()
  return {
    crear: new CrearSimulacroUseCase(repo),
    listar: new ListarSimulacrosUseCase(repo),
    asignar: new AsignarSimulacroUseCase(repo),
    enviarReporte: new EnviarReporteSimulacroUseCase(repo),
    revisar: new RevisarSimulacroUseCase(repo),
  }
}
