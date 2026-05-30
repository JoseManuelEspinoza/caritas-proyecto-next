import { Simulacro, SimulacroTipo, BrigadistaRef, AccionStatus } from '../../domain/entities/simulacro/Simulacro'

export interface CrearSimulacroInput {
  parroquia: string
  tipo: SimulacroTipo
  fecha: string
  descripcion?: string
  creadoPor?: string
}

export interface SimulacroOutput {
  id: string
  parroquia: string
  tipo: SimulacroTipo
  fecha: string
  descripcion?: string
  status: AccionStatus
  brigadistasAsignados: BrigadistaRef[]
  indicaciones?: string
  evidenciasBrigadista: string[]
  notasBrigadista?: string
  comentarioObservacion?: string
}

export function toSimulacroOutput(s: Simulacro): SimulacroOutput {
  const p = s.snapshot
  return {
    id: p.id,
    parroquia: p.parroquia,
    tipo: p.tipo,
    fecha: p.fecha,
    descripcion: p.descripcion,
    status: p.status,
    brigadistasAsignados: p.brigadistasAsignados,
    indicaciones: p.indicaciones,
    evidenciasBrigadista: p.evidenciasBrigadista,
    notasBrigadista: p.notasBrigadista,
    comentarioObservacion: p.comentarioObservacion,
  }
}
