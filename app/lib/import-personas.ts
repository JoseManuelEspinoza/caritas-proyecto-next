// ─────────────────────────────────────────────────────────────────────────────
// Importador de personas afectadas desde archivo .txt (formato "bloques clave:valor").
//
// Formato esperado (una persona por bloque, bloques separados por línea en blanco):
//
//   grupo_familiar: Grupo Familiar 1
//   tipo_doc: DNI
//   numero_documento: 60587924
//   nombres: juanito
//   apellido_paterno: valverde
//   edad: 32
//   genero: Masculino
//   parentesco: Jefe(a) de Hogar
//   situacion_especial: Herido
//
//   (línea en blanco = nueva persona)
//
// DISEÑO TOLERANTE A FALLOS (mala digitalización):
//   • Nunca descarta una persona: importa lo que pueda y marca lo inválido.
//   • Las CLAVES aceptan errores de tipeo / letras faltantes (fuzzy match).
//   • Los VALORES de enums se normalizan por coincidencia parcial + sinónimos.
//   • La validación por campo se expone aparte (validarPersona) para que la
//     vista previa pinte en ROJO lo que falta o está mal y el usuario corrija.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Catálogos canónicos (deben coincidir EXACTO con incident-form.tsx) ──────────
export const TIPOS_DOC = ['DNI', 'CE', 'Pasaporte', 'Otro'] as const
export const GENEROS = ['Masculino', 'Femenino', 'Otro', 'Prefiere no decir'] as const
export const PARENTESCOS = ['Jefe(a) de Hogar', 'Padre', 'Madre', 'Hijo(a)', 'Nieto(a)', 'Abuelo(a)', 'Tío(a)', 'Cónyuge', 'Otro'] as const
export const SITUACIONES = ['Gestante', 'Discapacitado', 'Con Lactancia', 'Enfermo', 'Herido', 'Enfermo crónico', 'Adulto mayor'] as const

/** Campos que SÍ o SÍ deben venir; si faltan, la vista previa los marca en rojo. */
export const CAMPOS_OBLIGATORIOS = ['nombre', 'edad'] as const

export type PersonaImportada = {
  grupoFamiliar: string
  tipoDoc: string
  dni: string
  nombre: string
  apellidoPaterno: string
  apellidoMaterno: string
  edad: string
  genero: string
  celular: string
  parentesco: string
  situacionActual: string
  _bloque: number // número de bloque en el archivo (para referencia en la UI)
}

export type ImportResult = {
  personas: PersonaImportada[]
  totalBloques: number
}

// ─── Utilidades de normalización ─────────────────────────────────────────────
const DIACRITICOS = new RegExp('[\\u0300-\\u036f]', 'g')
/** minúsculas, sin tildes, sin espacios extremos. */
function norm(s: string): string {
  return s.normalize('NFD').replace(DIACRITICOS, '').toLowerCase().trim()
}

/** Distancia de Levenshtein (para tolerar claves mal escritas). */
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)])
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    }
  }
  return dp[m][n]
}

// Alias de claves → clave canónica interna
const KEY_ALIASES: Record<string, keyof PersonaImportada> = {
  grupo_familiar: 'grupoFamiliar', grupo: 'grupoFamiliar', familia: 'grupoFamiliar', grupofamiliar: 'grupoFamiliar',
  tipo_doc: 'tipoDoc', tipo_documento: 'tipoDoc', tipo: 'tipoDoc', tipodoc: 'tipoDoc',
  numero_documento: 'dni', nro_documento: 'dni', n_documento: 'dni', documento: 'dni', dni: 'dni', doc: 'dni',
  nombres: 'nombre', nombre: 'nombre',
  apellido_paterno: 'apellidoPaterno', ape_paterno: 'apellidoPaterno', apellidopaterno: 'apellidoPaterno', apellido: 'apellidoPaterno',
  apellido_materno: 'apellidoMaterno', ape_materno: 'apellidoMaterno', apellidomaterno: 'apellidoMaterno',
  edad: 'edad', anios: 'edad', años: 'edad',
  genero: 'genero', sexo: 'genero',
  celular: 'celular', telefono: 'celular', cel: 'celular', movil: 'celular', tel: 'celular',
  parentesco: 'parentesco', relacion: 'parentesco', vinculo: 'parentesco',
  situacion_especial: 'situacionActual', situacion: 'situacionActual', situacion_actual: 'situacionActual', estado: 'situacionActual',
}
const ALIAS_KEYS = Object.keys(KEY_ALIASES)

