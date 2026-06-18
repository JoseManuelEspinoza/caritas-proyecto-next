import { PrismaIncidenciaRepository } from "../database/PrismaIncidenciaRepository";
import {
  RegistrarIncidenciaUseCase,
  ActualizarIncidenciaUseCase,
} from "../../application/use-cases/incidencias/RegistrarYActualizar.usecase";
import {
  AsignarBrigadistaUseCase,
  AsignarEquipoUseCase,
  AutoasignarmeUseCase,
  AgregarPersonaUseCase,
  AgregarEvidenciasUseCase,
  RegistrarLevantamientoUseCase,
  GenerarInformeEvaluacionUseCase,
  CorregirYReenviarUseCase,
} from "../../application/use-cases/incidencias/FlujoCampo.usecase";
import {
  RegistrarAtencionUseCase,
  IniciarSeguimientoUseCase,
  AgregarSeguimientoUseCase,
  CerrarCasoUseCase,
} from "../../application/use-cases/incidencias/AtencionYCierre.usecase";
import { AbrirRondaVotacionUseCase } from "../../application/use-cases/comite-donaciones/AbrirRondaVotacion.usecase";
import { PrismaComiteDonacionesRepository } from "../database/PrismaComiteDonacionesRepository";

/** Composition root del flujo de Incidencias (DI manual). */
export function makeIncidenciaUseCases() {
  const repo = new PrismaIncidenciaRepository();
  const comite = new PrismaComiteDonacionesRepository();
  const abrirRonda = new AbrirRondaVotacionUseCase(comite);
  return {
    registrar: new RegistrarIncidenciaUseCase(repo),
    actualizar: new ActualizarIncidenciaUseCase(repo),
    asignar: new AsignarBrigadistaUseCase(repo),
    asignarEquipo: new AsignarEquipoUseCase(repo),
    autoasignarme: new AutoasignarmeUseCase(repo),
    agregarPersona: new AgregarPersonaUseCase(repo),
    agregarEvidencias: new AgregarEvidenciasUseCase(repo),
    registrarCampo: new RegistrarLevantamientoUseCase(repo),
    generarInforme: new GenerarInformeEvaluacionUseCase(repo, abrirRonda),
    corregir: new CorregirYReenviarUseCase(repo, abrirRonda),
    registrarAtencion: new RegistrarAtencionUseCase(repo),
    iniciarSeguimiento: new IniciarSeguimientoUseCase(repo),
    agregarSeguimiento: new AgregarSeguimientoUseCase(repo),
    cerrar: new CerrarCasoUseCase(repo),
  };
}
