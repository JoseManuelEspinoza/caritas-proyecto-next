import { describe, it, expect, vi } from "vitest";
import {
  CrearBrigadistaUseCase,
  ActualizarBrigadistaUseCase,
  ToggleEstadoBrigadistaUseCase,
  ToggleDisponibilidadUseCase,
  ListarBrigadistasUseCase,
} from "@/core/application/use-cases/brigadistas/GestionarBrigadistas.usecase";
import { IBrigadistaRepository } from "@/core/domain/repositories/IBrigadistaRepository";
import {
  BrigadistaParroquial,
  ESTADO,
  DISPONIBILIDAD,
} from "@/core/domain/entities/brigadista/BrigadistaParroquial";
import {
  ValidationError,
  NotFoundError,
  BusinessRuleError,
} from "@/core/domain/errors/DomainError";
import { BrigadistaInput } from "@/core/application/dtos/BrigadistaDTO";

// ---------------------------------------------------------------------------
// Mock del repositorio
// ---------------------------------------------------------------------------
function makeRepo(overrides: Partial<IBrigadistaRepository> = {}): IBrigadistaRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn().mockResolvedValue(null),
    findAll: vi.fn().mockResolvedValue([]),
    findIdByDni: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

const INPUT: BrigadistaInput = {
  nombres: "María",
  apellidos: "García",
  dni: "12345678",
  celular: "999888777",
  correo: "maria@example.com",
  idParroquia: "parroquia-1",
  disponibilidad: DISPONIBILIDAD.DISPONIBLE,
};

function brigadistaActivo(id = "uuid-1"): BrigadistaParroquial {
  return BrigadistaParroquial.crear({ id, idParroquia: "parroquia-1", nombres: "María" });
}

function brigadistaInactivo(id = "uuid-1"): BrigadistaParroquial {
  const b = brigadistaActivo(id);
  b.toggleEstado();
  return b;
}

// ---------------------------------------------------------------------------
// CrearBrigadistaUseCase
// ---------------------------------------------------------------------------
describe("CrearBrigadistaUseCase", () => {
  it("[positivo] crea y guarda el brigadista cuando el DNI no existe", async () => {
    const repo = makeRepo();
    const result = await new CrearBrigadistaUseCase(repo).execute(INPUT);

    expect(repo.save).toHaveBeenCalledOnce();
    expect(result.nombres).toBe("María");
    expect(result.estado).toBe(ESTADO.ACTIVO);
  });

  it("[positivo] el output incluye nombreCompleto compuesto", async () => {
    const repo = makeRepo();
    const result = await new CrearBrigadistaUseCase(repo).execute(INPUT);
    expect(result.nombreCompleto).toBe("María García");
  });

  it("[negativo] lanza ValidationError cuando el DNI ya pertenece a otro brigadista", async () => {
    const repo = makeRepo({ findIdByDni: vi.fn().mockResolvedValue("otro-uuid") });
    await expect(new CrearBrigadistaUseCase(repo).execute(INPUT)).rejects.toThrow(ValidationError);
  });

  it("[negativo] lanza ValidationError cuando nombres está vacío", async () => {
    const repo = makeRepo();
    await expect(
      new CrearBrigadistaUseCase(repo).execute({ ...INPUT, nombres: "" })
    ).rejects.toThrow(ValidationError);
  });

  it("[borde] omite la validación de DNI cuando el campo está vacío", async () => {
    const repo = makeRepo();
    const result = await new CrearBrigadistaUseCase(repo).execute({ ...INPUT, dni: "" });
    expect(repo.findIdByDni).not.toHaveBeenCalled();
    expect(result.dni).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// ActualizarBrigadistaUseCase
// ---------------------------------------------------------------------------
describe("ActualizarBrigadistaUseCase", () => {
  it("[positivo] actualiza los datos del brigadista existente", async () => {
    const brigadista = brigadistaActivo();
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(brigadista) });
    const result = await new ActualizarBrigadistaUseCase(repo).execute("uuid-1", {
      ...INPUT,
      nombres: "Ana",
      apellidos: "López",
    });

    expect(repo.update).toHaveBeenCalledOnce();
    expect(result.nombres).toBe("Ana");
  });

  it("[negativo] lanza NotFoundError cuando el brigadista no existe", async () => {
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(null) });
    await expect(new ActualizarBrigadistaUseCase(repo).execute("no-existe", INPUT)).rejects.toThrow(
      NotFoundError
    );
  });

  it("[negativo] lanza ValidationError cuando el DNI pertenece a otro brigadista", async () => {
    const brigadista = brigadistaActivo("uuid-1");
    const repo = makeRepo({
      findById: vi.fn().mockResolvedValue(brigadista),
      findIdByDni: vi.fn().mockResolvedValue("uuid-otro"),
    });
    await expect(new ActualizarBrigadistaUseCase(repo).execute("uuid-1", INPUT)).rejects.toThrow(
      ValidationError
    );
  });

  it("[borde] permite actualizar manteniendo el mismo DNI (el brigadista es su propio dueño)", async () => {
    const brigadista = brigadistaActivo("uuid-1");
    const repo = makeRepo({
      findById: vi.fn().mockResolvedValue(brigadista),
      findIdByDni: vi.fn().mockResolvedValue("uuid-1"),
    });
    await expect(
      new ActualizarBrigadistaUseCase(repo).execute("uuid-1", INPUT)
    ).resolves.not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// ToggleEstadoBrigadistaUseCase
// ---------------------------------------------------------------------------
describe("ToggleEstadoBrigadistaUseCase", () => {
  it("[positivo] cambia el estado de ACTIVO a INACTIVO", async () => {
    const brigadista = brigadistaActivo();
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(brigadista) });
    const result = await new ToggleEstadoBrigadistaUseCase(repo).execute("uuid-1");

    expect(result.estado).toBe(ESTADO.INACTIVO);
    expect(result.disponibilidad).toBe(DISPONIBILIDAD.NO_DISPONIBLE);
    expect(repo.update).toHaveBeenCalledOnce();
  });

  it("[positivo] cambia el estado de INACTIVO a ACTIVO", async () => {
    const brigadista = brigadistaInactivo();
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(brigadista) });
    const result = await new ToggleEstadoBrigadistaUseCase(repo).execute("uuid-1");

    expect(result.estado).toBe(ESTADO.ACTIVO);
  });

  it("[negativo] lanza NotFoundError cuando el brigadista no existe", async () => {
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(null) });
    await expect(new ToggleEstadoBrigadistaUseCase(repo).execute("no-existe")).rejects.toThrow(
      NotFoundError
    );
  });
});

