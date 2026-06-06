import { PlanTrabajo } from "../entities/plan/PlanTrabajo";

export interface IPlanRepository {
  save(plan: PlanTrabajo): Promise<void>;
  update(plan: PlanTrabajo): Promise<void>;
  findById(id: string): Promise<PlanTrabajo | null>;
  findAll(): Promise<PlanTrabajo[]>;
  nextCodigo(): Promise<string>;
}
