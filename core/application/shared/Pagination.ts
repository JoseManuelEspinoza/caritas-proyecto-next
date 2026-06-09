/**
 * Tipos compartidos de paginación para los casos de uso de listado.
 * Planos y sin comportamiento — cruzan la frontera presentación ↔ aplicación.
 */
export interface PageQuery {
  page?: number; // 1-based
  pageSize?: number;
  search?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Normaliza una PageQuery aplicando valores por defecto seguros. */
export function normalizePage(
  q: PageQuery | undefined
): Required<Omit<PageQuery, "search">> & { search?: string } {
  const page = Math.max(1, Math.floor(q?.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Math.floor(q?.pageSize ?? 20)));
  return { page, pageSize, search: q?.search };
}
