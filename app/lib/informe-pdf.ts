import { jsPDF } from "jspdf";

export type ArticuloPdf = { codigo: string; descripcion: string; cantidad: number };
export type KitPdf = { tipoKit: string; articulos: ArticuloPdf[] };
export type FamiliaPdf = { nombre: string; integrantes: string[]; kits: KitPdf[] };
export type EvidenciaImagenPdf = { url: string; nombre: string; formato?: string };

export type InformePdfData = {
  codigo: string;
  categoria: string;
  evento: string;
  ubicacion: string;
  fechaSuceso: string;
  familiasAfectadas: number;
  personasEmpadronadas: number;
  fechaEmision: string;
  emitidoPor: string;
  oficina: string;
  motivo: string;
  dirigidoA: string;
  objetivoGeneral: string;
  objetivosEspecificos: string[];
  analisisSituacion: string;
  hallazgosTexto: string;
  hallazgosClave: string[];
  necesidadesIdentificadas: string[];
  evidenciasCount: number;
  /** Imágenes a incrustar en el PDF (pre-presignadas). */
  evidenciasImagenes?: EvidenciaImagenPdf[];
  familias: FamiliaPdf[];
  conclusiones: string;
};

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
        if (!ctx) { resolve(null); return; }
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

const VERDE: [number, number, number] = [0, 152, 80];
const GRIS: [number, number, number] = [110, 110, 110];
const MARGEN = 40;

/**
 * Genera y descarga el "Informe de Atención de Ayuda Humanitaria" en PDF,
 * replicando el formato institucional de Cáritas GRD.
 * Las imágenes se cargan y redimensionan vía Canvas antes de incrustarse.
 */
