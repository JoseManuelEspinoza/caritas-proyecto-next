import { Guard } from "../../shared/Guard";
import { BusinessRuleError } from "../../errors/DomainError";

export type TipoMovimiento = "INGRESO" | "ENTREGA" | "REPOSICION";

export interface KitProps {
  id: string;
  tipoKit: string;
  descripcion?: string | null;
  stockActual: number;
  estadoKit: string;
  codigoAlmacen?: string | null;
  ubicacionAlmacen?: string | null;
  idParroquiaBeneficiaria?: string | null;
}

/**
 * Kit / Mochila de emergencia (modelo DER `KitEmergencia`).
 *
 * Invariante de dominio: el stock NUNCA puede quedar negativo. Cada movimiento
 * lo ajusta según su tipo (ingreso/reposición suman, entrega resta) y la entidad
 * rechaza entregas sin saldo suficiente.
 */
export class KitEmergencia {
  private constructor(private props: KitProps) {}
  private static assertTipoMovimientoValido(tipo: string): asserts tipo is TipoMovimiento {
    const validos: TipoMovimiento[] = ["INGRESO", "ENTREGA", "REPOSICION"];

    if (!validos.includes(tipo as TipoMovimiento)) {
      throw new BusinessRuleError("Tipo de movimiento no válido para el kit.");
    }
  }

  private static assertEntero(value: number, campo: string): void {
    if (!Number.isInteger(value)) {
      throw new BusinessRuleError(`${campo} debe ser un número entero.`);
    }
  }
  static crear(input: {
    id: string;
    tipoKit: string;
    descripcion?: string | null;
    stockInicial?: number;
    codigoAlmacen?: string | null;
    ubicacionAlmacen?: string | null;
    idParroquiaBeneficiaria?: string | null;
  }): KitEmergencia {
    Guard.required(input.tipoKit, "tipoKit");
    const stock = input.stockInicial ?? 0;
    KitEmergencia.assertEntero(stock, "stockInicial");
    Guard.nonNegative(stock, "stockInicial");
    return new KitEmergencia({
      id: input.id,
      tipoKit: input.tipoKit.trim(),
      descripcion: input.descripcion?.trim() || null,
      stockActual: stock,
      estadoKit: "ACTIVO",
      codigoAlmacen: input.codigoAlmacen?.trim() || null,
      ubicacionAlmacen: input.ubicacionAlmacen?.trim() || null,
      idParroquiaBeneficiaria: input.idParroquiaBeneficiaria ?? null,
    });
  }

  static desdePersistencia(props: KitProps): KitEmergencia {
    return new KitEmergencia(props);
  }

  /** Ajusta el stock según el tipo de movimiento. Bloquea entregas sin saldo. */
  aplicarMovimiento(tipo: TipoMovimiento, cantidad: number): void {
    if (this.props.estadoKit === "ARCHIVADO") {
      throw new BusinessRuleError("No se pueden registrar movimientos en un kit archivado.");
    }
    KitEmergencia.assertTipoMovimientoValido(tipo);
    KitEmergencia.assertEntero(cantidad, "cantidad");    
    Guard.positive(cantidad, "cantidad");
    const delta = tipo === "ENTREGA" ? -cantidad : cantidad;
    const nuevo = this.props.stockActual + delta;
    if (nuevo < 0) {
      throw new BusinessRuleError(
        `Stock insuficiente: hay ${this.props.stockActual} y se intentan entregar ${cantidad}.`
      );
    }
    this.props.stockActual = nuevo;
  }

  /** Archiva el kit: queda inactivo (no admite movimientos) pero conserva su historial. */
  archivar(): void {
    if (this.props.estadoKit === "ARCHIVADO") {
      throw new BusinessRuleError("El kit ya está archivado.");
    }
    this.props.estadoKit = "ARCHIVADO";
  }

  get id(): string {
    return this.props.id;
  }
  get stockActual(): number {
    return this.props.stockActual;
  }
  get estadoKit(): string {
    return this.props.estadoKit;
  }
  get snapshot(): Readonly<KitProps> {
    return this.props;
  }
}
