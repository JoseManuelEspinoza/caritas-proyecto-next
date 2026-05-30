import { randomUUID } from 'crypto'
import { Guard } from '../../shared/Guard'
import { BusinessRuleError } from '../../errors/DomainError'

export type TipoMovimientoKit = 'INGRESO' | 'ENTREGA' | 'REPOSICION'

export interface KitMovement {
  id: string
  fecha: string
  tipo: TipoMovimientoKit
  cantidad: number
  responsable: string
  destinatario?: string
  parroquia?: string
  incidenciaId?: string
  notas?: string
}

export interface KitProps {
  id: string
  nombre: string
  contenido: string
  stock: number
  parroquiaAsignada?: string
  movimientos: KitMovement[]
}

/**
 * Kit / Mochila de Emergencia (logística).
 *
 * El stock es una invariante: NUNCA puede quedar negativo. Cada movimiento lo
 * ajusta según su tipo (ingreso/reposición suman, entrega resta) y el saldo se
 * valida dentro de la entidad, no en la UI.
 */
export class Kit {
  private constructor(private props: KitProps) {}

  static crear(input: { id: string; nombre: string; contenido: string; stockInicial?: number; parroquiaAsignada?: string }): Kit {
    Guard.minLength(input.nombre, 2, 'nombre')
    Guard.required(input.contenido, 'contenido')
    const stock = input.stockInicial ?? 0
    Guard.nonNegative(stock, 'stockInicial')
    return new Kit({
      id: input.id,
      nombre: input.nombre,
      contenido: input.contenido,
      stock,
      parroquiaAsignada: input.parroquiaAsignada,
      movimientos: [],
    })
  }

  static desdePersistencia(props: KitProps): Kit {
    return new Kit(props)
  }

  /** Registra un movimiento y ajusta el stock. Bloquea entregas sin saldo. */
  registrarMovimiento(mov: Omit<KitMovement, 'id'>): void {
    Guard.positive(mov.cantidad, 'cantidad')

    const delta = mov.tipo === 'ENTREGA' ? -mov.cantidad : mov.cantidad
    const nuevoStock = this.props.stock + delta
    if (nuevoStock < 0) {
      throw new BusinessRuleError(
        `Stock insuficiente: hay ${this.props.stock} unidades y se intentan entregar ${mov.cantidad}.`,
      )
    }

    this.props.stock = nuevoStock
    this.props.movimientos.push({ ...mov, id: randomUUID() })
  }

  get id(): string { return this.props.id }
  get stock(): number { return this.props.stock }
  get snapshot(): Readonly<KitProps> { return this.props }
}
