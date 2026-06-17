import { IComiteDonacionesRepository } from "../../../domain/repositories/IComiteDonacionesRepository";
import { IIncidenciaRepository } from "../../../domain/repositories/IIncidenciaRepository";
import {
  BusinessRuleError,
  NotFoundError,
  ValidationError,
} from "../../../domain/errors/DomainError";
import { calcularUmbral } from "./calcularQuorum";

/**
 * Cualquier miembro activo del Comité puede observar el caso, devolviéndolo al
 * GRD con un comentario. Cierra la ronda actual como CERRADA_OBSERVADA y
 * transiciona la incidencia a OBSERVADO. Al reabrir, se creará una ronda nueva.
 */
export class ObservarCasoComiteUseCase {
  constructor(
    private readonly comite: IComiteDonacionesRepository,
    private readonly incidencias: IIncidenciaRepository
  ) {}

  async execute(
    idIncidencia: string,
    idUsuarioGRD: string,
    observaciones: string
  ): Promise<void> {
    const inc = await this.incidencias.findById(idIncidencia);
    if (!inc) throw new NotFoundError("Incidencia no encontrada.");

    if (!observaciones?.trim()) {
      throw new ValidationError("Las observaciones son obligatorias para observar el caso.");
    }

    if (!(await this.comite.esMiembroActivo(idUsuarioGRD))) {
      throw new BusinessRuleError("El usuario no es miembro activo del Comité.");
    }

    const ronda = await this.comite.findRondaAbierta(idIncidencia);
    if (!ronda) {
      throw new BusinessRuleError("No hay ronda de votación abierta para observar.");
    }

    const n = await this.comite.contarMiembrosActivos();
    const umbral = n > 0 ? calcularUmbral(n) : 0;

    inc.observar();
    await this.comite.cerrarRonda(ronda.idRonda, {
      estado: "CERRADA_OBSERVADA",
      nSnapshot: n,
      umbralSnapshot: umbral,
      idUsuarioCierre: idUsuarioGRD,
      observaciones: observaciones.trim(),
    });
    await this.incidencias.resolverSolicitud(idIncidencia, "EN_EVALUACION", observaciones.trim());
    await this.incidencias.guardarTransicion(inc, "Caso devuelto con observaciones por el Comité", observaciones.trim());
  }
}
