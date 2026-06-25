import { describe, it, expect, vi } from "vitest";
import { AbrirRondaVotacionUseCase } from "@/core/application/use-cases/comite-donaciones/AbrirRondaVotacion.usecase";
import { IComiteDonacionesRepository } from "@/core/domain/repositories/IComiteDonacionesRepository";
import { RondaVotacion } from "@/core/domain/entities/comite-donaciones/RondaVotacion";

function makeRepo(overrides: Partial<IComiteDonacionesRepository> = {}): IComiteDonacionesRepository {
  return {
    findRondaAbierta: vi.fn().mockResolvedValue(null),
    abrirRonda: vi.fn(),
    upsertVoto: vi.fn().mockResolvedValue(undefined),
    contarMiembrosActivos: vi.fn().mockResolvedValue(0),
    esMiembroActivo: vi.fn().mockResolvedValue(false),
    contarVotos: vi.fn().mockResolvedValue({ aFavor: 0, enContra: 0 }),
    cerrarRonda: vi.fn().mockResolvedValue(undefined),
    tally: vi.fn().mockResolvedValue(null),
    descontarInventarioAprobacion: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

const RONDA_ABIERTA: RondaVotacion = {
  idRonda: "ronda-1",
  idIncidencia: "inc-1",
  numeroRonda: 1,
  estado: "ABIERTA",
};

describe("AbrirRondaVotacionUseCase", () => {
  it("[positivo] crea una ronda nueva si no existe ninguna abierta", async () => {
    const repo = makeRepo({
      findRondaAbierta: vi.fn().mockResolvedValue(null),
      abrirRonda: vi.fn().mockResolvedValue(RONDA_ABIERTA),
    });

    const result = await new AbrirRondaVotacionUseCase(repo).execute("inc-1");

    expect(repo.findRondaAbierta).toHaveBeenCalledWith("inc-1");
    expect(repo.abrirRonda).toHaveBeenCalledWith("inc-1");
    expect(result).toEqual(RONDA_ABIERTA);
  });

  it("[positivo] devuelve la ronda existente sin crear otra (idempotente)", async () => {
    const repo = makeRepo({
      findRondaAbierta: vi.fn().mockResolvedValue(RONDA_ABIERTA),
    });

    const result = await new AbrirRondaVotacionUseCase(repo).execute("inc-1");

    expect(repo.findRondaAbierta).toHaveBeenCalledWith("inc-1");
    expect(repo.abrirRonda).not.toHaveBeenCalled();
    expect(result).toEqual(RONDA_ABIERTA);
  });
});
