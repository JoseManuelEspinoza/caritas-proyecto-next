import { describe, it, expect, vi } from "vitest";
import {
  AsignarBrigadistaUseCase,
  RegistrarLevantamientoUseCase,
  GenerarInformeEvaluacionUseCase,
} from "@/core/application/use-cases/incidencias/FlujoCampo.usecase";
import {
  RegistrarAtencionUseCase,
  IniciarSeguimientoUseCase,
  CerrarCasoUseCase,
} from "@/core/application/use-cases/incidencias/AtencionYCierre.usecase";
import { IIncidenciaRepository } from "@/core/domain/repositories/IIncidenciaRepository";
import { Incidencia } from "@/core/domain/entities/incidencia/Incidencia";

// RF44, RF45, RF46 — Auditoría: cada transición de estado debe registrar
// el estado anterior para que el sistema guarde quién/cuándo/desde dónde cambió.

function makeRepo(overrides: Partial<IIncidenciaRepository> = {}): IIncidenciaRepository {
  return {
    nextCodigo: vi.fn().mockResolvedValue("GRD-2026-0001"),
    crear: vi.fn().mockResolvedValue("inc-1"),
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

const LEVANTAMIENTO = {
  fechaVisita: "2026-06-01",
  responsable: "usr-1",
  descripcionEvento: "Descripción del levantamiento en campo",
  nivelVulnerabilidad: "ALTO",
  necesidadesPrioritarias: ["ALIMENTOS"],
  recomendacion: "Evacuar inmediatamente",
  condHabitabilidad: {},
};

const INFORME = {
  analisisSituacion: "Análisis completo de la situación",
  hallazgosTexto: "Se encontraron daños estructurales",
  conclusiones: "Requiere intervención urgente",
  nivelUrgencia: "ALTO",
  tipoIntervencion: "EMERGENCIA",
  recomendacionComite: "Aprobar solicitud de ayuda",
};

describe("Auditoría de transiciones (RF44, RF45, RF46)", () => {
  it("[positivo] ABIERTO → ASIGNADO: guardarTransicion recibe Incidencia con estadoAnterior=ABIERTO", async () => {
    const inc = Incidencia.crear({ id: "inc-1" });
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(inc) });

    await new AsignarBrigadistaUseCase(repo).execute("inc-1", "brigadista-1");

    const [[incidenciaGuardada]] = vi.mocked(repo.guardarTransicion).mock.calls;
    expect(incidenciaGuardada.estadoAnterior).toBe("ABIERTO");
    expect(incidenciaGuardada.estadoActual).toBe("ASIGNADO");
  });

  it("[positivo] ASIGNADO → DATA RECOPILADA: guardarTransicion recibe estadoAnterior=ASIGNADO", async () => {
    const inc = Incidencia.desdePersistencia({ id: "inc-2", estadoActual: "ASIGNADO" });
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(inc) });

    await new RegistrarLevantamientoUseCase(repo).execute("inc-2", LEVANTAMIENTO);

    const [[incidenciaGuardada]] = vi.mocked(repo.guardarTransicion).mock.calls;
    expect(incidenciaGuardada.estadoAnterior).toBe("ASIGNADO");
    expect(incidenciaGuardada.estadoActual).toBe("DATA RECOPILADA");
  });

  it("[positivo] DATA RECOPILADA → EN EVALUACION: guardarTransicion recibe estadoAnterior correcto", async () => {
    const inc = Incidencia.desdePersistencia({ id: "inc-3", estadoActual: "DATA RECOPILADA" });
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(inc) });

    await new GenerarInformeEvaluacionUseCase(repo).execute("inc-3", INFORME);

    const [[incidenciaGuardada]] = vi.mocked(repo.guardarTransicion).mock.calls;
    expect(incidenciaGuardada.estadoAnterior).toBe("DATA RECOPILADA");
    expect(incidenciaGuardada.estadoActual).toBe("EN EVALUACION");
  });

  it("[positivo] APROBADO → ATENDIDO: guardarTransicion recibe estadoAnterior=APROBADO", async () => {
    const inc = Incidencia.desdePersistencia({ id: "inc-4", estadoActual: "APROBADO" });
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(inc) });

    await new RegistrarAtencionUseCase(repo).execute("inc-4", {
      descripcionEntrega: "Kits entregados a 3 familias",
    });

    const [[incidenciaGuardada]] = vi.mocked(repo.guardarTransicion).mock.calls;
    expect(incidenciaGuardada.estadoAnterior).toBe("APROBADO");
    expect(incidenciaGuardada.estadoActual).toBe("ATENDIDO");
  });

  it("[positivo] ATENDIDO → SEGUIMIENTO ABIERTO: guardarTransicion recibe estadoAnterior=ATENDIDO", async () => {
    const inc = Incidencia.desdePersistencia({ id: "inc-5", estadoActual: "ATENDIDO" });
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(inc) });

    await new IniciarSeguimientoUseCase(repo).execute("inc-5");

    const [[incidenciaGuardada]] = vi.mocked(repo.guardarTransicion).mock.calls;
    expect(incidenciaGuardada.estadoAnterior).toBe("ATENDIDO");
    expect(incidenciaGuardada.estadoActual).toBe("SEGUIMIENTO ABIERTO");
  });

  it("[positivo] SEGUIMIENTO ABIERTO → CERRADO: guardarTransicion registra cierre final", async () => {
    const inc = Incidencia.desdePersistencia({ id: "inc-6", estadoActual: "SEGUIMIENTO ABIERTO" });
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(inc) });

    await new CerrarCasoUseCase(repo).execute("inc-6");

    const [[incidenciaGuardada]] = vi.mocked(repo.guardarTransicion).mock.calls;
    expect(incidenciaGuardada.estadoAnterior).toBe("SEGUIMIENTO ABIERTO");
    expect(incidenciaGuardada.estadoActual).toBe("CERRADO");
  });

  it("[borde] estadoAnterior es undefined antes de la primera transición", () => {
    const inc = Incidencia.crear({ id: "inc-7" });
    expect(inc.estadoAnterior).toBeUndefined();
  });
});
