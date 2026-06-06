import { PrismaPlanRepository } from "../database/PrismaPlanRepository";
import {
  CrearPlanUseCase,
  ListarPlanesUseCase,
  ActualizarPlanUseCase,
  CambiarAprobacionPlanUseCase,
} from "../../application/use-cases/planes/GestionarPlanes.usecase";

/** Composition root del módulo de Planes. */
export function makePlanUseCases() {
  const repo = new PrismaPlanRepository();
  return {
    crear: new CrearPlanUseCase(repo),
    listar: new ListarPlanesUseCase(repo),
    actualizar: new ActualizarPlanUseCase(repo),
    cambiarAprobacion: new CambiarAprobacionPlanUseCase(repo),
  };
}
