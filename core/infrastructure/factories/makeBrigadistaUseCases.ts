import { PrismaBrigadistaRepository } from "../database/PrismaBrigadistaRepository";
import {
  CrearBrigadistaUseCase,
  ActualizarBrigadistaUseCase,
  ToggleEstadoBrigadistaUseCase,
  ToggleDisponibilidadUseCase,
  ListarBrigadistasUseCase,
} from "../../application/use-cases/brigadistas/GestionarBrigadistas.usecase";

/** Composition root del módulo de Brigadistas (DI manual). */
export function makeBrigadistaUseCases() {
  const repo = new PrismaBrigadistaRepository();
  return {
    crear: new CrearBrigadistaUseCase(repo),
    actualizar: new ActualizarBrigadistaUseCase(repo),
    toggleEstado: new ToggleEstadoBrigadistaUseCase(repo),
    toggleDisponibilidad: new ToggleDisponibilidadUseCase(repo),
    listar: new ListarBrigadistasUseCase(repo),
  };
}
