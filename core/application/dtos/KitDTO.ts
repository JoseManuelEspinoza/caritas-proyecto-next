import { Kit, KitMovement } from '../../domain/entities/kit/Kit'

export interface CrearKitInput {
  nombre: string
  contenido: string
  stockInicial?: number
  parroquiaAsignada?: string
}

export interface KitOutput {
  id: string
  nombre: string
  contenido: string
  stock: number
  parroquiaAsignada?: string
  movimientos: KitMovement[]
}

export function toKitOutput(k: Kit): KitOutput {
  const s = k.snapshot
  return {
    id: s.id,
    nombre: s.nombre,
    contenido: s.contenido,
    stock: s.stock,
    parroquiaAsignada: s.parroquiaAsignada,
    movimientos: s.movimientos,
  }
}
