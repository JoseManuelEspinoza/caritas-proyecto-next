import { randomUUID } from "crypto";
import { Curso, resultadoPorNota } from "../../../domain/entities/curso/Curso";
import {
  ICursoRepository,
  ParticipanteData,
  InscripcionRead,
} from "../../../domain/repositories/ICursoRepository";
import {
  NotFoundError,
  BusinessRuleError,
  ValidationError,
} from "../../../domain/errors/DomainError";

export interface CursoOutput {
  id: string;
  codigoCurso: string | null;
  nombreCurso: string;
  modalidadGeneral: string;
  estadoCurso: string;
  descripcion: string | null;
}

function toOutput(c: Curso): CursoOutput {
  const s = c.snapshot;
  return {
    id: s.id,
    codigoCurso: s.codigoCurso ?? null,
    nombreCurso: s.nombreCurso,
    modalidadGeneral: s.modalidadGeneral,
    estadoCurso: s.estadoCurso,
    descripcion: s.descripcion ?? null,
  };
}

async function cargar(repo: ICursoRepository, id: string): Promise<Curso> {
  const c = await repo.findCursoById(id);
  if (!c) throw new NotFoundError("Curso no encontrado.");
  return c;
}

const TIPOS_EVALUACION_VALIDOS = ["INICIAL", "FINAL", "UNICO"];

function texto(value?: string | null): string {
  return value?.trim() ?? "";
}

function validarTextoMinimo(
  value: string | undefined | null,
  campo: string,
  min: number,
  obligatorio = true
): void {
  const limpio = texto(value);

  if (!limpio && obligatorio) {
    throw new ValidationError(`${campo} es obligatorio.`);
  }

  if (limpio && limpio.length < min) {
    throw new ValidationError(`${campo} debe tener al menos ${min} caracteres.`);
  }
}

function validarEnteroPositivo(value: number | undefined | null, campo: string): void {
  if (value == null) return;

  if (!Number.isFinite(value)) {
    throw new ValidationError(`${campo} debe ser un número válido.`);
  }

  if (!Number.isInteger(value)) {
    throw new ValidationError(`${campo} debe ser un número entero.`);
  }

  if (value <= 0) {
    throw new ValidationError(`${campo} debe ser mayor que cero.`);
  }
}

function validarCursoInput(input: {
  idUsuarioResponsableGRD: string;
  nombreCurso: string;
  descripcion?: string;
  idInstitucionAliada?: string;
  duracionEstimadaHoras?: number;
}): void {
  if (!texto(input.idUsuarioResponsableGRD)) {
    throw new ValidationError("Selecciona el responsable del curso.");
  }

  validarTextoMinimo(input.nombreCurso, "El nombre del curso", 3);

  validarTextoMinimo(input.descripcion, "La descripción del curso", 5, false);

  validarEnteroPositivo(input.duracionEstimadaHoras, "La duración estimada");
}

function validarEvaluacionInput(
  idInscripcion: string,
  nota: number,
  opts?: { tipoEvaluacion?: string; numeroIntento?: number }
): void {
  if (!texto(idInscripcion)) {
    throw new ValidationError("No se encontró la inscripción.");
  }

  if (!Number.isFinite(nota)) {
    throw new ValidationError("La nota debe ser un número válido.");
  }

  if (nota < 0 || nota > 20) {
    throw new ValidationError("La nota debe estar entre 0 y 20.");
  }

  if (opts?.numeroIntento != null) {
    if (!Number.isInteger(opts.numeroIntento) || opts.numeroIntento <= 0) {
      throw new ValidationError("El número de intento debe ser un entero positivo.");
    }
  }
  const tipoEvaluacion = texto(opts?.tipoEvaluacion);

  if (tipoEvaluacion && !TIPOS_EVALUACION_VALIDOS.includes(tipoEvaluacion)) {
    throw new ValidationError("Selecciona un tipo de evaluación válido.");
  }
}

/** Crea un curso de capacitación (código CAP-YYYY-NNNN, estado BORRADOR). */
export class CrearCursoUseCase {
  constructor(private readonly repo: ICursoRepository) {}

