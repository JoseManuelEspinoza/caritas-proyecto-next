import { prisma } from "@/app/lib/prisma";
import { PlanTrabajo } from "../../domain/entities/plan/PlanTrabajo";
import { IPlanRepository } from "../../domain/repositories/IPlanRepository";
import { PlanMapper } from "../mappers/PlanMapper";

export class PrismaPlanRepository implements IPlanRepository {
  async save(plan: PlanTrabajo): Promise<void> {
    await prisma.planTrabajoGRD.create({ data: PlanMapper.toPersistence(plan) });
  }

  async update(plan: PlanTrabajo): Promise<void> {
    const { idPlanTrabajoGRD, ...data } = PlanMapper.toPersistence(plan);
    await prisma.planTrabajoGRD.update({ where: { idPlanTrabajoGRD }, data });
  }

  async findById(id: string): Promise<PlanTrabajo | null> {
    const row = await prisma.planTrabajoGRD.findUnique({ where: { idPlanTrabajoGRD: id } });
    return row ? PlanMapper.toDomain(row) : null;
  }

  async findAll(): Promise<PlanTrabajo[]> {
    const rows = await prisma.planTrabajoGRD.findMany({ orderBy: { nombrePlan: "asc" } });
    return rows.map(PlanMapper.toDomain);
  }

  async nextCodigo(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `PLAN-${year}-`;
    const count = await prisma.planTrabajoGRD.count({
      where: { codigoPlan: { startsWith: prefix } },
    });
    return `${prefix}${String(count + 1).padStart(4, "0")}`;
  }
}
