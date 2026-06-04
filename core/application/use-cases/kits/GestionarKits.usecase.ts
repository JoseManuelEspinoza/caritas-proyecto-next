import { randomUUID } from "crypto";
import { KitEmergencia, TipoMovimiento } from "../../../domain/entities/kit/KitEmergencia";
import { IKitRepository, KitMovimientoRead } from "../../../domain/repositories/IKitRepository";
import { NotFoundError } from "../../../domain/errors/DomainError";

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
    const kit = await this.repo.findById(idKit);
    if (!kit) throw new NotFoundError("Kit no encontrado.");
    kit.aplicarMovimiento(mov.tipo, mov.cantidad);
    await this.repo.registrarMovimiento(kit, mov);
    return toOutput(kit);
  }
}
