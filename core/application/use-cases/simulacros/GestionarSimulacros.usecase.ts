import { Simulacro, BrigadistaRef } from '../../../domain/entities/simulacro/Simulacro'
import { ISimulacroRepository } from '../../../domain/repositories/ISimulacroRepository'
import { NotFoundError } from '../../../domain/errors/DomainError'
import { CrearSimulacroInput, SimulacroOutput, toSimulacroOutput } from '../../dtos/SimulacroDTO'

async function cargar(repo: ISimulacroRepository, id: string): Promise<Simulacro> {
  const s = await repo.findById(id)
  if (!s) throw new NotFoundError(`No existe el simulacro ${id}.`)
  return s
}

/** Programa una acción preventiva (código SIM-YYYY-NNNN). */
export class CrearSimulacroUseCase {
  constructor(private readonly repo: ISimulacroRepository) {}
  async execute(input: CrearSimulacroInput): Promise<SimulacroOutput> {
    const id = await this.repo.nextCorrelativo()
    const sim = Simulacro.crear({ id, ...input })
    await this.repo.save(sim)
    return toSimulacroOutput(sim)
  }
}

export class ListarSimulacrosUseCase {
  constructor(private readonly repo: ISimulacroRepository) {}
  async execute(): Promise<SimulacroOutput[]> {
    return (await this.repo.findAll()).map(toSimulacroOutput)
  }
}

/** PROGRAMADA → ASIGNADA: asigna brigadistas e indicaciones. */
export class AsignarSimulacroUseCase {
  constructor(private readonly repo: ISimulacroRepository) {}
  async execute(id: string, brigadistas: BrigadistaRef[], indicaciones: string, documentos: string[]): Promise<SimulacroOutput> {
    const sim = await cargar(this.repo, id)
    sim.asignar(brigadistas, indicaciones, documentos)
    await this.repo.update(sim)
    return toSimulacroOutput(sim)
  }
}

/** ASIGNADA | OBSERVADA → EJECUTADA: el brigadista envía su reporte. */
export class EnviarReporteSimulacroUseCase {
  constructor(private readonly repo: ISimulacroRepository) {}
  async execute(id: string, evidencias: string[], notas: string): Promise<SimulacroOutput> {
    const sim = await cargar(this.repo, id)
    sim.enviarReporte(evidencias, notas)
    await this.repo.update(sim)
    return toSimulacroOutput(sim)
  }
}

/** EJECUTADA → OBSERVADA | VALIDADA: revisión del especialista. */
export class RevisarSimulacroUseCase {
  constructor(private readonly repo: ISimulacroRepository) {}
  async execute(id: string, decision: 'OBSERVAR' | 'VALIDAR', comentario?: string): Promise<SimulacroOutput> {
    const sim = await cargar(this.repo, id)
    if (decision === 'OBSERVAR') sim.observar(comentario ?? '')
    else sim.validar()
    await this.repo.update(sim)
    return toSimulacroOutput(sim)
  }
}
