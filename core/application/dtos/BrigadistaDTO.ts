import { BrigadistaParroquial } from '../../domain/entities/brigadista/BrigadistaParroquial'

/** Datos del formulario de alta/edición (coincide con la UI de intermedia). */
export interface BrigadistaInput {
  nombres: string
  apellidos: string
  dni: string
  celular: string
  correo: string
  idParroquia: string
  disponibilidad: string
}

export interface BrigadistaOutput {
  id: string
  idParroquia: string
  dni: string | null
  nombres: string
  apellidos: string | null
  nombreCompleto: string
  celular: string | null
  correo: string | null
  disponibilidad: string
  estado: string
  fechaRegistro: string
}

export function toBrigadistaOutput(b: BrigadistaParroquial): BrigadistaOutput {
  const s = b.snapshot
  return {
    id: s.id,
    idParroquia: s.idParroquia,
    dni: s.dni ?? null,
    nombres: s.nombres,
    apellidos: s.apellidos ?? null,
    nombreCompleto: `${s.nombres} ${s.apellidos ?? ''}`.trim(),
    celular: s.celular ?? null,
    correo: s.correo ?? null,
    disponibilidad: s.disponibilidad,
    estado: s.estado,
    fechaRegistro: s.fechaRegistro.toISOString(),
  }
}
