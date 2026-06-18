import { describe, it, expect } from "vitest";
import {
  BrigadistaParroquial,
  ESTADO,
  DISPONIBILIDAD,
} from "@/core/domain/entities/brigadista/BrigadistaParroquial";
import { ValidationError, BusinessRuleError } from "@/core/domain/errors/DomainError";

const BASE = {
  id: "uuid-1",
  idParroquia: "parroquia-1",
  nombres: "María",
  apellidos: "García",
  dni: "12345678",
  celular: "999888777",
  correo: "maria@example.com",
};

function crearActivo(): BrigadistaParroquial {
  return BrigadistaParroquial.crear(BASE);
}

function crearInactivo(): BrigadistaParroquial {
  const b = crearActivo();
  b.toggleEstado();
  return b;
}

// ---------------------------------------------------------------------------
// BrigadistaParroquial.crear
// ---------------------------------------------------------------------------
describe("BrigadistaParroquial.crear", () => {
  it("[positivo] crea el brigadista con datos válidos", () => {
    const b = crearActivo();
    expect(b.snapshot.nombres).toBe("María");
    expect(b.snapshot.estado).toBe(ESTADO.ACTIVO);
    expect(b.snapshot.disponibilidad).toBe(DISPONIBILIDAD.DISPONIBLE);
  });

  it("[positivo] trimea espacios en nombres y apellidos", () => {
    const b = BrigadistaParroquial.crear({ ...BASE, nombres: "  Ana  ", apellidos: "  López  " });
    expect(b.snapshot.nombres).toBe("Ana");
    expect(b.snapshot.apellidos).toBe("López");
  });

  it("[positivo] permite crear sin DNI", () => {
    const b = BrigadistaParroquial.crear({ ...BASE, dni: undefined });
    expect(b.snapshot.dni).toBeNull();
  });

  it("[negativo] lanza ValidationError cuando nombres está vacío", () => {
    expect(() => BrigadistaParroquial.crear({ ...BASE, nombres: "" })).toThrow(ValidationError);
  });

  it("[negativo] lanza ValidationError cuando nombres es solo espacios", () => {
    expect(() => BrigadistaParroquial.crear({ ...BASE, nombres: "   " })).toThrow(ValidationError);
  });

  it("[negativo] lanza ValidationError cuando idParroquia está vacío", () => {
    expect(() => BrigadistaParroquial.crear({ ...BASE, idParroquia: "" })).toThrow(ValidationError);
  });

  it("[borde] disponibilidad por defecto es DISPONIBLE", () => {
    const b = BrigadistaParroquial.crear({ ...BASE, disponibilidad: undefined });
    expect(b.snapshot.disponibilidad).toBe(DISPONIBILIDAD.DISPONIBLE);
  });

  it("[borde] respeta la disponibilidad pasada explícitamente", () => {
    const b = BrigadistaParroquial.crear({ ...BASE, disponibilidad: DISPONIBILIDAD.NO_DISPONIBLE });
    expect(b.snapshot.disponibilidad).toBe(DISPONIBILIDAD.NO_DISPONIBLE);
  });
});

// ---------------------------------------------------------------------------
// toggleEstado
// ---------------------------------------------------------------------------
describe("BrigadistaParroquial.toggleEstado", () => {
  it("[positivo] cambia de ACTIVO a INACTIVO", () => {
    const b = crearActivo();
    b.toggleEstado();
    expect(b.snapshot.estado).toBe(ESTADO.INACTIVO);
  });

  it("[positivo] cambia de INACTIVO a ACTIVO", () => {
    const b = crearInactivo();
    b.toggleEstado();
    expect(b.snapshot.estado).toBe(ESTADO.ACTIVO);
  });

  it("[borde] al desactivar fuerza disponibilidad a NO_DISPONIBLE", () => {
    const b = crearActivo();
    b.toggleEstado();
    expect(b.snapshot.disponibilidad).toBe(DISPONIBILIDAD.NO_DISPONIBLE);
  });

  it("[borde] al reactivar la disponibilidad no cambia automáticamente", () => {
    const b = crearInactivo();
    b.toggleEstado();
    expect(b.snapshot.estado).toBe(ESTADO.ACTIVO);
    expect(b.snapshot.disponibilidad).toBe(DISPONIBILIDAD.NO_DISPONIBLE);
  });
});

