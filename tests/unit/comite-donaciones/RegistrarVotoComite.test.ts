import { describe, it, expect, vi } from "vitest";
import { RegistrarVotoComiteUseCase } from "@/core/application/use-cases/comite-donaciones/RegistrarVotoComite.usecase";
import { IComiteDonacionesRepository } from "@/core/domain/repositories/IComiteDonacionesRepository";
import { IIncidenciaRepository } from "@/core/domain/repositories/IIncidenciaRepository";
import { Incidencia } from "@/core/domain/entities/incidencia/Incidencia";
import { RondaVotacion } from "@/core/domain/entities/comite-donaciones/RondaVotacion";
import { TallyRonda } from "@/core/domain/entities/comite-donaciones/VotoComite";
import { BusinessRuleError, NotFoundError } from "@/core/domain/errors/DomainError";

const RONDA: RondaVotacion = {
  idRonda: "ronda-1",
  idIncidencia: "inc-1",
  numeroRonda: 1,
  estado: "ABIERTA",
};

const TALLY_BASE: TallyRonda = {
  n: 3,
  umbral: 2,
  aFavor: 1,
  enContra: 0,
  pendientes: 2,
  votos: [],
};

function incidenciaEnEvaluacion(): Incidencia {
  return Incidencia.desdePersistencia({ id: "inc-1", estadoActual: "EN EVALUACION" });
}

function makeComite(overrides: Partial<IComiteDonacionesRepository> = {}): IComiteDonacionesRepository {
  return {
    findRondaAbierta: vi.fn().mockResolvedValue(RONDA),
    abrirRonda: vi.fn().mockResolvedValue(RONDA),
    upsertVoto: vi.fn().mockResolvedValue(undefined),
    contarMiembrosActivos: vi.fn().mockResolvedValue(3),
    esMiembroActivo: vi.fn().mockResolvedValue(true),
    contarVotos: vi.fn().mockResolvedValue({ aFavor: 1, enContra: 0 }),
    cerrarRonda: vi.fn().mockResolvedValue(undefined),
    tally: vi.fn().mockResolvedValue(TALLY_BASE),
    ...overrides,
  };
}

function makeIncidencias(overrides: Partial<IIncidenciaRepository> = {}): IIncidenciaRepository {
  return {
    nextCodigo: vi.fn().mockResolvedValue("GRD-2026-0001"),
    crear: vi.fn().mockResolvedValue("inc-1"),
    findById: vi.fn().mockResolvedValue(incidenciaEnEvaluacion()),
    actualizarDatos: vi.fn().mockResolvedValue(undefined),
    guardarTransicion: vi.fn().mockResolvedValue(undefined),
    registrarAsignacion: vi.fn().mockResolvedValue(undefined),
    asignarEquipo: vi.fn().mockResolvedValue(undefined),
    asignarResponsable: vi.fn().mockResolvedValue(undefined),
    guardarInforme: vi.fn().mockResolvedValue(undefined),
    upsertSolicitudEnEvaluacion: vi.fn().mockResolvedValue(undefined),
    resolverSolicitud: vi.fn().mockResolvedValue(undefined),
    registrarEntrega: vi.fn().mockResolvedValue(undefined),
    agregarSeguimiento: vi.fn().mockResolvedValue(undefined),
    liberarBrigadistas: vi.fn().mockResolvedValue(undefined),
    agregarPersona: vi.fn().mockResolvedValue(undefined),
    guardarEvidencias: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("RegistrarVotoComiteUseCase", () => {
  it("[positivo] registra el voto y devuelve EN_CURSO cuando el quórum no se ha alcanzado", async () => {
    const comite = makeComite({ contarVotos: vi.fn().mockResolvedValue({ aFavor: 1, enContra: 0 }) });
    const incidencias = makeIncidencias();

    const result = await new RegistrarVotoComiteUseCase(comite, incidencias).execute(
      "inc-1",
      "usuario-grd-1",
      "A_FAVOR"
    );

    expect(result.estado).toBe("EN_CURSO");
    expect(comite.upsertVoto).toHaveBeenCalledWith("ronda-1", "usuario-grd-1", "A_FAVOR");
  });

  it("[positivo] cierra la ronda como APROBADA cuando se alcanza el quórum", async () => {
    // n=3, umbral=2 → con 2 a favor se aprueba
    const comite = makeComite({ contarVotos: vi.fn().mockResolvedValue({ aFavor: 2, enContra: 0 }) });
    const incidencias = makeIncidencias();

    const result = await new RegistrarVotoComiteUseCase(comite, incidencias).execute(
      "inc-1",
      "usuario-grd-1",
      "A_FAVOR"
    );

    expect(result.estado).toBe("APROBADA");
    expect(comite.cerrarRonda).toHaveBeenCalledWith("ronda-1", expect.objectContaining({ estado: "CERRADA_APROBADA" }));
    expect(incidencias.resolverSolicitud).toHaveBeenCalledWith("inc-1", "APROBADA");
  });

  it("[positivo] cierra la ronda como RECHAZADA cuando el rechazo es matemáticamente definitivo", async () => {
    // n=3, umbral=2 → con 2 en contra ya no se puede llegar a 2 a favor
    const comite = makeComite({ contarVotos: vi.fn().mockResolvedValue({ aFavor: 0, enContra: 2 }) });
    const incidencias = makeIncidencias();

    const result = await new RegistrarVotoComiteUseCase(comite, incidencias).execute(
      "inc-1",
      "usuario-grd-1",
      "EN_CONTRA"
    );

    expect(result.estado).toBe("RECHAZADA");
    expect(comite.cerrarRonda).toHaveBeenCalledWith("ronda-1", expect.objectContaining({ estado: "CERRADA_RECHAZADA" }));
    expect(incidencias.resolverSolicitud).toHaveBeenCalledWith("inc-1", "RECHAZADA");
  });

  it("[negativo] lanza NotFoundError cuando la incidencia no existe", async () => {
    const comite = makeComite();
    const incidencias = makeIncidencias({ findById: vi.fn().mockResolvedValue(null) });

    await expect(
      new RegistrarVotoComiteUseCase(comite, incidencias).execute("no-existe", "usuario-1", "A_FAVOR")
    ).rejects.toThrow(NotFoundError);
  });

  it("[negativo] lanza BusinessRuleError si el usuario no es miembro activo", async () => {
    const comite = makeComite({ esMiembroActivo: vi.fn().mockResolvedValue(false) });
    const incidencias = makeIncidencias();

    await expect(
      new RegistrarVotoComiteUseCase(comite, incidencias).execute("inc-1", "usuario-externo", "A_FAVOR")
    ).rejects.toThrow(BusinessRuleError);
  });

  it("[negativo] lanza BusinessRuleError si no hay ronda abierta", async () => {
    const comite = makeComite({ findRondaAbierta: vi.fn().mockResolvedValue(null) });
    const incidencias = makeIncidencias();

    await expect(
      new RegistrarVotoComiteUseCase(comite, incidencias).execute("inc-1", "usuario-grd-1", "A_FAVOR")
    ).rejects.toThrow(BusinessRuleError);
  });
});
