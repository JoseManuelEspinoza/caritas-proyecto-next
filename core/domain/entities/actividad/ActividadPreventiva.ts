import { Guard } from "../../shared/Guard";
import { BusinessRuleError } from "../../errors/DomainError";

export type EstadoActividad =
  | "PROGRAMADA"
  | "ASIGNADA"
  | "EJECUTADA"
  | "OBSERVADA"
  | "VALIDADA"
  | "CANCELADA";

/** Transiciones permitidas */
const TRANSICIONES: Record<EstadoActividad, EstadoActividad[]> = {
  PROGRAMADA: ["ASIGNADA", "CANCELADA"],
  ASIGNADA:   ["EJECUTADA", "CANCELADA"],
  EJECUTADA:  ["OBSERVADA", "VALIDADA"],
  OBSERVADA:  ["EJECUTADA"],
  VALIDADA:   [],
  CANCELADA:  [],
};

function assertTransicion(desde: EstadoActividad, hacia: EstadoActividad) {
  if (!TRANSICIONES[desde].includes(hacia)) {
    throw new BusinessRuleError(
      `No se puede pasar de ${desde} a ${hacia}.`
    );
  }
}

export interface ActividadProps {
  id: string;
  idParroquia: string;
  idUsuarioRegistroGRD: string;
  idTipoActividadPreventiva: string;
  idPlanTrabajoGRD?: string | null;
  idBrigadistaResponsable?: string | null; // legacy — usar SimulacroBrigadista
  idUsuarioResponsableGRD?: string | null; // autoasignación
  codigoActividad?: string | null;
  nombreActividad: string;
  fechaProgramada?: string | null;
  horarioInicio?: string | null;
  fechaEjecucion?: string | null;
  lugarActividad?: string | null;
  publicoObjetivo?: string | null;
  numeroParticipantesEstimado?: number | null;
  numeroParticipantesReal?: number | null;
  descripcionActividad?: string | null;
  resultadoGeneral?: string | null;
  recomendaciones?: string | null;
  observaciones?: string | null;
  indicacionesEquipo?: string | null;
  reporteBrigadista?: string | null;
  estadoActividad: EstadoActividad;
}

export class ActividadPreventiva {
  private constructor(private props: ActividadProps) {}

  static crear(input: {
    id: string;
    idParroquia: string;
    idUsuarioRegistroGRD: string;
    idTipoActividadPreventiva: string;
    nombreActividad: string;
    idPlanTrabajoGRD?: string | null;
    codigoActividad?: string | null;
    fechaProgramada?: string | null;
    horarioInicio?: string | null;
    lugarActividad?: string | null;
    publicoObjetivo?: string | null;
    numeroParticipantesEstimado?: number | null;
    descripcionActividad?: string | null;
  }): ActividadPreventiva {
    Guard.required(input.idParroquia, "idParroquia");
    Guard.required(input.idUsuarioRegistroGRD, "idUsuarioRegistroGRD");
    Guard.required(input.idTipoActividadPreventiva, "idTipoActividadPreventiva");
    Guard.minLength(input.nombreActividad, 3, "nombreActividad");
    return new ActividadPreventiva({
      id: input.id,
      idParroquia: input.idParroquia,
      idUsuarioRegistroGRD: input.idUsuarioRegistroGRD,
      idTipoActividadPreventiva: input.idTipoActividadPreventiva,
      idPlanTrabajoGRD: input.idPlanTrabajoGRD ?? null,
      idBrigadistaResponsable: null,
      idUsuarioResponsableGRD: null,
      codigoActividad: input.codigoActividad ?? null,
      nombreActividad: input.nombreActividad.trim(),
      fechaProgramada: input.fechaProgramada ?? null,
      horarioInicio: input.horarioInicio ?? null,
      fechaEjecucion: null,
      lugarActividad: input.lugarActividad ?? null,
      publicoObjetivo: input.publicoObjetivo ?? null,
      numeroParticipantesEstimado: input.numeroParticipantesEstimado ?? null,
      numeroParticipantesReal: null,
      descripcionActividad: input.descripcionActividad ?? null,
      resultadoGeneral: null,
      recomendaciones: null,
      observaciones: null,
      indicacionesEquipo: null,
      reporteBrigadista: null,
      estadoActividad: "PROGRAMADA",
    });
  }