/** Versión pública de resolveKey (para detectar encabezados de tabla en PDF/Excel). */
export function resolveHeaderKey(rawKey: string): keyof PersonaImportada | null {
  return resolveKey(rawKey)
}

/** Resuelve la clave aunque venga mal escrita (ej. "nombre" → "nombre", "nombre" con typo). */
function resolveKey(rawKey: string): keyof PersonaImportada | null {
  const k = norm(rawKey).replace(/\s+/g, '_')
  if (KEY_ALIASES[k]) return KEY_ALIASES[k]
  // Fuzzy: acepta hasta 2 caracteres de diferencia con algún alias conocido.
  let mejor: string | null = null
  let mejorDist = Infinity
  for (const alias of ALIAS_KEYS) {
    const d = levenshtein(k, alias)
    if (d < mejorDist) { mejorDist = d; mejor = alias }
  }
  const umbral = k.length <= 4 ? 1 : 2
  return mejor && mejorDist <= umbral ? KEY_ALIASES[mejor] : null
}

// ─── Normalización de VALORES (tolerante: coincidencia parcial) ──────────────
export function mapTipoDoc(raw: string): string {
  const v = norm(raw)
  if (!v) return 'DNI'
  if (v.startsWith('dni')) return 'DNI'
  if (v === 'ce' || v.includes('carnet') || v.includes('extranjer')) return 'CE'
  if (v.includes('pasaport')) return 'Pasaporte'
  return 'Otro'
}

export function mapGenero(raw: string): string {
  const v = norm(raw)
  if (!v) return ''
  if (v === 'm' || v.startsWith('masc') || v.startsWith('hombre') || v.startsWith('varon')) return 'Masculino'
  if (v === 'f' || v.startsWith('feme') || v.startsWith('mujer')) return 'Femenino'
  if (v.includes('prefiere') || v.includes('no decir')) return 'Prefiere no decir'
  if (v.startsWith('otr')) return 'Otro'
  return '' // desconocido → vacío (no obligatorio)
}

export function mapParentesco(raw: string): string {
  const v = norm(raw)
  if (!v || v.startsWith('selecc')) return ''
  if (v.includes('jefe')) return 'Jefe(a) de Hogar'
  if (v.startsWith('padre') || v === 'papa') return 'Padre'
  if (v.startsWith('madre') || v === 'mama') return 'Madre'
  if (v.startsWith('hij')) return 'Hijo(a)'
  if (v.startsWith('niet')) return 'Nieto(a)'
  if (v.startsWith('abuel')) return 'Abuelo(a)'
  if (v.startsWith('tio') || v.startsWith('tia')) return 'Tío(a)'
  if (v.includes('conyug') || v.startsWith('espos') || v === 'pareja') return 'Cónyuge'
  return 'Otro'
}

export function mapSituacion(raw: string): string {
  const v = norm(raw)
  if (!v || v.startsWith('ningun') || v === 'n/a' || v === 'na' || v === '-') return ''
  if (v.includes('gestan') || v.includes('embaraz')) return 'Gestante'
  if (v.includes('discapac')) return 'Discapacitado'
  if (v.includes('lactan')) return 'Con Lactancia'
  if (v.includes('cronic')) return 'Enfermo crónico'
  if (v.includes('enferm')) return 'Enfermo'
  if (v.includes('herid')) return 'Herido'
  if (v.includes('adulto mayor') || v.includes('anciano') || v.includes('tercera edad') || v.includes('adulto_mayor')) return 'Adulto mayor'
  return '' // desconocido → Ninguna
}

