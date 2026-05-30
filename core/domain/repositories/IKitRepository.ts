import { KitEmergencia, TipoMovimiento } from '../entities/kit/KitEmergencia'

export interface MovimientoData {
  tipo: TipoMovimiento
  cantidad: number
  idUsuarioResponsableGRD: string
  idParroquiaDestino?: string | null
  motivoMovimiento?: string | null
  observaciones?: string | null
}

export interface IKitRepository {
  save(kit: KitEmergencia): Promise<void>
  findById(id: string): Promise<KitEmergencia | null>
  findAll(): Promise<KitEmergencia[]>
  /** Persiste el nuevo stock del kit y registra el movimiento (transaccional). */
  registrarMovimiento(kit: KitEmergencia, mov: MovimientoData): Promise<void>
}
