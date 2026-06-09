import { describe, it, expect } from "vitest";
import { Dni } from "@/core/domain/value-objects/Dni";
import { ValidationError } from "@/core/domain/errors/DomainError";

describe("Dni", () => {
  it("[positivo] crea un DNI válido de 8 dígitos", () => {
    const dni = new Dni("12345678");
    expect(dni.toString()).toBe("12345678");
  });

  it("[positivo] trimea espacios antes de validar", () => {
    const dni = new Dni("  12345678  ");
    expect(dni.toString()).toBe("12345678");
  });

  it("[positivo] dos DNIs con el mismo valor son iguales", () => {
    expect(new Dni("12345678").equals(new Dni("12345678"))).toBe(true);
  });

  it("[positivo] dos DNIs con distinto valor no son iguales", () => {
    expect(new Dni("12345678").equals(new Dni("87654321"))).toBe(false);
  });

  it("[negativo] lanza ValidationError con menos de 8 dígitos", () => {
    expect(() => new Dni("1234567")).toThrow(ValidationError);
  });

  it("[negativo] lanza ValidationError con más de 8 dígitos", () => {
    expect(() => new Dni("123456789")).toThrow(ValidationError);
  });

  it("[negativo] lanza ValidationError con letras", () => {
    expect(() => new Dni("1234567A")).toThrow(ValidationError);
  });

  it("[negativo] lanza ValidationError con cadena vacía", () => {
    expect(() => new Dni("")).toThrow(ValidationError);
  });
});
