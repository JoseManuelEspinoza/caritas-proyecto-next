import { PrismaActividadRepository } from '../database/PrismaActividadRepository'
import {
  ProgramarActividadUseCase,
  ListarActividadesUseCase,
  AsignarResponsableUseCase,
  EjecutarActividadUseCase,
  CancelarActividadUseCase,
} from '../../application/use-cases/simulacros/GestionarActividades.usecase'

/** Composition root del módulo de Simulacros / Actividades preventivas. */
export function makeActividadUseCases() {
  const repo = new PrismaActividadRepository()
  return {
    programar: new ProgramarActividadUseCase(repo),
    listar: new ListarActividadesUseCase(repo),
    asignarResponsable: new AsignarResponsableUseCase(repo),
    ejecutar: new EjecutarActividadUseCase(repo),
    cancelar: new CancelarActividadUseCase(repo),
  }
}
