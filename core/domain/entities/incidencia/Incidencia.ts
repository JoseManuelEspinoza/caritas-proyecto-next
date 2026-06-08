import { EstadoIncidencia, assertTransicion } from "./EstadoIncidencia";
import { BusinessRuleError } from "../../errors/DomainError";

export interface IncidenciaProps {
  id: string;
  codigoCaso?: string | null;
  idAviso?: string | null;
  idParroquia?: string | null;
  tituloIncidencia?: string | null;
  tipoEvento?: string | null;
  gravedad?: string | null;
  estadoActual: EstadoIncidencia;
}

/**
 * Agregado raíz del flujo GRD (modelo DER `Incidencia`).
 *
 * Su responsabilidad de dominio es custodiar la MÁQUINA DE ESTADOS: toda
 * transición se valida aquí contra la tabla de `EstadoIncidencia`. La
 * orquestación de los registros relacionados (aviso, familias, informes,
 * solicitudes, entregas, seguimientos) la hacen los casos de uso a través del
 * repositorio; esta entidad solo decide si el cambio de estado es legal y
 * registra el estado anterior para la auditoría.
 */
export class Incidencia {
  private _estadoAnterior?: EstadoIncidencia;

  private constructor(private props: IncidenciaProps) {}

  static crear(props: Omit<IncidenciaProps, "estadoActual">): Incidencia {
    return new Incidencia({ ...props, estadoActual: "ABIERTO" });
  }

  static desdePersistencia(props: IncidenciaProps): Incidencia {
    return new Incidencia(props);
  }

  /** Solo se puede editar el contenido del incidente mientras está ABIERTO. */
  asegurarEditable(): void {
    if (this.props.estadoActual !== "ABIERTO") {
      throw new BusinessRuleError("Solo se pueden editar incidentes en estado ABIERTO.");
    }
  }

  // ── Transiciones del flujo ────────────────────────────────────────────────
  asignar(): void {
    this.transicion("ASIGNADO");
  }
  registrarCampo(): void {
    this.transicion("DATA RECOPILADA");
  }
  enviarEvaluacion(): void {
    this.transicion("EN EVALUACION");
  }
  aprobar(): void {
    this.transicion("APROBADO");
  }
  observar(): void {
    this.transicion("OBSERVADO");
  }
  rechazar(): void {
    this.transicion("RECHAZADO");
  }
  atender(): void {
    this.transicion("ATENDIDO");
  }
  iniciarSeguimiento(): void {
    this.transicion("SEGUIMIENTO ABIERTO");
  }
  cerrar(): void {
    this.transicion("CERRADO");
  }

  private transicion(destino: EstadoIncidencia): void {
    assertTransicion(this.props.estadoActual, destino);
    this._estadoAnterior = this.props.estadoActual;
    this.props.estadoActual = destino;
  }

  get id(): string {
    return this.props.id;
  }
  get estadoActual(): EstadoIncidencia {
    return this.props.estadoActual;
  }
  get estadoAnterior(): EstadoIncidencia | undefined {
    return this._estadoAnterior;
  }
  get idAviso(): string | null | undefined {
    return this.props.idAviso;
  }
  get snapshot(): Readonly<IncidenciaProps> {
    return this.props;
  }
}
