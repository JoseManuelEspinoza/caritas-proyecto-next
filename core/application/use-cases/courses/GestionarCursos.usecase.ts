import { randomUUID } from 'crypto'
import { Course, AttendanceState, CourseParticipant } from '../../../domain/entities/course/Course'
import { ICourseRepository } from '../../../domain/repositories/ICourseRepository'
import { NotFoundError } from '../../../domain/errors/DomainError'
import { CourseOutput, CrearCursoInput, toCourseOutput } from '../../dtos/CourseDTO'

async function cargar(repo: ICourseRepository, id: string): Promise<Course> {
  const c = await repo.findById(id)
  if (!c) throw new NotFoundError(`No existe el curso ${id}.`)
  return c
}

/** Crea un curso de capacitación con código correlativo CAP-YYYY-NNNN. */
export class CrearCursoUseCase {
  constructor(private readonly repo: ICourseRepository) {}
  async execute(input: CrearCursoInput): Promise<CourseOutput> {
    const id = await this.repo.nextCorrelativo()
    const course = Course.crear({ id, ...input })
    await this.repo.save(course)
    return toCourseOutput(course)
  }
}

/** Lista todos los cursos. */
export class ListarCursosUseCase {
  constructor(private readonly repo: ICourseRepository) {}
  async execute(): Promise<CourseOutput[]> {
    return (await this.repo.findAll()).map(toCourseOutput)
  }
}

/** Inscribe un brigadista en un curso. */
export class InscribirParticipanteUseCase {
  constructor(private readonly repo: ICourseRepository) {}
  async execute(courseId: string, participante: Omit<CourseParticipant, 'id' | 'certState' | 'attendance'>): Promise<CourseOutput> {
    const course = await cargar(this.repo, courseId)
    course.inscribir({ ...participante, id: randomUUID(), attendance: {} })
    await this.repo.update(course)
    return toCourseOutput(course)
  }
}

/** Registra la asistencia de un participante a una sesión. */
export class RegistrarAsistenciaUseCase {
  constructor(private readonly repo: ICourseRepository) {}
  async execute(courseId: string, participantId: string, sessionId: string, estado: AttendanceState): Promise<CourseOutput> {
    const course = await cargar(this.repo, courseId)
    course.registrarAsistencia(participantId, sessionId, estado)
    await this.repo.update(course)
    return toCourseOutput(course)
  }
}

/** Registra una nota (inicial o final); la certificación se deriva de la final. */
export class EvaluarParticipanteUseCase {
  constructor(private readonly repo: ICourseRepository) {}
  async execute(courseId: string, participantId: string, campo: 'evalInicial' | 'evalFinal', valor: number): Promise<CourseOutput> {
    const course = await cargar(this.repo, courseId)
    course.evaluar(participantId, campo, valor)
    await this.repo.update(course)
    return toCourseOutput(course)
  }
}
