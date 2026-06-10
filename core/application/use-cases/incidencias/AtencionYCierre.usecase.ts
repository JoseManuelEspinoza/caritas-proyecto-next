import { IIncidenciaRepository } from "../../../domain/repositories/IIncidenciaRepository";
import { Incidencia } from "../../../domain/entities/incidencia/Incidencia";
import { NotFoundError } from "../../../domain/errors/DomainError";
import { AtencionData, SeguimientoData } from "../../dtos/IncidenciaDTO";

async function cargar(repo: IIncidenciaRepository, id: string): Promise<Incidencia> {
  const inc = await repo.findById(id);
  if (!inc) throw new NotFoundError("Incidencia no encontrada.");
  return inc;
}

/** APROBADO → ATENDIDO: registra la entrega de ayuda humanitaria. */
export class RegistrarAtencionUseCase {
  constructor(private readonly repo: IIncidenciaRepository) {}
  async execute(idIncidencia: string, data: AtencionData): Promise<void> {
    const inc = await cargar(this.repo, idIncidencia);
    inc.atender();
    await this.repo.registrarEntrega(idIncidencia, data);
    await this.repo.guardarTransicion(inc, "Ayuda humanitaria entregada");
  }
}

/** ATENDIDO → SEGUIMIENTO ABIERTO: abre el seguimiento sin registrar aún una visita. */
export class IniciarSeguimientoUseCase {
  constructor(private readonly repo: IIncidenciaRepository) {}
  async execute(idIncidencia: string): Promise<void> {
    const inc = await cargar(this.repo, idIncidencia);
    inc.iniciarSeguimiento();
    await this.repo.guardarTransicion(inc, "Inicio de seguimiento post-atención");
  }
}

/** Registra un seguimiento; transiciona ATENDIDO → SEGUIMIENTO ABIERTO si corresponde. */
export class AgregarSeguimientoUseCase {
  constructor(private readonly repo: IIncidenciaRepository) {}
  async execute(idIncidencia: string, data: SeguimientoData): Promise<void> {
    await this.repo.agregarSeguimiento(idIncidencia, data);
    const inc = await cargar(this.repo, idIncidencia);
    if (inc.estadoActual === "ATENDIDO") {
      inc.iniciarSeguimiento();
      await this.repo.guardarTransicion(inc, "Inicio de seguimiento post-atención");
    }
  }
}

/** SEGUIMIENTO ABIERTO → CERRADO: libera brigadistas y cierra el caso. */
export class CerrarCasoUseCase {
  constructor(private readonly repo: IIncidenciaRepository) {}
  async execute(idIncidencia: string): Promise<void> {
    const inc = await cargar(this.repo, idIncidencia);
    await this.repo.liberarBrigadistas(idIncidencia);
    inc.cerrar();
    await this.repo.guardarTransicion(inc, "Caso cerrado");
  }
}
