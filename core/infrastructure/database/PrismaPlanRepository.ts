import { prisma } from '@/app/lib/prisma'
import { Plan } from '../../domain/entities/plan/Plan'
import { IPlanRepository } from '../../domain/repositories/IPlanRepository'
import { PlanMapper } from '../mappers/PlanMapper'

export class PrismaPlanRepository implements IPlanRepository {
  async save(plan: Plan): Promise<void> {
    await prisma.plan.create({
      data: {
        ...PlanMapper.toScalarData(plan),
        actividades: { create: PlanMapper.actividadesToPersistence(plan) },
      },
    })
  }

  async update(plan: Plan): Promise<void> {
    const { id, ...scalar } = PlanMapper.toScalarData(plan)
    await prisma.$transaction([
      prisma.planActivity.deleteMany({ where: { planId: id } }),
      prisma.plan.update({
        where: { id },
        data: { ...scalar, actividades: { create: PlanMapper.actividadesToPersistence(plan) } },
      }),
    ])
  }

  async remove(id: string): Promise<void> {
    await prisma.plan.delete({ where: { id } })
  }

  async findById(id: string): Promise<Plan | null> {
    const row = await prisma.plan.findUnique({ where: { id }, include: { actividades: true } })
    return row ? PlanMapper.toDomain(row) : null
  }

  async findAll(): Promise<Plan[]> {
    const rows = await prisma.plan.findMany({ include: { actividades: true }, orderBy: { fechaInicio: 'desc' } })
    return rows.map(PlanMapper.toDomain)
  }

  async nextCorrelativo(): Promise<string> {
    const year = new Date().getFullYear()
    const prefix = `PLAN-${year}-`
    const count = await prisma.plan.count({ where: { id: { startsWith: prefix } } })
    return `${prefix}${String(count + 1).padStart(4, '0')}`
  }
}
