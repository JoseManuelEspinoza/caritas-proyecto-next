import { IComiteDonacionesRepository } from "../../../domain/repositories/IComiteDonacionesRepository";
import { IIncidenciaRepository } from "../../../domain/repositories/IIncidenciaRepository";
import { DecisionVoto, TallyRonda } from "../../../domain/entities/comite-donaciones/VotoComite";
import {
  BusinessRuleError,
  NotFoundError,
} from "../../../domain/errors/DomainError";
import { evaluarQuorum, calcularUmbral } from "./calcularQuorum";

export type ResultadoVoto =
  | { estado: "EN_CURSO"; tally: TallyRonda }
  | { estado: "APROBADA"; tally: TallyRonda }
  | { estado: "RECHAZADA"; tally: TallyRonda };

/**
 * Registra el voto de un miembro del Comité y, si corresponde, cierra la ronda
 * transicionando la Incidencia. Cierre por aprobación se da al alcanzar el
 * umbral; rechazo automático cuando los EN_CONTRA imposibilitan llegar a U.
 */
export class RegistrarVotoComiteUseCase {
  constructor(
    private readonly comite: IComiteDonacionesRepository,
    private readonly incidencias: IIncidenciaRepository
  ) {}

  async execute(
    idIncidencia: string,
    idUsuarioGRD: string,
    decision: DecisionVoto
  ): Promise<ResultadoVoto> {
    const inc = await this.incidencias.findById(idIncidencia);
    if (!inc) throw new NotFoundError("Incidencia no encontrada.");

    if (!(await this.comite.esMiembroActivo(idUsuarioGRD))) {
      throw new BusinessRuleError("El usuario no es miembro activo del Comité.");
    }

    const ronda = await this.comite.findRondaAbierta(idIncidencia);
    if (!ronda) {
      throw new BusinessRuleError("No hay ronda de votación abierta para esta incidencia.");
    }

    const n = await this.comite.contarMiembrosActivos();
    if (n < 1) {
      throw new BusinessRuleError("Comité sin miembros activos: no se puede votar.");
    }

    await this.comite.upsertVoto(ronda.idRonda, idUsuarioGRD, decision);

    const { aFavor, enContra } = await this.comite.contarVotos(ronda.idRonda);
    const decisionQuorum = evaluarQuorum(n, aFavor, enContra);
    const umbral = calcularUmbral(n);

    if (decisionQuorum.tipo === "APROBAR") {
      // Valida y descuenta el stock de los elementos ANTES de aprobar.
      // Si no hay stock, lanza error con los faltantes y la aprobación se aborta.
      await this.comite.descontarInventarioAprobacion(idIncidencia, idUsuarioGRD);
      inc.aprobar();
      await this.comite.cerrarRonda(ronda.idRonda, {
        estado: "CERRADA_APROBADA",
        nSnapshot: n,
        umbralSnapshot: umbral,
      });
      await this.incidencias.resolverSolicitud(idIncidencia, "APROBADA");
      // Caso aprobado: el equipo sale a la entrega → vuelve a campo.
      await this.incidencias.marcarBrigadistasEnCampo(idIncidencia);
      await this.incidencias.guardarTransicion(inc, "Caso aprobado por quórum del Comité");
      const tally = (await this.comite.tally(idIncidencia))!;
      return { estado: "APROBADA", tally };
    }

    if (decisionQuorum.tipo === "RECHAZAR") {
      inc.rechazar();
      await this.comite.cerrarRonda(ronda.idRonda, {
        estado: "CERRADA_RECHAZADA",
        nSnapshot: n,
        umbralSnapshot: umbral,
      });
      await this.incidencias.resolverSolicitud(idIncidencia, "RECHAZADA");
      await this.incidencias.guardarTransicion(inc, "Caso rechazado por quórum del Comité");
      const tally = (await this.comite.tally(idIncidencia))!;
      return { estado: "RECHAZADA", tally };
    }

    const tally = (await this.comite.tally(idIncidencia))!;
    return { estado: "EN_CURSO", tally };
  }
}
