import { PrismaCatalogoRepository } from "../database/PrismaCatalogoRepository";
import {
  CrearCatalogoUseCase,
  ListarCatalogosUseCase,
  ListarDetallesUseCase,
  AgregarDetalleUseCase,
  EditarDetalleUseCase,
  ToggleDetalleUseCase,
} from "../../application/use-cases/catalogos/GestionarCatalogos.usecase";

/** Composition root del módulo de Catálogos. */
export function makeCatalogoUseCases() {
  const repo = new PrismaCatalogoRepository();
  return {
    crearCatalogo: new CrearCatalogoUseCase(repo),
    listarCatalogos: new ListarCatalogosUseCase(repo),
    listarDetalles: new ListarDetallesUseCase(repo),
    agregarDetalle: new AgregarDetalleUseCase(repo),
    editarDetalle: new EditarDetalleUseCase(repo),
    toggleDetalle: new ToggleDetalleUseCase(repo),
  };
}
