// SugerirBrigadistas.test.ts — Tests del algoritmo RF36 (Cáritas Lima | 1INF47 2026-1)
// Ejecutar: npm test
//
// Re-homing de los 28 tests originales: ahora apuntan al caso de uso
// `SugerirBrigadistasUseCase` inyectando un mock de `ISugerenciaBrigadistasRepository`.
import { describe, test, expect } from "vitest";

import { SugerirBrigadistasUseCase } from "./SugerirBrigadistas.usecase";
import { haversine } from "../../../domain/services/haversine";
import { confianzaMixta } from "../../../domain/services/confianza";
import { CONFIG_DEFAULT } from "../../dtos/SugerenciaBrigadistasDTO";
import type { ISugerenciaBrigadistasRepository } from "../../../domain/repositories/ISugerenciaBrigadistasRepository";
import type {
  EntradaAlgoritmo,
  ConfigAlgoritmo,
  BrigadistaCandidatoRaw,
  ParroquiaRef,
} from "../../dtos/SugerenciaBrigadistasDTO";

// Tipos de los mocks: extienden las formas reales con los campos extra del dataset.
type ParroquiaMock = ParroquiaRef & { nombre: string; idDistrito: string };
type BrigadistaMock = BrigadistaCandidatoRaw & { estado: string };

// Helper: instancia el caso de uso con el repo dado y ejecuta.
function ejecutar(
  repo: ISugerenciaBrigadistasRepository,
  entrada: EntradaAlgoritmo,
  config?: ConfigAlgoritmo
) {
  return new SugerirBrigadistasUseCase(repo).execute(entrada, config);
}

// ════════════════════════════════════════════════════════════════════════════
// DATOS DE PRUEBA — Dataset_Pruebas_Algoritmo_GRD.xlsx
// ════════════════════════════════════════════════════════════════════════════

const PARROQUIAS: Record<string, ParroquiaMock> = {
  "PAR-01": {
    idParroquia: "PAR-01",
    nombre: "San Pedro Apóstol",
    latitud: -12.1219,
    longitud: -77.0296,
    idZonaPastoral: "ZP-01",
    idDistrito: "Miraflores",
  },
  "PAR-02": {
    idParroquia: "PAR-02",
    nombre: "Virgen del Rosario",
    latitud: -12.1178,
    longitud: -77.0341,
    idZonaPastoral: "ZP-01",
    idDistrito: "Miraflores",
  },
  "PAR-03": {
    idParroquia: "PAR-03",
    nombre: "Santa Rosa de Lima",
    latitud: -12.1024,
    longitud: -77.0365,
    idZonaPastoral: "ZP-01",
    idDistrito: "San Isidro",
  },
  "PAR-04": {
    idParroquia: "PAR-04",
    nombre: "Sagrada Familia",
    latitud: -12.1082,
    longitud: -77.0218,
    idZonaPastoral: "ZP-02",
    idDistrito: "Surquillo",
  },
  "PAR-05": {
    idParroquia: "PAR-05",
    nombre: "San Juan Bautista",
    latitud: -12.145,
    longitud: -77.0196,
    idZonaPastoral: "ZP-02",
    idDistrito: "Barranco",
  },
};