  static desdePersistencia(props: ActividadProps): ActividadPreventiva {
    return new ActividadPreventiva(props);
  }

  // ── PROGRAMADA → ASIGNADA ──────────────────────────────────────────────────
  asignarEquipo(indicaciones?: string): void {
    assertTransicion(this.props.estadoActividad, "ASIGNADA");
    this.props.estadoActividad = "ASIGNADA";
    this.props.indicacionesEquipo = indicaciones ?? null;
  }

  autoasignarme(idUsuario: string, indicaciones?: string): void {
    assertTransicion(this.props.estadoActividad, "ASIGNADA");
    this.props.estadoActividad = "ASIGNADA";
    this.props.idUsuarioResponsableGRD = idUsuario;
    this.props.indicacionesEquipo = indicaciones ?? null;
  }

  // ── ASIGNADA | OBSERVADA → EJECUTADA (brigadista envía reporte) ──────────
  enviarReporte(notas: string): void {
    assertTransicion(this.props.estadoActividad, "EJECUTADA");
    Guard.required(notas, "reporteBrigadista");
    this.props.estadoActividad = "EJECUTADA";
    this.props.fechaEjecucion = new Date().toISOString();
    this.props.reporteBrigadista = notas.trim();
  }

  // ── EJECUTADA → OBSERVADA (especialista devuelve) ─────────────────────────
  observar(comentario: string): void {
    assertTransicion(this.props.estadoActividad, "OBSERVADA");
    Guard.required(comentario, "comentarioObservacion");
    this.props.estadoActividad = "OBSERVADA";
    this.props.observaciones = comentario.trim();
  }

  // ── EJECUTADA → VALIDADA ──────────────────────────────────────────────────
  validar(): void {
    assertTransicion(this.props.estadoActividad, "VALIDADA");
    this.props.estadoActividad = "VALIDADA";
  }

  // ── * → CANCELADA ─────────────────────────────────────────────────────────
  cancelar(motivo: string): void {
    assertTransicion(this.props.estadoActividad, "CANCELADA");
    this.props.estadoActividad = "CANCELADA";
    this.props.observaciones = motivo;
  }

  // ── Legacy (mantener compatibilidad) ──────────────────────────────────────
  /** @deprecated usar enviarReporte */
  ejecutar(datos: {
    resultadoGeneral: string;
    numeroParticipantesReal?: number;
    recomendaciones?: string;
  }): void {
    // Permite transición desde PROGRAMADA (flujo antiguo) o ASIGNADA
    if (!["PROGRAMADA", "ASIGNADA"].includes(this.props.estadoActividad)) {
      throw new BusinessRuleError(
        `No se puede ejecutar una actividad en estado ${this.props.estadoActividad}.`
      );
    }
    this.props.estadoActividad = "EJECUTADA";
    this.props.fechaEjecucion = new Date().toISOString();
    this.props.resultadoGeneral = datos.resultadoGeneral;
    this.props.numeroParticipantesReal = datos.numeroParticipantesReal ?? null;
    this.props.recomendaciones = datos.recomendaciones ?? null;
  }

  /** @deprecated usar asignarEquipo */
  asignarResponsable(idBrigadista: string): void {
    if (this.props.estadoActividad !== "PROGRAMADA") {
      throw new BusinessRuleError("Solo se puede asignar responsable a una actividad PROGRAMADA.");
    }
    this.props.idBrigadistaResponsable = idBrigadista;
  }

  get id(): string { return this.props.id; }
  get snapshot(): Readonly<ActividadProps> { return this.props; }
}
