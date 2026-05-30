import { Simulacro } from '../entities/simulacro/Simulacro'

export interface ISimulacroRepository {
  save(simulacro: Simulacro): Promise<void>
  update(simulacro: Simulacro): Promise<void>
  findById(id: string): Promise<Simulacro | null>
  findAll(): Promise<Simulacro[]>
  nextCorrelativo(): Promise<string>
}
