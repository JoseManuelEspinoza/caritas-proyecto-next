import { ValidationError } from '../errors/DomainError'

/**
 * Guards de dominio reutilizables.
 *
 * Centralizan las validaciones de invariantes comunes (requerido, longitud,
 * rango) para que las entidades no repitan el mismo `if (...) throw` una y
 * otra vez. Todos lanzan `ValidationError` con un mensaje claro en español.
 */
export const Guard = {
  required(value: unknown, campo: string): void {
    if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
      throw new ValidationError(`El campo "${campo}" es obligatorio.`)
    }
  },

  minLength(value: string, min: number, campo: string): void {
    if (value.trim().length < min) {
      throw new ValidationError(`El campo "${campo}" debe tener al menos ${min} caracteres.`)
    }
  },

  positive(value: number, campo: string): void {
    if (!Number.isFinite(value) || value <= 0) {
      throw new ValidationError(`El campo "${campo}" debe ser un número positivo.`)
    }
  },

  nonNegative(value: number, campo: string): void {
    if (!Number.isFinite(value) || value < 0) {
      throw new ValidationError(`El campo "${campo}" no puede ser negativo.`)
    }
  },

  oneOf<T>(value: T, allowed: readonly T[], campo: string): void {
    if (!allowed.includes(value)) {
      throw new ValidationError(`Valor inválido para "${campo}": ${String(value)}.`)
    }
  },
}
