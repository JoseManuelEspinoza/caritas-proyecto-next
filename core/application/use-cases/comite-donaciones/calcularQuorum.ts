export type EstadoQuorum =
  | { tipo: "EN_CURSO" }
  | { tipo: "APROBAR" }
  | { tipo: "RECHAZAR" };

const TOPE_QUORUM = 4;

export function calcularUmbral(n: number): number {
  if (n < 1) {
    throw new Error("Comité sin miembros activos: no se puede calcular umbral.");
  }
  const mayoria = Math.floor(n / 2) + 1;
  return Math.min(TOPE_QUORUM, mayoria);
}

export function evaluarQuorum(
  n: number,
  aFavor: number,
  enContra: number
): EstadoQuorum {
  const u = calcularUmbral(n);
  if (aFavor >= u) return { tipo: "APROBAR" };
  if (enContra > n - u) return { tipo: "RECHAZAR" };
  return { tipo: "EN_CURSO" };
}
