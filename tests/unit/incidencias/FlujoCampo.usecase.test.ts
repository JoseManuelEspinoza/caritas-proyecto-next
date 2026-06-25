import { describe, it, expect, vi } from "vitest";
import {
  AsignarBrigadistaUseCase,
  AsignarEquipoUseCase,
  AutoasignarmeUseCase,
  AgregarPersonaUseCase,
  AgregarEvidenciasUseCase,
  RegistrarLevantamientoUseCase,
  GenerarInformeEvaluacionUseCase,
  CorregirYReenviarUseCase,
} from "@/core/application/use-cases/incidencias/FlujoCampo.usecase";
import { IIncidenciaRepository } from "@/core/domain/repositories/IIncidenciaRepository";
import { Incidencia } from "@/core/domain/entities/incidencia/Incidencia";
import { NotFoundError, BusinessRuleError } from "@/core/domain/errors/DomainError";

function makeRepo(overrides: Partial<IIncidenciaRepository> = {}): IIncidenciaRepository {
  return {
    nextCodigo: vi.fn().mockResolvedValue("GRD-2026-0001"),
    crear: vi.fn().mockResolvedValue("inc-uuid"),
    findById: vi.fn().mockResolvedValue(null),
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

const INFO_CAMPO = {
  fechaVisita: "2026-06-01",
  responsable: "usuario-1",
  descripcionEvento: "Descripción del campo",
  nivelVulnerabilidad: "ALTO",
  necesidadesPrioritarias: ["ALIMENTOS"],
  recomendacion: "Evacuar inmediatamente",
  condHabitabilidad: {},
};

const INFORME_EVALUACION = {
  analisisSituacion: "Análisis completo",
  hallazgosTexto: "Se encontraron daños",
  conclusiones: "Requiere intervención",
  nivelUrgencia: "ALTO",
  tipoIntervencion: "EMERGENCIA",
  recomendacionComite: "Aprobar solicitud",
};

// ---------------------------------------------------------------------------
// AsignarBrigadistaUseCase
// ---------------------------------------------------------------------------
describe("AsignarBrigadistaUseCase", () => {
  it("[positivo] asigna brigadista y transiciona ABIERTO → ASIGNADO", async () => {
    const inc = Incidencia.crear({ id: "inc-1" });
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(inc) });

    await new AsignarBrigadistaUseCase(repo).execute("inc-1", "brigadista-1");

    expect(repo.registrarAsignacion).toHaveBeenCalledOnce();
    expect(repo.guardarTransicion).toHaveBeenCalledOnce();
    expect(inc.estadoActual).toBe("ASIGNADO");
  });

  it("[borde] no transiciona si ya está ASIGNADO (solo registra la asignación)", async () => {
    const inc = Incidencia.desdePersistencia({ id: "inc-2", estadoActual: "ASIGNADO" });
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(inc) });

    await new AsignarBrigadistaUseCase(repo).execute("inc-2", "brigadista-2");

    expect(repo.registrarAsignacion).toHaveBeenCalledOnce();
    expect(repo.guardarTransicion).not.toHaveBeenCalled();
    expect(inc.estadoActual).toBe("ASIGNADO");
  });

  it("[negativo] lanza NotFoundError cuando el incidente no existe", async () => {
    const repo = makeRepo();
    await expect(
      new AsignarBrigadistaUseCase(repo).execute("no-existe", "brigadista-1")
    ).rejects.toThrow(NotFoundError);
  });
});

// ---------------------------------------------------------------------------
// AsignarEquipoUseCase
// ---------------------------------------------------------------------------
describe("AsignarEquipoUseCase", () => {
  it("[positivo] asigna equipo y transiciona ABIERTO → ASIGNADO", async () => {
    const inc = Incidencia.crear({ id: "inc-eq-1" });
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(inc) });

    await new AsignarEquipoUseCase(repo).execute("inc-eq-1", "responsable-1", ["brig-1", "brig-2"]);

    expect(repo.asignarEquipo).toHaveBeenCalledOnce();
    expect(repo.guardarTransicion).toHaveBeenCalledOnce();
    expect(inc.estadoActual).toBe("ASIGNADO");
  });

  it("[borde] no transiciona si ya está ASIGNADO (solo actualiza equipo)", async () => {
    const inc = Incidencia.desdePersistencia({ id: "inc-eq-2", estadoActual: "ASIGNADO" });
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(inc) });

    await new AsignarEquipoUseCase(repo).execute("inc-eq-2", "responsable-1", []);

    expect(repo.asignarEquipo).toHaveBeenCalledOnce();
    expect(repo.guardarTransicion).not.toHaveBeenCalled();
    expect(inc.estadoActual).toBe("ASIGNADO");
  });

  it("[negativo] lanza NotFoundError cuando el incidente no existe", async () => {
    const repo = makeRepo();
    await expect(
      new AsignarEquipoUseCase(repo).execute("no-existe", "responsable-1", [])
    ).rejects.toThrow(NotFoundError);
  });
});

