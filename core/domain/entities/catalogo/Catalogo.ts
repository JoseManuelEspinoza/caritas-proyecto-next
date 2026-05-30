import { Guard } from '../../shared/Guard'

const ACTIVO = 'ACTIVO'
const INACTIVO = 'INACTIVO'

export interface CatalogoProps {
  id: string
  nombreCatalogo: string
  descripcion?: string | null
  estado: string
}

/** Catálogo maestro del sistema (modelo DER `CatalogoGRD`). */
export class Catalogo {
  private constructor(private props: CatalogoProps) {}

  static crear(input: { id: string; nombreCatalogo: string; descripcion?: string | null }): Catalogo {
    Guard.required(input.nombreCatalogo, 'nombreCatalogo')
    return new Catalogo({
      id: input.id,
      nombreCatalogo: input.nombreCatalogo.trim(),
      descripcion: input.descripcion?.trim() || null,
      estado: ACTIVO,
    })
  }

  static desdePersistencia(props: CatalogoProps): Catalogo {
    return new Catalogo(props)
  }

  toggle(): void {
    this.props.estado = this.props.estado === ACTIVO ? INACTIVO : ACTIVO
  }

  get id(): string { return this.props.id }
  get snapshot(): Readonly<CatalogoProps> { return this.props }
}

export interface CatalogoDetalleProps {
  id: string
  idCatalogoGRD: string
  codigo: string
  valor: string
  descripcion?: string | null
  orden?: number | null
  estado: string
}

/**
 * Ítem de un catálogo (modelo DER `CatalogoDetalleGRD`).
 *
 * El borrado es lógico (estado = INACTIVO) para no romper las FKs que otras
 * tablas mantienen contra el detalle (evidencias, auditoría).
 */
export class CatalogoDetalle {
  private constructor(private props: CatalogoDetalleProps) {}

  static crear(input: {
    id: string
    idCatalogoGRD: string
    codigo: string
    valor: string
    descripcion?: string | null
    orden?: number | null
  }): CatalogoDetalle {
    Guard.required(input.codigo, 'codigo')
    Guard.required(input.valor, 'valor')
    return new CatalogoDetalle({
      id: input.id,
      idCatalogoGRD: input.idCatalogoGRD,
      codigo: input.codigo.trim(),
      valor: input.valor.trim(),
      descripcion: input.descripcion?.trim() || null,
      orden: input.orden ?? null,
      estado: ACTIVO,
    })
  }

  static desdePersistencia(props: CatalogoDetalleProps): CatalogoDetalle {
    return new CatalogoDetalle(props)
  }

  editar(valor: string, descripcion?: string | null): void {
    Guard.required(valor, 'valor')
    this.props.valor = valor.trim()
    if (descripcion !== undefined) this.props.descripcion = descripcion?.trim() || null
  }

  toggle(): void {
    this.props.estado = this.props.estado === ACTIVO ? INACTIVO : ACTIVO
  }

  get id(): string { return this.props.id }
  get snapshot(): Readonly<CatalogoDetalleProps> { return this.props }
}