/** Divide el texto en bloques (separados por una o más líneas en blanco). */
function splitBloques(texto: string): string[][] {
  const lineas = texto.replace(/\r\n/g, '\n').split('\n')
  const bloques: string[][] = []
  let actual: string[] = []
  for (const linea of lineas) {
    if (linea.trim() === '') {
      if (actual.length) { bloques.push(actual); actual = [] }
    } else {
      actual.push(linea)
    }
  }
  if (actual.length) bloques.push(actual)
  return bloques
}

/**
 * Parsea el .txt. SIEMPRE devuelve una persona por bloque (mejor esfuerzo),
 * con los valores tal cual se pudieron interpretar. La validación se hace
 * aparte con validarPersona() para que la UI marque en rojo lo corregible.
 */
export function parsePersonasTxt(texto: string): ImportResult {
  const bloques = splitBloques(texto)
  const personas: PersonaImportada[] = []

  bloques.forEach((lineas, idx) => {
    const raw: Partial<Record<keyof PersonaImportada, string>> = {}
    for (const linea of lineas) {
      // Acepta separador ":" o "="
      const sep = Math.min(
        ...[linea.indexOf(':'), linea.indexOf('=')].filter((i) => i !== -1).concat([Infinity]),
      )
      if (!isFinite(sep)) continue
      const canon = resolveKey(linea.slice(0, sep))
      if (!canon) continue
      raw[canon] = linea.slice(sep + 1).trim()
    }

    // Bloque totalmente vacío o sin ninguna clave reconocida → se omite.
    if (Object.keys(raw).length === 0) return
    personas.push(buildPersona(raw, idx + 1))
  })

  return { personas, totalBloques: bloques.length }
}

/**
 * Parser flexible para texto extraído de PDF (donde se pierden las líneas en blanco).
 * Lee cada línea "clave: valor" y empieza una NUEVA persona cuando una clave se repite
 * (ej. aparece "nombres" otra vez). También respeta líneas en blanco si existen.
 */
export function parsePersonasFlexible(texto: string): ImportResult {
  // Orden canónico de los campos: una persona nueva empieza cuando aparece un
  // campo de orden MENOR o IGUAL al anterior (o cuando se repite una clave).
  const ORDEN: Record<keyof PersonaImportada, number> = {
    grupoFamiliar: 0, tipoDoc: 1, dni: 2, nombre: 3, apellidoPaterno: 4,
    apellidoMaterno: 5, edad: 6, genero: 7, celular: 8, parentesco: 9,
    situacionActual: 10, _bloque: 99,
  }
  const lineas = texto.replace(/\r\n/g, '\n').split('\n')
  const personas: PersonaImportada[] = []
  let raw: Partial<Record<keyof PersonaImportada, string>> = {}
  let ultimoOrden = -1

  const flush = () => {
    if (Object.keys(raw).length > 0) { personas.push(buildPersona(raw, personas.length + 1)); raw = {} }
    ultimoOrden = -1
  }

  for (const linea of lineas) {
    if (linea.trim() === '') { flush(); continue }
    const sep = Math.min(
      ...[linea.indexOf(':'), linea.indexOf('=')].filter((i) => i !== -1).concat([Infinity]),
    )
    if (!isFinite(sep)) continue
    const canon = resolveKey(linea.slice(0, sep))
    if (!canon) continue
    const orden = ORDEN[canon]
    // Nueva persona si el campo retrocede en el orden o si la clave se repite.
    if (Object.keys(raw).length > 0 && (orden <= ultimoOrden || raw[canon] !== undefined)) flush()
    raw[canon] = linea.slice(sep + 1).trim()
    ultimoOrden = orden
  }
  flush()

  return { personas, totalBloques: personas.length }
}

