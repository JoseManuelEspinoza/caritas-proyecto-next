/**
 * Error base del dominio.
 *
 * Representa una violación de una regla de negocio (ej: un DNI inválido, una
 * transición de estado no permitida). Es TypeScript puro: NO sabe nada de HTTP,
 * Next.js ni Prisma. La capa de presentación es la encargada de atrapar estos
 * errores y traducirlos a una respuesta para el usuario.
 */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** Se lanza cuando un dato de entrada no cumple una invariante del dominio. */
export class ValidationError extends DomainError {}

/** Se lanza cuando se intenta una operación no permitida por el estado actual. */
export class BusinessRuleError extends DomainError {}

/** Se lanza cuando no se encuentra una entidad esperada. */
export class NotFoundError extends DomainError {}
