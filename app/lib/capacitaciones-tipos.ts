/**
 * Tipos de material de capacitación. Lista funcional de la UI (cada tipo tiene
 * comportamiento propio: enlace vs archivo), compartida entre las vistas de
 * admin/especialista y la validación del servidor — una sola fuente.
 */
export const TIPOS_MATERIAL: readonly string[] = [
  "Documento (PDF, Word, Excel)",
  "Presentación",
  "Video",
  "Enlace web",
  "Otro",
];
