import { BrigadistaParroquial } from '../entities/brigadista/BrigadistaParroquial'

export interface IBrigadistaRepository {
  save(brigadista: BrigadistaParroquial): Promise<void>
  update(brigadista: BrigadistaParroquial): Promise<void>
  findById(id: string): Promise<BrigadistaParroquial | null>
  findAll(): Promise<BrigadistaParroquial[]>
  /** Devuelve el id del brigadista con ese DNI, o null. Para validar unicidad. */
  findIdByDni(dni: string): Promise<string | null>
}
