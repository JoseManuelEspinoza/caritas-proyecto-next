import { CatalogItem, CatalogTipo } from '../entities/catalog/CatalogItem'

export interface ICatalogRepository {
  save(item: CatalogItem): Promise<void>
  update(item: CatalogItem): Promise<void>
  findById(id: string): Promise<CatalogItem | null>
  findByTipo(tipo: CatalogTipo): Promise<CatalogItem[]>
  existsValue(tipo: CatalogTipo, value: string): Promise<boolean>
}