export async function generarInformePdf(d: InformePdfData): Promise<void> {
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
    const lines = doc.splitTextToSize(txt, ancho - 110);
    checkSpace(lines.length * 13 + 4);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(80, 80, 80);
    doc.text(label, MARGEN, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 40);
    doc.text(lines, MARGEN + 110, y);
    y += lines.length * 13 + 4;
  };

  const parrafo = (label: string, value: string) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(80, 80, 80);
    checkSpace(14);
    doc.text(label, MARGEN, y);
    y += 13;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 40);
    const lines = doc.splitTextToSize(value && value.trim() ? value : "—", ancho);
    checkSpace(lines.length * 12);
    doc.text(lines, MARGEN, y);
    y += lines.length * 12 + 6;
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
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRIS);
  doc.text(`Categoría: ${d.categoria}`, W - MARGEN, y + 18, { align: "right" });
  y += 36;
  doc.setDrawColor(220, 220, 220);
  doc.line(MARGEN, y, W - MARGEN, y);
  y += 18;

  doc.setTextColor(40, 40, 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("INFORME DE ATENCIÓN DE AYUDA HUMANITARIA", MARGEN, y);
  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(70, 70, 70);
  doc.text(`Evento: ${d.evento}`, MARGEN, y);
  y += 13;
  doc.text(`Ubicación: ${d.ubicacion}`, MARGEN, y);
  y += 13;
  doc.text(
    `Fecha del suceso: ${d.fechaSuceso}   |   Familias afectadas: ${d.familiasAfectadas}`,
    MARGEN,
    y
  );
  y += 18;

  // ── a) Datos de identificación ──
  heading("a) Datos de identificación");
  par("Fecha", d.fechaEmision);
  par("Emitido por", d.emitidoPor);
  par("Oficina / Área", d.oficina);
  par("Motivo", d.motivo);
  par("Dirigido a", d.dirigidoA);
  y += 6;

  // ── b) Objetivos de la visita ──
  heading("b) Objetivos de la visita");
  parrafo("Objetivo general:", d.objetivoGeneral);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(80, 80, 80);
  checkSpace(14);
  doc.text("Objetivos específicos:", MARGEN, y);
  y += 13;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(40, 40, 40);
  if (d.objetivosEspecificos.length === 0) {
    doc.text("—", MARGEN, y);
    y += 13;
  } else {
    for (const o of d.objetivosEspecificos) {
      const lines = doc.splitTextToSize(`•  ${o}`, ancho - 10);
      checkSpace(lines.length * 12);
      doc.text(lines, MARGEN + 6, y);
      y += lines.length * 12;
    }
  }
  y += 8;

  // ── c) Análisis y descripción ──
  heading("c) Análisis y descripción");
  parrafo("Análisis de la situación:", d.analisisSituacion);
  parrafo("Hallazgos principales:", d.hallazgosTexto);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(80, 80, 80);
  checkSpace(14);
  doc.text("Hallazgos clave:", MARGEN, y);
  y += 13;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(40, 40, 40);
  if (d.hallazgosClave.length === 0) {
    doc.text("—", MARGEN, y);
    y += 13;
  } else {
    for (const h of d.hallazgosClave) {
      const lines = doc.splitTextToSize(`•  ${h}`, ancho - 10);
      checkSpace(lines.length * 12);
      doc.text(lines, MARGEN + 6, y);
      y += lines.length * 12;
    }
  }
  y += 10;

  // Datos registrados (referencia)
  checkSpace(70);
  doc.setFillColor(245, 247, 250);
  doc.rect(MARGEN, y, ancho, 64, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text("Datos registrados en el sistema (referencia)", MARGEN + 8, y + 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.text(`Familias afectadas: ${d.familiasAfectadas}`, MARGEN + 8, y + 30);
  doc.text(`Personas empadronadas: ${d.personasEmpadronadas}`, MARGEN + 8, y + 44);
  const nec = d.necesidadesIdentificadas.length
    ? d.necesidadesIdentificadas.join(", ")
    : "—";
  doc.text(
    doc.splitTextToSize(`Necesidades: ${nec}`, ancho / 2 - 16),
    MARGEN + ancho / 2,
    y + 30
  );
  doc.text(`Evidencias adjuntas: ${d.evidenciasCount} archivo(s)`, MARGEN + ancho / 2, y + 58);
  y += 78;

  // ── d) Asignación de ayuda humanitaria por familia ──
  heading("d) Asignación de ayuda humanitaria por familia");
  const consolidado: Record<string, ArticuloPdf & { tipoKit: string }> = {};
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
      // tabla
      doc.setFontSize(8.5);
      doc.setTextColor(70, 70, 70);
      tablaCabecera(doc, y, ["N°", "Código / Artículo", "Descripción", "Cant."], ancho);
      y += 16;
      kit.articulos.forEach((a, i) => {
        checkSpace(14);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(40, 40, 40);
        doc.text(String(i + 1), MARGEN + 4, y);
        doc.text(a.codigo || "—", MARGEN + 40, y);
        doc.text(doc.splitTextToSize(a.descripcion || "—", ancho * 0.45)[0] ?? "—", MARGEN + 160, y);
        doc.text(String(a.cantidad), W - MARGEN - 20, y, { align: "right" });
        y += 14;
        const k = `${kit.tipoKit}||${a.codigo}||${a.descripcion}`;
        if (!consolidado[k])
          consolidado[k] = { tipoKit: kit.tipoKit, codigo: a.codigo, descripcion: a.descripcion, cantidad: 0 };
        consolidado[k].cantidad += a.cantidad;
      });
      y += 8;
    }
    y += 6;
  }

  // Resumen consolidado
  const filas = Object.values(consolidado);
  if (filas.length) {
    checkSpace(40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    doc.text("Resumen consolidado de artículos", MARGEN, y);
    y += 16;
    doc.setFontSize(8.5);
    tablaCabecera(doc, y, ["Kit", "Código", "Descripción", "Cant. total"], ancho);
    y += 16;
    for (const f of filas) {
      checkSpace(14);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(40, 40, 40);
      doc.text(doc.splitTextToSize(f.tipoKit, 110)[0] ?? "", MARGEN + 4, y);
      doc.text(f.codigo || "—", MARGEN + 120, y);
      doc.text(doc.splitTextToSize(f.descripcion || "—", ancho * 0.4)[0] ?? "—", MARGEN + 200, y);
      doc.text(String(f.cantidad), W - MARGEN - 20, y, { align: "right" });
      y += 14;
    }
    y += 10;
  }

  // ── e) Evidencias fotográficas ──
  const colW = Math.floor((ancho - 8) / 2);
  const colH = Math.floor(colW * 0.72); // ~4:3 aspect at 72%
  const imgEntries: { dataUrl: string; w: number; h: number; nombre: string }[] = [];
  for (const ev of d.evidenciasImagenes ?? []) {
    const fmt = ev.formato ?? "";
    const isImg = fmt.startsWith("image/") || /\.(jpe?g|png|gif|webp|bmp)$/i.test(ev.nombre);
    if (!isImg) continue;
    const loaded = await loadImageForPdf(ev.url, colW, colH);
    if (loaded) imgEntries.push({ ...loaded, nombre: ev.nombre });
  }
  if (imgEntries.length > 0) {
    heading("e) Evidencias fotográficas");
    let col = 0;
    for (const img of imgEntries) {
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
    if (col !== 0) y += (imgEntries[imgEntries.length - 1]?.h ?? 0) + 18;
    y += 6;
  }

  // ── f) Conclusiones ──
  heading(imgEntries.length > 0 ? "f) Conclusiones" : "e) Conclusiones");
  parrafo("", d.conclusiones);
  y += 16;

  checkSpace(40);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(10);
  doc.text(d.emitidoPor, MARGEN, y);
  y += 13;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRIS);
  doc.text("Cáritas Lima — Gestión de Riesgo de Desastres", MARGEN, y);

  footer();
  doc.save(`Informe_AyudaHumanitaria_${d.codigo}.pdf`);
}

function tablaCabecera(doc: jsPDF, y: number, cols: string[], ancho: number) {
  doc.setFillColor(235, 238, 242);
  doc.rect(MARGEN, y - 11, ancho, 15, "F");
  doc.setFont("helvetica", "bold");
  doc.setTextColor(70, 70, 70);
  const W = doc.internal.pageSize.getWidth();
  doc.text(cols[0], MARGEN + 4, y);
  doc.text(cols[1], MARGEN + 40, y);
  doc.text(cols[2], MARGEN + 160, y);
  doc.text(cols[3], W - MARGEN - 20, y, { align: "right" });
}
