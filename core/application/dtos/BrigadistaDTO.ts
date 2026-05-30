import { Brigadista, CertificacionBrigadista, RolPastoral } from '../../domain/entities/Brigadista'

export interface RegistrarBrigadistaInput {
  dni: string
  nombres: string
  apellidoPaterno: string
  apellidoMaterno: string
  celular: string
  parroquia: string
  rolPastoral: RolPastoral
  email?: string
}

export interface BrigadistaOutput {
  id: string
  dni: string
  nombreCompleto: string
  nombres: string
  apellidoPaterno: string
  apellidoMaterno: string
  celular: string
  email?: string
  parroquia: string
  rolPastoral: RolPastoral
  fechaIngreso: string
  disponible: boolean
  activo: boolean
  certificado: boolean
  horasFormacion: number
  cursosEnProceso: string[]
  certificaciones: CertificacionBrigadista[]
}

export function toBrigadistaOutput(b: Brigadista): BrigadistaOutput {
  const s = b.snapshot
  return {
    id: s.id,
    dni: s.dni.toString(),
    nombreCompleto: b.nombreCompleto,
    nombres: s.nombres,
    apellidoPaterno: s.apellidoPaterno,
    apellidoMaterno: s.apellidoMaterno,
    celular: s.celular,
    email: s.email,
    parroquia: s.parroquia,
    rolPastoral: s.rolPastoral,
    fechaIngreso: s.fechaIngreso.toISOString(),
    disponible: s.disponible,
    activo: s.activo,
    certificado: s.certificado,
    horasFormacion: s.horasFormacion,
    cursosEnProceso: s.cursosEnProceso,
    certificaciones: s.certificaciones,
  }
}
