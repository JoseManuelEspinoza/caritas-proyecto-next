import { PrismaIncidenciaRepository } from "../database/PrismaIncidenciaRepository";
import {
  RegistrarIncidenciaUseCase,
  ActualizarIncidenciaUseCase,
} from "../../application/use-cases/incidencias/RegistrarYActualizar.usecase";
import {
  AsignarBrigadistaUseCase,
  AsignarEquipoUseCase,
  AutoasignarmeUseCase,
  RegistrarLevantamientoUseCase,
  GenerarInformeEvaluacionUseCase,
  CorregirYReenviarUseCase,
} from "../../application/use-cases/incidencias/FlujoCampo.usecase";
import { DecisionComiteUseCase } from "../../application/use-cases/incidencias/DecisionComite.usecase";
import {
  RegistrarAtencionUseCase,
  AgregarSeguimientoUseCase,
  CerrarCasoUseCase,
} from "../../application/use-cases/incidencias/AtencionYCierre.usecase";

/** Composition root del flujo de Incidencias (DI manual). */
export function makeIncidenciaUseCases() {
  const repo = new PrismaIncidenciaRepository();
  return {
    registrar: new RegistrarIncidenciaUseCase(repo),
    actualizar: new ActualizarIncidenciaUseCase(repo),
    asignar: new AsignarBrigadistaUseCase(repo),
    asignarEquipo: new AsignarEquipoUseCase(repo),
    autoasignarme: new AutoasignarmeUseCase(repo),
    registrarCampo: new RegistrarLevantamientoUseCase(repo),
    generarInforme: new GenerarInformeEvaluacionUseCase(repo),
    corregir: new CorregirYReenviarUseCase(repo),
    decisionComite: new DecisionComiteUseCase(repo),
    registrarAtencion: new RegistrarAtencionUseCase(repo),
    agregarSeguimiento: new AgregarSeguimientoUseCase(repo),
    cerrar: new CerrarCasoUseCase(repo),
  };
}
