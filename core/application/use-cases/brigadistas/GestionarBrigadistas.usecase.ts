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
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DISPONIBILIDADES_VALIDAS = ["DISPONIBLE", "EN CAMPO", "NO DISPONIBLE"];

function soloDigitos(value?: string | null): string {
  return (value ?? "").replace(/\D/g, "");
}

function celularPeruano(value?: string | null): string {
  const digits = soloDigitos(value);
  return digits.startsWith("51") ? digits.slice(2) : digits;
}

function validarInputBrigadista(input: BrigadistaInput): void {
  const nombres = input.nombres?.trim() ?? "";
  const apellidos = input.apellidos?.trim() ?? "";
  const dni = soloDigitos(input.dni);
  const celular = celularPeruano(input.celular);
  const correo = input.correo?.trim() ?? "";

  if (!nombres) throw new ValidationError("Ingresa los nombres del brigadista.");
  if (nombres.length < 2) {
    throw new ValidationError("Los nombres deben tener al menos 2 caracteres.");
  }

  if (!apellidos) throw new ValidationError("Ingresa los apellidos del brigadista.");
  if (apellidos.length < 2) {
    throw new ValidationError("Los apellidos deben tener al menos 2 caracteres.");
  }

  if (!dni) throw new ValidationError("Ingresa el DNI del brigadista.");
  if (dni.length !== 8) throw new ValidationError("El DNI debe tener exactamente 8 dígitos.");

  if (!celular) throw new ValidationError("Ingresa el celular del brigadista.");
  if (!/^9\d{8}$/.test(celular)) {
    throw new ValidationError("El celular debe tener 9 dígitos y empezar con 9.");
  }

  if (correo && !EMAIL_RE.test(correo)) {
    throw new ValidationError("El correo no tiene un formato válido.");
  }

  if (!input.idParroquia?.trim()) {
    throw new ValidationError("Selecciona la parroquia del brigadista.");
  }

  if (
    input.disponibilidad &&
    !DISPONIBILIDADES_VALIDAS.includes(input.disponibilidad)
  ) {
    throw new ValidationError("Selecciona una disponibilidad válida.");
  }
}
/** Valida que el DNI no esté repetido (opcionalmente excluyendo un id propio). */
async function assertDniUnico(
  repo: IBrigadistaRepository,
  dni: string | null | undefined,
  exceptId?: string
): Promise<void> {
  const limpio = soloDigitos(dni);
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
    validarInputBrigadista(input);
    await assertDniUnico(this.repo, input.dni);

    const brigadista = BrigadistaParroquial.crear({
      id: randomUUID(),
      idParroquia: input.idParroquia,
      nombres: input.nombres,
      apellidos: input.apellidos,
      dni: soloDigitos(input.dni),
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
    validarInputBrigadista(input);
    await assertDniUnico(this.repo, input.dni, id);

    const brigadista = await cargar(this.repo, id);
    brigadista.actualizarDatos({
  ...input,
  dni: soloDigitos(input.dni),
});

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
