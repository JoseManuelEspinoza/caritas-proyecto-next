/**
 * Configuración ÚNICA de subida de archivos del sistema.
 *
 * Aquí vive la verdad sobre qué tipos de archivo se aceptan y con qué tamaño
 * máximo, por categoría. La validación se ejecuta IGUAL en el cliente (antes
 * de subir) y en el servidor (al prefirmar), así ninguna vista inventa sus
 * propias reglas.
 *
 * Este módulo es isomorfo: no importa nada de Next ni de AWS.
 */

export type CategoriaArchivo = "imagen" | "documento" | "video" | "evidencia" | "material";

/** Extensiones permitidas por categoría (en minúsculas, sin punto). */
const EXTENSIONES: Record<CategoriaArchivo, string[]> = {
  imagen: ["png", "jpg", "jpeg", "gif", "webp", "heic"],
  documento: ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv"],
  video: ["mp4", "mov", "avi", "mkv", "webm"],
  // Evidencias de campo: fotos, videos o documentos.
  evidencia: [],
  // Materiales de capacitación: documentos, videos o imágenes.
  material: [],
};
EXTENSIONES.evidencia = [...EXTENSIONES.imagen, ...EXTENSIONES.video, ...EXTENSIONES.documento];
EXTENSIONES.material = [...EXTENSIONES.documento, ...EXTENSIONES.video, ...EXTENSIONES.imagen];

/** Prefijos de MIME type aceptados por categoría (complementa a la extensión). */
const MIME_PREFIJOS: Record<CategoriaArchivo, string[]> = {
  imagen: ["image/"],
  documento: ["application/", "text/"],
  video: ["video/"],
  evidencia: ["image/", "video/", "application/", "text/"],
  material: ["image/", "video/", "application/", "text/"],
};

/** Tamaño máximo por categoría, en MB. */
export const MAX_MB: Record<CategoriaArchivo, number> = {
  imagen: 10,
  documento: 20,
  video: 100,
  evidencia: 100,
  material: 100,
};

/** Valor para el atributo `accept` del input file, por categoría. */
export const ACCEPT: Record<CategoriaArchivo, string> = {
  imagen: "image/*",
  documento: EXTENSIONES.documento.map((e) => `.${e}`).join(","),
  video: "video/*",
  evidencia: ["image/*", "video/*", ...EXTENSIONES.documento.map((e) => `.${e}`)].join(","),
  material: ["image/*", "video/*", ...EXTENSIONES.documento.map((e) => `.${e}`)].join(","),
};

/** Texto de ayuda para mostrar bajo el botón de subida. */
export const HINT: Record<CategoriaArchivo, string> = {
  imagen: `Imágenes (máx. ${MAX_MB.imagen} MB)`,
  documento: `PDF, Word, Excel, PowerPoint o texto (máx. ${MAX_MB.documento} MB)`,
  video: `Videos (máx. ${MAX_MB.video} MB)`,
  evidencia: `Fotos, videos o documentos (máx. ${MAX_MB.evidencia} MB)`,
  material: `Documentos, videos o imágenes (máx. ${MAX_MB.material} MB)`,
};

function extensionDe(nombre: string): string {
  const idx = nombre.lastIndexOf(".");
  return idx >= 0 ? nombre.slice(idx + 1).toLowerCase() : "";
}

/**
 * Valida nombre/tipo/tamaño de un archivo contra una categoría.
 * Devuelve un mensaje de error legible, o `null` si el archivo es válido.
 */
export function validarArchivo(
  archivo: { name: string; type?: string | null; size: number },
  categoria: CategoriaArchivo
): string | null {
  const ext = extensionDe(archivo.name);
  const extOk = EXTENSIONES[categoria].includes(ext);
  // El MIME del navegador puede venir vacío; basta con que extensión O mime cuadren.
  const mimeOk = !!archivo.type && MIME_PREFIJOS[categoria].some((p) => archivo.type!.startsWith(p));
  if (!extOk && !mimeOk) {
    return `"${archivo.name}" no es un tipo de archivo permitido. Se acepta: ${HINT[categoria]}.`;
  }
  const maxBytes = MAX_MB[categoria] * 1024 * 1024;
  if (archivo.size > maxBytes) {
    const mb = (archivo.size / 1024 / 1024).toFixed(1);
    return `"${archivo.name}" pesa ${mb} MB y el máximo permitido es ${MAX_MB[categoria]} MB.`;
  }
  return null;
}

/** Destinos de subida registrados: carpeta en S3 + categoría de validación. */
export const TIPOS_UPLOAD = {
  "evidencia-incidencia": { prefijo: "evidencias/incidencias", categoria: "evidencia" },
  "evidencia-simulacro": { prefijo: "evidencias/simulacros", categoria: "evidencia" },
  "material-capacitacion": { prefijo: "capacitaciones/materiales", categoria: "material" },
} as const satisfies Record<string, { prefijo: string; categoria: CategoriaArchivo }>;

export type TipoUpload = keyof typeof TIPOS_UPLOAD;
