import { ValidationError } from '../errors/DomainError'

/**
 * Value Object: DNI peruano.
 *
 * Un Value Object es inmutable y se valida a sí mismo al construirse: si existe
 * una instancia de `Dni`, está garantizado que es válida. Esto evita esparcir
 * validaciones de DNI por todo el código — la regla vive en un solo lugar.
 *
 * Dos DNIs son iguales si su valor es igual (no por identidad de referencia).
 */
export class Dni {
  private readonly value: string

  constructor(value: string) {
    const clean = value.trim()
    if (!/^\d{8}$/.test(clean)) {
      throw new ValidationError('El DNI debe tener exactamente 8 dígitos numéricos.')
    }
    this.value = clean
  }

  toString(): string {
    return this.value
  }

  equals(other: Dni): boolean {
    return this.value === other.value
  }
}