// ---------------------------------------------------------------------------
// AutoasignarmeUseCase
// ---------------------------------------------------------------------------
describe("AutoasignarmeUseCase", () => {
  it("[positivo] autoasigna y transiciona ABIERTO → ASIGNADO", async () => {
    const inc = Incidencia.crear({ id: "inc-3" });
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(inc) });

    await new AutoasignarmeUseCase(repo).execute("inc-3", "usuario-grd-1");

    expect(repo.asignarResponsable).toHaveBeenCalledOnce();
    expect(inc.estadoActual).toBe("ASIGNADO");
  });

  it("[borde] no transiciona si ya está ASIGNADO (solo actualiza responsable)", async () => {
    const inc = Incidencia.desdePersistencia({ id: "inc-3b", estadoActual: "ASIGNADO" });
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(inc) });

    await new AutoasignarmeUseCase(repo).execute("inc-3b", "usuario-grd-1");

    expect(repo.asignarResponsable).toHaveBeenCalledOnce();
    expect(repo.guardarTransicion).not.toHaveBeenCalled();
    expect(inc.estadoActual).toBe("ASIGNADO");
  });

  it("[negativo] lanza NotFoundError cuando el incidente no existe", async () => {
    const repo = makeRepo();
    await expect(
      new AutoasignarmeUseCase(repo).execute("no-existe", "usuario-grd-1")
    ).rejects.toThrow(NotFoundError);
  });
});

// ---------------------------------------------------------------------------
// AgregarPersonaUseCase
// ---------------------------------------------------------------------------
describe("AgregarPersonaUseCase", () => {
  it("[positivo] agrega persona afectada a incidencia existente", async () => {
    const inc = Incidencia.desdePersistencia({ id: "inc-p-1", estadoActual: "ASIGNADO" });
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(inc) });

    await new AgregarPersonaUseCase(repo).execute("inc-p-1", { nombres: "Juan" });

    expect(repo.agregarPersona).toHaveBeenCalledOnce();
    expect(repo.agregarPersona).toHaveBeenCalledWith("inc-p-1", { nombres: "Juan" });
  });

  it("[negativo] lanza NotFoundError cuando el incidente no existe", async () => {
    const repo = makeRepo();
    await expect(
      new AgregarPersonaUseCase(repo).execute("no-existe", { nombres: "Juan" })
    ).rejects.toThrow(NotFoundError);
  });
});

// ---------------------------------------------------------------------------
// AgregarEvidenciasUseCase
// ---------------------------------------------------------------------------
describe("AgregarEvidenciasUseCase", () => {
  it("[positivo] persiste evidencias en incidencia existente", async () => {
    const inc = Incidencia.desdePersistencia({ id: "inc-ev-1", estadoActual: "ASIGNADO" });
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(inc) });
    const evidencias = [
      { key: "s3/foto1.jpg", nombreArchivo: "foto1.jpg", formato: "jpg", tamano: 1024, descripcion: null },
    ];

    await new AgregarEvidenciasUseCase(repo).execute("inc-ev-1", "usuario-grd-1", evidencias);

    expect(repo.guardarEvidencias).toHaveBeenCalledOnce();
    expect(repo.guardarEvidencias).toHaveBeenCalledWith("inc-ev-1", "usuario-grd-1", evidencias);
  });

  it("[negativo] lanza NotFoundError cuando el incidente no existe", async () => {
    const repo = makeRepo();
    await expect(
      new AgregarEvidenciasUseCase(repo).execute("no-existe", "usuario-grd-1", [])
    ).rejects.toThrow(NotFoundError);
  });
});

// ---------------------------------------------------------------------------
// RegistrarLevantamientoUseCase
// ---------------------------------------------------------------------------
describe("RegistrarLevantamientoUseCase", () => {
  it("[positivo] transiciona ASIGNADO → DATA RECOPILADA y guarda informe", async () => {
    const inc = Incidencia.desdePersistencia({ id: "inc-4", estadoActual: "ASIGNADO" });
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(inc) });

    await new RegistrarLevantamientoUseCase(repo).execute("inc-4", INFO_CAMPO, "usuario-1");

    expect(inc.estadoActual).toBe("DATA RECOPILADA");
    expect(repo.guardarInforme).toHaveBeenCalledOnce();
    expect(repo.guardarTransicion).toHaveBeenCalledOnce();
  });

  it("[negativo] lanza BusinessRuleError si el incidente no está ASIGNADO", async () => {
    const inc = Incidencia.crear({ id: "inc-5" });
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(inc) });

    await expect(
      new RegistrarLevantamientoUseCase(repo).execute("inc-5", INFO_CAMPO, "usuario-1")
    ).rejects.toThrow(BusinessRuleError);
  });

  it("[negativo] lanza NotFoundError cuando el incidente no existe", async () => {
    const repo = makeRepo();
    await expect(
      new RegistrarLevantamientoUseCase(repo).execute("no-existe", INFO_CAMPO, "usuario-1")
    ).rejects.toThrow(NotFoundError);
  });
});

