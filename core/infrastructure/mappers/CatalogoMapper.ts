import { Prisma } from '@prisma/client'
import type { CatalogoGRD as CatalogoRow, CatalogoDetalleGRD as DetalleRow } from '@prisma/client'
import { Catalogo, CatalogoDetalle } from '../../domain/entities/catalogo/Catalogo'

export const CatalogoMapper = {
  catalogoToDomain(row: CatalogoRow): Catalogo {
    return Catalogo.desdePersistencia({
      id: row.idCatalogoGRD,
      nombreCatalogo: row.nombreCatalogo,
      descripcion: row.descripcion,
      estado: row.estado,
    })
  },

  catalogoToPersistence(c: Catalogo): Prisma.CatalogoGRDUncheckedCreateInput {
    const s = c.snapshot
    return { idCatalogoGRD: s.id, nombreCatalogo: s.nombreCatalogo, descripcion: s.descripcion ?? undefined, estado: s.estado }
  },

  detalleToDomain(row: DetalleRow): CatalogoDetalle {
    return CatalogoDetalle.desdePersistencia({
      id: row.idCatalogoDetalleGRD,
      idCatalogoGRD: row.idCatalogoGRD,
      codigo: row.codigo,
      valor: row.valor,
      descripcion: row.descripcion,
      orden: row.orden,
      estado: row.estado,
    })
  },

  detalleToPersistence(d: CatalogoDetalle): Prisma.CatalogoDetalleGRDUncheckedCreateInput {
    const s = d.snapshot
    return {
      idCatalogoDetalleGRD: s.id,
      idCatalogoGRD: s.idCatalogoGRD,
      codigo: s.codigo,
      valor: s.valor,
      descripcion: s.descripcion ?? undefined,
      orden: s.orden ?? undefined,
      estado: s.estado,
    }
  },
}