// ---------------------------------------------------------------------------
// ToggleDisponibilidadUseCase
// ---------------------------------------------------------------------------
describe("ToggleDisponibilidadUseCase", () => {
  it("[positivo] cambia disponibilidad de DISPONIBLE a NO_DISPONIBLE", async () => {
    const brigadista = brigadistaActivo();
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(brigadista) });
    const result = await new ToggleDisponibilidadUseCase(repo).execute("uuid-1");

    expect(result.disponibilidad).toBe(DISPONIBILIDAD.NO_DISPONIBLE);
    expect(repo.update).toHaveBeenCalledOnce();
  });

  it("[negativo] lanza NotFoundError cuando el brigadista no existe", async () => {
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(null) });
    await expect(new ToggleDisponibilidadUseCase(repo).execute("no-existe")).rejects.toThrow(
      NotFoundError
    );
  });

  it("[negativo] lanza BusinessRuleError al intentar disponibilizar un brigadista INACTIVO", async () => {
    const brigadista = brigadistaInactivo();
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(brigadista) });
    await expect(new ToggleDisponibilidadUseCase(repo).execute("uuid-1")).rejects.toThrow(
      BusinessRuleError
    );
  });
});

// ---------------------------------------------------------------------------
// ListarBrigadistasUseCase
// ---------------------------------------------------------------------------
describe("ListarBrigadistasUseCase", () => {
  it("[positivo] retorna la lista de brigadistas como output", async () => {
    const lista = [brigadistaActivo("a"), brigadistaActivo("b")];
    const repo = makeRepo({ findAll: vi.fn().mockResolvedValue(lista) });
    const result = await new ListarBrigadistasUseCase(repo).execute();

    expect(result).toHaveLength(2);
    expect(result[0].estado).toBe(ESTADO.ACTIVO);
  });

  it("[positivo] retorna array vacío cuando no hay brigadistas", async () => {
    const repo = makeRepo({ findAll: vi.fn().mockResolvedValue([]) });
    const result = await new ListarBrigadistasUseCase(repo).execute();
    expect(result).toEqual([]);
  });
});
