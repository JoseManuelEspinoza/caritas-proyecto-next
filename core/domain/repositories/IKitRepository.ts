import { KitEmergencia, TipoMovimiento } from "../entities/kit/KitEmergencia";

export interface MovimientoData {
  tipo: TipoMovimiento;
  cantidad: number;
  idUsuarioResponsableGRD: string;
  idParroquiaDestino?: string | null;
  motivoMovimiento?: string | null;
  observaciones?: string | null;
}

/** Proyección de lectura de un movimiento (read model). */
export interface KitMovimientoRead {
  id: string;
  tipo: string;
  cantidad: number;
  fecha: string;
  responsable: string | null;
  motivoMovimiento: string | null;
  observaciones: string | null;
}

export interface IKitRepository {
  save(kit: KitEmergencia): Promise<void>;
  findById(id: string): Promise<KitEmergencia | null>;
  findAll(): Promise<KitEmergencia[]>;
  /** Persiste el nuevo stock del kit y registra el movimiento (transaccional). */
  registrarMovimiento(kit: KitEmergencia, mov: MovimientoData): Promise<void>;
  /** Historial de movimientos de un kit (más reciente primero). */
  findMovimientos(idKit: string): Promise<KitMovimientoRead[]>;
  /** Persiste cambios de un kit existente (p. ej. archivarlo). */
  update(kit: KitEmergencia): Promise<void>;
  /** Elimina un kit. Solo debe invocarse si no tiene movimientos. */
  delete(id: string): Promise<void>;
  /** Nº de movimientos registrados para un kit. */
  contarMovimientos(idKit: string): Promise<number>;
}