const BRIGADISTAS: Record<string, BrigadistaMock> = {
  // ── Escenario 1: disponibles en PAR-01 ───────────────────────────────────
  "BRI-01": {
    idBrigadistaParroquial: "BRI-01",
    idParroquia: "PAR-01",
    nombres: "Carlos",
    apellidos: "Mendoza Ríos",
    celular: "987654321",
    correo: null,
    disponibilidad: "DISPONIBLE",
    estado: "ACTIVO",
    certificacionCurso: { estadoCertificacion: "GENERADA" },
    parroquia: PARROQUIAS["PAR-01"],
  },
  "BRI-02": {
    idBrigadistaParroquial: "BRI-02",
    idParroquia: "PAR-01",
    nombres: "Ana",
    apellidos: "Torres Vega",
    celular: "976543210",
    correo: null,
    disponibilidad: "DISPONIBLE",
    estado: "ACTIVO",
    certificacionCurso: { estadoCertificacion: "GENERADA" },
    parroquia: PARROQUIAS["PAR-01"],
  },
  "BRI-03": {
    idBrigadistaParroquial: "BRI-03",
    idParroquia: "PAR-01",
    nombres: "Luis",
    apellidos: "Paredes Cuba",
    celular: "965432109",
    correo: null,
    disponibilidad: "NO_DISPONIBLE",
    estado: "ACTIVO",
    certificacionCurso: null,
    parroquia: PARROQUIAS["PAR-01"],
  },
  "BRI-04": {
    idBrigadistaParroquial: "BRI-04",
    idParroquia: "PAR-01",
    nombres: "María",
    apellidos: "Quispe León",
    celular: "954321098",
    correo: null,
    disponibilidad: "DISPONIBLE",
    estado: "ACTIVO",
    certificacionCurso: null,
    parroquia: PARROQUIAS["PAR-01"],
  },
  // ── Escenario 2: disponibles en parroquias vecinas ────────────────────────
  "BRI-07": {
    idBrigadistaParroquial: "BRI-07",
    idParroquia: "PAR-02",
    nombres: "Pedro",
    apellidos: "Flores Mamani",
    celular: "921098765",
    correo: null,
    disponibilidad: "DISPONIBLE",
    estado: "ACTIVO",
    certificacionCurso: null,
    parroquia: PARROQUIAS["PAR-02"],
  }, // ~0.48 km, misma zona pastoral
  "BRI-08": {
    idBrigadistaParroquial: "BRI-08",
    idParroquia: "PAR-03",
    nombres: "Silvia",
    apellidos: "Ramos Apaza",
    celular: "910987654",
    correo: null,
    disponibilidad: "DISPONIBLE",
    estado: "ACTIVO",
    certificacionCurso: null,
    parroquia: PARROQUIAS["PAR-03"],
  }, // ~2.18 km, misma zona pastoral
  "BRI-09": {
    idBrigadistaParroquial: "BRI-09",
    idParroquia: "PAR-04",
    nombres: "Juan",
    apellidos: "Cáceres Pinto",
    celular: "909876543",
    correo: null,
    disponibilidad: "DISPONIBLE",
    estado: "ACTIVO",
    certificacionCurso: null,
    parroquia: PARROQUIAS["PAR-04"],
  }, // ~1.1 km, OTRA zona pastoral (ZP-02)
  "BRI-10": {
    idBrigadistaParroquial: "BRI-10",
    idParroquia: "PAR-05",
    nombres: "Elena",
    apellidos: "Vargas Soto",
    celular: "998877665",
    correo: null,
    disponibilidad: "DISPONIBLE",
    estado: "ACTIVO",
    certificacionCurso: null,
    parroquia: PARROQUIAS["PAR-05"],
  }, // ~3.4 km, OTRA zona pastoral (ZP-02)
};

const INCIDENCIAS: Record<string, number> = {
  "BRI-01": 5,
  "BRI-02": 3,
  "BRI-03": 8,
  "BRI-04": 1,
  "BRI-07": 2,
  "BRI-08": 1,
  "BRI-09": 0,
  "BRI-10": 2,
};

// ── Factory de repositorio mock (implementa la interfaz de dominio) ────────────
function makeRepo(escenario: "E1" | "E2" | "E3" | "E4"): ISugerenciaBrigadistasRepository {
  return {
    async getParroquia(id) {
      return PARROQUIAS[id] ?? null;
    },

    async getBrigadistasDisponiblesPorParroquia(idParroquia) {
      if (escenario === "E2" || escenario === "E3" || escenario === "E4") {
        return []; // nadie disponible en la parroquia del incidente
      }
      // E1: brigadistas DISPONIBLES y ACTIVOS en PAR-01
      return Object.values(BRIGADISTAS).filter(
        (b) =>
          b.idParroquia === idParroquia &&
          b.disponibilidad === "DISPONIBLE" &&
          b.estado === "ACTIVO"
      );
    },

    async getTodosBrigadistasDisponibles(excluirParroquia) {
      if (escenario === "E3" || escenario === "E4") return [];
      return Object.values(BRIGADISTAS).filter(
        (b) =>
          b.idParroquia !== excluirParroquia &&
          b.disponibilidad === "DISPONIBLE" &&
          b.estado === "ACTIVO"
      );
    },

    async getIncidenciasAtendidas(id) {
      return INCIDENCIAS[id] ?? 0;
    },

    async getCargaActual() {
      return 0; // en los datos de prueba nadie tiene carga actual
    },

    async getTiempoRespuestaPromedioHoras() {
      return null; // sin historial de tiempos en el dataset
    },

    async getParroquiasConCoords() {
      return Object.values(PARROQUIAS).map((p) => ({
        idParroquia: p.idParroquia,
        latitud: p.latitud,
        longitud: p.longitud,
      }));
    },

    async registrarIntentoFallido() {
      // En tests no hace nada
    },
  };
}

const ENTRADA_BASE: EntradaAlgoritmo = {
  idParroquia: "PAR-01",
  latitud: -12.1219,
  longitud: -77.0296,
  tipoIncidente: "INCENDIO",
};

