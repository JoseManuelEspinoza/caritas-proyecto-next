import { PrismaSugerenciaBrigadistasRepository } from "../database/PrismaSugerenciaBrigadistasRepository";
import { SugerirBrigadistasUseCase } from "../../application/use-cases/asignacion/SugerirBrigadistas.usecase";

/** Composition root del módulo de Asignación de brigadistas (RF36, DI manual). */
export function makeAsignacionUseCases() {
  const repo = new PrismaSugerenciaBrigadistasRepository();
  return {
    sugerir: new SugerirBrigadistasUseCase(repo),
  };
}
