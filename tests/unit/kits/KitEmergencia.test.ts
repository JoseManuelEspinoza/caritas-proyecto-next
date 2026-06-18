import { describe, it, expect } from "vitest";
import { KitEmergencia } from "@/core/domain/entities/kit/KitEmergencia";
import { ValidationError, BusinessRuleError } from "@/core/domain/errors/DomainError";

function crearKit(stockInicial = 10): KitEmergencia {
  return KitEmergencia.crear({ id: "kit-1", tipoKit: "Mochila básica", stockInicial });
}

describe("KitEmergencia.crear", () => {
  it("[positivo] crea el kit con estado ACTIVO y stock correcto", () => {
    const kit = crearKit(5);
    expect(kit.snapshot.estadoKit).toBe("ACTIVO");
    expect(kit.stockActual).toBe(5);
  });

  it("[positivo] stock por defecto es 0 cuando no se especifica", () => {
    const kit = KitEmergencia.crear({ id: "kit-2", tipoKit: "Linterna" });
    expect(kit.stockActual).toBe(0);
  });

  it("[positivo] trimea tipoKit", () => {
    const kit = KitEmergencia.crear({ id: "kit-3", tipoKit: "  Botiquín  " });
    expect(kit.snapshot.tipoKit).toBe("Botiquín");
  });

  it("[negativo] lanza ValidationError cuando tipoKit está vacío", () => {
    expect(() => KitEmergencia.crear({ id: "kit-4", tipoKit: "" })).toThrow(ValidationError);
  });

  it("[negativo] lanza ValidationError cuando stockInicial es negativo", () => {
    expect(() =>
      KitEmergencia.crear({ id: "kit-5", tipoKit: "Mochila", stockInicial: -1 })
    ).toThrow(ValidationError);
  });
});

describe("KitEmergencia.aplicarMovimiento", () => {
  it("[positivo] INGRESO suma al stock", () => {
    const kit = crearKit(10);
    kit.aplicarMovimiento("INGRESO", 5);
    expect(kit.stockActual).toBe(15);
  });

  it("[positivo] REPOSICION suma al stock", () => {
    const kit = crearKit(10);
    kit.aplicarMovimiento("REPOSICION", 3);
    expect(kit.stockActual).toBe(13);
  });

  it("[positivo] ENTREGA resta del stock", () => {
    const kit = crearKit(10);
    kit.aplicarMovimiento("ENTREGA", 4);
    expect(kit.stockActual).toBe(6);
  });

  it("[positivo] ENTREGA exacta al stock deja el stock en 0", () => {
    const kit = crearKit(5);
    kit.aplicarMovimiento("ENTREGA", 5);
    expect(kit.stockActual).toBe(0);
  });

  it("[negativo] ENTREGA mayor al stock lanza BusinessRuleError", () => {
    const kit = crearKit(3);
    expect(() => kit.aplicarMovimiento("ENTREGA", 4)).toThrow(BusinessRuleError);
  });

  it("[negativo] cantidad 0 lanza ValidationError", () => {
    const kit = crearKit(10);
    expect(() => kit.aplicarMovimiento("INGRESO", 0)).toThrow(ValidationError);
  });

  it("[negativo] cantidad negativa lanza ValidationError", () => {
    const kit = crearKit(10);
    expect(() => kit.aplicarMovimiento("ENTREGA", -2)).toThrow(ValidationError);
  });

  it("[negativo] tipo de movimiento inválido lanza BusinessRuleError", () => {
    const kit = crearKit(10);
    expect(() => kit.aplicarMovimiento("INVALIDO" as any, 5)).toThrow(BusinessRuleError);
  });

  it("[negativo] cantidad decimal lanza BusinessRuleError", () => {
    const kit = crearKit(10);
    expect(() => kit.aplicarMovimiento("INGRESO", 1.5)).toThrow(BusinessRuleError);
  });
});

describe("KitEmergencia — desdePersistencia e id", () => {
  it("[positivo] desdePersistencia restaura el stock", () => {
    const kit = KitEmergencia.desdePersistencia({
      id: "kit-99",
      tipoKit: "Mochila avanzada",
      stockActual: 25,
      estadoKit: "ACTIVO",
    });
    expect(kit.stockActual).toBe(25);
    expect(kit.id).toBe("kit-99");
    expect(kit.snapshot.tipoKit).toBe("Mochila avanzada");
  });
});
