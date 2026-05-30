import { randomUUID } from 'crypto'
import { Curso, resultadoPorNota } from '../../../domain/entities/curso/Curso'
import { ICursoRepository, ParticipanteData } from '../../../domain/repositories/ICursoRepository'
import { NotFoundError, BusinessRuleError, ValidationError } from '../../../domain/errors/DomainError'

export interface CursoOutput {
  id: string
  codigoCurso: string | null
  nombreCurso: string
  modalidadGeneral: string
  estadoCurso: string
  descripcion: string | null
}

function toOutput(c: Curso): CursoOutput {
  const s = c.snapshot
  return {
    id: s.id,
    codigoCurso: s.codigoCurso ?? null,
    nombreCurso: s.nombreCurso,
    modalidadGeneral: s.modalidadGeneral,
    estadoCurso: s.estadoCurso,
    descripcion: s.descripcion ?? null,
  }
}

async function cargar(repo: ICursoRepository, id: string): Promise<Curso> {
  const c = await repo.findCursoById(id)
  if (!c) throw new NotFoundError('Curso no encontrado.')
  return c
}

/** Crea un curso de capacitación (código CAP-YYYY-NNNN, estado BORRADOR). */
export class CrearCursoUseCase {
  constructor(private readonly repo: ICursoRepository) {}
  async execute(input: { idUsuarioResponsableGRD: string; nombreCurso: string; descripcion?: string; idInstitucionAliada?: string; duracionEstimadaHoras?: number }): Promise<CursoOutput> {
    const codigoCurso = await this.repo.nextCodigo()
    const curso = Curso.crear({ id: randomUUID(), codigoCurso, ...input })
    await this.repo.crearCurso(curso)
    return toOutput(curso)
  }
}

export class ListarCursosUseCase {
  constructor(private readonly repo: ICursoRepository) {}
  async execute(): Promise<CursoOutput[]> {
    return (await this.repo.findAllCursos()).map(toOutput)
  }
}

/** Cambia el estado de publicación del curso (publicar / cerrar). */
export class CambiarEstadoCursoUseCase {
  constructor(private readonly repo: ICursoRepository) {}
  async execute(id: string, accion: 'PUBLICAR' | 'CERRAR'): Promise<CursoOutput> {
    const curso = await cargar(this.repo, id)
    if (accion === 'PUBLICAR') curso.publicar()
    else curso.cerrar()
    await this.repo.actualizarCurso(curso)
    return toOutput(curso)
  }
}

/** Inscribe un participante en un curso PUBLICADO (crea el participante si es nuevo). */
export class InscribirParticipanteUseCase {
  constructor(private readonly repo: ICursoRepository) {}
  async execute(idCurso: string, participante: ParticipanteData): Promise<{ idInscripcion: string }> {
    const curso = await cargar(this.repo, idCurso)
    if (!curso.estaAbierto) throw new BusinessRuleError('El curso no está abierto a inscripciones.')

    const idParticipante = await this.repo.upsertParticipante(participante)
    if (await this.repo.existsInscripcion(idCurso, idParticipante)) {
      throw new ValidationError('El participante ya está inscrito en este curso.')
    }
    const idInscripcion = await this.repo.crearInscripcion(idCurso, idParticipante)
    return { idInscripcion }
  }
}

/** Registra una evaluación; el resultado (APROBADO/DESAPROBADO) se deriva de la nota. */
export class RegistrarEvaluacionUseCase {
  constructor(private readonly repo: ICursoRepository) {}
  async execute(idInscripcion: string, nota: number, opts?: { tipoEvaluacion?: string; numeroIntento?: number }): Promise<{ resultado: string }> {
    if (nota < 0 || nota > 20) throw new ValidationError('La nota debe estar entre 0 y 20.')
    if (!(await this.repo.existsInscripcionId(idInscripcion))) throw new NotFoundError('Inscripción no encontrada.')
    const resultado = resultadoPorNota(nota)
    await this.repo.crearEvaluacion(idInscripcion, {
      tipoEvaluacion: opts?.tipoEvaluacion,
      numeroIntento: opts?.numeroIntento ?? 1,
      nota,
      resultado,
    })
    return { resultado }
  }
}

/** Emite la certificación si el participante tiene al menos una evaluación aprobada. */
export class CertificarUseCase {
  constructor(private readonly repo: ICursoRepository) {}
  async execute(idInscripcion: string, constanciaUrl?: string): Promise<void> {
    if (!(await this.repo.existsInscripcionId(idInscripcion))) throw new NotFoundError('Inscripción no encontrada.')
    if (!(await this.repo.tieneEvaluacionAprobada(idInscripcion))) {
      throw new BusinessRuleError('No se puede certificar: el participante no tiene una evaluación aprobada.')
    }
    await this.repo.upsertCertificacion(idInscripcion, { estadoCertificacion: 'GENERADA', constanciaUrl })
  }
}