/** Construye una PersonaImportada (mejor esfuerzo) a partir de valores crudos. */
function buildPersona(raw: Partial<Record<keyof PersonaImportada, string>>, bloque: number): PersonaImportada {
  return {
    grupoFamiliar: (raw.grupoFamiliar ?? '').trim(),
    tipoDoc: mapTipoDoc(raw.tipoDoc ?? ''),
    dni: (raw.dni ?? '').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 12),
    nombre: (raw.nombre ?? '').trim(),
    apellidoPaterno: (raw.apellidoPaterno ?? '').trim(),
    apellidoMaterno: (raw.apellidoMaterno ?? '').trim(),
    edad: (raw.edad ?? '').replace(/[^\d]/g, '').slice(0, 3),
    genero: mapGenero(raw.genero ?? ''),
    celular: (raw.celular ?? '').replace(/\D/g, '').slice(0, 9),
    parentesco: mapParentesco(raw.parentesco ?? ''),
    situacionActual: mapSituacion(raw.situacionActual ?? ''),
    _bloque: bloque,
  }
}

/**
 * Convierte filas de Excel/CSV (objetos encabezado→valor) en personas.
 * Los encabezados se resuelven con tolerancia (fuzzy), igual que el .txt.
 * `rows` es lo que devuelve XLSX.utils.sheet_to_json(sheet, { defval: '' }).
 */
export function parsePersonasRows(rows: Record<string, unknown>[]): ImportResult {
  const personas: PersonaImportada[] = []

  rows.forEach((row, idx) => {
    const raw: Partial<Record<keyof PersonaImportada, string>> = {}
    for (const [header, value] of Object.entries(row)) {
      const canon = resolveKey(header)
      if (!canon) continue
      const v = value == null ? '' : String(value).trim()
      if (v !== '') raw[canon] = v
    }
    if (Object.keys(raw).length === 0) return // fila vacía
    personas.push(buildPersona(raw, idx + 2)) // +2: fila 1 = encabezados
  })

  return { personas, totalBloques: rows.length }
}

/**
 * Valida una persona y devuelve un mapa { campo: mensaje } solo con los
 * campos problemáticos. La UI usa estas claves para pintar el borde en rojo.
 */
export function validarPersona(p: PersonaImportada): Partial<Record<keyof PersonaImportada, string>> {
  const errs: Partial<Record<keyof PersonaImportada, string>> = {}

  if (!p.nombre.trim()) errs.nombre = 'Falta el nombre (obligatorio).'

  if (!p.edad.trim()) {
    errs.edad = 'Falta la edad (obligatoria).'
  } else {
    const e = parseInt(p.edad, 10)
    if (isNaN(e) || e < 0 || e > 120) errs.edad = 'Edad inválida (0–120).'
  }

  if (p.tipoDoc === 'DNI' && p.dni) {
    if (p.dni.replace(/\D/g, '').length < 8) errs.dni = 'DNI debe tener 8 dígitos.'
  }
  if (p.celular && p.celular.length !== 9) errs.celular = 'El celular debe tener 9 dígitos.'

  return errs
}

/** Plantilla de ejemplo para descargar. */
export const PLANTILLA_TXT = `grupo_familiar: Grupo Familiar 1
tipo_doc: DNI
numero_documento: 60587924
nombres: Juan
apellido_paterno: Valverde
apellido_materno: Torres
edad: 32
genero: Masculino
celular: 987654321
parentesco: Jefe(a) de Hogar
situacion_especial: Herido

grupo_familiar: Grupo Familiar 1
tipo_doc: DNI
numero_documento: 45221033
nombres: Maria
apellido_paterno: Valverde
edad: 28
genero: Femenino
parentesco: Cónyuge
situacion_especial: Gestante

tipo_doc: DNI
numero_documento: 60582332
nombres: Rosa
apellido_paterno: Carhuapoma
edad: 21
genero: Femenino
situacion_especial: Con Lactancia
`
