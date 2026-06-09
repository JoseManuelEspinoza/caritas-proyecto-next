// Extrae texto de un PDF en el navegador.
//  1) Primero intenta la capa de texto (PDF.js) — rápido y exacto.
//  2) Si el PDF es escaneado (imagen, sin texto), recurre a OCR con Tesseract.js.

import { resolveHeaderKey } from "./import-personas";

type ProgresoCb = (info: { fase: "texto" | "ocr"; pagina: number; total: number }) => void;

type Celda = { x: number; text: string };
type Fila = { y: number; celdas: Celda[] };

async function cargarPdf(file: File) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  const data = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data }).promise;
  return pdf;
}

/** Reconstruye filas con celdas (separadas por huecos en X) de una página. */
function construirFilas(items: { str: string; transform: number[]; width: number }[]): Fila[] {
  const porY = new Map<number, { x: number; text: string; w: number; fs: number }[]>();
  for (const it of items) {
    if (!it.str) continue;
    const y = Math.round(it.transform[5] / 3) * 3;
    if (!porY.has(y)) porY.set(y, []);
    porY
      .get(y)!
      .push({ x: it.transform[4], text: it.str, w: it.width, fs: Math.abs(it.transform[0]) || 10 });
  }
  const filas: Fila[] = [];
  for (const y of Array.from(porY.keys()).sort((a, b) => b - a)) {
    const its = porY.get(y)!.sort((a, b) => a.x - b.x);
    const celdas: Celda[] = [];
    let cur = "";
    let curX = 0;
    let prevEnd = -Infinity;
    for (const it of its) {
      const charW = it.fs * 0.5;
      // Nueva celda cuando el hueco entre fragmentos es claramente de columna.
      if (cur && it.x - prevEnd > charW * 1.6) {
        celdas.push({ x: curX, text: cur.trim() });
        cur = "";
      }
      if (!cur) curX = it.x;
      cur += (cur ? " " : "") + it.text;
      prevEnd = it.x + it.text.length * charW; // ancho estimado (consistente entre PDF.js node/browser)
    }
    if (cur.trim()) celdas.push({ x: curX, text: cur.trim() });
    if (celdas.length) filas.push({ y, celdas });
  }
  return filas;
}

/** Capa de texto: devuelve el texto plano y las filas/celdas (para tablas). */
async function extraerCapaTexto(
  pdf: Awaited<ReturnType<typeof cargarPdf>>,
  onProgress?: ProgresoCb
): Promise<{ texto: string; filas: Fila[] }> {
  const lineas: string[] = [];
  const todasFilas: Fila[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    onProgress?.({ fase: "texto", pagina: p, total: pdf.numPages });
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const items = content.items.filter(
      (i) => "str" in i && !!(i as { str?: string }).str
    ) as { str: string; transform: number[]; width: number }[];
    const filas = construirFilas(items);
    todasFilas.push(...filas);
    for (const f of filas) lineas.push(f.celdas.map((c) => c.text).join(" "));
    // Nota: no se inserta línea en blanco entre páginas para no partir a una
    // persona cuyo bloque continúa en la página siguiente.
  }
  return { texto: lineas.join("\n"), filas: todasFilas };
}

/**
 * Intenta interpretar las filas como una TABLA: detecta la fila de encabezados
 * (≥3 columnas reconocidas) y asigna cada celda a su columna por cercanía en X.
 * Devuelve filas como objetos { encabezado: valor } (vacío si no hay tabla).
 */
export function tablaDeFilas(filas: Fila[]): Record<string, string>[] {
  const esEncabezado = (f: Fila) => f.celdas.filter((c) => resolveHeaderKey(c.text)).length >= 3;
  const headerIdx = filas.findIndex(esEncabezado);
  if (headerIdx === -1) return [];

  const cols = filas[headerIdx].celdas.map((c) => ({ x: c.x, key: c.text }));
  const out: Record<string, string>[] = [];
  for (let i = headerIdx + 1; i < filas.length; i++) {
    const fila = filas[i];
    if (esEncabezado(fila)) continue; // encabezado repetido (otra página) → omitir
    const obj: Record<string, string> = {};
    for (const celda of fila.celdas) {
      let best = cols[0];
      let bestD = Infinity;
      for (const col of cols) {
        const d = Math.abs(col.x - celda.x);
        if (d < bestD) {
          bestD = d;
          best = col;
        }
      }
      obj[best.key] = obj[best.key] ? `${obj[best.key]} ${celda.text}` : celda.text;
    }
    if (Object.keys(obj).length > 0) out.push(obj);
  }
  return out;
}

/** Renderiza cada página a imagen y la pasa por OCR (Tesseract.js, español). */
async function ocrPdf(
  pdf: Awaited<ReturnType<typeof cargarPdf>>,
  onProgress?: ProgresoCb
): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  // Un único worker compartido entre todas las páginas: evita descargar el
  // modelo de idioma N veces y elimina la fuga de procesos trabajadores.
  const worker = await createWorker("spa");
  try {
    const partes: string[] = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      onProgress?.({ fase: "ocr", pagina: p, total: pdf.numPages });
      const page = await pdf.getPage(p);
      const viewport = page.getViewport({ scale: 2 }); // mayor escala = mejor OCR
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d")!;
      await page.render({ canvas, canvasContext: ctx, viewport }).promise;
      const { data } = await worker.recognize(canvas);
      partes.push(data.text);
      // Libera recursos de la página y del canvas tras cada iteración.
      page.cleanup();
      canvas.width = 0;
      canvas.height = 0;
    }
    return partes.join("\n");
  } finally {
    await worker.terminate();
  }
}

/** ¿El texto extraído es demasiado pobre? → probablemente es un PDF escaneado. */
function pareceEscaneado(texto: string): boolean {
  return texto.replace(/\s/g, "").length < 25;
}

/**
 * Extrae el texto del PDF de forma inteligente: capa de texto y, si está vacío
 * (PDF escaneado), OCR. Devuelve { texto, usoOcr }.
 */
export async function extraerTextoPdf(
  file: File,
  onProgress?: ProgresoCb
): Promise<{ texto: string; usoOcr: boolean; tabla: Record<string, string>[] }> {
  const pdf = await cargarPdf(file);
  const { texto, filas } = await extraerCapaTexto(pdf, onProgress);
  if (!pareceEscaneado(texto)) {
    return { texto, usoOcr: false, tabla: tablaDeFilas(filas) };
  }
  // Sin texto seleccionable → OCR (sin estructura de tabla)
  const textoOcr = await ocrPdf(pdf, onProgress);
  return { texto: textoOcr, usoOcr: true, tabla: [] };
}