  async execute(input: {
    idUsuarioResponsableGRD: string;
    nombreCurso: string;
    descripcion?: string;
    idInstitucionAliada?: string;
    duracionEstimadaHoras?: number;
  }): Promise<CursoOutput> {
    validarCursoInput(input);

    const codigoCurso = await this.repo.nextCodigo();
    const curso = Curso.crear({
      id: randomUUID(),
      codigoCurso,
      ...input,
      idUsuarioResponsableGRD: input.idUsuarioResponsableGRD.trim(),
      nombreCurso: input.nombreCurso.trim(),
      descripcion: texto(input.descripcion) || undefined,
      idInstitucionAliada: texto(input.idInstitucionAliada) || undefined,
    });

    await this.repo.crearCurso(curso);
    return toOutput(curso);
  }
}

export class ListarCursosUseCase {
  constructor(private readonly repo: ICursoRepository) {}
  async execute(): Promise<CursoOutput[]> {
    return (await this.repo.findAllCursos()).map(toOutput);
  }
}

/** Lista las inscripciones de un curso (vista de participantes). */
export class ListarInscripcionesUseCase {
  constructor(private readonly repo: ICursoRepository) {}
  async execute(idCurso: string): Promise<InscripcionRead[]> {
    return this.repo.findInscripciones(idCurso);
  }
}

/** Cambia el estado de publicación del curso (publicar / cerrar). */
export class CambiarEstadoCursoUseCase {
  constructor(private readonly repo: ICursoRepository) {}
  async execute(id: string, accion: "PUBLICAR" | "CERRAR"): Promise<CursoOutput> {
    const curso = await cargar(this.repo, id);
    if (accion === "PUBLICAR") curso.publicar();
    else curso.cerrar();
    await this.repo.actualizarCurso(curso);
    return toOutput(curso);
  }
}

/** Inscribe un participante en un curso PUBLICADO (crea el participante si es nuevo). */
export class InscribirParticipanteUseCase {
  constructor(private readonly repo: ICursoRepository) {}
  async execute(
    idCurso: string,
    participante: ParticipanteData
  ): Promise<{ idInscripcion: string }> {
    const curso = await cargar(this.repo, idCurso);
    if (!curso.estaAbierto)
      throw new BusinessRuleError("El curso no está abierto a inscripciones.");

    const idParticipante = await this.repo.upsertParticipante(participante);
    if (await this.repo.existsInscripcion(idCurso, idParticipante)) {
      throw new ValidationError("El participante ya está inscrito en este curso.");
    }
    const idInscripcion = await this.repo.crearInscripcion(idCurso, idParticipante);
    return { idInscripcion };
  }
}

/** Registra una evaluación; el resultado (APROBADO/DESAPROBADO) se deriva de la nota. */
export class RegistrarEvaluacionUseCase {
  constructor(private readonly repo: ICursoRepository) {}

  async execute(
    idInscripcion: string,
    nota: number,
    opts?: { tipoEvaluacion?: string; numeroIntento?: number }
  ): Promise<{ resultado: string }> {
    validarEvaluacionInput(idInscripcion, nota, opts);

    if (!(await this.repo.existsInscripcionId(idInscripcion))) {
      throw new NotFoundError("Inscripción no encontrada.");
    }

    const resultado = resultadoPorNota(nota);

    await this.repo.crearEvaluacion(idInscripcion, {
      tipoEvaluacion: texto(opts?.tipoEvaluacion) || undefined,
      numeroIntento: opts?.numeroIntento ?? 1,
      nota,
      resultado,
    });

    return { resultado };
  }
}

/** Emite la certificación si el participante tiene al menos una evaluación aprobada. */
export class CertificarUseCase {
  constructor(private readonly repo: ICursoRepository) {}
  async execute(idInscripcion: string, constanciaUrl?: string): Promise<void> {
    if (!(await this.repo.existsInscripcionId(idInscripcion)))
      throw new NotFoundError("Inscripción no encontrada.");
    if (!(await this.repo.tieneEvaluacionAprobada(idInscripcion))) {
      throw new BusinessRuleError(
        "No se puede certificar: el participante no tiene una evaluación aprobada."
      );
    }
    await this.repo.upsertCertificacion(idInscripcion, {
      estadoCertificacion: "GENERADA",
      constanciaUrl,
    });
  }
}
