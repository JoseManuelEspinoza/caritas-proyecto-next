import { Plan } from '../entities/plan/Plan'

export interface IPlanRepository {
  save(plan: Plan): Promise<void>
  update(plan: Plan): Promise<void>
  remove(id: string): Promise<void>
  findById(id: string): Promise<Plan | null>
  findAll(): Promise<Plan[]>
  nextCorrelativo(): Promise<string>
}
