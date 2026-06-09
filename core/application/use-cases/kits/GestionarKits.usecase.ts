import { randomUUID } from "crypto";
import { KitEmergencia, TipoMovimiento } from "../../../domain/entities/kit/KitEmergencia";
import { IKitRepository, KitMovimientoRead } from "../../../domain/repositories/IKitRepository";
import { NotFoundError, ValidationError } from "../../../domain/errors/DomainError";

export interface KitOutput {
  id: string;
  tipoKit: string;
  descripcion: string | null;
  stockActual: number;
  estadoKit: string;
  codigoAlmacen: string | null;
  ubicacionAlmacen: string | null;
}

function toOutput(k: KitEmergencia): KitOutput {
  const s = k.snapshot;
  return {
    id: s.id,
    tipoKit: s.tipoKit,
    descripcion: s.descripcion ?? null,
    stockActual: s.stockActual,
    estadoKit: s.estadoKit,
    codigoAlmacen: s.codigoAlmacen ?? null,
    ubicacionAlmacen: s.ubicacionAlmacen ?? null,
  };
}

const TIPOS_MOVIMIENTO_VALIDOS: TipoMovimiento[] = ["INGRESO", "ENTREGA", "REPOSICION"];

function validarEnteroNoNegativo(value: number | undefined, campo: string): number {
  const n = value ?? 0;

  if (!Number.isFinite(n)) {
    throw new ValidationError(`${campo} debe ser un número válido.`);
  }

  if (!Number.isInteger(n)) {
    throw new ValidationError(`${campo} debe ser un número entero.`);
  }

  if (n < 0) {
    throw new ValidationError(`${campo} no puede ser negativo.`);
  }

  return n;
}

function validarEnteroPositivo(value: number, campo: string): void {
  if (!Number.isFinite(value)) {
    throw new ValidationError(`${campo} debe ser un número válido.`);
  }

  if (!Number.isInteger(value)) {
    throw new ValidationError(`${campo} debe ser un número entero.`);
  }

  if (value <= 0) {
    throw new ValidationError(`${campo} debe ser mayor que cero.`);
  }
}

function validarCreacionKit(input: {
  tipoKit: string;
  descripcion?: string;
  stockInicial?: number;
}): void {
  if (!input.tipoKit?.trim()) {
    throw new ValidationError("Indica el tipo de kit.");
  }

  if (input.tipoKit.trim().length < 3) {
    throw new ValidationError("El tipo de kit debe tener al menos 3 caracteres.");
  }

  validarEnteroNoNegativo(input.stockInicial, "stockInicial");
}

function validarMovimientoKit(
  idKit: string,
  mov: {
    tipo: TipoMovimiento;
    cantidad: number;
    idUsuarioResponsableGRD: string;
    idParroquiaDestino?: string;
  }
): void {
  if (!idKit?.trim()) {
    throw new ValidationError("Selecciona el kit.");
  }

  if (!TIPOS_MOVIMIENTO_VALIDOS.includes(mov.tipo)) {
    throw new ValidationError("Selecciona un tipo de movimiento válido.");
  }

  validarEnteroPositivo(mov.cantidad, "cantidad");

  if (!mov.idUsuarioResponsableGRD?.trim()) {
    throw new ValidationError("No se encontró el usuario responsable del movimiento.");
  }

  if (mov.tipo === "ENTREGA" && !mov.idParroquiaDestino?.trim()) {
    throw new ValidationError("Selecciona la parroquia destino para la entrega.");
  }
}

/** Registra un tipo de kit en el almacén. */
export class CrearKitUseCase {
  constructor(private readonly repo: IKitRepository) {}
  async execute(input: {
    tipoKit: string;
    descripcion?: string;
    stockInicial?: number;
    codigoAlmacen?: string;
    ubicacionAlmacen?: string;
  }): Promise<KitOutput> {
    validarCreacionKit(input);

    const kit = KitEmergencia.crear({ id: randomUUID(), ...input });
    await this.repo.save(kit);
    return toOutput(kit);
  }
}

export class ListarKitsUseCase {
  constructor(private readonly repo: IKitRepository) {}
  async execute(): Promise<KitOutput[]> {
    return (await this.repo.findAll()).map(toOutput);
  }
}

/** Devuelve el historial de movimientos de un kit. */
export class ListarMovimientosKitUseCase {
  constructor(private readonly repo: IKitRepository) {}
  async execute(idKit: string): Promise<KitMovimientoRead[]> {
    return this.repo.findMovimientos(idKit);
  }
}

/** Registra un movimiento (ingreso/entrega/reposición) ajustando el stock. */
export class RegistrarMovimientoKitUseCase {
  constructor(private readonly repo: IKitRepository) {}
  async execute(
    idKit: string,
    mov: {
      tipo: TipoMovimiento;
      cantidad: number;
      idUsuarioResponsableGRD: string;
      idParroquiaDestino?: string;
      motivoMovimiento?: string;
      observaciones?: string;
    }
  ): Promise<KitOutput> {
    validarMovimientoKit(idKit, mov);

    const kit = await this.repo.findById(idKit);
    if (!kit) throw new NotFoundError("Kit no encontrado.");
    
    kit.aplicarMovimiento(mov.tipo, mov.cantidad);
    await this.repo.registrarMovimiento(kit, mov);
    return toOutput(kit);
  }
}
