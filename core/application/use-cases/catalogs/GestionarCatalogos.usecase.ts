import { randomUUID } from 'crypto'
import { CatalogItem, CatalogTipo } from '../../../domain/entities/catalog/CatalogItem'
import { ICatalogRepository } from '../../../domain/repositories/ICatalogRepository'
import { NotFoundError, ValidationError } from '../../../domain/errors/DomainError'

export interface CatalogItemOutput {
  id: string
  tipo: CatalogTipo
  value: string
  active: boolean
}

const toOutput = (i: CatalogItem): CatalogItemOutput => ({ ...i.snapshot })

async function cargar(repo: ICatalogRepository, id: string): Promise<CatalogItem> {
  const i = await repo.findById(id)
  if (!i) throw new NotFoundError('No se encontró el ítem de catálogo.')
  return i
}

/** Lista los ítems de un catálogo. */
export class ListarCatalogoUseCase {
  constructor(private readonly repo: ICatalogRepository) {}
  async execute(tipo: CatalogTipo): Promise<CatalogItemOutput[]> {
    return (await this.repo.findByTipo(tipo)).map(toOutput)
  }
}

/** Agrega un ítem a un catálogo (valor único dentro del tipo). */
export class AgregarItemUseCase {
  constructor(private readonly repo: ICatalogRepository) {}
  async execute(tipo: CatalogTipo, value: string): Promise<CatalogItemOutput> {
    if (await this.repo.existsValue(tipo, value.trim())) {
      throw new ValidationError('Ese valor ya existe en el catálogo.')
    }
    const item = CatalogItem.crear({ id: randomUUID(), tipo, value })
    await this.repo.save(item)
    return toOutput(item)
  }
}

/** Renombra el valor de un ítem. */
export class RenombrarItemUseCase {
  constructor(private readonly repo: ICatalogRepository) {}
  async execute(id: string, value: string): Promise<CatalogItemOutput> {
    const item = await cargar(this.repo, id)
    item.renombrar(value)
    await this.repo.update(item)
    return toOutput(item)
  }
}

/** Activa/desactiva un ítem (borrado lógico). */
export class ToggleItemUseCase {
  constructor(private readonly repo: ICatalogRepository) {}
  async execute(id: string): Promise<CatalogItemOutput> {
    const item = await cargar(this.repo, id)
    item.toggle()
    await this.repo.update(item)
    return toOutput(item)
  }
}
