import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/app/lib/dal", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/core/infrastructure/factories/makeAsignacionUseCases", () => ({
  makeAsignacionUseCases: vi.fn(() => ({
    sugerir: { execute: vi.fn() },
  })),
}));

import { POST } from "@/app/api/grd/asignar-brigadista/route";
import { getSession } from "@/app/lib/dal";
import { makeAsignacionUseCases } from "@/core/infrastructure/factories/makeAsignacionUseCases";

const SESSION = { userId: "user-1", role: "ESPECIALISTAGRD" };

const BODY_VALIDO = {
  idParroquia: "par-1",
  tipoIncidente: "INCENDIO" as const,
  latitud: -12.1219,
  longitud: -77.0296,
};

const RESULTADO_MOCK = {
  listaSugerida: [
    {
      idBrigadistaParroquial: "bri-1",
      nombres: "Juan",
      apellidos: "Pérez",
      disponibilidad: "DISPONIBLE",
      distanciaKm: 0.5,
      scoreConfianza: 8.2,
    },
  ],
  faseResultado: "F1",
  mensaje: null,
};

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/grd/asignar-brigadista", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/grd/asignar-brigadista", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getSession).mockResolvedValue(SESSION as any);
    vi.mocked(makeAsignacionUseCases).mockReturnValue({
      sugerir: { execute: vi.fn().mockResolvedValue(RESULTADO_MOCK) },
    } as any);
  });

  // ── Autenticación ───────────────────────────────────────────────────────────

  it("[negativo] sin sesión → 401", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    const res = await POST(makeRequest(BODY_VALIDO));
    expect(res.status).toBe(401);
    expect((await res.json()).message).toBe("No autenticado.");
  });

  // ── Validación Zod ──────────────────────────────────────────────────────────

  it("[negativo] body JSON inválido → 400", async () => {
    const req = new Request("http://localhost/api/grd/asignar-brigadista", {
      method: "POST",
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("[negativo] idParroquia ausente → 400", async () => {
    const res = await POST(makeRequest({ tipoIncidente: "INCENDIO" }));
    expect(res.status).toBe(400);
  });

  it("[negativo] tipoIncidente inválido → 400", async () => {
    const res = await POST(makeRequest({ ...BODY_VALIDO, tipoIncidente: "TERREMOTO" }));
    expect(res.status).toBe(400);
  });

  it("[negativo] tipoIncidente ausente → 400", async () => {
    const { tipoIncidente: _t, ...sinTipo } = BODY_VALIDO;
    const res = await POST(makeRequest(sinTipo));
    expect(res.status).toBe(400);
  });

  it("[negativo] config.topN supera el máximo (50) → 400", async () => {
    const res = await POST(makeRequest({
      ...BODY_VALIDO,
      config: { pesoManual: 0.4, pesoAutomatico: 0.6, topN: 100 },
    }));
    expect(res.status).toBe(400);
  });

  it("[negativo] config.pesoManual fuera de rango [0,1] → 400", async () => {
    const res = await POST(makeRequest({
      ...BODY_VALIDO,
      config: { pesoManual: 1.5, pesoAutomatico: 0.5, topN: 5 },
    }));
    expect(res.status).toBe(400);
  });

  // ── Casos exitosos ──────────────────────────────────────────────────────────

  it("[positivo] retorna sugerencias cuando hay brigadistas disponibles", async () => {
    const res = await POST(makeRequest(BODY_VALIDO));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.listaSugerida).toHaveLength(1);
    expect(body.faseResultado).toBe("F1");
  });

  it("[positivo] acepta todos los tipos de incidente válidos", async () => {
    const tipos = ["INCENDIO", "INUNDACION", "DERRUMBE", "TSUNAMI", "COLAPSO_INFRAESTRUCTURA", "PERDIDA_VIVIENDA"] as const;
    for (const tipoIncidente of tipos) {
      const res = await POST(makeRequest({ ...BODY_VALIDO, tipoIncidente }));
      expect(res.status).toBe(200);
    }
  });

  it("[positivo] acepta request sin latitud/longitud (opcionales)", async () => {
    const { latitud: _lat, longitud: _lng, ...sinCoords } = BODY_VALIDO;
    const res = await POST(makeRequest(sinCoords));
    expect(res.status).toBe(200);
  });

  it("[positivo] acepta config personalizada dentro de rangos válidos", async () => {
    const res = await POST(makeRequest({
      ...BODY_VALIDO,
      config: { pesoManual: 0.3, pesoAutomatico: 0.7, topN: 10 },
    }));
    expect(res.status).toBe(200);
  });

  // ── Errores del use case ────────────────────────────────────────────────────

  it("[negativo] error inesperado en el use case → 500", async () => {
    vi.mocked(makeAsignacionUseCases).mockReturnValue({
      sugerir: { execute: vi.fn().mockRejectedValue(new Error("DB failure")) },
    } as any);

    const res = await POST(makeRequest(BODY_VALIDO));
    expect(res.status).toBe(500);
  });
});
