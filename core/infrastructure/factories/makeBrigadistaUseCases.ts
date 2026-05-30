import { PrismaBrigadistaRepository } from '../database/PrismaBrigadistaRepository'
import { RegistrarBrigadistaUseCase } from '../../application/use-cases/brigadistas/RegistrarBrigadista.usecase'
import { ListarBrigadistasUseCase } from '../../application/use-cases/brigadistas/ListarBrigadistas.usecase'
import {
  ToggleActivoBrigadistaUseCase,
  MarcarDisponibilidadUseCase,
  CertificarBrigadistaUseCase,
} from '../../application/use-cases/brigadistas/GestionarBrigadista.usecase'

/** Composition root del módulo de Brigadistas (DI manual). */
export function makeBrigadistaUseCases() {
  const repo = new PrismaBrigadistaRepository()
  return {
    registrar: new RegistrarBrigadistaUseCase(repo),
    listar: new ListarBrigadistasUseCase(repo),
    toggleActivo: new ToggleActivoBrigadistaUseCase(repo),
    marcarDisponibilidad: new MarcarDisponibilidadUseCase(repo),
    certificar: new CertificarBrigadistaUseCase(repo),
  }
}
