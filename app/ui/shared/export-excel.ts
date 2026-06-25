// Exportación de Excel con estilo unificado (ExcelJS): encabezado con color de
// marca, filas alternas, bordes, autofiltro por columna, panel congelado y
// anchos automáticos. ExcelJS se importa de forma dinámica para no inflar el
// bundle inicial; el archivo se descarga en el navegador.

type CellColor = { bg: string; fg: string };

export type ExcelColumn = { header: string; key?: string; width?: number };

export type ExcelSheetInput = {
  name: string;
  rows: Record<string, string | number | null | undefined>[];
  /** Columnas explícitas; si se omite, se derivan de las claves de las filas. */
  columns?: ExcelColumn[];
  /** Color opcional por celda (bg/fg en ARGB) según el encabezado y el valor. */
  cellColor?: (header: string, value: unknown) => CellColor | undefined;
};

const GREEN = "FF009850";

/** Colores por estado de incidencia para la columna "Estado" (ARGB). */
export const ESTADO_COLORS_XLSX: Record<string, CellColor> = {
  ABIERTO: { bg: "FFFEF3C7", fg: "FF92400E" },
  ASIGNADO: { bg: "FFDBEAFE", fg: "FF1E40AF" },
  "DATA RECOPILADA": { bg: "FFFFEDD5", fg: "FF9A3412" },
  "EN EVALUACION": { bg: "FFEDE9FE", fg: "FF5B21B6" },
  APROBADO: { bg: "FFD1FAE5", fg: "FF065F46" },
  ATENDIDO: { bg: "FFCFFAFE", fg: "FF155E75" },
  OBSERVADO: { bg: "FFFEF3C7", fg: "FF92400E" },
  RECHAZADO: { bg: "FFFEE2E2", fg: "FF991B1B" },
  "SEGUIMIENTO ABIERTO": { bg: "FFCCFBF1", fg: "FF115E59" },
  CERRADO: { bg: "FFF3F4F6", fg: "FF374151" },
};

function colLetter(n: number): string {
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export async function exportarExcel(opts: {
  fileName: string;
  /** Título de marca (fila 1). Si se omite, los encabezados van en la fila 1
   *  (útil para plantillas de importación). */
  title?: string;
  subtitle?: string;
  sheets: ExcelSheetInput[];
}): Promise<void> {
  const mod = await import("exceljs");
  const ExcelJS = (mod as unknown as { default?: typeof mod }).default ?? mod;

  const wb = new ExcelJS.Workbook();
  wb.creator = "Cáritas Lima";
  wb.created = new Date();

  const thin = { style: "thin" as const, color: { argb: "FFE5E7EB" } };
  const borderAll = { top: thin, bottom: thin, left: thin, right: thin };

  for (const sh of opts.sheets) {
    const cols: { header: string; key: string; width?: number }[] = sh.columns
      ? sh.columns.map((c) => ({ header: c.header, key: c.key ?? c.header, width: c.width }))
      : Array.from(new Set(sh.rows.flatMap((r) => Object.keys(r)))).map((k) => ({ header: k, key: k }));
    if (cols.length === 0) cols.push({ header: " ", key: " ", width: 12 });

    const headerIdx = opts.title ? 3 : 1;
    const ws = wb.addWorksheet(sh.name.slice(0, 31), {
      views: [{ state: "frozen", ySplit: headerIdx }],
    });
    const nCols = cols.length;
    const lastLetter = colLetter(nCols);

    if (opts.title) {
      ws.mergeCells(`A1:${lastLetter}1`);
      const t = ws.getCell("A1");
      t.value = opts.title;
      t.font = { bold: true, size: 14, color: { argb: GREEN } };
      t.alignment = { vertical: "middle" };
      ws.getRow(1).height = 26;
      ws.mergeCells(`A2:${lastLetter}2`);
      const s = ws.getCell("A2");
      s.value =
        opts.subtitle ??
        `Exportado el ${new Date().toLocaleString("es-PE", { timeZone: "America/Lima" })} · ${sh.rows.length} fila(s)`;
      s.font = { size: 10, italic: true, color: { argb: "FF6B7280" } };
    }

    const hr = ws.getRow(headerIdx);
    cols.forEach((c, i) => {
      const cell = hr.getCell(i + 1);
      cell.value = c.header;
      cell.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREEN } };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      cell.border = borderAll;
    });
    hr.height = 22;

    sh.rows.forEach((r, idx) => {
      const row = ws.getRow(headerIdx + 1 + idx);
      cols.forEach((c, ci) => {
        const cell = row.getCell(ci + 1);
        const val = r[c.key];
        cell.value = (val ?? "") as string | number;
        cell.border = borderAll;
        cell.alignment = { vertical: "middle" };
        if (idx % 2 === 1) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9FAFB" } };
        }
        const col = sh.cellColor?.(c.header, val);
        if (col) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: col.bg } };
          cell.font = { bold: true, color: { argb: col.fg } };
          cell.alignment = { vertical: "middle", horizontal: "center" };
        }
      });
    });

    ws.autoFilter = { from: { row: headerIdx, column: 1 }, to: { row: headerIdx, column: nCols } };

    cols.forEach((c, i) => {
      let w = c.width;
      if (!w) {
        const headerLen = c.header.length;
        const maxCell = sh.rows.reduce((m, r) => Math.max(m, String(r[c.key] ?? "").length), 0);
        w = Math.min(40, Math.max(10, Math.max(headerLen, maxCell) + 2));
      }
      ws.getColumn(i + 1).width = w;
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = opts.fileName.endsWith(".xlsx") ? opts.fileName : `${opts.fileName}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
