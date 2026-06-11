import { jsPDF } from "jspdf";

export type ActaArticulo = {
  codigo: string;
  descripcion: string;
  cantidad: number;
  confirmado: boolean;
};
export type ActaKit = { tipoKit: string; articulos: ActaArticulo[] };
export type ActaFamilia = {
  nombre: string;
  integrantes: string[];
  kits: ActaKit[];
  /** URL (objectURL o http) de la foto de evidencia de esta familia. */
  fotoUrl?: string;
  fotoNombre?: string;
};
export type ActaEvidencia = { url: string; nombre: string };

export type ActaEntregaData = {
  codigo: string;
  evento: string;
  ubicacion: string;
  fechaEntrega: string;
  lugarEntrega: string;
  emitidoPor: string;
  resolucionComite: string;
  descripcionEntrega: string;
  familias: ActaFamilia[];
  /** Evidencias generales de la entrega (imágenes). */
  evidencias?: ActaEvidencia[];
};

const VERDE: [number, number, number] = [0, 152, 80];
const GRIS: [number, number, number] = [110, 110, 110];
const MARGEN = 40;

async function loadImageForPdf(
  url: string,
  maxW: number,
  maxH: number
): Promise<{ dataUrl: string; w: number; h: number } | null> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1);
        const w = Math.max(1, Math.round(img.naturalWidth * scale));
        const h = Math.max(1, Math.round(img.naturalHeight * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve({ dataUrl: canvas.toDataURL("image/jpeg", 0.72), w, h });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * Genera y descarga el "Acta de Entrega de Ayuda Humanitaria" en PDF,
 * con el detalle de kits entregados por familia y los ítems confirmados.
 */
export async function generarActaEntregaPdf(d: ActaEntregaData): Promise<void> {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const ancho = W - MARGEN * 2;
  let y = MARGEN;
  let pagina = 1;

  const footer = () => {
    doc.setFontSize(8);
    doc.setTextColor(...GRIS);
    doc.text("Cáritas Lima — Sistema GRD", MARGEN, H - 24);
    doc.text(`Página ${pagina}`, W - MARGEN, H - 24, { align: "right" });
  };
  const nuevaPagina = () => {
    footer();
    doc.addPage();
    pagina++;
    y = MARGEN;
  };
  const checkSpace = (alto: number) => {
    if (y + alto > H - 50) nuevaPagina();
  };
  const heading = (txt: string) => {
    checkSpace(34);
    doc.setFillColor(...VERDE);
    doc.rect(MARGEN, y, ancho, 20, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(txt, MARGEN + 8, y + 14);
    y += 30;
    doc.setTextColor(40, 40, 40);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
  };
  const par = (label: string, value: string) => {
    const txt = value && value.trim() ? value : "—";
    const lines = doc.splitTextToSize(txt, ancho - 120);
    checkSpace(lines.length * 13 + 4);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(80, 80, 80);
    doc.text(label, MARGEN, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 40);
    doc.text(lines, MARGEN + 120, y);
    y += lines.length * 13 + 4;
  };

  // ── Encabezado institucional ──
  doc.setTextColor(...VERDE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("CÁRITAS LIMA", MARGEN, y + 4);
  doc.setFontSize(9);
  doc.setTextColor(...GRIS);
  doc.setFont("helvetica", "normal");
  doc.text("Gestión de Riesgo de Desastres (GRD)", MARGEN, y + 18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(10);
  doc.text(d.codigo, W - MARGEN, y + 4, { align: "right" });
  y += 36;
  doc.setDrawColor(220, 220, 220);
  doc.line(MARGEN, y, W - MARGEN, y);
  y += 18;

  doc.setTextColor(40, 40, 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("ACTA DE ENTREGA DE AYUDA HUMANITARIA", MARGEN, y);
  y += 20;

  // ── Datos de la entrega ──
  heading("Datos de la entrega");
  par("Evento:", d.evento);
  par("Ubicación:", d.ubicacion);
  par("Fecha de entrega:", d.fechaEntrega);
  par("Lugar de entrega:", d.lugarEntrega);
  par("Entregado por:", d.emitidoPor);
  y += 6;

  // ── Resolución del Comité ──
  if (d.resolucionComite.trim()) {
    heading("Resolución del Comité de Donaciones");
    const lines = doc.splitTextToSize(d.resolucionComite, ancho);
    checkSpace(lines.length * 12 + 6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 40);
    doc.text(lines, MARGEN, y);
    y += lines.length * 12 + 12;
  }

  // ── Kits entregados por familia ──
  heading("Kits entregados por familia");
  for (const fam of d.familias) {
    checkSpace(40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    doc.text(doc.splitTextToSize(`Familia: ${fam.nombre}`, ancho), MARGEN, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(90, 90, 90);
    const integ = fam.integrantes.length ? fam.integrantes.join(", ") : "—";
    const il = doc.splitTextToSize(`Integrantes: ${integ}`, ancho);
    checkSpace(il.length * 11);
    doc.text(il, MARGEN, y);
    y += il.length * 11 + 4;

    if (fam.kits.length === 0) {
      doc.setTextColor(150, 150, 150);
      doc.text("Sin kits asignados.", MARGEN, y);
      y += 16;
      continue;
    }
    for (const kit of fam.kits) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...VERDE);
      checkSpace(28);
      doc.text(kit.tipoKit, MARGEN, y);
      y += 13;
      // cabecera tabla
      doc.setFillColor(235, 238, 242);
      doc.rect(MARGEN, y - 11, ancho, 15, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(70, 70, 70);
      doc.text("Entregado", MARGEN + 4, y);
      doc.text("Código", MARGEN + 80, y);
      doc.text("Descripción", MARGEN + 160, y);
      doc.text("Cant.", W - MARGEN - 20, y, { align: "right" });
      y += 16;
      for (const a of kit.articulos) {
        checkSpace(14);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(40, 40, 40);
        doc.text(a.confirmado ? "[X]" : "[  ]", MARGEN + 4, y);
        doc.text(a.codigo || "—", MARGEN + 80, y);
        doc.text(doc.splitTextToSize(a.descripcion || "—", ancho * 0.45)[0] ?? "—", MARGEN + 160, y);
        doc.text(String(a.cantidad), W - MARGEN - 20, y, { align: "right" });
        y += 14;
      }
      y += 8;
    }

    // Foto de evidencia de la familia
    if (fam.fotoUrl) {
      const img = await loadImageForPdf(fam.fotoUrl, ancho * 0.5, 180);
      if (img) {
        checkSpace(img.h + 22);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(80, 80, 80);
        doc.text("Foto de evidencia:", MARGEN, y);
        y += 12;
        doc.addImage(img.dataUrl, "JPEG", MARGEN, y, img.w, img.h);
        if (fam.fotoNombre) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7);
          doc.setTextColor(...GRIS);
          doc.text(doc.splitTextToSize(fam.fotoNombre, ancho * 0.5)[0] ?? "", MARGEN, y + img.h + 9);
        }
        y += img.h + 16;
      }
    }
    y += 6;
  }

  // ── Evidencias generales de la entrega ──
  const evis = d.evidencias ?? [];
  if (evis.length > 0) {
    const colW = Math.floor((ancho - 8) / 2);
    const colH = Math.floor(colW * 0.72);
    const cargadas: { dataUrl: string; w: number; h: number; nombre: string }[] = [];
    for (const ev of evis) {
      const img = await loadImageForPdf(ev.url, colW, colH);
      if (img) cargadas.push({ ...img, nombre: ev.nombre });
    }
    if (cargadas.length > 0) {
      heading("Evidencias de la entrega");
      let col = 0;
      for (const img of cargadas) {
        const imgX = col === 0 ? MARGEN : MARGEN + colW + 8;
        checkSpace(img.h + 18);
        doc.addImage(img.dataUrl, "JPEG", imgX, y, img.w, img.h);
        doc.setFontSize(7);
        doc.setTextColor(...GRIS);
        doc.text(doc.splitTextToSize(img.nombre, colW)[0] ?? "", imgX, y + img.h + 10);
        if (col === 0) {
          col = 1;
        } else {
          col = 0;
          y += img.h + 18;
        }
      }
      if (col !== 0) y += (cargadas[cargadas.length - 1]?.h ?? 0) + 18;
      y += 6;
    }
  }

  // ── Descripción de la entrega ──
  if (d.descripcionEntrega.trim()) {
    heading("Descripción de la entrega");
    const lines = doc.splitTextToSize(d.descripcionEntrega, ancho);
    checkSpace(lines.length * 12 + 6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 40);
    doc.text(lines, MARGEN, y);
    y += lines.length * 12 + 12;
  }

  // ── Firma ──
  checkSpace(70);
  y += 24;
  doc.setDrawColor(120, 120, 120);
  doc.line(MARGEN, y, MARGEN + 200, y);
  y += 13;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  doc.text(d.emitidoPor, MARGEN, y);
  y += 13;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRIS);
  doc.text("Especialista GRD — Cáritas Lima", MARGEN, y);

  footer();
  const fechaArchivo = d.fechaEntrega.replace(/[^0-9]/g, "") || "entrega";
  doc.save(`Acta_Entrega_${d.codigo}_${fechaArchivo}.pdf`);
}
