import { Prisma } from "@prisma/client";
import type { ActividadPreventiva as ActividadRow } from "@prisma/client";
import {
  ActividadPreventiva,
  EstadoActividad,
} from "../../domain/entities/actividad/ActividadPreventiva";

const iso = (d: Date | null) => (d ? d.toISOString() : null);

export const ActividadMapper = {
  toDomain(row: ActividadRow): ActividadPreventiva {
    return ActividadPreventiva.desdePersistencia({
      id: row.idActividadPreventiva,
      idParroquia: row.idParroquia,
      idUsuarioRegistroGRD: row.idUsuarioRegistroGRD,
      idTipoActividadPreventiva: row.idTipoActividadPreventiva,
      idPlanTrabajoGRD: row.idPlanTrabajoGRD,
      idBrigadistaResponsable: row.idBrigadistaResponsable,
      idUsuarioResponsableGRD: row.idUsuarioResponsableGRD,
      codigoActividad: row.codigoActividad,
      nombreActividad: row.nombreActividad,
      fechaProgramada: iso(row.fechaProgramada),
      horarioInicio: row.horarioInicio,
      fechaEjecucion: iso(row.fechaEjecucion),
      lugarActividad: row.lugarActividad,
      publicoObjetivo: row.publicoObjetivo,
      numeroParticipantesEstimado: row.numeroParticipantesEstimado,
      numeroParticipantesReal: row.numeroParticipantesReal,
      descripcionActividad: row.descripcionActividad,
      resultadoGeneral: row.resultadoGeneral,
      recomendaciones: row.recomendaciones,
      observaciones: row.observaciones,
      indicacionesEquipo: row.indicacionesEquipo,
      reporteBrigadista: row.reporteBrigadista,
      estadoActividad: row.estadoActividad as EstadoActividad,
    });
  },

  toPersistence(a: ActividadPreventiva): Prisma.ActividadPreventivaUncheckedCreateInput {
    const s = a.snapshot;
    return {
      idActividadPreventiva: s.id,
      idParroquia: s.idParroquia,
      idUsuarioRegistroGRD: s.idUsuarioRegistroGRD,
      idTipoActividadPreventiva: s.idTipoActividadPreventiva,
      idPlanTrabajoGRD: s.idPlanTrabajoGRD ?? undefined,
      idBrigadistaResponsable: s.idBrigadistaResponsable ?? undefined,
      idUsuarioResponsableGRD: s.idUsuarioResponsableGRD ?? undefined,
      codigoActividad: s.codigoActividad ?? undefined,
      nombreActividad: s.nombreActividad,
      fechaProgramada: s.fechaProgramada ? new Date(s.fechaProgramada) : undefined,
      horarioInicio: s.horarioInicio ?? undefined,
      fechaEjecucion: s.fechaEjecucion ? new Date(s.fechaEjecucion) : undefined,
      lugarActividad: s.lugarActividad ?? undefined,
      publicoObjetivo: s.publicoObjetivo ?? undefined,
      numeroParticipantesEstimado: s.numeroParticipantesEstimado ?? undefined,
      numeroParticipantesReal: s.numeroParticipantesReal ?? undefined,
      descripcionActividad: s.descripcionActividad ?? undefined,
      resultadoGeneral: s.resultadoGeneral ?? undefined,
      recomendaciones: s.recomendaciones ?? undefined,
      observaciones: s.observaciones ?? undefined,
      indicacionesEquipo: s.indicacionesEquipo ?? undefined,
      reporteBrigadista: s.reporteBrigadista ?? undefined,
      estadoActividad: s.estadoActividad,
    };
  },
};
