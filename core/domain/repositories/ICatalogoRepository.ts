import { Catalogo, CatalogoDetalle } from '../entities/catalogo/Catalogo'

export interface ICatalogoRepository {
  crearCatalogo(catalogo: Catalogo): Promise<void>
  findCatalogoById(id: string): Promise<Catalogo | null>
  findAllCatalogos(): Promise<Catalogo[]>
  existsNombreCatalogo(nombre: string): Promise<boolean>

  crearDetalle(detalle: CatalogoDetalle): Promise<void>
  actualizarDetalle(detalle: CatalogoDetalle): Promise<void>
  findDetalleById(id: string): Promise<CatalogoDetalle | null>
  findDetallesByCatalogo(idCatalogo: string): Promise<CatalogoDetalle[]>
  existsCodigoEnCatalogo(idCatalogo: string, codigo: string): Promise<boolean>
}
