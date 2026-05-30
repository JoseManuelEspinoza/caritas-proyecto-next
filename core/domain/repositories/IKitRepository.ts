import { Kit } from '../entities/kit/Kit'

export interface IKitRepository {
  save(kit: Kit): Promise<void>
  update(kit: Kit): Promise<void>
  findById(id: string): Promise<Kit | null>
  findAll(): Promise<Kit[]>
  nextCorrelativo(): Promise<string>
}
