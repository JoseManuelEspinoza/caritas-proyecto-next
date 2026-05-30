import { Guard } from '../../shared/Guard'

/** Los 9 catálogos de datos maestros del sistema GRD. */
export type CatalogTipo =
  | 'TIPOS_EVENTO'
  | 'ESTADOS'
  | 'DISTRITOS'
  | 'PARROQUIAS'
  | 'CATEGORIAS'
  | 'FUENTES_ALERTA'
  | 'GRUPOS_VULNERABLES'
  | 'NECESIDADES'
  | 'INSTITUCIONES'

export const CATALOG_TIPOS: CatalogTipo[] = [
  'TIPOS_EVENTO',
  'ESTADOS',
  'DISTRITOS',
  'PARROQUIAS',
  'CATEGORIAS',
  'FUENTES_ALERTA',
  'GRUPOS_VULNERABLES',
  'NECESIDADES',
  'INSTITUCIONES',
]

export interface CatalogItemProps {
  id: string
  tipo: CatalogTipo
  value: string
  active: boolean
}

/**
 * Ítem de catálogo (dato maestro).
 *
 * Entidad simple cuya regla es que el valor nunca sea vacío. El borrado es
 * lógico (active=false) para preservar la integridad histórica: un distrito o
 * categoría usado por incidentes antiguos se desactiva, no se elimina.
 */
export class CatalogItem {
  private constructor(private props: CatalogItemProps) {}

  static crear(input: { id: string; tipo: CatalogTipo; value: string }): CatalogItem {
    Guard.required(input.value, 'value')
    return new CatalogItem({ id: input.id, tipo: input.tipo, value: input.value.trim(), active: true })
  }

  static desdePersistencia(props: CatalogItemProps): CatalogItem {
    return new CatalogItem(props)
  }

  renombrar(value: string): void {
    Guard.required(value, 'value')
    this.props.value = value.trim()
  }

  toggle(): void {
    this.props.active = !this.props.active
  }

  get id(): string { return this.props.id }
  get snapshot(): Readonly<CatalogItemProps> { return this.props }
}
