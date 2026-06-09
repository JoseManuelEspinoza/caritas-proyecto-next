// Genera los .xlsx de ejemplo. Ejecutar: node ejemplos-padron/_generar-excel.cjs
const XLSX = require("xlsx");
const path = require("path");

const dir = __dirname;

// ── 1) Excel limpio (formato correcto) ───────────────────────────────────────
const limpio = [
  {
    grupo_familiar: "Grupo Familiar 1",
    tipo_doc: "DNI",
    numero_documento: "60587924",
    nombres: "Juan Carlos",
    apellido_paterno: "Valverde",
    apellido_materno: "Torres",
    edad: 32,
    genero: "Masculino",
    celular: "987654321",
    parentesco: "Jefe(a) de Hogar",
    situacion_especial: "Herido",
  },
  {
    grupo_familiar: "Grupo Familiar 1",
    tipo_doc: "DNI",
    numero_documento: "45221033",
    nombres: "María Elena",
    apellido_paterno: "Valverde",
    apellido_materno: "",
    edad: 28,
    genero: "Femenino",
    celular: "987111222",
    parentesco: "Cónyuge",
    situacion_especial: "Gestante",
  },
  {
    grupo_familiar: "",
    tipo_doc: "DNI",
    numero_documento: "60582332",
    nombres: "Rosa",
    apellido_paterno: "Carhuapoma",
    apellido_materno: "",
    edad: 21,
    genero: "Femenino",
    celular: "",
    parentesco: "",
    situacion_especial: "Con Lactancia",
  },
];

// ── 2) Excel con mala digitalización (encabezados/valores sucios) ─────────────
// Encabezados mal escritos y con sinónimos → el fuzzy match los reconoce.
const sucio = [
  {
    flia: "Familia Quispe",
    tipodoc: "dni",
    documnto: "41258796",
    nombre: "Pedro",
    ape_paterno: "Quispe",
    añios: 45,
    sexo: "m",
    cel: "998877665",
    relacion: "jefe",
    estado: "enfermo cronico",
  },
  {
    familia: "Familia Quispe",
    documento: "7012345",
    nombres: "Lucia",
    apellido: "Quispe",
    edad: 9,
    sexo: "f",
    vinculo: "hija",
  },
  {
    grupo: "Los Mendoza",
    tipo: "carnet de extranjeria",
    documento: "001234567",
    nombres: "Carmen",
    apellido_paterno: "Mendoza",
    edad: 67,
    genero: "mujer",
    parentesco: "esposa",
    situacion_especial: "embarazada",
  },
  // Datos incompletos / inválidos → se importan y se marcan en ROJO
  {
    grupo_familiar: "Albergue San Pedro",
    tipo_doc: "DNI",
    numero_documento: "1234",
    nombres: "Rosa",
    edad: "",
    genero: "femenino",
    situacion_especial: "con lactancia",
  },
  {
    nombres: "",
    apellido_paterno: "Huamán",
    edad: "abc",
    celular: "987",
  },
  {
    tipo_doc: "DNI",
    numero_documento: "70112233",
    nombres: "Luis",
    edad: 15,
  },
];

function guardar(rows, nombre) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Padron");
  const file = path.join(dir, nombre);
  XLSX.writeFile(wb, file);
  console.log("Generado:", file);
}

guardar(limpio, "padron-ejemplo.xlsx");
guardar(sucio, "padron-mala-digitalizacion.xlsx");
