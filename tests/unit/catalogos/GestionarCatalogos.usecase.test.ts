import { describe, it, expect, vi } from "vitest";
import {
  CrearCatalogoUseCase,
  ListarCatalogosUseCase,
  ListarDetallesUseCase,
  AgregarDetalleUseCase,
  EditarDetalleUseCase,
  ToggleDetalleUseCase,
} from "@/core/application/use-cases/catalogos/GestionarCatalogos.usecase";
import { ICatalogoRepository } from "@/core/domain/repositories/ICatalogoRepository";
import { Catalogo, CatalogoDetalle } from "@/core/domain/entities/catalogo/Catalogo";
import { NotFoundError, ValidationError } from "@/core/domain/errors/DomainError";

function makeRepo(overrides: Partial<ICatalogoRepository> = {}): ICatalogoRepository {
  return {
    crearCatalogo: vi.fn().mockResolvedValue(undefined),
    findCatalogoById: vi.fn().mockResolvedValue(null),
    findAllCatalogos: vi.fn().mockResolvedValue([]),
    existsNombreCatalogo: vi.fn().mockResolvedValue(false),
    crearDetalle: vi.fn().mockResolvedValue(undefined),
    actualizarDetalle: vi.fn().mockResolvedValue(undefined),
    findDetalleById: vi.fn().mockResolvedValue(null),
    findDetallesByCatalogo: vi.fn().mockResolvedValue([]),
    existsCodigoEnCatalogo: vi.fn().mockResolvedValue(false),
    ...overrides,
  };
}

function catalogoActivo(id = "cat-1"): Catalogo {
  return Catalogo.crear({ id, nombreCatalogo: "Tipos de evento" });
}

function detalleActivo(id = "det-1"): CatalogoDetalle {
  return CatalogoDetalle.crear({ id, idCatalogoGRD: "cat-1", codigo: "SIS", valor: "Sismo" });
}

// ---------------------------------------------------------------------------
// CrearCatalogoUseCase
// ---------------------------------------------------------------------------
describe("CrearCatalogoUseCase", () => {
  it("[positivo] crea el catálogo cuando el nombre es único", async () => {
    const repo = makeRepo();
    const result = await new CrearCatalogoUseCase(repo).execute("Tipos de evento");

    expect(repo.crearCatalogo).toHaveBeenCalledOnce();
    expect(result.nombreCatalogo).toBe("Tipos de evento");
    expect(result.estado).toBe("ACTIVO");
  });

  it("[negativo] lanza ValidationError si ya existe un catálogo con ese nombre", async () => {
    const repo = makeRepo({ existsNombreCatalogo: vi.fn().mockResolvedValue(true) });
    await expect(new CrearCatalogoUseCase(repo).execute("Tipos de evento")).rejects.toThrow(
      ValidationError
    );
  });

  it("[negativo] lanza ValidationError si el nombre está vacío", async () => {
    const repo = makeRepo();
    await expect(new CrearCatalogoUseCase(repo).execute("")).rejects.toThrow(ValidationError);
  });
});

