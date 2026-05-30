import { Kit, KitMovement } from '../../../domain/entities/kit/Kit'
import { IKitRepository } from '../../../domain/repositories/IKitRepository'
import { NotFoundError } from '../../../domain/errors/DomainError'
import { CrearKitInput, KitOutput, toKitOutput } from '../../dtos/KitDTO'

async function cargar(repo: IKitRepository, id: string): Promise<Kit> {
  const k = await repo.findById(id)
  if (!k) throw new NotFoundError(`No existe el kit ${id}.`)
  return k
}

/** Crea un tipo de kit (código KIT-NNN). */
export class CrearKitUseCase {
  constructor(private readonly repo: IKitRepository) {}
  async execute(input: CrearKitInput): Promise<KitOutput> {
    const id = await this.repo.nextCorrelativo()
    const kit = Kit.crear({ id, ...input })
    await this.repo.save(kit)
    return toKitOutput(kit)
  }
}

export class ListarKitsUseCase {
  constructor(private readonly repo: IKitRepository) {}
  async execute(): Promise<KitOutput[]> {
    return (await this.repo.findAll()).map(toKitOutput)
  }
}

/** Registra un movimiento (ingreso/entrega/reposición) ajustando el stock. */
export class RegistrarMovimientoKitUseCase {
  constructor(private readonly repo: IKitRepository) {}
  async execute(kitId: string, mov: Omit<KitMovement, 'id'>): Promise<KitOutput> {
    const kit = await cargar(this.repo, kitId)
    kit.registrarMovimiento(mov)
    await this.repo.update(kit)
    return toKitOutput(kit)
  }
}
