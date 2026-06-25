import { describe, it, expect, vi } from "vitest";
import { ObservarCasoComiteUseCase } from "@/core/application/use-cases/comite-donaciones/ObservarCasoComite.usecase";
import { IComiteDonacionesRepository } from "@/core/domain/repositories/IComiteDonacionesRepository";
import { IIncidenciaRepository } from "@/core/domain/repositories/IIncidenciaRepository";
import { Incidencia } from "@/core/domain/entities/incidencia/Incidencia";
import { RondaVotacion } from "@/core/domain/entities/comite-donaciones/RondaVotacion";
import { BusinessRuleError, NotFoundError, ValidationError } from "@/core/domain/errors/DomainError";

const RONDA: RondaVotacion = {
  idRonda: "ronda-1",
  idIncidencia: "inc-1",
  numeroRonda: 1,
  estado: "ABIERTA",
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
    contarVotos: vi.fn().mockResolvedValue({ aFavor: 0, enContra: 0 }),
    cerrarRonda: vi.fn().mockResolvedValue(undefined),
    tally: vi.fn().mockResolvedValue(null),
    descontarInventarioAprobacion: vi.fn().mockResolvedValue(undefined),
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
    marcarBrigadistasEnCampo: vi.fn().mockResolvedValue(undefined),
    marcarBrigadistasDisponibles: vi.fn().mockResolvedValue(undefined),
    agregarPersona: vi.fn().mockResolvedValue(undefined),
    guardarEvidencias: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("ObservarCasoComiteUseCase", () => {
  it("[positivo] cierra la ronda como OBSERVADA y devuelve el caso al GRD", async () => {
    const comite = makeComite();
    const incidencias = makeIncidencias();

    await new ObservarCasoComiteUseCase(comite, incidencias).execute(
      "inc-1",
      "usuario-grd-1",
      "Falta documentación de daños"
    );

    expect(comite.cerrarRonda).toHaveBeenCalledWith(
      "ronda-1",
      expect.objectContaining({ estado: "CERRADA_OBSERVADA" })
    );
    expect(incidencias.resolverSolicitud).toHaveBeenCalledWith(
      "inc-1",
      "EN_EVALUACION",
      "Falta documentación de daños"
    );
    expect(incidencias.guardarTransicion).toHaveBeenCalledOnce();
  });

  it("[negativo] lanza NotFoundError cuando la incidencia no existe", async () => {
    const comite = makeComite();
    const incidencias = makeIncidencias({ findById: vi.fn().mockResolvedValue(null) });

    await expect(
      new ObservarCasoComiteUseCase(comite, incidencias).execute("no-existe", "usuario-1", "Falta info")
    ).rejects.toThrow(NotFoundError);
  });

  it("[negativo] lanza ValidationError si las observaciones están vacías", async () => {
    const comite = makeComite();
    const incidencias = makeIncidencias();

    await expect(
      new ObservarCasoComiteUseCase(comite, incidencias).execute("inc-1", "usuario-1", "")
    ).rejects.toThrow(ValidationError);
  });

  it("[negativo] lanza ValidationError si las observaciones son solo espacios", async () => {
    const comite = makeComite();
    const incidencias = makeIncidencias();

    await expect(
      new ObservarCasoComiteUseCase(comite, incidencias).execute("inc-1", "usuario-1", "   ")
    ).rejects.toThrow(ValidationError);
  });

  it("[negativo] lanza BusinessRuleError si el usuario no es miembro activo", async () => {
    const comite = makeComite({ esMiembroActivo: vi.fn().mockResolvedValue(false) });
    const incidencias = makeIncidencias();

    await expect(
      new ObservarCasoComiteUseCase(comite, incidencias).execute("inc-1", "usuario-externo", "Observación válida")
    ).rejects.toThrow(BusinessRuleError);
  });

  it("[negativo] lanza BusinessRuleError si no hay ronda abierta", async () => {
    const comite = makeComite({ findRondaAbierta: vi.fn().mockResolvedValue(null) });
    const incidencias = makeIncidencias();

    await expect(
      new ObservarCasoComiteUseCase(comite, incidencias).execute("inc-1", "usuario-grd-1", "Sin ronda activa")
    ).rejects.toThrow(BusinessRuleError);
  });

  it("[borde] umbral es 0 cuando no hay miembros activos (cubre rama false de n > 0)", async () => {
    const comite = makeComite({ contarMiembrosActivos: vi.fn().mockResolvedValue(0) });
    const incidencias = makeIncidencias();

    await new ObservarCasoComiteUseCase(comite, incidencias).execute(
      "inc-1",
      "usuario-grd-1",
      "Observación válida con umbral cero"
    );

    expect(comite.cerrarRonda).toHaveBeenCalledWith(
      "ronda-1",
      expect.objectContaining({ umbralSnapshot: 0 })
    );
  });
});