// ---------------------------------------------------------------------------
// ListarCatalogosUseCase
// ---------------------------------------------------------------------------
describe("ListarCatalogosUseCase", () => {
  it("[positivo] retorna la lista de catálogos", async () => {
    const catalogos = [catalogoActivo("c1"), catalogoActivo("c2")];
    const repo = makeRepo({ findAllCatalogos: vi.fn().mockResolvedValue(catalogos) });
    const result = await new ListarCatalogosUseCase(repo).execute();
    expect(result).toHaveLength(2);
  });

  it("[positivo] retorna array vacío cuando no hay catálogos", async () => {
    const repo = makeRepo();
    const result = await new ListarCatalogosUseCase(repo).execute();
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// ListarDetallesUseCase
// ---------------------------------------------------------------------------
describe("ListarDetallesUseCase", () => {
  it("[positivo] retorna los detalles de un catálogo", async () => {
    const detalles = [detalleActivo("d1"), detalleActivo("d2")];
    const repo = makeRepo({ findDetallesByCatalogo: vi.fn().mockResolvedValue(detalles) });
    const result = await new ListarDetallesUseCase(repo).execute("cat-1");
    expect(result).toHaveLength(2);
    expect(repo.findDetallesByCatalogo).toHaveBeenCalledWith("cat-1");
  });
});

// ---------------------------------------------------------------------------
// AgregarDetalleUseCase
// ---------------------------------------------------------------------------
describe("AgregarDetalleUseCase", () => {
  it("[positivo] agrega el detalle cuando el código es único en el catálogo", async () => {
    const catalogo = catalogoActivo();
    const repo = makeRepo({ findCatalogoById: vi.fn().mockResolvedValue(catalogo) });

    const result = await new AgregarDetalleUseCase(repo).execute({
      idCatalogoGRD: "cat-1",
      codigo: "SIS",
      valor: "Sismo",
    });

    expect(repo.crearDetalle).toHaveBeenCalledOnce();
    expect(result.codigo).toBe("SIS");
    expect(result.valor).toBe("Sismo");
    expect(result.estado).toBe("ACTIVO");
  });

  it("[negativo] lanza NotFoundError cuando el catálogo no existe", async () => {
    const repo = makeRepo();
    await expect(
      new AgregarDetalleUseCase(repo).execute({
        idCatalogoGRD: "no-existe",
        codigo: "SIS",
        valor: "Sismo",
      })
    ).rejects.toThrow(NotFoundError);
  });

  it("[negativo] lanza ValidationError si el código ya existe en el catálogo", async () => {
    const catalogo = catalogoActivo();
    const repo = makeRepo({
      findCatalogoById: vi.fn().mockResolvedValue(catalogo),
      existsCodigoEnCatalogo: vi.fn().mockResolvedValue(true),
    });
    await expect(
      new AgregarDetalleUseCase(repo).execute({
        idCatalogoGRD: "cat-1",
        codigo: "SIS",
        valor: "Sismo",
      })
    ).rejects.toThrow(ValidationError);
  });

  it("[negativo] lanza ValidationError si el código está vacío", async () => {
    const catalogo = catalogoActivo();
    const repo = makeRepo({ findCatalogoById: vi.fn().mockResolvedValue(catalogo) });
    await expect(
      new AgregarDetalleUseCase(repo).execute({
        idCatalogoGRD: "cat-1",
        codigo: "",
        valor: "Sismo",
      })
    ).rejects.toThrow(ValidationError);
  });
});

// ---------------------------------------------------------------------------
// EditarDetalleUseCase
// ---------------------------------------------------------------------------
describe("EditarDetalleUseCase", () => {
  it("[positivo] edita el valor del detalle", async () => {
    const detalle = detalleActivo();
    const repo = makeRepo({ findDetalleById: vi.fn().mockResolvedValue(detalle) });

    const result = await new EditarDetalleUseCase(repo).execute(
      "det-1",
      "Terremoto",
      "Sismo mayor"
    );

    expect(repo.actualizarDetalle).toHaveBeenCalledOnce();
    expect(result.valor).toBe("Terremoto");
    expect(result.descripcion).toBe("Sismo mayor");
  });

  it("[negativo] lanza NotFoundError cuando el detalle no existe", async () => {
    const repo = makeRepo();
    await expect(
      new EditarDetalleUseCase(repo).execute("no-existe", "Nuevo valor")
    ).rejects.toThrow(NotFoundError);
  });

  it("[negativo] lanza ValidationError si el nuevo valor está vacío", async () => {
    const detalle = detalleActivo();
    const repo = makeRepo({ findDetalleById: vi.fn().mockResolvedValue(detalle) });
    await expect(new EditarDetalleUseCase(repo).execute("det-1", "")).rejects.toThrow(
      ValidationError
    );
  });
});

// ---------------------------------------------------------------------------
// ToggleDetalleUseCase
// ---------------------------------------------------------------------------
describe("ToggleDetalleUseCase", () => {
  it("[positivo] cambia de ACTIVO a INACTIVO", async () => {
    const detalle = detalleActivo();
    const repo = makeRepo({ findDetalleById: vi.fn().mockResolvedValue(detalle) });

    const result = await new ToggleDetalleUseCase(repo).execute("det-1");

    expect(result.estado).toBe("INACTIVO");
    expect(repo.actualizarDetalle).toHaveBeenCalledOnce();
  });

  it("[positivo] cambia de INACTIVO a ACTIVO", async () => {
    const detalle = CatalogoDetalle.desdePersistencia({
      id: "det-2",
      idCatalogoGRD: "cat-1",
      codigo: "SIS",
      valor: "Sismo",
      estado: "INACTIVO",
    });
    const repo = makeRepo({ findDetalleById: vi.fn().mockResolvedValue(detalle) });

    const result = await new ToggleDetalleUseCase(repo).execute("det-2");

    expect(result.estado).toBe("ACTIVO");
  });

  it("[negativo] lanza NotFoundError cuando el detalle no existe", async () => {
    const repo = makeRepo();
    await expect(new ToggleDetalleUseCase(repo).execute("no-existe")).rejects.toThrow(
      NotFoundError
    );
  });
});