// ---------------------------------------------------------------------------
// toggleDisponibilidad
// ---------------------------------------------------------------------------
describe("BrigadistaParroquial.toggleDisponibilidad", () => {
  it("[positivo] cambia de DISPONIBLE a NO_DISPONIBLE", () => {
    const b = crearActivo();
    b.toggleDisponibilidad();
    expect(b.snapshot.disponibilidad).toBe(DISPONIBILIDAD.NO_DISPONIBLE);
  });

  it("[positivo] cambia de NO_DISPONIBLE a DISPONIBLE cuando está ACTIVO", () => {
    const b = BrigadistaParroquial.crear({ ...BASE, disponibilidad: DISPONIBILIDAD.NO_DISPONIBLE });
    b.toggleDisponibilidad();
    expect(b.snapshot.disponibilidad).toBe(DISPONIBILIDAD.DISPONIBLE);
  });

  it("[negativo] lanza BusinessRuleError al intentar poner DISPONIBLE a un brigadista INACTIVO", () => {
    const b = crearInactivo();
    expect(() => b.toggleDisponibilidad()).toThrow(BusinessRuleError);
  });

  it("[borde] un brigadista EN_CAMPO pasa a DISPONIBLE al hacer toggle (no es DISPONIBLE → quiere serlo)", () => {
    const b = crearActivo();
    b.marcarEnCampo();
    expect(() => b.toggleDisponibilidad()).not.toThrow();
    expect(b.snapshot.disponibilidad).toBe(DISPONIBILIDAD.DISPONIBLE);
  });
});

// ---------------------------------------------------------------------------
// marcarEnCampo y liberar
// ---------------------------------------------------------------------------
describe("BrigadistaParroquial.marcarEnCampo y liberar", () => {
  it("[positivo] marcarEnCampo establece EN_CAMPO", () => {
    const b = crearActivo();
    b.marcarEnCampo();
    expect(b.snapshot.disponibilidad).toBe(DISPONIBILIDAD.EN_CAMPO);
  });

  it("[positivo] liberar devuelve DISPONIBLE cuando el brigadista está ACTIVO", () => {
    const b = crearActivo();
    b.marcarEnCampo();
    b.liberar();
    expect(b.snapshot.disponibilidad).toBe(DISPONIBILIDAD.DISPONIBLE);
  });

  it("[borde] liberar no cambia nada cuando el brigadista está INACTIVO", () => {
    const b = crearInactivo();
    b.liberar();
    expect(b.snapshot.disponibilidad).toBe(DISPONIBILIDAD.NO_DISPONIBLE);
  });
});

// ---------------------------------------------------------------------------
// desdePersistencia, id y dni getters
// ---------------------------------------------------------------------------
describe("BrigadistaParroquial.desdePersistencia e id/dni", () => {
  it("[positivo] desdePersistencia restaura los datos sin validar", () => {
    const props = {
      id: "uuid-99",
      idParroquia: "parroquia-1",
      nombres: "Pedro",
      apellidos: "Ruiz",
      disponibilidad: DISPONIBILIDAD.DISPONIBLE,
      estado: ESTADO.ACTIVO,
      fechaRegistro: new Date(),
    };
    const b = BrigadistaParroquial.desdePersistencia(props);
    expect(b.snapshot.nombres).toBe("Pedro");
    expect(b.snapshot.estado).toBe(ESTADO.ACTIVO);
  });

  it("[positivo] get id retorna el id del brigadista", () => {
    const b = crearActivo();
    expect(b.id).toBe("uuid-1");
  });

  it("[positivo] get dni retorna el dni del brigadista", () => {
    const b = crearActivo();
    expect(b.dni).toBe("12345678");
  });

  it("[positivo] get dni retorna null cuando no se asignó", () => {
    const b = BrigadistaParroquial.crear({ ...BASE, dni: undefined });
    expect(b.dni).toBeNull();
  });

  it("[negativo] lanza BusinessRuleError cuando disponibilidad es inválida en crear", () => {
    expect(() =>
      BrigadistaParroquial.crear({ ...BASE, disponibilidad: "INVALIDA" })
    ).toThrow(BusinessRuleError);
  });
});

// ---------------------------------------------------------------------------
// actualizarDatos
// ---------------------------------------------------------------------------
describe("BrigadistaParroquial.actualizarDatos", () => {
  it("[positivo] actualiza correctamente los datos editables", () => {
    const b = crearActivo();
    b.actualizarDatos({ idParroquia: "parroquia-2", nombres: "Ana", apellidos: "López" });
    expect(b.snapshot.nombres).toBe("Ana");
    expect(b.snapshot.idParroquia).toBe("parroquia-2");
  });

  it("[negativo] lanza ValidationError cuando nombres queda vacío", () => {
    const b = crearActivo();
    expect(() => b.actualizarDatos({ idParroquia: "parroquia-1", nombres: "" })).toThrow(
      ValidationError
    );
  });

  it("[negativo] lanza ValidationError cuando idParroquia queda vacío", () => {
    const b = crearActivo();
    expect(() => b.actualizarDatos({ idParroquia: "", nombres: "María" })).toThrow(ValidationError);
  });

  it("[borde] trimea espacios en los campos actualizados", () => {
    const b = crearActivo();
    b.actualizarDatos({ idParroquia: "parroquia-1", nombres: "  Pedro  ", apellidos: "  Ruiz  " });
    expect(b.snapshot.nombres).toBe("Pedro");
    expect(b.snapshot.apellidos).toBe("Ruiz");
  });
});
