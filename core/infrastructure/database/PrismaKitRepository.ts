import { prisma } from '@/app/lib/prisma'
import { KitEmergencia } from '../../domain/entities/kit/KitEmergencia'
import { IKitRepository, MovimientoData } from '../../domain/repositories/IKitRepository'
import { KitMapper } from '../mappers/KitMapper'

export class PrismaKitRepository implements IKitRepository {
  async save(kit: KitEmergencia): Promise<void> {
    await prisma.kitEmergencia.create({ data: KitMapper.toPersistence(kit) })
  }

  async findById(id: string): Promise<KitEmergencia | null> {
    const row = await prisma.kitEmergencia.findUnique({ where: { idKitEmergencia: id } })
    return row ? KitMapper.toDomain(row) : null
  }

  async findAll(): Promise<KitEmergencia[]> {
    const rows = await prisma.kitEmergencia.findMany({ orderBy: { tipoKit: 'asc' } })
    return rows.map(KitMapper.toDomain)
  }

  async registrarMovimiento(kit: KitEmergencia, mov: MovimientoData): Promise<void> {
    await prisma.$transaction([
      prisma.kitEmergencia.update({
        where: { idKitEmergencia: kit.id },
        data: { stockActual: kit.stockActual },
      }),
      prisma.movimientoKit.create({
        data: {
          idKitEmergencia: kit.id,
          idUsuarioResponsableGRD: mov.idUsuarioResponsableGRD,
          idParroquiaDestino: mov.idParroquiaDestino ?? undefined,
          tipoMovimiento: mov.tipo,
          cantidad: mov.cantidad,
          motivoMovimiento: mov.motivoMovimiento ?? undefined,
          observaciones: mov.observaciones ?? undefined,
        },
      }),
    ])
  }
}