// ════════════════════════════════════════════════════════════════════════════
// TESTS — Haversine
// ════════════════════════════════════════════════════════════════════════════
describe("📐 Haversine — distancias GPS", () => {
  test("distancia entre mismas coordenadas es 0", () => {
    expect(haversine(-12.1219, -77.0296, -12.1219, -77.0296)).toBe(0);
  });

  test("PAR-01 → PAR-02 es ~0.48 km (misma zona pastoral)", () => {
    const d = haversine(-12.1219, -77.0296, -12.1178, -77.0341);
    expect(d).toBeGreaterThan(0.4);
    expect(d).toBeLessThan(0.7);
  });

  test("PAR-01 → PAR-04 es ~1.4 km (otra zona pastoral)", () => {
    const d = haversine(-12.1219, -77.0296, -12.1082, -77.0218);
    expect(d).toBeGreaterThan(1.0);
    expect(d).toBeLessThan(2.0);
  });

  test("PAR-01 → PAR-03 es ~2.2 km", () => {
    const d = haversine(-12.1219, -77.0296, -12.1024, -77.0365);
    expect(d).toBeGreaterThan(2.0);
    expect(d).toBeLessThan(2.5);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// TESTS — confianzaMixta()
// ════════════════════════════════════════════════════════════════════════════
describe("🎯 confianzaMixta() — scoring de brigadistas", () => {
  test("BRI-01 (cert GENERADA + 5 incidencias) tiene score alto (>5)", () => {
    const score = confianzaMixta(BRIGADISTAS["BRI-01"], 5);
    expect(score).toBeGreaterThan(5);
    expect(score).toBeLessThanOrEqual(10);
  });

  test("BRI-04 (sin cert + 1 incidencia) tiene score bajo (<5)", () => {
    const score = confianzaMixta(BRIGADISTAS["BRI-04"], 1);
    expect(score).toBeLessThan(5);
  });

  test("Con 0 incidencias no penaliza — usa solo capacitaciones", () => {
    const conCert = confianzaMixta(BRIGADISTAS["BRI-02"], 0); // cert GENERADA
    const sinCert = confianzaMixta(BRIGADISTAS["BRI-04"], 0); // sin cert
    expect(conCert).toBeGreaterThan(sinCert);
  });

  test("Score siempre entre 0 y 10", () => {
    Object.values(BRIGADISTAS).forEach((b) => {
      const score = confianzaMixta(b, INCIDENCIAS[b.idBrigadistaParroquial] ?? 0);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(10);
    });
  });

  test("Config personalizada (pesos 50/50) cambia el resultado", () => {
    const configDefault = confianzaMixta(BRIGADISTAS["BRI-01"], 5, CONFIG_DEFAULT);
    const config5050 = confianzaMixta(BRIGADISTAS["BRI-01"], 5, {
      pesoManual: 0.5,
      pesoAutomatico: 0.5,
    });
    expect(configDefault).not.toBe(config5050);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// TESTS — Escenario 1: Fase 1
// ════════════════════════════════════════════════════════════════════════════
describe("✅ Escenario 1 — Fase 1: brigadistas en la parroquia del incidente", () => {
  test("retorna faseResultado = F1", async () => {
    const res = await ejecutar(makeRepo("E1"), ENTRADA_BASE);
    expect(res.faseResultado).toBe("F1");
  });

  test("todos los candidatos son de PAR-01", async () => {
    const res = await ejecutar(makeRepo("E1"), ENTRADA_BASE);
    expect(res.listaSugerida.length).toBeGreaterThan(0);
    res.listaSugerida.forEach((c) => expect(c.idParroquia).toBe("PAR-01"));
  });

  test("BRI-03 (NO_DISPONIBLE) NO aparece en la lista", async () => {
    const res = await ejecutar(makeRepo("E1"), ENTRADA_BASE);
    const ids = res.listaSugerida.map((c) => c.idBrigadistaParroquial);
    expect(ids).not.toContain("BRI-03");
  });

  test("lista ordenada por scoreConfianza DESC", async () => {
    const res = await ejecutar(makeRepo("E1"), ENTRADA_BASE);
    const scores = res.listaSugerida
      .map((c) => c.scoreConfianza)
      .filter((s) => s !== null) as number[];
    for (let i = 0; i < scores.length - 1; i++) {
      expect(scores[i]).toBeGreaterThanOrEqual(scores[i + 1]);
    }
  });

  test("no devuelve más de topN=5 candidatos", async () => {
    const res = await ejecutar(makeRepo("E1"), ENTRADA_BASE);
    expect(res.listaSugerida.length).toBeLessThanOrEqual(5);
  });

  test("topN personalizado respetado", async () => {
    const res = await ejecutar(makeRepo("E1"), ENTRADA_BASE, { ...CONFIG_DEFAULT, topN: 2 });
    expect(res.listaSugerida.length).toBeLessThanOrEqual(2);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// TESTS — Escenario 2: Fase 2
// ════════════════════════════════════════════════════════════════════════════
describe("🔍 Escenario 2 — Fase 2: cascada por niveles del grafo + score combinado", () => {
  test("retorna faseResultado = F2", async () => {
    const res = await ejecutar(makeRepo("E2"), ENTRADA_BASE);
    expect(res.faseResultado).toBe("F2");
  });

  test("todos los candidatos traen scoreFinal y nivel", async () => {
    const res = await ejecutar(makeRepo("E2"), ENTRADA_BASE);
    expect(res.listaSugerida.length).toBeGreaterThan(0);
    res.listaSugerida.forEach((c) => {
      expect(typeof c.scoreFinal).toBe("number");
      expect(typeof c.nivel).toBe("number");
    });
  });

  test("BRI-07 (más cercano y sin carga) aparece primero", async () => {
    const res = await ejecutar(makeRepo("E2"), ENTRADA_BASE);
    expect(res.listaSugerida[0].idBrigadistaParroquial).toBe("BRI-07");
  });

  test("orden: nivel ASC y, dentro del nivel, scoreFinal DESC", async () => {
    const res = await ejecutar(makeRepo("E2"), ENTRADA_BASE);
    for (let i = 0; i < res.listaSugerida.length - 1; i++) {
      const a = res.listaSugerida[i];
      const b = res.listaSugerida[i + 1];
      const na = a.nivel ?? 99;
      const nb = b.nivel ?? 99;
      if (na === nb) {
        expect(a.scoreFinal ?? 0).toBeGreaterThanOrEqual(b.scoreFinal ?? 0);
      } else {
        expect(na).toBeLessThanOrEqual(nb);
      }
    }
  });

  test("los candidatos de Fase 2 caen en niveles del grafo (≥ 2)", async () => {
    const res = await ejecutar(makeRepo("E2"), ENTRADA_BASE);
    const bri07 = res.listaSugerida.find((c) => c.idBrigadistaParroquial === "BRI-07");
    expect(bri07!.nivel).toBe(2); // PAR-02, vecina directa de PAR-01 (~0.48 km)
    // Ningún candidato de F2 es de la parroquia del incidente → nivel ≥ 2.
    res.listaSugerida.forEach((c) => expect(c.nivel ?? 99).toBeGreaterThanOrEqual(2));
  });

  test("indicador mismaZonaPastoral se calcula (BRI-07 true, BRI-09 false)", async () => {
    const res = await ejecutar(makeRepo("E2"), ENTRADA_BASE);
    const bri07 = res.listaSugerida.find((c) => c.idBrigadistaParroquial === "BRI-07");
    const bri09 = res.listaSugerida.find((c) => c.idBrigadistaParroquial === "BRI-09");
    expect(bri07!.mismaZonaPastoral).toBe(true);
    expect(bri09!.mismaZonaPastoral).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// TESTS — Escenario 4: Fase 3
// ════════════════════════════════════════════════════════════════════════════
describe("🚨 Escenario 4 — Fase 3: sin candidatos disponibles", () => {
  test("retorna faseResultado = F3", async () => {
    const res = await ejecutar(makeRepo("E4"), ENTRADA_BASE);
    expect(res.faseResultado).toBe("F3");
  });

  test("lista vacía", async () => {
    const res = await ejecutar(makeRepo("E4"), ENTRADA_BASE);
    expect(res.listaSugerida).toHaveLength(0);
  });

  test("mensaje no es null", async () => {
    const res = await ejecutar(makeRepo("E4"), ENTRADA_BASE);
    expect(res.mensaje).not.toBeNull();
    expect(res.mensaje).toContain("intervención manual");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// TESTS — Casos borde
// ════════════════════════════════════════════════════════════════════════════
describe("⚙️  Config mínima — cobertura de ramas ?? en líneas 84-88", () => {
  test("config sin radioAdyacenciaKm/distanciaMaxKm/pesos usa los defaults del CONFIG_DEFAULT", async () => {
    const res = await ejecutar(makeRepo("E2"), ENTRADA_BASE, {
      topN: 5,
      pesoManual: 0.4,
      pesoAutomatico: 0.6,
      // campos opcionales omitidos → se usarán los ?? CONFIG_DEFAULT...
    });
    expect(res.faseResultado).toBe("F2");
  });
});

describe("⚠️  Casos borde — parroquia no encontrada y zona pastoral null", () => {
  test("CB-03: parroquia no encontrada + sin GPS → F3 (cubre líneas 96-99 y rama false de 128)", async () => {
    const repoSinParroquia: ISugerenciaBrigadistasRepository = {
      async getParroquia() { return null; },
      async getBrigadistasDisponiblesPorParroquia() { return []; },
      async getTodosBrigadistasDisponibles() { return []; },
      async getIncidenciasAtendidas() { return 0; },
      async getCargaActual() { return 0; },
      async getTiempoRespuestaPromedioHoras() { return null; },
      async getParroquiasConCoords() { return []; },
      async registrarIntentoFallido() {},
    };
    const res = await ejecutar(repoSinParroquia, { ...ENTRADA_BASE, latitud: null, longitud: null });
    expect(res.faseResultado).toBe("F3");
  });

  test("F2: zonaPastoralInc=null cuando parroquia no tiene zona pastoral (cubre rama false de línea 158)", async () => {
    const brigSinZona: BrigadistaMock = {
      idBrigadistaParroquial: "BRI-SINZONA",
      idParroquia: "PAR-02",
      nombres: "Pedro",
      apellidos: "Gómez",
      celular: null,
      correo: null,
      disponibilidad: "DISPONIBLE",
      estado: "ACTIVO",
      certificacionCurso: null,
      parroquia: { idParroquia: "PAR-02", latitud: -12.1178, longitud: -77.0341, idZonaPastoral: "ZP-01", nombre: "SinZona", idDistrito: "MIR" },
    };
    const repoSinZona: ISugerenciaBrigadistasRepository = {
      async getParroquia() {
        return { idParroquia: "PAR-01", latitud: -12.1219, longitud: -77.0296, idZonaPastoral: null };
      },
      async getBrigadistasDisponiblesPorParroquia() { return []; },
      async getTodosBrigadistasDisponibles() { return [brigSinZona]; },
      async getIncidenciasAtendidas() { return 0; },
      async getCargaActual() { return 0; },
      async getTiempoRespuestaPromedioHoras() { return null; },
      async getParroquiasConCoords() {
        return [
          { idParroquia: "PAR-01", latitud: -12.1219, longitud: -77.0296 },
          { idParroquia: "PAR-02", latitud: -12.1178, longitud: -77.0341 },
        ];
      },
      async registrarIntentoFallido() {},
    };
    const res = await ejecutar(repoSinZona, ENTRADA_BASE);
    expect(res.faseResultado).toBe("F2");
    expect(res.listaSugerida[0].mismaZonaPastoral).toBeNull();
  });

  test("F2: brigadista en parroquia fuera del grafo recibe nivel 99 (cubre ?? 99 en línea 163)", async () => {
    const brigFuera: BrigadistaMock = {
      idBrigadistaParroquial: "BRI-FUERA",
      idParroquia: "PAR-05",
      nombres: "Elena",
      apellidos: "Ramos",
      celular: null,
      correo: null,
      disponibilidad: "DISPONIBLE",
      estado: "ACTIVO",
      certificacionCurso: null,
      parroquia: { idParroquia: "PAR-05", latitud: -12.145, longitud: -77.0196, idZonaPastoral: "ZP-02", nombre: "Fuera", idDistrito: "BAR" },
    };
    const repoFuera: ISugerenciaBrigadistasRepository = {
      async getParroquia() { return { idParroquia: "PAR-01", latitud: -12.1219, longitud: -77.0296, idZonaPastoral: "ZP-01" }; },
      async getBrigadistasDisponiblesPorParroquia() { return []; },
      async getTodosBrigadistasDisponibles() { return [brigFuera]; },
      async getIncidenciasAtendidas() { return 0; },
      async getCargaActual() { return 0; },
      async getTiempoRespuestaPromedioHoras() { return null; },
      async getParroquiasConCoords() {
        return [
          { idParroquia: "PAR-01", latitud: -12.1219, longitud: -77.0296 },
          { idParroquia: "PAR-02", latitud: -12.1178, longitud: -77.0341 },
          { idParroquia: "PAR-05", latitud: -12.145, longitud: -77.0196 },
        ];
      },
      async registrarIntentoFallido() {},
    };
    const config: ConfigAlgoritmo = { ...CONFIG_DEFAULT, radioAdyacenciaKm: 0.6 };
    const res = await ejecutar(repoFuera, ENTRADA_BASE, config);
    expect(res.faseResultado).toBe("F2");
    const brigFueraResult = res.listaSugerida.find((c) => c.idBrigadistaParroquial === "BRI-FUERA");
    expect(brigFueraResult?.nivel).toBe(99);
  });
});

describe("⚠️  Casos borde", () => {
  test("CB-02: incidente sin GPS usa coordenadas de la parroquia", async () => {
    const entradaSinGPS = { ...ENTRADA_BASE, latitud: null, longitud: null };
    const res = await ejecutar(makeRepo("E1"), entradaSinGPS);
    expect(res.faseResultado).toBe("F1"); // debe seguir funcionando
  });

  test("CB-02 con Fase 2: sin GPS igual calcula distancias desde parroquia", async () => {
    const entradaSinGPS = { ...ENTRADA_BASE, latitud: null, longitud: null };
    const res = await ejecutar(makeRepo("E2"), entradaSinGPS);
    expect(res.faseResultado).toBe("F2");
    res.listaSugerida.forEach((c) => expect(c.distanciaKm).not.toBeNull());
  });

  test("mensaje null en Fase 1", async () => {
    const res = await ejecutar(makeRepo("E1"), ENTRADA_BASE);
    expect(res.mensaje).toBeNull();
  });

  test("tipo siempre es brigadista en F1 y F2", async () => {
    const resF1 = await ejecutar(makeRepo("E1"), ENTRADA_BASE);
    const resF2 = await ejecutar(makeRepo("E2"), ENTRADA_BASE);
    [...resF1.listaSugerida, ...resF2.listaSugerida].forEach((c) =>
      expect(c.tipo).toBe("brigadista")
    );
  });
});

// ════════════════════════════════════════════════════════════════════════════
// TESTS — Ordenamiento con empates (tie-breaking)
// ════════════════════════════════════════════════════════════════════════════
describe("🔀 Tie-breaking — orden alfabético cuando scores empatan", () => {
  // Dos brigadistas con exactamente el mismo score en F1 → se ordena por apellido
  test("F1: empate de scoreConfianza → orden alfabético por apellido (línea 51)", async () => {
    const brigA: BrigadistaMock = {
      idBrigadistaParroquial: "BRI-TIE-A",
      idParroquia: "PAR-TIE",
      nombres: "Zeta",
      apellidos: "Gonzalez",
      celular: null,
      correo: null,
      disponibilidad: "DISPONIBLE",
      estado: "ACTIVO",
      certificacionCurso: null, // mismo score: manual neutro sin cert sin inc = 2
      parroquia: { idParroquia: "PAR-TIE", latitud: -12.1219, longitud: -77.0296, idZonaPastoral: "ZP-01", nombre: "Tie Parroquia", idDistrito: "TIE" },
    };
    const brigB: BrigadistaMock = {
      idBrigadistaParroquial: "BRI-TIE-B",
      idParroquia: "PAR-TIE",
      nombres: "Alfa",
      apellidos: "Hernandez",
      celular: null,
      correo: null,
      disponibilidad: "DISPONIBLE",
      estado: "ACTIVO",
      certificacionCurso: null, // mismo score: manual neutro sin cert sin inc = 2
      parroquia: { idParroquia: "PAR-TIE", latitud: -12.1219, longitud: -77.0296, idZonaPastoral: "ZP-01", nombre: "Tie Parroquia", idDistrito: "TIE" },
    };

    const repoTie: ISugerenciaBrigadistasRepository = {
      async getParroquia() { return { idParroquia: "PAR-TIE", latitud: -12.1219, longitud: -77.0296, idZonaPastoral: "ZP-01" }; },
      async getBrigadistasDisponiblesPorParroquia() { return [brigA, brigB]; },
      async getTodosBrigadistasDisponibles() { return []; },
      async getIncidenciasAtendidas() { return 0; },
      async getCargaActual() { return 0; },
      async getTiempoRespuestaPromedioHoras() { return null; },
      async getParroquiasConCoords() { return []; },
      async registrarIntentoFallido() {},
    };

    const res = await ejecutar(repoTie, { ...ENTRADA_BASE, idParroquia: "PAR-TIE" });
    expect(res.faseResultado).toBe("F1");
    // Con mismo score, se ordena por apellido: Gonzalez < Hernandez
    expect(res.listaSugerida[0].idBrigadistaParroquial).toBe("BRI-TIE-A");
    expect(res.listaSugerida[1].idBrigadistaParroquial).toBe("BRI-TIE-B");
  });

  // F2: pesoCercania=0 → mismo scoreFinal con distintas distancias → line 63 ejecuta
  test("F2: pesoCercania=0 garantiza mismo scoreFinal con distintas distancias → orden por distanciaKm (línea 63)", async () => {
    const brigCerca2: BrigadistaMock = {
      idBrigadistaParroquial: "BRI-CERCA2",
      idParroquia: "PAR-02",
      nombres: "Rosa",
      apellidos: "Mendez",
      celular: null,
      correo: null,
      disponibilidad: "DISPONIBLE",
      estado: "ACTIVO",
      certificacionCurso: null,
      parroquia: { idParroquia: "PAR-02", latitud: -12.1178, longitud: -77.0341, idZonaPastoral: "ZP-01", nombre: "Cerca2", idDistrito: "MIR" },
    };
    const brigLejos2: BrigadistaMock = {
      idBrigadistaParroquial: "BRI-LEJOS2",
      idParroquia: "PAR-03",
      nombres: "Mario",
      apellidos: "Vargas",
      celular: null,
      correo: null,
      disponibilidad: "DISPONIBLE",
      estado: "ACTIVO",
      certificacionCurso: null,
      parroquia: { idParroquia: "PAR-03", latitud: -12.1024, longitud: -77.0365, idZonaPastoral: "ZP-01", nombre: "Lejos2", idDistrito: "SIS" },
    };

    const repoZeroCerc: ISugerenciaBrigadistasRepository = {
      async getParroquia() { return { idParroquia: "PAR-01", latitud: -12.1219, longitud: -77.0296, idZonaPastoral: "ZP-01" }; },
      async getBrigadistasDisponiblesPorParroquia() { return []; },
      async getTodosBrigadistasDisponibles() { return [brigLejos2, brigCerca2]; },
      async getIncidenciasAtendidas() { return 0; },
      async getCargaActual() { return 0; },
      async getTiempoRespuestaPromedioHoras() { return null; },
      async getParroquiasConCoords() {
        return [
          { idParroquia: "PAR-01", latitud: -12.1219, longitud: -77.0296 },
          { idParroquia: "PAR-02", latitud: -12.1178, longitud: -77.0341 },
          { idParroquia: "PAR-03", latitud: -12.1024, longitud: -77.0365 },
        ];
      },
      async registrarIntentoFallido() {},
    };

    const config: ConfigAlgoritmo = {
      ...CONFIG_DEFAULT,
      radioAdyacenciaKm: 5,
      pesoCercania: 0,      // sin peso de cercanía → mismo scoreFinal para ambos
      pesoConfianza: 0.5,
      pesoDisponibilidad: 0.5,
    };

    const res = await ejecutar(repoZeroCerc, ENTRADA_BASE, config);
    expect(res.faseResultado).toBe("F2");
    expect(res.listaSugerida.length).toBe(2);
    // Con pesoCercania=0, ambos tienen mismo scoreFinal. Desempate por distanciaKm:
    // PAR-02 ~0.48 km va primero que PAR-03 ~2.18 km.
    expect(res.listaSugerida[0].idBrigadistaParroquial).toBe("BRI-CERCA2");
  });

  // F2 con mismo scoreFinal y mismo nivel → tie-break por distancia (líneas 62-64)
  test("F2: mismo nivel y scoreFinal → orden por distanciaKm (líneas 62-64)", async () => {
    const brigCerca: BrigadistaMock = {
      idBrigadistaParroquial: "BRI-CERCA",
      idParroquia: "PAR-02",
      nombres: "Ana",
      apellidos: "Torres",
      celular: null,
      correo: null,
      disponibilidad: "DISPONIBLE",
      estado: "ACTIVO",
      certificacionCurso: null,
      parroquia: { idParroquia: "PAR-02", latitud: -12.1178, longitud: -77.0341, idZonaPastoral: "ZP-01", nombre: "Cerca", idDistrito: "MIR" },
    };
    const brigLejos: BrigadistaMock = {
      idBrigadistaParroquial: "BRI-LEJOS",
      idParroquia: "PAR-03",
      nombres: "Pedro",
      apellidos: "Ruiz",
      celular: null,
      correo: null,
      disponibilidad: "DISPONIBLE",
      estado: "ACTIVO",
      certificacionCurso: null,
      parroquia: { idParroquia: "PAR-03", latitud: -12.1024, longitud: -77.0365, idZonaPastoral: "ZP-01", nombre: "Lejos", idDistrito: "SIS" },
    };

    const repoF2Tie: ISugerenciaBrigadistasRepository = {
      async getParroquia() { return { idParroquia: "PAR-01", latitud: -12.1219, longitud: -77.0296, idZonaPastoral: "ZP-01" }; },
      async getBrigadistasDisponiblesPorParroquia() { return []; },
      async getTodosBrigadistasDisponibles() { return [brigCerca, brigLejos]; },
      async getIncidenciasAtendidas() { return 0; },
      async getCargaActual() { return 0; },
      async getTiempoRespuestaPromedioHoras() { return null; },
      async getParroquiasConCoords() {
        return [
          { idParroquia: "PAR-01", latitud: -12.1219, longitud: -77.0296 },
          { idParroquia: "PAR-02", latitud: -12.1178, longitud: -77.0341 },
          { idParroquia: "PAR-03", latitud: -12.1024, longitud: -77.0365 },
        ];
      },
      async registrarIntentoFallido() {},
    };

    const config: ConfigAlgoritmo = {
      ...CONFIG_DEFAULT,
      radioAdyacenciaKm: 5, // radio grande para que ambos estén conectados
    };

    const res = await ejecutar(repoF2Tie, ENTRADA_BASE, config);
    expect(res.faseResultado).toBe("F2");
    // Con mismo score y mismo nivel, el más cercano (PAR-02 ~0.48km) va primero
    expect(res.listaSugerida[0].idBrigadistaParroquial).toBe("BRI-CERCA");
  });

  // F2 con mismo scoreFinal, nivel y distancia → tie-break por apellido (línea 65)
  test("F2: mismo nivel, score y distancia → orden por apellido (línea 65)", async () => {
    const brigZ: BrigadistaMock = {
      idBrigadistaParroquial: "BRI-Z",
      idParroquia: "PAR-02",
      nombres: "Zeta",
      apellidos: "Zapata",
      celular: null,
      correo: null,
      disponibilidad: "DISPONIBLE",
      estado: "ACTIVO",
      certificacionCurso: null,
      parroquia: { idParroquia: "PAR-02", latitud: -12.1178, longitud: -77.0341, idZonaPastoral: "ZP-01", nombre: "P2", idDistrito: "MIR" },
    };
    const brigA: BrigadistaMock = {
      idBrigadistaParroquial: "BRI-A",
      idParroquia: "PAR-02",
      nombres: "Alfa",
      apellidos: "Avalos",
      celular: null,
      correo: null,
      disponibilidad: "DISPONIBLE",
      estado: "ACTIVO",
      certificacionCurso: null,
      parroquia: { idParroquia: "PAR-02", latitud: -12.1178, longitud: -77.0341, idZonaPastoral: "ZP-01", nombre: "P2", idDistrito: "MIR" },
    };

    const repoSameAll: ISugerenciaBrigadistasRepository = {
      async getParroquia() { return { idParroquia: "PAR-01", latitud: -12.1219, longitud: -77.0296, idZonaPastoral: "ZP-01" }; },
      async getBrigadistasDisponiblesPorParroquia() { return []; },
      async getTodosBrigadistasDisponibles() { return [brigZ, brigA]; },
      async getIncidenciasAtendidas() { return 0; },
      async getCargaActual() { return 0; },
      async getTiempoRespuestaPromedioHoras() { return null; },
      async getParroquiasConCoords() {
        return [
          { idParroquia: "PAR-01", latitud: -12.1219, longitud: -77.0296 },
          { idParroquia: "PAR-02", latitud: -12.1178, longitud: -77.0341 },
        ];
      },
      async registrarIntentoFallido() {},
    };

    const res = await ejecutar(repoSameAll, ENTRADA_BASE, { ...CONFIG_DEFAULT, radioAdyacenciaKm: 5 });
    expect(res.faseResultado).toBe("F2");
    expect(res.listaSugerida.length).toBe(2);
    // Mismo score, mismo nivel, misma distancia → orden alfabético por apellido: Avalos < Zapata
    expect(res.listaSugerida[0].idBrigadistaParroquial).toBe("BRI-A");
  });
});

describe("🏗️  buildCandidato — ramas defensivas", () => {
  test("F1: brigadista con parroquia null produce nombreParroquia='' (cubre ?. en línea 37)", async () => {
    const brigSinParroquia: BrigadistaCandidatoRaw = {
      idBrigadistaParroquial: "BRI-NULL-PAR",
      idParroquia: "PAR-01",
      nombres: "Test",
      apellidos: "Nulo",
      celular: null,
      correo: null,
      disponibilidad: "DISPONIBLE",
      parroquia: null as any, // activa la rama ?. en b.parroquia?.nombre
    };
    const repoNullPar: ISugerenciaBrigadistasRepository = {
      async getParroquia() { return { idParroquia: "PAR-01", latitud: -12.1219, longitud: -77.0296, idZonaPastoral: "ZP-01" }; },
      async getBrigadistasDisponiblesPorParroquia() { return [brigSinParroquia]; },
      async getTodosBrigadistasDisponibles() { return []; },
      async getIncidenciasAtendidas() { return 0; },
      async getCargaActual() { return 0; },
      async getTiempoRespuestaPromedioHoras() { return null; },
      async getParroquiasConCoords() { return []; },
      async registrarIntentoFallido() {},
    };
    const res = await ejecutar(repoNullPar, ENTRADA_BASE);
    expect(res.faseResultado).toBe("F1");
    expect(res.listaSugerida[0].nombreParroquia).toBe("");
  });
});
