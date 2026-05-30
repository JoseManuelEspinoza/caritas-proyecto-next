import { PrismaCatalogRepository } from '../database/PrismaCatalogRepository'
import {
  ListarCatalogoUseCase,
  AgregarItemUseCase,
  RenombrarItemUseCase,
  ToggleItemUseCase,
} from '../../application/use-cases/catalogs/GestionarCatalogos.usecase'

/** Composition root del módulo de Catálogos. */
export function makeCatalogUseCases() {
  const repo = new PrismaCatalogRepository()
  return {
    listar: new ListarCatalogoUseCase(repo),
    agregar: new AgregarItemUseCase(repo),
    renombrar: new RenombrarItemUseCase(repo),
    toggle: new ToggleItemUseCase(repo),
  }
}
