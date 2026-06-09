import { Prisma } from "@prisma/client";
import type { PlanTrabajoGRD as PlanRow } from "@prisma/client";
import { PlanTrabajo, EstadoAprobacion } from "../../domain/entities/plan/PlanTrabajo";

const iso = (d: Date | null) => (d ? d.toISOString() : null);

export const PlanMapper = {
  toDomain(row: PlanRow): PlanTrabajo {
    return PlanTrabajo.desdePersistencia({
      id: row.idPlanTrabajoGRD,
      idParroquia: row.idParroquia,
      idUsuarioResponsableGRD: row.idUsuarioResponsableGRD,
      codigoPlan: row.codigoPlan,
      nombrePlan: row.nombrePlan,
      diagnosticoRiesgo: row.diagnosticoRiesgo,
      objetivos: row.objetivos,
      actividadesGenerales: row.actividadesGenerales,
      fechaInicio: iso(row.fechaInicio),
      fechaFin: iso(row.fechaFin),
      rutasEvacuacion: row.rutasEvacuacion,
      zonasSeguras: row.zonasSeguras,
      estadoAprobacion: row.estadoAprobacion as EstadoAprobacion,
      observaciones: row.observaciones,
    });
  },

  toPersistence(p: PlanTrabajo): Prisma.PlanTrabajoGRDUncheckedCreateInput {
    const s = p.snapshot;
    return {
      idPlanTrabajoGRD: s.id,
      idParroquia: s.idParroquia,
      idUsuarioResponsableGRD: s.idUsuarioResponsableGRD,
      codigoPlan: s.codigoPlan ?? undefined,
      nombrePlan: s.nombrePlan,
      diagnosticoRiesgo: s.diagnosticoRiesgo ?? undefined,
      objetivos: s.objetivos ?? undefined,
      actividadesGenerales: s.actividadesGenerales ?? undefined,
      fechaInicio: s.fechaInicio ? new Date(s.fechaInicio) : undefined,
      fechaFin: s.fechaFin ? new Date(s.fechaFin) : undefined,
      rutasEvacuacion: s.rutasEvacuacion ?? undefined,
      zonasSeguras: s.zonasSeguras ?? undefined,
      estadoAprobacion: s.estadoAprobacion,
      observaciones: s.observaciones ?? undefined,
    };
  },
};
