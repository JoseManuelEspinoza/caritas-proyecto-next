import { describe, it, expect, vi } from "vitest";
import {
  RegistrarIncidenciaUseCase,
  ActualizarIncidenciaUseCase,
} from "@/core/application/use-cases/incidencias/RegistrarYActualizar.usecase";
import { IIncidenciaRepository } from "@/core/domain/repositories/IIncidenciaRepository";
import { Incidencia } from "@/core/domain/entities/incidencia/Incidencia";
import {
  ValidationError,
  NotFoundError,
  BusinessRuleError,
} from "@/core/domain/errors/DomainError";
import { CreateIncidenteData } from "@/core/application/dtos/IncidenciaDTO";

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
    agregarPersona: vi.fn().mockResolvedValue(undefined),
    guardarEvidencias: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

const INPUT_VALIDO: CreateIncidenteData = {
  reportaDni: "12345678",
  reportaNombre: "Juan Pérez",
  reportaTel: "999111222",
  reportaRol: "VECINO",
  fechaReporte: "2026-06-01",
  fechaSuceso: "2026-06-01",
  horaSuceso: "10:00",
  categoria: "SISMO",
  pais: "Perú",
  region: "Lima",
  distrito: "Miraflores",
  parroquia: "parroquia-1",
  direccion: "Av. Principal 123",
  referencia: "Frente al parque",
  descripcion: "Descripción del evento",
  causa: "Natural",
  familias: [],
  personas: [],
  necesidades: [],
  necesidadOtra: "",
  necesidadesObs: "",
  nivelAfectacion: "MODERADO",
};

