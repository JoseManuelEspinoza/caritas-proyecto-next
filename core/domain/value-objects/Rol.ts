/**
 * Roles del sistema GRD (unión de dominio). El mapeo desde el rol persistido y
 * las etiquetas/colores de presentación viven en `app/lib/roles.ts`, que
 * re-exporta este tipo para no duplicar la unión.
 */
export type Rol = "admin" | "especialistaGRD" | "brigadista" | "comite" | "jefaOGP";
