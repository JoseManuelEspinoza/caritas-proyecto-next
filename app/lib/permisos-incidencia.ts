import type { FrontendRole } from "@/app/lib/roles";
import type { EstadoIncidencia } from "@/core/domain/entities/incidencia/EstadoIncidencia";
import type { IncidenciaDetalleOutput } from "@/core/application/dtos/IncidenciaDetalleDTO";

/** Contexto necesario para decidir qué puede hacer el usuario sobre una incidencia. */
export interface ContextoPermisos {
  rol: FrontendRole;
  estado: EstadoIncidencia;
  esResponsableGRD: boolean;
  esBrigadistaAsignado: boolean;
}

/** Capacidades del usuario sobre la incidencia, derivadas de su rol y el estado. */
export interface PermisosIncidencia {
  /** Gestionar el equipo de brigadistas. */
  puedeAsignar: boolean;
  /** Elaborar/enviar el informe de evaluación al Comité. */
  puedeEvaluar: boolean;
  /** Decidir como Comité (aprobar/observar/rechazar). */
  puedeDecidir: boolean;
  /** Registrar la entrega de ayuda (atender). GRD o brigadista asignado. */
  puedeAtender: boolean;
  /** Decidir seguimiento/cierre tras la atención. Solo Especialista GRD. */
  puedeDecidirSeguimiento: boolean;
  /** Registrar el seguimiento post-atención. */
  puedeSeguir: boolean;
}

const ES_GRD = (rol: FrontendRole) => rol === "admin" || rol === "especialistaGRD";
const ES_COMITE = (rol: FrontendRole) => rol === "admin" || rol === "comite";

/**
 * Única fuente de verdad para los permisos del flujo de incidencias.
 * Reemplaza las comparaciones `role === "..."` dispersas por la UI.
 */
export function permisosIncidencia(ctx: ContextoPermisos): PermisosIncidencia {
  return {
    puedeAsignar: ES_GRD(ctx.rol),
    puedeEvaluar: ES_GRD(ctx.rol),
    puedeDecidir: ES_COMITE(ctx.rol),
    // El brigadista asignado registra la entrega del caso aprobado (recopilación);
    // los no asignados solo pueden visualizarla. La decisión de seguimiento/cierre
    // sigue siendo exclusiva del Especialista GRD (ver `puedeDecidirSeguimiento`).
    puedeAtender: ES_GRD(ctx.rol) || ctx.esBrigadistaAsignado,
    puedeDecidirSeguimiento: ES_GRD(ctx.rol),
    // Registrar el seguimiento es exclusivo del responsable asignado a esa fase:
    // el brigadista asignado o el GRD que se auto-asignó como responsable. Un
    // especialista NO asignado solo puede visualizar lo que registró el brigadista.
    puedeSeguir: ctx.esResponsableGRD || ctx.esBrigadistaAsignado,
  };
}

/** Conveniencia: arma el contexto de permisos desde el read-model de detalle. */
export function permisosDeDetalle(
  d: Pick<
    IncidenciaDetalleOutput,
    "role" | "estadoActual" | "isResponsableGRD" | "isBrigadistaAsignado"
  >
): PermisosIncidencia {
  return permisosIncidencia({
    rol: d.role,
    estado: d.estadoActual as EstadoIncidencia,
    esResponsableGRD: d.isResponsableGRD,
    esBrigadistaAsignado: d.isBrigadistaAsignado,
  });
}
