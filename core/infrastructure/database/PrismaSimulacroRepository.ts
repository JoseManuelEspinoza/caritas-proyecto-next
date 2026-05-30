import { prisma } from '@/app/lib/prisma'
import { Simulacro } from '../../domain/entities/simulacro/Simulacro'
import { ISimulacroRepository } from '../../domain/repositories/ISimulacroRepository'
import { SimulacroMapper } from '../mappers/SimulacroMapper'

export class PrismaSimulacroRepository implements ISimulacroRepository {
  async save(simulacro: Simulacro): Promise<void> {
    await prisma.simulacro.create({ data: SimulacroMapper.toPersistence(simulacro) })
  }

  async update(simulacro: Simulacro): Promise<void> {
    const { id, ...data } = SimulacroMapper.toPersistence(simulacro)
    await prisma.simulacro.update({ where: { id }, data })
  }

  async findById(id: string): Promise<Simulacro | null> {
    const row = await prisma.simulacro.findUnique({ where: { id } })
    return row ? SimulacroMapper.toDomain(row) : null
  }

  async findAll(): Promise<Simulacro[]> {
    const rows = await prisma.simulacro.findMany({ orderBy: { fecha: 'desc' } })
    return rows.map(SimulacroMapper.toDomain)
  }

  async nextCorrelativo(): Promise<string> {
    const year = new Date().getFullYear()
    const prefix = `SIM-${year}-`
    const count = await prisma.simulacro.count({ where: { id: { startsWith: prefix } } })
    return `${prefix}${String(count + 1).padStart(4, '0')}`
  }
}
