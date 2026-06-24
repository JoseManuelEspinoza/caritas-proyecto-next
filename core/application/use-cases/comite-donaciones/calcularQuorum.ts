export type EstadoQuorum =
  | { tipo: "EN_CURSO" }
  | { tipo: "APROBAR" }
  | { tipo: "RECHAZAR" };

export function calcularUmbral(n: number): number {
  if (n < 1) {
    throw new Error("Comité sin miembros activos: no se puede calcular umbral.");
  }
  // Aprobación con el 50% o más del total de miembros del comité.
  // ceil(n/2): n=1→1, n=2→1, n=3→2, n=4→2, n=5→3, n=10→5.
  return Math.ceil(n / 2);
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
