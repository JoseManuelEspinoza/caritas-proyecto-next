import { Prisma } from '@prisma/client'
import type { BrigadistaParroquial as BrigadistaRow } from '@prisma/client'
import { BrigadistaParroquial } from '../../domain/entities/brigadista/BrigadistaParroquial'

/** Traduce entre la fila Prisma `BrigadistaParroquial` y la entidad de dominio. */
export const BrigadistaMapper = {
  toDomain(row: BrigadistaRow): BrigadistaParroquial {
    return BrigadistaParroquial.desdePersistencia({
      id: row.idBrigadistaParroquial,
      idParroquia: row.idParroquia,
      idUsuarioGRD: row.idUsuarioGRD,
      idCertificacionCurso: row.idCertificacionCurso,
      dni: row.dni,
      nombres: row.nombres,
      apellidos: row.apellidos,
      celular: row.celular,
      correo: row.correo,
      disponibilidad: row.disponibilidad ?? 'DISPONIBLE',
      estado: row.estado,
      fechaRegistro: row.fechaRegistro,
    })
  },

  toPersistence(b: BrigadistaParroquial): Prisma.BrigadistaParroquialUncheckedCreateInput {
    const s = b.snapshot
    return {
      idBrigadistaParroquial: s.id,
      idParroquia: s.idParroquia,
      idUsuarioGRD: s.idUsuarioGRD ?? undefined,
      idCertificacionCurso: s.idCertificacionCurso ?? undefined,
      dni: s.dni ?? undefined,
      nombres: s.nombres,
      apellidos: s.apellidos ?? undefined,
      celular: s.celular ?? undefined,
      correo: s.correo ?? undefined,
      disponibilidad: s.disponibilidad,
      estado: s.estado,
      fechaRegistro: s.fechaRegistro,
    }
  },
}
