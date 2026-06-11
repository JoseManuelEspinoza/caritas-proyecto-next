import { PrismaActividadRepository } from "../database/PrismaActividadRepository";
import {
  ProgramarActividadUseCase,
  ListarActividadesUseCase,
  AsignarEquipoSimulacroUseCase,
  AutoasignarmeSimulacroUseCase,
  EnviarReporteSimulacroUseCase,
  ObservarSimulacroUseCase,
  ValidarSimulacroUseCase,
  CancelarActividadUseCase,
  // legacy
  AsignarResponsableUseCase,
  EjecutarActividadUseCase,
} from "../../application/use-cases/simulacros/GestionarActividades.usecase";

export function makeActividadUseCases() {
  const repo = new PrismaActividadRepository();
  return {
    programar:         new ProgramarActividadUseCase(repo),
    listar:            new ListarActividadesUseCase(repo),
    asignarEquipo:     new AsignarEquipoSimulacroUseCase(repo),
    autoasignarme:     new AutoasignarmeSimulacroUseCase(repo),
    enviarReporte:     new EnviarReporteSimulacroUseCase(repo),
    observar:          new ObservarSimulacroUseCase(repo),
    validar:           new ValidarSimulacroUseCase(repo),
    cancelar:          new CancelarActividadUseCase(repo),
    // legacy
    asignarResponsable: new AsignarResponsableUseCase(repo),
    ejecutar:           new EjecutarActividadUseCase(repo),
  };
}
