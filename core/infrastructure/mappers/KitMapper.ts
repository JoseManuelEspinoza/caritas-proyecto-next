import { Prisma } from '@prisma/client'
import type { Kit as KitRow, KitMovement as MovementRow } from '@prisma/client'
import { Kit, TipoMovimientoKit } from '../../domain/entities/kit/Kit'

type KitRowFull = KitRow & { movimientos: MovementRow[] }

export const KitMapper = {
  toDomain(row: KitRowFull): Kit {
    return Kit.desdePersistencia({
      id: row.id,
      nombre: row.nombre,
      contenido: row.contenido,
      stock: row.stock,
      parroquiaAsignada: row.parroquiaAsignada ?? undefined,
      movimientos: row.movimientos.map((m) => ({
        id: m.id,
        fecha: m.fecha.toISOString(),
        tipo: m.tipo as TipoMovimientoKit,
        cantidad: m.cantidad,
        responsable: m.responsable,
        destinatario: m.destinatario ?? undefined,
        parroquia: m.parroquia ?? undefined,
        incidenciaId: m.incidenciaId ?? undefined,
        notas: m.notas ?? undefined,
      })),
    })
  },

  toScalarData(k: Kit): Prisma.KitUncheckedCreateInput {
    const s = k.snapshot
    return {
      id: s.id,
      nombre: s.nombre,
      contenido: s.contenido,
      stock: s.stock,
      parroquiaAsignada: s.parroquiaAsignada,
    }
  },

  movimientosToPersistence(k: Kit): Prisma.KitMovementCreateWithoutKitInput[] {
    return k.snapshot.movimientos.map((m) => ({
      id: m.id,
      fecha: new Date(m.fecha),
      tipo: m.tipo,
      cantidad: m.cantidad,
      responsable: m.responsable,
      destinatario: m.destinatario,
      parroquia: m.parroquia,
      incidenciaId: m.incidenciaId,
      notas: m.notas,
    }))
  },
}
