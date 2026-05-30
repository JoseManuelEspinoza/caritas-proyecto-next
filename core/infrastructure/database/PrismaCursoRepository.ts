import { prisma } from '@/app/lib/prisma'
import { Curso } from '../../domain/entities/curso/Curso'
import { ICursoRepository, ParticipanteData } from '../../domain/repositories/ICursoRepository'
import { CursoMapper } from '../mappers/CursoMapper'

export class PrismaCursoRepository implements ICursoRepository {
  async nextCodigo(): Promise<string> {
    const year = new Date().getFullYear()
    const prefix = `CAP-${year}-`
    const count = await prisma.cursoCapacitacion.count({ where: { codigoCurso: { startsWith: prefix } } })
    return `${prefix}${String(count + 1).padStart(4, '0')}`
  }

  async crearCurso(curso: Curso): Promise<void> {
    await prisma.cursoCapacitacion.create({ data: CursoMapper.toPersistence(curso) })
  }

  async actualizarCurso(curso: Curso): Promise<void> {
    const { idCursoCapacitacion, ...data } = CursoMapper.toPersistence(curso)
    await prisma.cursoCapacitacion.update({ where: { idCursoCapacitacion }, data })
  }

  async findCursoById(id: string): Promise<Curso | null> {
    const row = await prisma.cursoCapacitacion.findUnique({ where: { idCursoCapacitacion: id } })
    return row ? CursoMapper.toDomain(row) : null
  }

  async findAllCursos(): Promise<Curso[]> {
    const rows = await prisma.cursoCapacitacion.findMany({ orderBy: { fechaCreacion: 'desc' } })
    return rows.map(CursoMapper.toDomain)
  }

  async upsertParticipante(data: ParticipanteData): Promise<string> {
    if (data.tipoDocumento && data.numeroDocumento) {
      const existente = await prisma.participante.findUnique({
        where: { tipoDocumento_numeroDocumento: { tipoDocumento: data.tipoDocumento, numeroDocumento: data.numeroDocumento } },
        select: { idParticipante: true },
      })
      if (existente) return existente.idParticipante
    }
    const creado = await prisma.participante.create({
      data: {
        tipoDocumento: data.tipoDocumento ?? undefined,
        numeroDocumento: data.numeroDocumento ?? undefined,
        nombres: data.nombres,
        apellidos: data.apellidos ?? undefined,
        celular: data.celular ?? undefined,
        correo: data.correo ?? undefined,
        idParroquia: data.idParroquia ?? undefined,
        rolPastoralComunitario: data.rolPastoralComunitario ?? undefined,
      },
      select: { idParticipante: true },
    })
    return creado.idParticipante
  }

  async existsInscripcion(idCurso: string, idParticipante: string): Promise<boolean> {
    const row = await prisma.inscripcionCurso.findUnique({
      where: { idCursoCapacitacion_idParticipante: { idCursoCapacitacion: idCurso, idParticipante } },
      select: { idInscripcionCurso: true },
    })
    return row !== null
  }

  async crearInscripcion(idCurso: string, idParticipante: string): Promise<string> {
    const row = await prisma.inscripcionCurso.create({
      data: { idCursoCapacitacion: idCurso, idParticipante, estadoInscripcion: 'INSCRITO' },
      select: { idInscripcionCurso: true },
    })
    return row.idInscripcionCurso
  }

  async existsInscripcionId(idInscripcion: string): Promise<boolean> {
    const row = await prisma.inscripcionCurso.findUnique({ where: { idInscripcionCurso: idInscripcion }, select: { idInscripcionCurso: true } })
    return row !== null
  }

  async crearEvaluacion(idInscripcion: string, data: { tipoEvaluacion?: string; numeroIntento: number; nota: number; resultado: string }): Promise<void> {
    await prisma.evaluacionCurso.create({
      data: {
        idInscripcionCurso: idInscripcion,
        tipoEvaluacion: data.tipoEvaluacion ?? undefined,
        numeroIntento: data.numeroIntento,
        nota: data.nota,
        resultado: data.resultado,
        fechaEvaluacion: new Date(),
      },
    })
  }

  async tieneEvaluacionAprobada(idInscripcion: string): Promise<boolean> {
    const count = await prisma.evaluacionCurso.count({ where: { idInscripcionCurso: idInscripcion, resultado: 'APROBADO' } })
    return count > 0
  }

  async upsertCertificacion(idInscripcion: string, data: { estadoCertificacion: string; constanciaUrl?: string }): Promise<void> {
    await prisma.certificacionCurso.upsert({
      where: { idInscripcionCurso: idInscripcion },
      create: {
        idInscripcionCurso: idInscripcion,
        estadoCertificacion: data.estadoCertificacion,
        constanciaUrl: data.constanciaUrl ?? undefined,
        fechaCertificacion: new Date(),
      },
      update: {
        estadoCertificacion: data.estadoCertificacion,
        constanciaUrl: data.constanciaUrl ?? undefined,
        fechaCertificacion: new Date(),
      },
    })
  }
}
