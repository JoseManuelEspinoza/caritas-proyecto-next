import { PrismaComiteDonacionesRepository } from "../database/PrismaComiteDonacionesRepository";
import { PrismaIncidenciaRepository } from "../database/PrismaIncidenciaRepository";
import { AbrirRondaVotacionUseCase } from "../../application/use-cases/comite-donaciones/AbrirRondaVotacion.usecase";
import { RegistrarVotoComiteUseCase } from "../../application/use-cases/comite-donaciones/RegistrarVotoComite.usecase";
import { ObservarCasoComiteUseCase } from "../../application/use-cases/comite-donaciones/ObservarCasoComite.usecase";

export function makeComiteDonacionesUseCases() {
  const comite = new PrismaComiteDonacionesRepository();
  const incidencias = new PrismaIncidenciaRepository();
  return {
    abrirRonda: new AbrirRondaVotacionUseCase(comite),
    registrarVoto: new RegistrarVotoComiteUseCase(comite, incidencias),
    observarCaso: new ObservarCasoComiteUseCase(comite, incidencias),
    tally: (idIncidencia: string) => comite.tally(idIncidencia),
  };
}
