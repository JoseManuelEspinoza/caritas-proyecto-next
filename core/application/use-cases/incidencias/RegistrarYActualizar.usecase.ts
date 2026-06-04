import { IIncidenciaRepository } from "../../../domain/repositories/IIncidenciaRepository";
import { NotFoundError, ValidationError } from "../../../domain/errors/DomainError";
import { CreateIncidenteData } from "../../dtos/IncidenciaDTO";

/** Validaciones de los campos obligatorios del formulario de incidente. */
function validarCreacion(data: CreateIncidenteData): void {
  if (!data.reportaNombre?.trim()) throw new ValidationError("Ingresa el nombre de quien reportó.");
  if (!data.reportaDni?.trim()) throw new ValidationError("Ingresa el DNI de quien reportó.");
  if (!data.reportaTel?.trim()) throw new ValidationError("Ingresa el celular de quien reportó.");
  if (!data.reportaRol) throw new ValidationError("Selecciona el rol de quien reportó.");
  validarEvento(data);
  if (!data.fechaSuceso) throw new ValidationError("Ingresa la fecha del suceso.");
}

function validarEvento(data: CreateIncidenteData): void {
  if (!data.categoria) throw new ValidationError("Selecciona la categoría del evento.");
  if (!data.distrito) throw new ValidationError("Selecciona el distrito.");
  if (!data.direccion?.trim()) throw new ValidationError("Ingresa la dirección del evento.");
}

/** ABIERTO: registra un incidente nuevo. Devuelve el id para redirigir. */
export class RegistrarIncidenciaUseCase {
  constructor(private readonly repo: IIncidenciaRepository) {}
  async execute(data: CreateIncidenteData): Promise<string> {
    validarCreacion(data);
    const codigo = await this.repo.nextCodigo();
    return this.repo.crear(codigo, data);
  }
}

/** Actualiza los datos de un incidente (solo permitido en estado ABIERTO). */
export class ActualizarIncidenciaUseCase {
  constructor(private readonly repo: IIncidenciaRepository) {}
  async execute(id: string, data: CreateIncidenteData): Promise<void> {
    validarEvento(data);
    const incidencia = await this.repo.findById(id);
    if (!incidencia) throw new NotFoundError("Incidencia no encontrada.");
    incidencia.asegurarEditable();
    await this.repo.actualizarDatos(id, data);
  }
}
