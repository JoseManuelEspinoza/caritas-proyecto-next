import { Prisma } from '@prisma/client'
import type { Brigadista as BrigadistaRow, CertificacionBrigadista as CertRow } from '@prisma/client'
import { Brigadista, RolPastoral } from '../../domain/entities/Brigadista'
import { Dni } from '../../domain/value-objects/Dni'

type BrigadistaRowFull = BrigadistaRow & { certificaciones: CertRow[] }

/** Traduce entre la fila de Prisma (con certificaciones) y la entidad de dominio. */
export const BrigadistaMapper = {
  toDomain(row: BrigadistaRowFull): Brigadista {
    return Brigadista.desdePersistencia({
      id: row.id,
      dni: new Dni(row.dni),
      nombres: row.nombres,
      apellidoPaterno: row.apellidoPaterno,
      apellidoMaterno: row.apellidoMaterno,
      celular: row.celular,
      email: row.email ?? undefined,
      parroquia: row.parroquia,
      rolPastoral: row.rolPastoral as RolPastoral,
      fechaIngreso: row.fechaIngreso,
      disponible: row.disponible,
      activo: row.activo,
      certificado: row.certificado,
      horasFormacion: row.horasFormacion,
      cursosEnProceso: row.cursosEnProceso,
      notas: row.notas ?? undefined,
      certificaciones: row.certificaciones.map((c) => ({
        id: c.id,
        cursoCodigo: c.cursoCodigo,
        cursoNombre: c.cursoNombre,
        fechaEmision: c.fechaEmision.toISOString(),
        estado: c.estado as 'VIGENTE' | 'POR_VENCER' | 'VENCIDA',
        notaFinal: c.notaFinal ?? undefined,
      })),
    })
  },

  toScalarData(b: Brigadista): Prisma.BrigadistaUncheckedCreateInput {
    const s = b.snapshot
    return {
      id: s.id,
      dni: s.dni.toString(),
      nombres: s.nombres,
      apellidoPaterno: s.apellidoPaterno,
      apellidoMaterno: s.apellidoMaterno,
      celular: s.celular,
      email: s.email,
      parroquia: s.parroquia,
      rolPastoral: s.rolPastoral,
      fechaIngreso: s.fechaIngreso,
      disponible: s.disponible,
      activo: s.activo,
      certificado: s.certificado,
      horasFormacion: s.horasFormacion,
      cursosEnProceso: s.cursosEnProceso,
      notas: s.notas,
    }
  },

  certsToPersistence(b: Brigadista): Prisma.CertificacionBrigadistaCreateWithoutBrigadistaInput[] {
    return b.snapshot.certificaciones.map((c) => ({
      cursoCodigo: c.cursoCodigo,
      cursoNombre: c.cursoNombre,
      fechaEmision: new Date(c.fechaEmision),
      estado: c.estado,
      notaFinal: c.notaFinal,
    }))
  },
}
