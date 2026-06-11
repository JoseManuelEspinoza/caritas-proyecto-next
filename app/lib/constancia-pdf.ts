import { jsPDF } from "jspdf";

export type ConstanciaData = {
  nombreParticipante: string;
  nombreCurso: string;
  codigoCurso: string | null;
  fechaCertificacion: string | null;
  idCertificacion: string;
  nota: number | null;
};

const VERDE: [number, number, number] = [0, 152, 80];
const BLANCO: [number, number, number] = [255, 255, 255];
const GRIS_OSCURO: [number, number, number] = [40, 40, 40];
const GRIS_MEDIO: [number, number, number] = [110, 110, 110];
const GRIS_CLARO: [number, number, number] = [230, 230, 230];

function fmtFecha(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const meses = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  return `Lima, ${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
}

export function buildConstanciaDoc(d: ConstanciaData): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  doc.setProperties({
    title: `Constancia - ${d.nombreParticipante} - ${d.nombreCurso}`,
    subject: "Constancia de Capacitación",
    author: "Cáritas del Perú",
  });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const cx = W / 2;

  // ── Borde exterior ──
  doc.setDrawColor(...VERDE);
  doc.setLineWidth(3);
  doc.rect(24, 24, W - 48, H - 48);

  // ── Encabezado verde ──
  doc.setFillColor(...VERDE);
  doc.rect(24, 24, W - 48, 100, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...BLANCO);
  doc.text("CÁRITAS DEL PERÚ", cx, 70, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("Constancia de Capacitación", cx, 104, { align: "center" });

  // ── Cuerpo ──
  let y = 160;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(...GRIS_MEDIO);
  doc.text("Se otorga la presente constancia a:", cx, y, { align: "center" });
  y += 44;

  // Nombre del participante
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(...GRIS_OSCURO);
  doc.text(d.nombreParticipante, cx, y, { align: "center" });
  y += 12;

  // Línea bajo el nombre
  const lineW = 200;
  doc.setDrawColor(...VERDE);
  doc.setLineWidth(1.5);
  doc.line(cx - lineW / 2, y, cx + lineW / 2, y);
  y += 36;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(...GRIS_MEDIO);
  doc.text("Por haber completado satisfactoriamente el curso:", cx, y, { align: "center" });
  y += 28;

  // Recuadro del curso
  const boxX = 80;
  const boxW = W - 160;
  const boxH = 68;
  doc.setFillColor(248, 248, 248);
  doc.setDrawColor(...GRIS_CLARO);
  doc.setLineWidth(1);
  doc.roundedRect(boxX, y, boxW, boxH, 8, 8, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...GRIS_OSCURO);
  doc.text(d.nombreCurso, cx, y + 28, { align: "center" });

  if (d.codigoCurso) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...GRIS_MEDIO);
    doc.text(d.codigoCurso, cx, y + 48, { align: "center" });
  }
  y += boxH + 32;

  // Nota
  if (d.nota != null) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(...GRIS_MEDIO);
    doc.text("Nota obtenida: ", cx - 10, y, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...GRIS_OSCURO);
    doc.text(`${d.nota.toFixed(1)} / 20`, cx - 8, y);
    y += 36;
  }

  // Fecha
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...GRIS_MEDIO);
  doc.text(fmtFecha(d.fechaCertificacion), cx, y, { align: "center" });

  // ── Pie: firmas ──
  const firmaY = H - 110;
  const col1 = 100;
  const col3 = W - 100;

  doc.setDrawColor(...GRIS_CLARO);
  doc.setLineWidth(1);
  doc.line(col1, firmaY, col1 + 120, firmaY);
  doc.line(col3 - 120, firmaY, col3, firmaY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRIS_MEDIO);
  doc.text("Especialista GRD", col1 + 60, firmaY + 14, { align: "center" });
  doc.text("Jefa GRD", col3 - 60, firmaY + 14, { align: "center" });

  // ID verificación
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...GRIS_CLARO);
  doc.text(`ID: ${d.idCertificacion}`, cx, H - 36, { align: "center" });
  doc.text("Documento generado automáticamente — Cáritas del Perú", cx, H - 24, { align: "center" });

  return doc;
}

export function generarConstanciaPdf(d: ConstanciaData): void {
  const doc = buildConstanciaDoc(d);
  const slug = (s: string) => s.replace(/\s+/g, "-").toLowerCase();
  const nombreArchivo = `Constancia_${slug(d.nombreParticipante)}_${slug(d.nombreCurso)}.pdf`;
  doc.save(nombreArchivo);
}
