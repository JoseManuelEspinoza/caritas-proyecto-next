import { PrismaPlanRepository } from '../database/PrismaPlanRepository'
import {
  CrearPlanUseCase,
  ListarPlanesUseCase,
  AgregarActividadUseCase,
  CambiarEstadoActividadUseCase,
  EliminarPlanUseCase,
} from '../../application/use-cases/plans/GestionarPlanes.usecase'

/** Composition root del módulo de Planes. */
export function makePlanUseCases() {
  const repo = new PrismaPlanRepository()
  return {
    crear: new CrearPlanUseCase(repo),
    listar: new ListarPlanesUseCase(repo),
    agregarActividad: new AgregarActividadUseCase(repo),
    cambiarEstadoActividad: new CambiarEstadoActividadUseCase(repo),
    eliminar: new EliminarPlanUseCase(repo),
  }
}
