import { prisma } from '@/app/lib/prisma'
import { Course } from '../../domain/entities/course/Course'
import { ICourseRepository } from '../../domain/repositories/ICourseRepository'
import { CourseMapper } from '../mappers/CourseMapper'

const INCLUDE = { sesiones: true, participantes: true }

export class PrismaCourseRepository implements ICourseRepository {
  async save(course: Course): Promise<void> {
    await prisma.course.create({
      data: {
        ...CourseMapper.toScalarData(course),
        sesiones: { create: CourseMapper.sesionesToPersistence(course) },
        participantes: { create: CourseMapper.participantesToPersistence(course) },
      },
    })
  }

  async update(course: Course): Promise<void> {
    const { id, ...scalar } = CourseMapper.toScalarData(course)
    await prisma.$transaction([
      prisma.courseSession.deleteMany({ where: { courseId: id } }),
      prisma.courseParticipant.deleteMany({ where: { courseId: id } }),
      prisma.course.update({
        where: { id },
        data: {
          ...scalar,
          sesiones: { create: CourseMapper.sesionesToPersistence(course) },
          participantes: { create: CourseMapper.participantesToPersistence(course) },
        },
      }),
    ])
  }

  async findById(id: string): Promise<Course | null> {
    const row = await prisma.course.findUnique({ where: { id }, include: INCLUDE })
    return row ? CourseMapper.toDomain(row) : null
  }

  async findAll(): Promise<Course[]> {
    const rows = await prisma.course.findMany({ include: INCLUDE, orderBy: { fechaInicio: 'desc' } })
    return rows.map(CourseMapper.toDomain)
  }

  async nextCorrelativo(): Promise<string> {
    const year = new Date().getFullYear()
    const prefix = `CAP-${year}-`
    const count = await prisma.course.count({ where: { id: { startsWith: prefix } } })
    return `${prefix}${String(count + 1).padStart(4, '0')}`
  }
}
