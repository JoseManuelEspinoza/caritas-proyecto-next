import { Guard } from "../../shared/Guard";
import { BusinessRuleError } from "../../errors/DomainError";

export type EstadoAprobacion = "BORRADOR" | "EN_REVISION" | "APROBADO" | "OBSERVADO";

const TRANSICIONES: Record<EstadoAprobacion, EstadoAprobacion[]> = {
  BORRADOR: ["EN_REVISION"],
  EN_REVISION: ["APROBADO", "OBSERVADO"],
  OBSERVADO: ["EN_REVISION"],
  APROBADO: [],
};

export interface PlanProps {
  id: string;
  idParroquia: string;
  idUsuarioResponsableGRD: string;
  codigoPlan?: string | null;
  nombrePlan: string;
  diagnosticoRiesgo?: string | null;
  objetivos?: string | null;
  actividadesGenerales?: string | null;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  rutasEvacuacion?: string | null;
  zonasSeguras?: string | null;
  estadoAprobacion: EstadoAprobacion;
  observaciones?: string | null;
}

export type DatosEditables = Partial<
  Pick<
    PlanProps,
    | "nombrePlan"
    | "diagnosticoRiesgo"
    | "objetivos"
    | "actividadesGenerales"
    | "fechaInicio"
    | "fechaFin"
    | "rutasEvacuacion"
    | "zonasSeguras"
  >
>;

/**
 * Plan de Trabajo GRD por parroquia (modelo DER `PlanTrabajoGRD`).
 *
 * Custodia el flujo de aprobación: BORRADOR → EN_REVISION → APROBADO | OBSERVADO,
 * con reenvío desde OBSERVADO. Solo es editable en BORRADOR u OBSERVADO.
 */
export class PlanTrabajo {
  private constructor(private props: PlanProps) {}

  static crear(input: {
    id: string;
    idParroquia: string;
    idUsuarioResponsableGRD: string;
    codigoPlan?: string | null;
    nombrePlan: string;
    diagnosticoRiesgo?: string | null;
    objetivos?: string | null;
    fechaInicio?: string | null;
    fechaFin?: string | null;
  }): PlanTrabajo {
    Guard.required(input.idParroquia, "idParroquia");
    Guard.required(input.idUsuarioResponsableGRD, "idUsuarioResponsableGRD");
    Guard.minLength(input.nombrePlan, 3, "nombrePlan");
    return new PlanTrabajo({
      id: input.id,
      idParroquia: input.idParroquia,
      idUsuarioResponsableGRD: input.idUsuarioResponsableGRD,
      codigoPlan: input.codigoPlan ?? null,
      nombrePlan: input.nombrePlan.trim(),
      diagnosticoRiesgo: input.diagnosticoRiesgo ?? null,
      objetivos: input.objetivos ?? null,
      actividadesGenerales: null,
      fechaInicio: input.fechaInicio ?? null,
      fechaFin: input.fechaFin ?? null,
      rutasEvacuacion: null,
      zonasSeguras: null,
      estadoAprobacion: "BORRADOR",
      observaciones: null,
    });
  }

  static desdePersistencia(props: PlanProps): PlanTrabajo {
    return new PlanTrabajo(props);
  }

  actualizar(datos: DatosEditables): void {
    if (this.props.estadoAprobacion !== "BORRADOR" && this.props.estadoAprobacion !== "OBSERVADO") {
      throw new BusinessRuleError("Solo se puede editar un plan en BORRADOR u OBSERVADO.");
    }
    Object.assign(this.props, datos);
    if (datos.nombrePlan) Guard.minLength(datos.nombrePlan, 3, "nombrePlan");
  }

  enviarRevision(): void {
    this.transicion("EN_REVISION");
  }
  aprobar(): void {
    this.transicion("APROBADO");
  }
  observar(observaciones: string): void {
    Guard.required(observaciones, "observaciones");
    this.transicion("OBSERVADO");
    this.props.observaciones = observaciones;
  }

  private transicion(destino: EstadoAprobacion): void {
    if (!TRANSICIONES[this.props.estadoAprobacion].includes(destino)) {
      throw new BusinessRuleError(
        `Transición de aprobación no permitida: ${this.props.estadoAprobacion} → ${destino}.`
      );
    }
    this.props.estadoAprobacion = destino;
  }

  get id(): string {
    return this.props.id;
  }
  get snapshot(): Readonly<PlanProps> {
    return this.props;
  }
}