// ---------------------------------------------------------------------------
// RegistrarIncidenciaUseCase
// ---------------------------------------------------------------------------
describe("RegistrarIncidenciaUseCase", () => {
  it("[positivo] llama a nextCodigo y crear, devuelve el id", async () => {
    const repo = makeRepo();
    const result = await new RegistrarIncidenciaUseCase(repo).execute(INPUT_VALIDO);

    expect(repo.nextCodigo).toHaveBeenCalledOnce();
    expect(repo.crear).toHaveBeenCalledOnce();
    expect(result).toBe("inc-uuid");
  });

  it("[negativo] lanza ValidationError cuando reportaNombre está vacío", async () => {
    const repo = makeRepo();
    await expect(
      new RegistrarIncidenciaUseCase(repo).execute({ ...INPUT_VALIDO, reportaNombre: "" })
    ).rejects.toThrow(ValidationError);
  });

  it("[negativo] lanza ValidationError cuando reportaDni está vacío", async () => {
    const repo = makeRepo();
    await expect(
      new RegistrarIncidenciaUseCase(repo).execute({ ...INPUT_VALIDO, reportaDni: "" })
    ).rejects.toThrow(ValidationError);
  });

  it("[negativo] lanza ValidationError cuando reportaTel está vacío", async () => {
    const repo = makeRepo();
    await expect(
      new RegistrarIncidenciaUseCase(repo).execute({ ...INPUT_VALIDO, reportaTel: "" })
    ).rejects.toThrow(ValidationError);
  });

  it("[negativo] lanza ValidationError cuando reportaRol no está definido", async () => {
    const repo = makeRepo();
    await expect(
      new RegistrarIncidenciaUseCase(repo).execute({ ...INPUT_VALIDO, reportaRol: "" })
    ).rejects.toThrow(ValidationError);
  });

  it("[negativo] lanza ValidationError cuando categoria está vacía", async () => {
    const repo = makeRepo();
    await expect(
      new RegistrarIncidenciaUseCase(repo).execute({ ...INPUT_VALIDO, categoria: "" })
    ).rejects.toThrow(ValidationError);
  });

  it("[negativo] lanza ValidationError cuando fechaSuceso está vacía", async () => {
    const repo = makeRepo();
    await expect(
      new RegistrarIncidenciaUseCase(repo).execute({ ...INPUT_VALIDO, fechaSuceso: "" })
    ).rejects.toThrow(ValidationError);
  });

  it("[negativo] lanza ValidationError cuando fechaSuceso tiene formato inválido", async () => {
    const repo = makeRepo();
    await expect(
      new RegistrarIncidenciaUseCase(repo).execute({ ...INPUT_VALIDO, fechaSuceso: "no-es-fecha" })
    ).rejects.toThrow(ValidationError);
  });

  it("[negativo] lanza ValidationError cuando fechaSuceso es futura", async () => {
    const repo = makeRepo();
    await expect(
      new RegistrarIncidenciaUseCase(repo).execute({ ...INPUT_VALIDO, fechaSuceso: "2099-01-01" })
    ).rejects.toThrow(ValidationError);
  });

  it("[negativo] lanza ValidationError cuando lat está fuera de rango", async () => {
    const repo = makeRepo();
    await expect(
      new RegistrarIncidenciaUseCase(repo).execute({ ...INPUT_VALIDO, lat: 91 })
    ).rejects.toThrow(ValidationError);
  });

  it("[negativo] lanza ValidationError cuando lng está fuera de rango", async () => {
    const repo = makeRepo();
    await expect(
      new RegistrarIncidenciaUseCase(repo).execute({ ...INPUT_VALIDO, lng: 181 })
    ).rejects.toThrow(ValidationError);
  });

  it("[negativo] lanza ValidationError cuando reportaDni no tiene 8 dígitos", async () => {
    const repo = makeRepo();
    await expect(
      new RegistrarIncidenciaUseCase(repo).execute({ ...INPUT_VALIDO, reportaDni: "1234567" })
    ).rejects.toThrow(ValidationError);
  });

  it("[negativo] lanza ValidationError cuando reportaNombre tiene menos de 5 caracteres", async () => {
    const repo = makeRepo();
    await expect(
      new RegistrarIncidenciaUseCase(repo).execute({ ...INPUT_VALIDO, reportaNombre: "Ana" })
    ).rejects.toThrow(ValidationError);
  });

  it("[negativo] lanza ValidationError cuando celular extranjero tiene longitud inválida", async () => {
    const repo = makeRepo();
    await expect(
      new RegistrarIncidenciaUseCase(repo).execute({ ...INPUT_VALIDO, reportaTel: "+1 123" })
    ).rejects.toThrow(ValidationError);
  });

  it("[negativo] lanza ValidationError cuando distrito está vacío", async () => {
    const repo = makeRepo();
    await expect(
      new RegistrarIncidenciaUseCase(repo).execute({ ...INPUT_VALIDO, distrito: "" })
    ).rejects.toThrow(ValidationError);
  });

  it("[negativo] lanza ValidationError cuando direccion está vacía", async () => {
    const repo = makeRepo();
    await expect(
      new RegistrarIncidenciaUseCase(repo).execute({ ...INPUT_VALIDO, direccion: "" })
    ).rejects.toThrow(ValidationError);
  });

  it("[negativo] lanza ValidationError cuando direccion tiene menos de 5 caracteres", async () => {
    const repo = makeRepo();
    await expect(
      new RegistrarIncidenciaUseCase(repo).execute({ ...INPUT_VALIDO, direccion: "Cal" })
    ).rejects.toThrow(ValidationError);
  });

  it("[negativo] lanza ValidationError cuando descripcion está vacía", async () => {
    const repo = makeRepo();
    await expect(
      new RegistrarIncidenciaUseCase(repo).execute({ ...INPUT_VALIDO, descripcion: "" })
    ).rejects.toThrow(ValidationError);
  });

  it("[negativo] lanza ValidationError cuando descripcion tiene menos de 10 caracteres", async () => {
    const repo = makeRepo();
    await expect(
      new RegistrarIncidenciaUseCase(repo).execute({ ...INPUT_VALIDO, descripcion: "Breve" })
    ).rejects.toThrow(ValidationError);
  });

  it("[negativo] lanza ValidationError cuando nivelAfectacion está vacío", async () => {
    const repo = makeRepo();
    await expect(
      new RegistrarIncidenciaUseCase(repo).execute({ ...INPUT_VALIDO, nivelAfectacion: "" })
    ).rejects.toThrow(ValidationError);
  });

  it("[negativo] lanza ValidationError cuando necesidades incluye 'Otros' sin necesidadOtra", async () => {
    const repo = makeRepo();
    await expect(
      new RegistrarIncidenciaUseCase(repo).execute({
        ...INPUT_VALIDO,
        necesidades: ["Otros"],
        necesidadOtra: "",
      })
    ).rejects.toThrow(ValidationError);
  });

  it("[borde] llama guardarEvidencias cuando hay evidencias y usuario de carga", async () => {
    const repo = makeRepo();
    await new RegistrarIncidenciaUseCase(repo).execute(
      {
        ...INPUT_VALIDO,
        evidencias: [{ key: "s3/foto.jpg", nombreArchivo: "foto.jpg", formato: "jpg", tamano: 512, descripcion: null }],
      },
      "usuario-grd-1"
    );

    expect(repo.guardarEvidencias).toHaveBeenCalledOnce();
  });

  it("[borde] acepta celular extranjero con longitud válida (cubre rama false de línea 58)", async () => {
    const repo = makeRepo();
    await expect(
      new RegistrarIncidenciaUseCase(repo).execute({
        ...INPUT_VALIDO,
        reportaTel: "+1 1234567",
      })
    ).resolves.toBe("inc-uuid");
  });

  it("[borde] reportaDni null activa la rama ?? '' y lanza ValidationError (línea 37)", async () => {
    const repo = makeRepo();
    await expect(
      new RegistrarIncidenciaUseCase(repo).execute({ ...INPUT_VALIDO, reportaDni: null as any })
    ).rejects.toThrow(ValidationError);
  });

  it("[borde] reportaTel null activa la rama ?? '' y lanza ValidationError (línea 39)", async () => {
    const repo = makeRepo();
    await expect(
      new RegistrarIncidenciaUseCase(repo).execute({ ...INPUT_VALIDO, reportaTel: null as any })
    ).rejects.toThrow(ValidationError);
  });
});

