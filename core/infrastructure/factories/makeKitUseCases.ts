import { PrismaKitRepository } from "../database/PrismaKitRepository";
import {
  CrearKitUseCase,
  ListarKitsUseCase,
  ListarMovimientosKitUseCase,
  RegistrarMovimientoKitUseCase,
  ArchivarKitUseCase,
  EliminarKitUseCase,
} from "../../application/use-cases/kits/GestionarKits.usecase";

/** Composition root del módulo de Kits. */
export function makeKitUseCases() {
  const repo = new PrismaKitRepository();
  return {
    crear: new CrearKitUseCase(repo),
    listar: new ListarKitsUseCase(repo),
    listarMovimientos: new ListarMovimientosKitUseCase(repo),
    registrarMovimiento: new RegistrarMovimientoKitUseCase(repo),
    archivar: new ArchivarKitUseCase(repo),
    eliminar: new EliminarKitUseCase(repo),
  };
}
