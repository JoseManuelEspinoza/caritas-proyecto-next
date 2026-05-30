import { Prisma } from '@prisma/client'
import type { CatalogItem as CatalogRow } from '@prisma/client'
import { CatalogItem, CatalogTipo } from '../../domain/entities/catalog/CatalogItem'

export const CatalogMapper = {
  toDomain(row: CatalogRow): CatalogItem {
    return CatalogItem.desdePersistencia({
      id: row.id,
      tipo: row.tipo as CatalogTipo,
      value: row.value,
      active: row.active,
    })
  },

  toPersistence(i: CatalogItem): Prisma.CatalogItemUncheckedCreateInput {
    const s = i.snapshot
    return { id: s.id, tipo: s.tipo, value: s.value, active: s.active }
  },
}
