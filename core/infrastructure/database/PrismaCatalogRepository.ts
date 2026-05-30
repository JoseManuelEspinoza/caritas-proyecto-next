import { prisma } from '@/app/lib/prisma'
import { CatalogItem, CatalogTipo } from '../../domain/entities/catalog/CatalogItem'
import { ICatalogRepository } from '../../domain/repositories/ICatalogRepository'
import { CatalogMapper } from '../mappers/CatalogMapper'

export class PrismaCatalogRepository implements ICatalogRepository {
  async save(item: CatalogItem): Promise<void> {
    await prisma.catalogItem.create({ data: CatalogMapper.toPersistence(item) })
  }

  async update(item: CatalogItem): Promise<void> {
    const { id, ...data } = CatalogMapper.toPersistence(item)
    await prisma.catalogItem.update({ where: { id }, data })
  }

  async findById(id: string): Promise<CatalogItem | null> {
    const row = await prisma.catalogItem.findUnique({ where: { id } })
    return row ? CatalogMapper.toDomain(row) : null
  }

  async findByTipo(tipo: CatalogTipo): Promise<CatalogItem[]> {
    const rows = await prisma.catalogItem.findMany({ where: { tipo }, orderBy: { value: 'asc' } })
    return rows.map(CatalogMapper.toDomain)
  }

  async existsValue(tipo: CatalogTipo, value: string): Promise<boolean> {
    const found = await prisma.catalogItem.findUnique({ where: { tipo_value: { tipo, value } } })
    return found !== null
  }
}
