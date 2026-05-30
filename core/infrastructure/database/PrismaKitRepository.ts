import { prisma } from '@/app/lib/prisma'
import { Kit } from '../../domain/entities/kit/Kit'
import { IKitRepository } from '../../domain/repositories/IKitRepository'
import { KitMapper } from '../mappers/KitMapper'

export class PrismaKitRepository implements IKitRepository {
  async save(kit: Kit): Promise<void> {
    await prisma.kit.create({
      data: {
        ...KitMapper.toScalarData(kit),
        movimientos: { create: KitMapper.movimientosToPersistence(kit) },
      },
    })
  }

  async update(kit: Kit): Promise<void> {
    const { id, ...scalar } = KitMapper.toScalarData(kit)
    await prisma.$transaction([
      prisma.kitMovement.deleteMany({ where: { kitId: id } }),
      prisma.kit.update({
        where: { id },
        data: { ...scalar, movimientos: { create: KitMapper.movimientosToPersistence(kit) } },
      }),
    ])
  }

  async findById(id: string): Promise<Kit | null> {
    const row = await prisma.kit.findUnique({ where: { id }, include: { movimientos: true } })
    return row ? KitMapper.toDomain(row) : null
  }

  async findAll(): Promise<Kit[]> {
    const rows = await prisma.kit.findMany({ include: { movimientos: true }, orderBy: { nombre: 'asc' } })
    return rows.map(KitMapper.toDomain)
  }

  async nextCorrelativo(): Promise<string> {
    const count = await prisma.kit.count()
    return `KIT-${String(count + 1).padStart(3, '0')}`
  }
}
