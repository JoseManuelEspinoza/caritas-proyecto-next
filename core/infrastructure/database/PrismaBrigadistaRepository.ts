import { prisma } from '@/app/lib/prisma'
import { Brigadista } from '../../domain/entities/Brigadista'
import { IBrigadistaRepository } from '../../domain/repositories/IBrigadistaRepository'
import { BrigadistaMapper } from '../mappers/BrigadistaMapper'

const INCLUDE = { certificaciones: true }

/** Implementación Prisma del repositorio del padrón de brigadistas. */
export class PrismaBrigadistaRepository implements IBrigadistaRepository {
  async save(brigadista: Brigadista): Promise<void> {
    await prisma.brigadista.create({
      data: {
        ...BrigadistaMapper.toScalarData(brigadista),
        certificaciones: { create: BrigadistaMapper.certsToPersistence(brigadista) },
      },
    })
  }

  async update(brigadista: Brigadista): Promise<void> {
    const { id, ...scalar } = BrigadistaMapper.toScalarData(brigadista)
    await prisma.$transaction([
      prisma.certificacionBrigadista.deleteMany({ where: { brigadistaId: id } }),
      prisma.brigadista.update({
        where: { id },
        data: {
          ...scalar,
          certificaciones: { create: BrigadistaMapper.certsToPersistence(brigadista) },
        },
      }),
    ])
  }

  async findById(id: string): Promise<Brigadista | null> {
    const row = await prisma.brigadista.findUnique({ where: { id }, include: INCLUDE })
    return row ? BrigadistaMapper.toDomain(row) : null
  }

  async findByDni(dni: string): Promise<Brigadista | null> {
    const row = await prisma.brigadista.findUnique({ where: { dni }, include: INCLUDE })
    return row ? BrigadistaMapper.toDomain(row) : null
  }

  async findAll(): Promise<Brigadista[]> {
    const rows = await prisma.brigadista.findMany({ include: INCLUDE, orderBy: { fechaIngreso: 'desc' } })
    return rows.map(BrigadistaMapper.toDomain)
  }
}
