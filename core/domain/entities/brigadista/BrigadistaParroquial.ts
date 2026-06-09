import { Guard } from "../../shared/Guard";
import { BusinessRuleError } from "../../errors/DomainError";

/** Estados de actividad del brigadista en el padrón. */
export const ESTADO = { ACTIVO: "ACTIVO", INACTIVO: "INACTIVO" } as const;
/** Estados de disponibilidad operativa. */
export const DISPONIBILIDAD = {
  DISPONIBLE: "DISPONIBLE",
  NO_DISPONIBLE: "NO DISPONIBLE",
  EN_CAMPO: "EN CAMPO",
} as const;

export interface BrigadistaProps {
  id: string;
  idParroquia: string;
  idUsuarioGRD?: string | null;
  idCertificacionCurso?: string | null;
  dni?: string | null;
  nombres: string;
  apellidos?: string | null;
  celular?: string | null;
  correo?: string | null;
  disponibilidad: string;
  estado: string;
  fechaRegistro: Date;
}

/**
 * Entidad del padrón de brigadistas parroquiales (modelo DER `BrigadistaParroquial`).
 *
 * Reglas que protege:
 *  - nombres y parroquia son obligatorios;
 *  - solo un brigadista ACTIVO puede quedar DISPONIBLE o EN CAMPO;
 *  - al desactivarlo deja de estar disponible.
 *
 * La unicidad del DNI es responsabilidad del repositorio (lo verifica el caso de uso).
 * TypeScript puro — sin Prisma ni Next.js.
 */
export class BrigadistaParroquial {
  private constructor(private props: BrigadistaProps) {}
  private static assertDisponibilidadValida(valor: string): void {
    const validas = Object.values(DISPONIBILIDAD) as string[];

    if (!validas.includes(valor)) {
      throw new BusinessRuleError("Disponibilidad no válida para el brigadista.");
    }
  }
  static crear(input: {
    id: string;
    idParroquia: string;
    nombres: string;
    apellidos?: string | null;
    dni?: string | null;
    celular?: string | null;
    correo?: string | null;
    disponibilidad?: string;
  }): BrigadistaParroquial {
    Guard.required(input.nombres, "nombres");
    Guard.required(input.apellidos, "apellidos");
    Guard.required(input.idParroquia, "idParroquia");

    const disponibilidad = input.disponibilidad || DISPONIBILIDAD.DISPONIBLE;
    BrigadistaParroquial.assertDisponibilidadValida(disponibilidad);
    return new BrigadistaParroquial({
      id: input.id,
      idParroquia: input.idParroquia,
      nombres: input.nombres.trim(),
      apellidos: input.apellidos?.trim() || null,
      dni: input.dni?.trim() || null,
      celular: input.celular?.trim() || null,
      correo: input.correo?.trim() || null,
      disponibilidad,
      estado: ESTADO.ACTIVO,
      fechaRegistro: new Date(),
    });
  }

  static desdePersistencia(props: BrigadistaProps): BrigadistaParroquial {
    return new BrigadistaParroquial(props);
  }

  /** Actualiza los datos editables del brigadista. */
  actualizarDatos(input: {
    idParroquia: string;
    nombres: string;
    apellidos?: string | null;
    dni?: string | null;
    celular?: string | null;
    correo?: string | null;
    disponibilidad?: string;
  }): void {
    Guard.required(input.nombres, "nombres");
    Guard.required(input.apellidos, "apellidos");
    Guard.required(input.idParroquia, "idParroquia");
    this.props.idParroquia = input.idParroquia;
    this.props.nombres = input.nombres.trim();
    this.props.apellidos = input.apellidos?.trim() || null;
    this.props.dni = input.dni?.trim() || null;
    this.props.celular = input.celular?.trim() || null;
    this.props.correo = input.correo?.trim() || null;
    if (input.disponibilidad) this.setDisponibilidad(input.disponibilidad);
  }

  /** Alterna ACTIVO ↔ INACTIVO. Al desactivar, deja de estar disponible. */
  toggleEstado(): void {
    if (this.props.estado === ESTADO.ACTIVO) {
      this.props.estado = ESTADO.INACTIVO;
      this.props.disponibilidad = DISPONIBILIDAD.NO_DISPONIBLE;
    } else {
      this.props.estado = ESTADO.ACTIVO;
    }
  }

  /** Alterna DISPONIBLE ↔ NO DISPONIBLE (requiere estar ACTIVO para ponerse disponible). */
  toggleDisponibilidad(): void {
    const quiereDisponible = this.props.disponibilidad !== DISPONIBILIDAD.DISPONIBLE;
    this.setDisponibilidad(
      quiereDisponible ? DISPONIBILIDAD.DISPONIBLE : DISPONIBILIDAD.NO_DISPONIBLE
    );
  }

  /** Marca al brigadista como ocupado en campo (al asignarlo a una incidencia). */
  marcarEnCampo(): void {
    this.setDisponibilidad(DISPONIBILIDAD.EN_CAMPO);
  }

  /** Libera al brigadista (al cerrar el caso). */
  liberar(): void {
    if (this.props.estado === ESTADO.ACTIVO) this.props.disponibilidad = DISPONIBILIDAD.DISPONIBLE;
  }

  private setDisponibilidad(valor: string): void {
    BrigadistaParroquial.assertDisponibilidadValida(valor);
    if (valor !== DISPONIBILIDAD.NO_DISPONIBLE && this.props.estado !== ESTADO.ACTIVO) {
      throw new BusinessRuleError(
        "Un brigadista inactivo no puede marcarse como disponible o en campo."
      );
    }
    this.props.disponibilidad = valor;
  }

  get id(): string {
    return this.props.id;
  }
  get dni(): string | null | undefined {
    return this.props.dni;
  }
  get snapshot(): Readonly<BrigadistaProps> {
    return this.props;
  }
}