// ---------------------------------------------------------------------------
// GenerarInformeEvaluacionUseCase
// ---------------------------------------------------------------------------
describe("GenerarInformeEvaluacionUseCase", () => {
  it("[positivo] transiciona DATA RECOPILADA → EN EVALUACION", async () => {
    const inc = Incidencia.desdePersistencia({ id: "inc-6", estadoActual: "DATA RECOPILADA" });
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(inc) });

    await new GenerarInformeEvaluacionUseCase(repo).execute(
      "inc-6",
      INFORME_EVALUACION,
      "usuario-1"
    );

    expect(inc.estadoActual).toBe("EN EVALUACION");
    expect(repo.guardarInforme).toHaveBeenCalledOnce();
    expect(repo.upsertSolicitudEnEvaluacion).toHaveBeenCalledOnce();
  });

  it("[negativo] lanza NotFoundError cuando el incidente no existe", async () => {
    const repo = makeRepo();
    await expect(
      new GenerarInformeEvaluacionUseCase(repo).execute(
        "no-existe",
        INFORME_EVALUACION,
        "usuario-1"
      )
    ).rejects.toThrow(NotFoundError);
  });
});

// ---------------------------------------------------------------------------
// CorregirYReenviarUseCase
// ---------------------------------------------------------------------------
describe("CorregirYReenviarUseCase", () => {
  it("[positivo] transiciona OBSERVADO → EN EVALUACION", async () => {
    const inc = Incidencia.desdePersistencia({ id: "inc-7", estadoActual: "OBSERVADO" });
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(inc) });

    await new CorregirYReenviarUseCase(repo).execute(
      "inc-7",
      {
        analisisSituacion: "Nuevo análisis",
        hallazgosTexto: "Nuevos hallazgos",
        conclusiones: "Nuevas conclusiones",
        recomendacionComite: "Aprobar",
      },
      "usuario-1"
    );

    expect(inc.estadoActual).toBe("EN EVALUACION");
    expect(repo.resolverSolicitud).toHaveBeenCalledWith("inc-7", "EN_EVALUACION");
  });

  it("[negativo] lanza NotFoundError cuando el incidente no existe", async () => {
    const repo = makeRepo();
    await expect(
      new CorregirYReenviarUseCase(repo).execute(
        "no-existe",
        {
          analisisSituacion: "x",
          hallazgosTexto: "x",
          conclusiones: "x",
          recomendacionComite: "x",
        },
        "usuario-1"
      )
    ).rejects.toThrow(NotFoundError);
  });

  it("[borde] ejecuta abrirRonda cuando se proporciona", async () => {
    const inc = Incidencia.desdePersistencia({ id: "inc-corr-2", estadoActual: "OBSERVADO" });
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(inc) });
    const abrirRonda = { execute: vi.fn().mockResolvedValue(undefined) } as any;

    await new CorregirYReenviarUseCase(repo, abrirRonda).execute(
      "inc-corr-2",
      { analisisSituacion: "Nuevo análisis completo", hallazgosTexto: "Hallazgos", conclusiones: "OK", recomendacionComite: "Aprobar" },
      "usuario-1"
    );

    expect(abrirRonda.execute).toHaveBeenCalledWith("inc-corr-2");
  });
});

// ---------------------------------------------------------------------------
// GenerarInformeEvaluacionUseCase — rama abrirRonda
// ---------------------------------------------------------------------------
describe("GenerarInformeEvaluacionUseCase — con abrirRonda", () => {
  it("[borde] ejecuta abrirRonda cuando se proporciona", async () => {
    const inc = Incidencia.desdePersistencia({ id: "inc-inf-2", estadoActual: "DATA RECOPILADA" });
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(inc) });
    const abrirRonda = { execute: vi.fn().mockResolvedValue(undefined) } as any;

    await new GenerarInformeEvaluacionUseCase(repo, abrirRonda).execute(
      "inc-inf-2",
      INFORME_EVALUACION,
      "usuario-1"
    );

    expect(abrirRonda.execute).toHaveBeenCalledWith("inc-inf-2");
    expect(inc.estadoActual).toBe("EN EVALUACION");
  });
});
