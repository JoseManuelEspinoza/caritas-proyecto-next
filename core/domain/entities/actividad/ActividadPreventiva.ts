import { Guard } from "../../shared/Guard";
import { BusinessRuleError } from "../../errors/DomainError";

export type EstadoActividad = "PROGRAMADA" | "EJECUTADA" | "CANCELADA";

export interface ActividadProps {
  id: string;
  idParroquia: string;
  idUsuarioRegistroGRD: string;
  idTipoActividadPreventiva: string;
  idPlanTrabajoGRD?: string | null;
  idBrigadistaResponsable?: string | null;
  codigoActividad?: string | null;
  nombreActividad: string;
  fechaProgramada?: string | null;
  fechaEjecucion?: string | null;
  lugarActividad?: string | null;
  publicoObjetivo?: string | null;
  numeroParticipantesEstimado?: number | null;
  numeroParticipantesReal?: number | null;
  descripcionActividad?: string | null;
  resultadoGeneral?: string | null;
  recomendaciones?: string | null;
  observaciones?: string | null;
  estadoActividad: EstadoActividad;
}

/**
 * Actividad preventiva / Simulacro (modelo DER `ActividadPreventiva`).
 *
 * Flujo: PROGRAMADA → EJECUTADA | CANCELADA. Al ejecutarse se registran la
 * fecha real, el resultado y la asistencia; una actividad cancelada o ya
 * ejecutada no admite nuevos cambios de estado.
 */
export class ActividadPreventiva {
  private constructor(private props: ActividadProps) {}
  private static assertEnteroNoNegativo(value: number | null | undefined, campo: string): void {
    if (value == null) return;

    if (!Number.isFinite(value)) {
      throw new BusinessRuleError(`${campo} debe ser un número válido.`);
    }

    if (!Number.isInteger(value)) {
      throw new BusinessRuleError(`${campo} debe ser un número entero.`);
    }

    if (value < 0) {
      throw new BusinessRuleError(`${campo} no puede ser negativo.`);
    }
  }
  static crear(input: {
    id: string;
    idParroquia: string;
    idUsuarioRegistroGRD: string;
    idTipoActividadPreventiva: string;
    nombreActividad: string;
    idPlanTrabajoGRD?: string | null;
    idBrigadistaResponsable?: string | null;
    codigoActividad?: string | null;
    fechaProgramada?: string | null;
    lugarActividad?: string | null;
    publicoObjetivo?: string | null;
    numeroParticipantesEstimado?: number | null;
    descripcionActividad?: string | null;
  }): ActividadPreventiva {
    Guard.required(input.idParroquia, "idParroquia");
    Guard.required(input.idUsuarioRegistroGRD, "idUsuarioRegistroGRD");
    Guard.required(input.idTipoActividadPreventiva, "idTipoActividadPreventiva");
    Guard.minLength(input.nombreActividad, 3, "nombreActividad");
    ActividadPreventiva.assertEnteroNoNegativo(
      input.numeroParticipantesEstimado,
  "numeroParticipantesEstimado"
    );
    return new ActividadPreventiva({
      id: input.id,
      idParroquia: input.idParroquia,
      idUsuarioRegistroGRD: input.idUsuarioRegistroGRD,
      idTipoActividadPreventiva: input.idTipoActividadPreventiva,
      idPlanTrabajoGRD: input.idPlanTrabajoGRD ?? null,
      idBrigadistaResponsable: input.idBrigadistaResponsable ?? null,
      codigoActividad: input.codigoActividad ?? null,
      nombreActividad: input.nombreActividad.trim(),
      fechaProgramada: input.fechaProgramada ?? null,
      fechaEjecucion: null,
      lugarActividad: input.lugarActividad?.trim() || null,
      publicoObjetivo: input.publicoObjetivo?.trim() || null,
      numeroParticipantesEstimado: input.numeroParticipantesEstimado ?? null,
      numeroParticipantesReal: null,
      descripcionActividad: input.descripcionActividad?.trim() || null,
      resultadoGeneral: null,
      recomendaciones: null,
      observaciones: null,
      estadoActividad: "PROGRAMADA",
    });
  }

  static desdePersistencia(props: ActividadProps): ActividadPreventiva {
    return new ActividadPreventiva(props);
  }

  asignarResponsable(idBrigadista: string): void {
    Guard.required(idBrigadista, "idBrigadista");
    if (this.props.estadoActividad !== "PROGRAMADA") {
      throw new BusinessRuleError("Solo se puede asignar responsable a una actividad PROGRAMADA.");
    }
    this.props.idBrigadistaResponsable = idBrigadista;
  }

  /** PROGRAMADA → EJECUTADA: registra la ejecución y sus resultados. */
  ejecutar(datos: {
    resultadoGeneral: string;
    numeroParticipantesReal?: number;
    recomendaciones?: string;
  }): void {
    if (this.props.estadoActividad !== "PROGRAMADA") {
      throw new BusinessRuleError(
        `No se puede ejecutar una actividad en estado ${this.props.estadoActividad}.`
      );
    }
    Guard.minLength(datos.resultadoGeneral, 5, "resultadoGeneral");
    ActividadPreventiva.assertEnteroNoNegativo(
    datos.numeroParticipantesReal,
    "numeroParticipantesReal"
    );
    this.props.estadoActividad = "EJECUTADA";
    this.props.fechaEjecucion = new Date().toISOString();
    this.props.resultadoGeneral = datos.resultadoGeneral.trim();
    this.props.numeroParticipantesReal = datos.numeroParticipantesReal ?? null;
    this.props.recomendaciones = datos.recomendaciones?.trim() || null;
  }

  /** PROGRAMADA → CANCELADA. */
  cancelar(motivo: string): void {
    if (this.props.estadoActividad !== "PROGRAMADA") {
      throw new BusinessRuleError("Solo se puede cancelar una actividad PROGRAMADA.");
    }

    Guard.minLength(motivo, 5, "motivoCancelacion");
    this.props.estadoActividad = "CANCELADA";
    this.props.observaciones = motivo.trim();
  }

  get id(): string {
    return this.props.id;
  }
  get snapshot(): Readonly<ActividadProps> {
    return this.props;
  }
}
