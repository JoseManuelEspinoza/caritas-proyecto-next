import { IIncidenciaRepository } from "../../../domain/repositories/IIncidenciaRepository";
import { Incidencia } from "../../../domain/entities/incidencia/Incidencia";
import { NotFoundError, ValidationError } from "../../../domain/errors/DomainError";

export type DecisionComite = "APROBAR" | "OBSERVAR" | "RECHAZAR";

async function cargar(repo: IIncidenciaRepository, id: string): Promise<Incidencia> {
  const inc = await repo.findById(id);
  if (!inc) throw new NotFoundError("Incidencia no encontrada.");
  return inc;
}

/**
 * EN EVALUACION → APROBADO | OBSERVADO | RECHAZADO.
 * El Comité de Donaciones decide; la solicitud de ayuda se actualiza en consecuencia.
 */
export class DecisionComiteUseCase {
  constructor(private readonly repo: IIncidenciaRepository) {}

  async execute(
    idIncidencia: string,
    decision: DecisionComite,
    observaciones?: string
  ): Promise<void> {
    const inc = await cargar(this.repo, idIncidencia);

    if (decision === "APROBAR") {
      await this.repo.resolverSolicitud(idIncidencia, "APROBADA");
      inc.aprobar();
      await this.repo.guardarTransicion(inc, "Caso aprobado por el Comité", observaciones);
      return;
    }

    if (!observaciones?.trim()) {
      throw new ValidationError("Las observaciones son obligatorias para observar o rechazar.");
    }

    if (decision === "OBSERVAR") {
      await this.repo.resolverSolicitud(idIncidencia, "EN_EVALUACION", observaciones);
      inc.observar();
      await this.repo.guardarTransicion(inc, "Caso devuelto con observaciones", observaciones);
    } else {
      await this.repo.resolverSolicitud(idIncidencia, "RECHAZADA", observaciones);
      inc.rechazar();
      await this.repo.guardarTransicion(inc, "Caso rechazado por el Comité", observaciones);
    }
  }
}
