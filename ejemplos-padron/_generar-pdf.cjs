// Genera un PDF de ejemplo VERTICAL (portrait) con una TABLA "Personas Afectadas"
// que incluye TODOS los campos. Ejecutar: node ejemplos-padron/_generar-pdf.cjs
const { jsPDF } = require("jspdf");
const fs = require("fs");
const path = require("path");

const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

// ── Texto introductorio ───────────────────────────────────────────────────────
doc.setFont("helvetica", "bold");
doc.setFontSize(13);
doc.text("CÁRITAS LIMA — INFORME DE EMERGENCIA", 10, 16);
doc.setFont("helvetica", "normal");
doc.setFontSize(9);
doc.text("Distrito: Lince     Fecha: 02/06/2026     Tipo de evento: Inundación", 10, 23);
doc.text("Familias y personas afectadas por el desborde ocurrido en la zona.", 10, 29);
doc.setFont("helvetica", "bold");
doc.setFontSize(11);
doc.text("PERSONAS AFECTADAS", 10, 39);

// Columnas (x en mm). Separadas para que la extracción no fusione columnas.
const cols = [
  { key: "Grupo", x: 6 },
  { key: "Tipo", x: 20 },
  { key: "Documento", x: 30 },
  { key: "Nombres", x: 48 },
  { key: "Ap Paterno", x: 70 },
  { key: "Ap Materno", x: 92 },
  { key: "Edad", x: 114 },
  { key: "Genero", x: 124 },
  { key: "Celular", x: 142 },
  { key: "Parentesco", x: 160 },
  { key: "Situacion", x: 178 },
];

// Valores compactos (el importador normaliza: Jefe→Jefe(a) de Hogar, etc.)
const filas = [
  [
    "GF 1",
    "DNI",
    "60587924",
    "Juan Carlos",
    "Valverde",
    "Torres",
    "32",
    "Masculino",
    "987654321",
    "Jefe",
    "Herido",
  ],
  [
    "GF 1",
    "DNI",
    "45221033",
    "Maria Elena",
    "Valverde",
    "Rios",
    "28",
    "Femenino",
    "987111222",
    "Conyuge",
    "Gestante",
  ],
  ["GF 1", "DNI", "71234567", "Pedro", "Valverde", "Rios", "8", "Masculino", "", "Hijo", ""],
  [
    "",
    "DNI",
    "60582332",
    "Rosa",
    "Carhuapoma",
    "Diaz",
    "21",
    "Femenino",
    "999888777",
    "",
    "Con Lactancia",
  ],
  [
    "Mendoza",
    "CE",
    "001234567",
    "Carmen",
    "Mendoza",
    "Soto",
    "67",
    "Femenino",
    "",
    "Madre",
    "Adulto mayor",
  ],
];

let y = 47;
doc.setFontSize(6.5);
doc.setFont("helvetica", "bold");
cols.forEach((c) => doc.text(c.key, c.x, y));
doc.setDrawColor(150);
doc.line(6, y + 1.5, 193, y + 1.5);
y += 6;

doc.setFont("helvetica", "normal");
for (const fila of filas) {
  cols.forEach((c, i) => {
    if (fila[i]) doc.text(String(fila[i]), c.x, y);
  });
  y += 6;
}

const file = path.join(__dirname, "padron-ejemplo.pdf");
fs.writeFileSync(file, Buffer.from(doc.output("arraybuffer")));
console.log("Generado:", file);
