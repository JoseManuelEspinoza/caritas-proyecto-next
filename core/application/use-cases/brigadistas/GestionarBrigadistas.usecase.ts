import { randomUUID } from "crypto";
import { BrigadistaParroquial } from "../../../domain/entities/brigadista/BrigadistaParroquial";
import { IBrigadistaRepository } from "../../../domain/repositories/IBrigadistaRepository";
import { NotFoundError, ValidationError } from "../../../domain/errors/DomainError";
import { BrigadistaInput, BrigadistaOutput, toBrigadistaOutput } from "../../dtos/BrigadistaDTO";

async function cargar(repo: IBrigadistaRepository, id: string): Promise<BrigadistaParroquial> {
  const b = await repo.findById(id);
  if (!b) throw new NotFoundError("Brigadista no encontrado.");
  return b;
}

/** Valida que el DNI no esté repetido (opcionalmente excluyendo un id propio). */
async function assertDniUnico(
  repo: IBrigadistaRepository,
  dni: string | undefined,
  exceptId?: string
): Promise<void> {
  const limpio = dni?.trim();
  if (!limpio) return;
  const dueno = await repo.findIdByDni(limpio);
  if (dueno && dueno !== exceptId) {
    throw new ValidationError(
      exceptId ? "Ya existe otro brigadista con ese DNI." : "Ya existe un brigadista con ese DNI."
    );
  }
}

/** Registra un brigadista en el padrón parroquial. */
export class CrearBrigadistaUseCase {
  constructor(private readonly repo: IBrigadistaRepository) {}
  async execute(input: BrigadistaInput): Promise<BrigadistaOutput> {
    await assertDniUnico(this.repo, input.dni);
    const brigadista = BrigadistaParroquial.crear({
      id: randomUUID(),
      idParroquia: input.idParroquia,
      nombres: input.nombres,
      apellidos: input.apellidos,
      dni: input.dni,
      celular: input.celular,
      correo: input.correo,
      disponibilidad: input.disponibilidad,
    });
    await this.repo.save(brigadista);
    return toBrigadistaOutput(brigadista);
  }
}

/** Actualiza los datos de un brigadista existente. */
export class ActualizarBrigadistaUseCase {
  constructor(private readonly repo: IBrigadistaRepository) {}
  async execute(id: string, input: BrigadistaInput): Promise<BrigadistaOutput> {
    await assertDniUnico(this.repo, input.dni, id);
    const brigadista = await cargar(this.repo, id);
    brigadista.actualizarDatos(input);
    await this.repo.update(brigadista);
    return toBrigadistaOutput(brigadista);
  }
}

/** Alterna ACTIVO ↔ INACTIVO. */
export class ToggleEstadoBrigadistaUseCase {
  constructor(private readonly repo: IBrigadistaRepository) {}
  async execute(id: string): Promise<BrigadistaOutput> {
    const brigadista = await cargar(this.repo, id);
    brigadista.toggleEstado();
    await this.repo.update(brigadista);
    return toBrigadistaOutput(brigadista);
  }
}

/** Alterna DISPONIBLE ↔ NO DISPONIBLE. */
export class ToggleDisponibilidadUseCase {
  constructor(private readonly repo: IBrigadistaRepository) {}
  async execute(id: string): Promise<BrigadistaOutput> {
    const brigadista = await cargar(this.repo, id);
    brigadista.toggleDisponibilidad();
    await this.repo.update(brigadista);
    return toBrigadistaOutput(brigadista);
  }
}

/** Lista todo el padrón. */
export class ListarBrigadistasUseCase {
  constructor(private readonly repo: IBrigadistaRepository) {}
  async execute(): Promise<BrigadistaOutput[]> {
    return (await this.repo.findAll()).map(toBrigadistaOutput);
  }
}
