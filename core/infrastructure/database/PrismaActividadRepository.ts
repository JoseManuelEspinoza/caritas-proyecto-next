import { prisma } from '@/app/lib/prisma'
import { ActividadPreventiva } from '../../domain/entities/actividad/ActividadPreventiva'
import { IActividadRepository } from '../../domain/repositories/IActividadRepository'
import { ActividadMapper } from '../mappers/ActividadMapper'

export class PrismaActividadRepository implements IActividadRepository {
  async save(actividad: ActividadPreventiva): Promise<void> {
    await prisma.actividadPreventiva.create({ data: ActividadMapper.toPersistence(actividad) })
  }

  async update(actividad: ActividadPreventiva): Promise<void> {
    const { idActividadPreventiva, ...data } = ActividadMapper.toPersistence(actividad)
    await prisma.actividadPreventiva.update({ where: { idActividadPreventiva }, data })
  }

  async findById(id: string): Promise<ActividadPreventiva | null> {
    const row = await prisma.actividadPreventiva.findUnique({ where: { idActividadPreventiva: id } })
    return row ? ActividadMapper.toDomain(row) : null
  }

  async findAll(): Promise<ActividadPreventiva[]> {
    const rows = await prisma.actividadPreventiva.findMany({ orderBy: { fechaRegistro: 'desc' } })
    return rows.map(ActividadMapper.toDomain)
  }

  async nextCodigo(): Promise<string> {
    const year = new Date().getFullYear()
    const prefix = `ACT-${year}-`
    const count = await prisma.actividadPreventiva.count({ where: { codigoActividad: { startsWith: prefix } } })
    return `${prefix}${String(count + 1).padStart(4, '0')}`
  }
}
