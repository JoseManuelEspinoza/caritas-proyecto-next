import { Brigadista } from '../entities/Brigadista'

/**
 * Contrato (puerto) para persistir brigadistas.
 *
 * El dominio DEFINE lo que necesita ("quiero poder guardar y buscar
 * brigadistas") sin saber CÓMO se cumple. La implementación concreta vive en la
 * capa de infraestructura (`PrismaBrigadistaRepository`). Esto permite cambiar
 * Prisma por otra cosa, o usar un repo en memoria para tests, sin tocar los
 * casos de uso.
 */
export interface IBrigadistaRepository {
  save(brigadista: Brigadista): Promise<void>
  update(brigadista: Brigadista): Promise<void>
  findById(id: string): Promise<Brigadista | null>
  findByDni(dni: string): Promise<Brigadista | null>
  findAll(): Promise<Brigadista[]>
}
