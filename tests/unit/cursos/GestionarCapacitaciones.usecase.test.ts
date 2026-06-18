import { describe, it, expect, vi } from "vitest";
import {
  CrearCursoUseCase,
  ListarCursosUseCase,
  ListarInscripcionesUseCase,
  CambiarEstadoCursoUseCase,
  InscribirParticipanteUseCase,
  RegistrarEvaluacionUseCase,
  CertificarUseCase,
} from "@/core/application/use-cases/capacitaciones/GestionarCapacitaciones.usecase";
import { ICursoRepository, ParticipanteData } from "@/core/domain/repositories/ICursoRepository";
import { Curso } from "@/core/domain/entities/curso/Curso";
import {
  NotFoundError,
  ValidationError,
  BusinessRuleError,
} from "@/core/domain/errors/DomainError";

function makeRepo(overrides: Partial<ICursoRepository> = {}): ICursoRepository {
  return {
    nextCodigo: vi.fn().mockResolvedValue("CAP-2026-0001"),
    crearCurso: vi.fn().mockResolvedValue(undefined),
    actualizarCurso: vi.fn().mockResolvedValue(undefined),
    findCursoById: vi.fn().mockResolvedValue(null),
    findAllCursos: vi.fn().mockResolvedValue([]),
    findInscripciones: vi.fn().mockResolvedValue([]),
    upsertParticipante: vi.fn().mockResolvedValue("participante-1"),
    existsInscripcion: vi.fn().mockResolvedValue(false),
    crearInscripcion: vi.fn().mockResolvedValue("inscripcion-1"),
    existsInscripcionId: vi.fn().mockResolvedValue(false),
    crearEvaluacion: vi.fn().mockResolvedValue(undefined),
    tieneEvaluacionAprobada: vi.fn().mockResolvedValue(false),
    upsertCertificacion: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function cursoBorrador(id = "curso-1"): Curso {
  return Curso.crear({ id, idUsuarioResponsableGRD: "usuario-1", nombreCurso: "GRD Básico" });
}

function cursoPublicado(id = "curso-1"): Curso {
  const c = cursoBorrador(id);
  c.publicar();
  return c;
}

const PARTICIPANTE: ParticipanteData = { nombres: "Juan", apellidos: "Pérez" };
const INPUT = { idUsuarioResponsableGRD: "usuario-1", nombreCurso: "GRD Básico" };

// ---------------------------------------------------------------------------
// CrearCursoUseCase
// ---------------------------------------------------------------------------
describe("CrearCursoUseCase", () => {
  it("[positivo] crea el curso con código y estado BORRADOR", async () => {
    const repo = makeRepo();
    const result = await new CrearCursoUseCase(repo).execute(INPUT);

    expect(repo.crearCurso).toHaveBeenCalledOnce();
    expect(result.estadoCurso).toBe("BORRADOR");
    expect(result.codigoCurso).toBe("CAP-2026-0001");
  });

  it("[negativo] lanza ValidationError cuando idUsuarioResponsableGRD está vacío", async () => {
    const repo = makeRepo();
    await expect(
      new CrearCursoUseCase(repo).execute({ ...INPUT, idUsuarioResponsableGRD: "" })
    ).rejects.toThrow(ValidationError);
  });

  it("[negativo] lanza ValidationError cuando nombreCurso tiene menos de 3 caracteres", async () => {
    const repo = makeRepo();
    await expect(
      new CrearCursoUseCase(repo).execute({ ...INPUT, nombreCurso: "AB" })
    ).rejects.toThrow(ValidationError);
  });

  it("[negativo] lanza ValidationError cuando nombreCurso está vacío", async () => {
    const repo = makeRepo();
    await expect(
      new CrearCursoUseCase(repo).execute({ ...INPUT, nombreCurso: "" })
    ).rejects.toThrow(ValidationError);
  });
});

// ---------------------------------------------------------------------------
// ListarCursosUseCase
// ---------------------------------------------------------------------------
describe("ListarCursosUseCase", () => {
  it("[positivo] retorna la lista de cursos", async () => {
    const cursos = [cursoBorrador("c1"), cursoBorrador("c2")];
    const repo = makeRepo({ findAllCursos: vi.fn().mockResolvedValue(cursos) });
    const result = await new ListarCursosUseCase(repo).execute();
    expect(result).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// ListarInscripcionesUseCase
// ---------------------------------------------------------------------------
describe("ListarInscripcionesUseCase", () => {
  it("[positivo] delega al repositorio", async () => {
    const inscripciones = [
      {
        idInscripcion: "i1",
        participante: "Juan",
        estadoInscripcion: "ACTIVO",
        ultimaNota: null,
        resultado: null,
        certificado: false,
      },
    ];
    const repo = makeRepo({ findInscripciones: vi.fn().mockResolvedValue(inscripciones) });
    const result = await new ListarInscripcionesUseCase(repo).execute("curso-1");
    expect(result).toHaveLength(1);
    expect(repo.findInscripciones).toHaveBeenCalledWith("curso-1");
  });
});

// ---------------------------------------------------------------------------
// CambiarEstadoCursoUseCase
// ---------------------------------------------------------------------------
describe("CambiarEstadoCursoUseCase", () => {
  it("[positivo] PUBLICAR cambia estado a PUBLICADO", async () => {
    const curso = cursoBorrador();
    const repo = makeRepo({ findCursoById: vi.fn().mockResolvedValue(curso) });

    const result = await new CambiarEstadoCursoUseCase(repo).execute("curso-1", "PUBLICAR");

    expect(result.estadoCurso).toBe("PUBLICADO");
    expect(repo.actualizarCurso).toHaveBeenCalledOnce();
  });

  it("[positivo] CERRAR cambia estado a CERRADO", async () => {
    const curso = cursoPublicado();
    const repo = makeRepo({ findCursoById: vi.fn().mockResolvedValue(curso) });

    const result = await new CambiarEstadoCursoUseCase(repo).execute("curso-1", "CERRAR");

    expect(result.estadoCurso).toBe("CERRADO");
  });

  it("[negativo] lanza NotFoundError cuando el curso no existe", async () => {
    const repo = makeRepo();
    await expect(
      new CambiarEstadoCursoUseCase(repo).execute("no-existe", "PUBLICAR")
    ).rejects.toThrow(NotFoundError);
  });

  it("[negativo] lanza BusinessRuleError al PUBLICAR un curso ya PUBLICADO", async () => {
    const curso = cursoPublicado();
    const repo = makeRepo({ findCursoById: vi.fn().mockResolvedValue(curso) });
    await expect(
      new CambiarEstadoCursoUseCase(repo).execute("curso-1", "PUBLICAR")
    ).rejects.toThrow(BusinessRuleError);
  });
});

// ---------------------------------------------------------------------------
// InscribirParticipanteUseCase
// ---------------------------------------------------------------------------
describe("InscribirParticipanteUseCase", () => {
  it("[positivo] inscribe al participante en un curso PUBLICADO", async () => {
    const curso = cursoPublicado();
    const repo = makeRepo({ findCursoById: vi.fn().mockResolvedValue(curso) });

    const result = await new InscribirParticipanteUseCase(repo).execute("curso-1", PARTICIPANTE);

    expect(repo.upsertParticipante).toHaveBeenCalledOnce();
    expect(repo.crearInscripcion).toHaveBeenCalledOnce();
    expect(result.idInscripcion).toBe("inscripcion-1");
  });

  it("[negativo] lanza BusinessRuleError en curso no PUBLICADO", async () => {
    const curso = cursoBorrador();
    const repo = makeRepo({ findCursoById: vi.fn().mockResolvedValue(curso) });
    await expect(
      new InscribirParticipanteUseCase(repo).execute("curso-1", PARTICIPANTE)
    ).rejects.toThrow(BusinessRuleError);
  });

  it("[negativo] lanza ValidationError si el participante ya está inscrito", async () => {
    const curso = cursoPublicado();
    const repo = makeRepo({
      findCursoById: vi.fn().mockResolvedValue(curso),
      existsInscripcion: vi.fn().mockResolvedValue(true),
    });
    await expect(
      new InscribirParticipanteUseCase(repo).execute("curso-1", PARTICIPANTE)
    ).rejects.toThrow(ValidationError);
  });

  it("[negativo] lanza NotFoundError cuando el curso no existe", async () => {
    const repo = makeRepo();
    await expect(
      new InscribirParticipanteUseCase(repo).execute("no-existe", PARTICIPANTE)
    ).rejects.toThrow(NotFoundError);
  });
});

// ---------------------------------------------------------------------------
// RegistrarEvaluacionUseCase
// ---------------------------------------------------------------------------
describe("RegistrarEvaluacionUseCase", () => {
  it("[positivo] registra la evaluación y retorna APROBADO para nota >= 11", async () => {
    const repo = makeRepo({ existsInscripcionId: vi.fn().mockResolvedValue(true) });
    const result = await new RegistrarEvaluacionUseCase(repo).execute("inscripcion-1", 15);
    expect(result.resultado).toBe("APROBADO");
    expect(repo.crearEvaluacion).toHaveBeenCalledOnce();
  });

  it("[positivo] retorna DESAPROBADO para nota < 11", async () => {
    const repo = makeRepo({ existsInscripcionId: vi.fn().mockResolvedValue(true) });
    const result = await new RegistrarEvaluacionUseCase(repo).execute("inscripcion-1", 10);
    expect(result.resultado).toBe("DESAPROBADO");
  });

  it("[negativo] lanza ValidationError con nota fuera del rango 0-20", async () => {
    const repo = makeRepo();
    await expect(new RegistrarEvaluacionUseCase(repo).execute("inscripcion-1", 21)).rejects.toThrow(
      ValidationError
    );
  });

  it("[negativo] lanza ValidationError con nota negativa", async () => {
    const repo = makeRepo();
    await expect(new RegistrarEvaluacionUseCase(repo).execute("inscripcion-1", -1)).rejects.toThrow(
      ValidationError
    );
  });

  it("[negativo] lanza NotFoundError cuando la inscripción no existe", async () => {
    const repo = makeRepo({ existsInscripcionId: vi.fn().mockResolvedValue(false) });
    await expect(new RegistrarEvaluacionUseCase(repo).execute("no-existe", 15)).rejects.toThrow(
      NotFoundError
    );
  });
});

// ---------------------------------------------------------------------------
// CrearCursoUseCase — validación duracionEstimadaHoras
// ---------------------------------------------------------------------------
describe("CrearCursoUseCase — validación duracionEstimadaHoras", () => {
  it("[negativo] lanza ValidationError cuando duracion no es número finito", async () => {
    const repo = makeRepo();
    await expect(
      new CrearCursoUseCase(repo).execute({ ...INPUT, duracionEstimadaHoras: NaN })
    ).rejects.toThrow(ValidationError);
  });

  it("[negativo] lanza ValidationError cuando duracion no es entero", async () => {
    const repo = makeRepo();
    await expect(
      new CrearCursoUseCase(repo).execute({ ...INPUT, duracionEstimadaHoras: 1.5 })
    ).rejects.toThrow(ValidationError);
  });

  it("[negativo] lanza ValidationError cuando duracion es 0", async () => {
    const repo = makeRepo();
    await expect(
      new CrearCursoUseCase(repo).execute({ ...INPUT, duracionEstimadaHoras: 0 })
    ).rejects.toThrow(ValidationError);
  });

  it("[negativo] lanza ValidationError cuando duracion es negativa", async () => {
    const repo = makeRepo();
    await expect(
      new CrearCursoUseCase(repo).execute({ ...INPUT, duracionEstimadaHoras: -1 })
    ).rejects.toThrow(ValidationError);
  });

  it("[negativo] lanza ValidationError cuando descripcion tiene menos de 5 caracteres", async () => {
    const repo = makeRepo();
    await expect(
      new CrearCursoUseCase(repo).execute({ ...INPUT, descripcion: "Brv" })
    ).rejects.toThrow(ValidationError);
  });
});

// ---------------------------------------------------------------------------
// RegistrarEvaluacionUseCase — validaciones adicionales
// ---------------------------------------------------------------------------
describe("RegistrarEvaluacionUseCase — validaciones adicionales", () => {
  it("[negativo] lanza ValidationError cuando idInscripcion está vacío", async () => {
    const repo = makeRepo();
    await expect(new RegistrarEvaluacionUseCase(repo).execute("", 15)).rejects.toThrow(
      ValidationError
    );
  });

  it("[negativo] lanza ValidationError cuando nota es NaN", async () => {
    const repo = makeRepo();
    await expect(new RegistrarEvaluacionUseCase(repo).execute("inscripcion-1", NaN)).rejects.toThrow(
      ValidationError
    );
  });

  it("[negativo] lanza ValidationError cuando numeroIntento es decimal", async () => {
    const repo = makeRepo();
    await expect(
      new RegistrarEvaluacionUseCase(repo).execute("inscripcion-1", 15, { numeroIntento: 1.5 })
    ).rejects.toThrow(ValidationError);
  });

  it("[negativo] lanza ValidationError cuando numeroIntento es 0", async () => {
    const repo = makeRepo();
    await expect(
      new RegistrarEvaluacionUseCase(repo).execute("inscripcion-1", 15, { numeroIntento: 0 })
    ).rejects.toThrow(ValidationError);
  });

  it("[negativo] lanza ValidationError cuando tipoEvaluacion no es válido", async () => {
    const repo = makeRepo();
    await expect(
      new RegistrarEvaluacionUseCase(repo).execute("inscripcion-1", 15, { tipoEvaluacion: "INVALIDO" })
    ).rejects.toThrow(ValidationError);
  });

  it("[positivo] acepta tipoEvaluacion válido FINAL", async () => {
    const repo = makeRepo({ existsInscripcionId: vi.fn().mockResolvedValue(true) });
    const result = await new RegistrarEvaluacionUseCase(repo).execute("inscripcion-1", 15, {
      tipoEvaluacion: "FINAL",
    });
    expect(result.resultado).toBe("APROBADO");
  });
});

// ---------------------------------------------------------------------------
// CertificarUseCase
// ---------------------------------------------------------------------------
describe("CertificarUseCase", () => {
  it("[positivo] certifica cuando el participante tiene evaluación aprobada", async () => {
    const repo = makeRepo({
      existsInscripcionId: vi.fn().mockResolvedValue(true),
      tieneEvaluacionAprobada: vi.fn().mockResolvedValue(true),
    });
    await expect(
      new CertificarUseCase(repo).execute("inscripcion-1", "https://cert.pdf")
    ).resolves.not.toThrow();
    expect(repo.upsertCertificacion).toHaveBeenCalledOnce();
  });

  it("[negativo] lanza BusinessRuleError si no tiene evaluación aprobada", async () => {
    const repo = makeRepo({
      existsInscripcionId: vi.fn().mockResolvedValue(true),
      tieneEvaluacionAprobada: vi.fn().mockResolvedValue(false),
    });
    await expect(new CertificarUseCase(repo).execute("inscripcion-1")).rejects.toThrow(
      BusinessRuleError
    );
  });

  it("[negativo] lanza NotFoundError cuando la inscripción no existe", async () => {
    const repo = makeRepo({ existsInscripcionId: vi.fn().mockResolvedValue(false) });
    await expect(new CertificarUseCase(repo).execute("no-existe")).rejects.toThrow(NotFoundError);
  });
});
