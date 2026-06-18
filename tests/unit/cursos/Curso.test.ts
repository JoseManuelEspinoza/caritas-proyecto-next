import { describe, it, expect } from "vitest";
import { Curso, resultadoPorNota, NOTA_APROBATORIA } from "@/core/domain/entities/curso/Curso";
import { ValidationError, BusinessRuleError } from "@/core/domain/errors/DomainError";

const BASE = {
  id: "curso-1",
  idUsuarioResponsableGRD: "usuario-1",
  nombreCurso: "Gestión de Riesgos",
};

function crearBorrador(): Curso {
  return Curso.crear(BASE);
}

function crearPublicado(): Curso {
  const c = crearBorrador();
  c.publicar();
  return c;
}

describe("resultadoPorNota", () => {
  it(`[positivo] nota ${NOTA_APROBATORIA} retorna APROBADO`, () => {
    expect(resultadoPorNota(NOTA_APROBATORIA)).toBe("APROBADO");
  });

  it("[positivo] nota 20 retorna APROBADO", () => {
    expect(resultadoPorNota(20)).toBe("APROBADO");
  });

  it("[positivo] nota por debajo del mínimo retorna DESAPROBADO", () => {
    expect(resultadoPorNota(NOTA_APROBATORIA - 1)).toBe("DESAPROBADO");
  });

  it("[positivo] nota 0 retorna DESAPROBADO", () => {
    expect(resultadoPorNota(0)).toBe("DESAPROBADO");
  });
});

describe("Curso.crear", () => {
  it("[positivo] crea el curso con estado BORRADOR y modalidad ASINCRONA", () => {
    const c = crearBorrador();
    expect(c.snapshot.estadoCurso).toBe("BORRADOR");
    expect(c.snapshot.modalidadGeneral).toBe("ASINCRONA");
  });

  it("[positivo] trimea nombreCurso", () => {
    const c = Curso.crear({ ...BASE, nombreCurso: "  GRD Básico  " });
    expect(c.snapshot.nombreCurso).toBe("GRD Básico");
  });

  it("[positivo] estaAbierto es false en BORRADOR", () => {
    expect(crearBorrador().estaAbierto).toBe(false);
  });

  it("[negativo] lanza ValidationError cuando idUsuarioResponsableGRD está vacío", () => {
    expect(() => Curso.crear({ ...BASE, idUsuarioResponsableGRD: "" })).toThrow(ValidationError);
  });

  it("[negativo] lanza ValidationError cuando nombreCurso tiene menos de 3 caracteres", () => {
    expect(() => Curso.crear({ ...BASE, nombreCurso: "AB" })).toThrow(ValidationError);
  });
});

describe("Curso.publicar", () => {
  it("[positivo] cambia el estado a PUBLICADO y registra la fecha", () => {
    const c = crearBorrador();
    c.publicar();
    expect(c.snapshot.estadoCurso).toBe("PUBLICADO");
    expect(c.snapshot.fechaPublicacion).not.toBeNull();
  });

  it("[positivo] estaAbierto es true después de publicar", () => {
    expect(crearPublicado().estaAbierto).toBe(true);
  });

  it("[negativo] lanza BusinessRuleError al publicar un curso ya PUBLICADO", () => {
    expect(() => crearPublicado().publicar()).toThrow(BusinessRuleError);
  });
});

describe("Curso.cerrar", () => {
  it("[positivo] cambia el estado a CERRADO y registra la fecha", () => {
    const c = crearPublicado();
    c.cerrar();
    expect(c.snapshot.estadoCurso).toBe("CERRADO");
    expect(c.snapshot.fechaCierre).not.toBeNull();
  });

  it("[positivo] estaAbierto es false después de cerrar", () => {
    const c = crearPublicado();
    c.cerrar();
    expect(c.estaAbierto).toBe(false);
  });

  it("[negativo] lanza BusinessRuleError al cerrar un curso en BORRADOR", () => {
    expect(() => crearBorrador().cerrar()).toThrow(BusinessRuleError);
  });

  it("[negativo] lanza BusinessRuleError al cerrar un curso ya CERRADO", () => {
    const c = crearPublicado();
    c.cerrar();
    expect(() => c.cerrar()).toThrow(BusinessRuleError);
  });
});

describe("Curso — assertDuracionValida", () => {
  it("[negativo] lanza BusinessRuleError cuando duracion no es finita (Infinity)", () => {
    expect(() => Curso.crear({ ...BASE, duracionEstimadaHoras: Infinity })).toThrow(BusinessRuleError);
  });

  it("[negativo] lanza BusinessRuleError cuando duracion no es entero", () => {
    expect(() => Curso.crear({ ...BASE, duracionEstimadaHoras: 2.5 })).toThrow(BusinessRuleError);
  });

  it("[negativo] lanza BusinessRuleError cuando duracion es 0", () => {
    expect(() => Curso.crear({ ...BASE, duracionEstimadaHoras: 0 })).toThrow(BusinessRuleError);
  });

  it("[negativo] lanza BusinessRuleError cuando duracion es negativa", () => {
    expect(() => Curso.crear({ ...BASE, duracionEstimadaHoras: -5 })).toThrow(BusinessRuleError);
  });

  it("[positivo] acepta duracion válida", () => {
    const c = Curso.crear({ ...BASE, duracionEstimadaHoras: 8 });
    expect(c.snapshot.duracionEstimadaHoras).toBe(8);
  });
});

describe("Curso — desdePersistencia e id", () => {
  it("[positivo] desdePersistencia restaura el estado CERRADO", () => {
    const c = Curso.desdePersistencia({
      id: "curso-99",
      idUsuarioResponsableGRD: "u-1",
      nombreCurso: "Curso Avanzado",
      modalidadGeneral: "ASINCRONA",
      estadoCurso: "CERRADO",
    });
    expect(c.snapshot.estadoCurso).toBe("CERRADO");
    expect(c.id).toBe("curso-99");
  });
});