// ---------------------------------------------------------------------------
// ActualizarIncidenciaUseCase
// ---------------------------------------------------------------------------
describe("ActualizarIncidenciaUseCase", () => {
  it("[positivo] actualiza cuando el incidente está ABIERTO", async () => {
    const incidencia = Incidencia.crear({ id: "inc-1" });
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(incidencia) });

    await expect(
      new ActualizarIncidenciaUseCase(repo).execute("inc-1", INPUT_VALIDO)
    ).resolves.not.toThrow();
    expect(repo.actualizarDatos).toHaveBeenCalledOnce();
  });

  it("[negativo] lanza NotFoundError cuando el incidente no existe", async () => {
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(null) });
    await expect(
      new ActualizarIncidenciaUseCase(repo).execute("no-existe", INPUT_VALIDO)
    ).rejects.toThrow(NotFoundError);
  });

  it("[negativo] lanza BusinessRuleError cuando el incidente no está ABIERTO", async () => {
    const incidencia = Incidencia.desdePersistencia({ id: "inc-2", estadoActual: "ASIGNADO" });
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(incidencia) });

    await expect(
      new ActualizarIncidenciaUseCase(repo).execute("inc-2", INPUT_VALIDO)
    ).rejects.toThrow(BusinessRuleError);
  });

  it("[negativo] lanza ValidationError cuando categoria está vacía en actualización", async () => {
    const incidencia = Incidencia.crear({ id: "inc-3" });
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(incidencia) });

    await expect(
      new ActualizarIncidenciaUseCase(repo).execute("inc-3", { ...INPUT_VALIDO, categoria: "" })
    ).rejects.toThrow(ValidationError);
  });
});
