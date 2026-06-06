import { describe, it, expect } from "vitest";
import { Catalogo, CatalogoDetalle } from "@/core/domain/entities/catalogo/Catalogo";
import { ValidationError } from "@/core/domain/errors/DomainError";

// ---------------------------------------------------------------------------
// Catalogo
// ---------------------------------------------------------------------------
describe("Catalogo.crear", () => {
  it("[positivo] crea el catálogo con estado ACTIVO", () => {
    const c = Catalogo.crear({ id: "cat-1", nombreCatalogo: "Tipos de evento" });
    expect(c.snapshot.estado).toBe("ACTIVO");
  });

  it("[positivo] trimea nombreCatalogo", () => {
    const c = Catalogo.crear({ id: "cat-2", nombreCatalogo: "  Tipos  " });
    expect(c.snapshot.nombreCatalogo).toBe("Tipos");
  });

  it("[negativo] lanza ValidationError cuando nombreCatalogo está vacío", () => {
    expect(() => Catalogo.crear({ id: "cat-3", nombreCatalogo: "" })).toThrow(ValidationError);
  });
});

describe("Catalogo.toggle", () => {
  it("[positivo] cambia de ACTIVO a INACTIVO", () => {
    const c = Catalogo.crear({ id: "cat-4", nombreCatalogo: "Gravedad" });
    c.toggle();
    expect(c.snapshot.estado).toBe("INACTIVO");
  });

  it("[positivo] cambia de INACTIVO a ACTIVO", () => {
    const c = Catalogo.desdePersistencia({
      id: "cat-5",
      nombreCatalogo: "Gravedad",
      estado: "INACTIVO",
    });
    c.toggle();
    expect(c.snapshot.estado).toBe("ACTIVO");
  });
});

// ---------------------------------------------------------------------------
// CatalogoDetalle
// ---------------------------------------------------------------------------
describe("CatalogoDetalle.crear", () => {
  it("[positivo] crea el detalle con estado ACTIVO", () => {
    const d = CatalogoDetalle.crear({
      id: "det-1",
      idCatalogoGRD: "cat-1",
      codigo: "SIS",
      valor: "Sismo",
    });
    expect(d.snapshot.estado).toBe("ACTIVO");
    expect(d.snapshot.codigo).toBe("SIS");
    expect(d.snapshot.valor).toBe("Sismo");
  });

  it("[positivo] trimea codigo y valor", () => {
    const d = CatalogoDetalle.crear({
      id: "det-2",
      idCatalogoGRD: "cat-1",
      codigo: "  INC  ",
      valor: "  Incendio  ",
    });
    expect(d.snapshot.codigo).toBe("INC");
    expect(d.snapshot.valor).toBe("Incendio");
  });

  it("[negativo] lanza ValidationError cuando codigo está vacío", () => {
    expect(() =>
      CatalogoDetalle.crear({ id: "det-3", idCatalogoGRD: "cat-1", codigo: "", valor: "Sismo" })
    ).toThrow(ValidationError);
  });

  it("[negativo] lanza ValidationError cuando valor está vacío", () => {
    expect(() =>
      CatalogoDetalle.crear({ id: "det-4", idCatalogoGRD: "cat-1", codigo: "SIS", valor: "" })
    ).toThrow(ValidationError);
  });
});

describe("CatalogoDetalle.editar", () => {
  it("[positivo] actualiza el valor", () => {
    const d = CatalogoDetalle.crear({
      id: "det-5",
      idCatalogoGRD: "cat-1",
      codigo: "SIS",
      valor: "Sismo",
    });
    d.editar("Terremoto", "Sismo de gran magnitud");
    expect(d.snapshot.valor).toBe("Terremoto");
    expect(d.snapshot.descripcion).toBe("Sismo de gran magnitud");
  });

  it("[negativo] lanza ValidationError cuando el nuevo valor está vacío", () => {
    const d = CatalogoDetalle.crear({
      id: "det-6",
      idCatalogoGRD: "cat-1",
      codigo: "SIS",
      valor: "Sismo",
    });
    expect(() => d.editar("")).toThrow(ValidationError);
  });
});

describe("CatalogoDetalle.toggle", () => {
  it("[positivo] cambia de ACTIVO a INACTIVO", () => {
    const d = CatalogoDetalle.crear({
      id: "det-7",
      idCatalogoGRD: "cat-1",
      codigo: "SIS",
      valor: "Sismo",
    });
    d.toggle();
    expect(d.snapshot.estado).toBe("INACTIVO");
  });

  it("[positivo] cambia de INACTIVO a ACTIVO", () => {
    const d = CatalogoDetalle.desdePersistencia({
      id: "det-8",
      idCatalogoGRD: "cat-1",
      codigo: "SIS",
      valor: "Sismo",
      estado: "INACTIVO",
    });
    d.toggle();
    expect(d.snapshot.estado).toBe("ACTIVO");
  });
});
