import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    parroquia: { findMany: vi.fn() },
  },
}));

import { GET } from "@/app/api/mobile/parroquias/route";
import { prisma } from "@/app/lib/prisma";

const API_KEY = "test-sync-key-123";

function makeRequest(headers: Record<string, string> = {}, search = "") {
  return new Request(`http://localhost/api/mobile/parroquias${search}`, { headers });
}

const PARROQUIA_MOCK = {
  idParroquia: "par-1",
  idLugarCatalogo: "lug-1",
  nombre: "San Pedro Apóstol",
  direccion: "Av. Larco 100",
  referencia: "Frente al parque",
  latitud: { toNumber: () => -12.1219, toString: () => "-12.1219" },
  longitud: { toNumber: () => -77.0296, toString: () => "-77.0296" },
  telefono: null,
  correo: null,
  estado: "ACTIVO",
  lugarCatalogo: null,
};

describe("GET /api/mobile/parroquias", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.MOBILE_SYNC_API_KEY = API_KEY;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // ── Autenticación ───────────────────────────────────────────────────────────

  it("[negativo] sin API key → 401", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("[negativo] API key incorrecta → 401", async () => {
    const res = await GET(makeRequest({ "x-mobile-sync-key": "bad-key" }));
    expect(res.status).toBe(401);
  });

  it("[negativo] MOBILE_SYNC_API_KEY no configurada → 503", async () => {
    vi.stubEnv("MOBILE_SYNC_API_KEY", "");
    const res = await GET(makeRequest({ "x-mobile-sync-key": API_KEY }));
    expect(res.status).toBe(503);
  });

  // ── Respuestas exitosas ─────────────────────────────────────────────────────

  it("[positivo] retorna lista de parroquias activas", async () => {
    vi.mocked(prisma.parroquia.findMany).mockResolvedValue([PARROQUIA_MOCK] as any);

    const res = await GET(makeRequest({ "x-mobile-sync-key": API_KEY }));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.total).toBe(1);
    expect(body.parroquias[0].nombre).toBe("San Pedro Apóstol");
  });

  it("[positivo] convierte Decimal a número en latitud y longitud", async () => {
    vi.mocked(prisma.parroquia.findMany).mockResolvedValue([PARROQUIA_MOCK] as any);

    const res = await GET(makeRequest({ "x-mobile-sync-key": API_KEY }));
    const body = await res.json();
    expect(typeof body.parroquias[0].latitud).toBe("number");
    expect(typeof body.parroquias[0].longitud).toBe("number");
  });

  it("[positivo] incluye inactivas cuando incluirInactivas=true", async () => {
    vi.mocked(prisma.parroquia.findMany).mockResolvedValue([] as any);

    await GET(makeRequest({ "x-mobile-sync-key": API_KEY }, "?incluirInactivas=true"));

    const [call] = vi.mocked(prisma.parroquia.findMany).mock.calls;
    expect(call[0].where).not.toHaveProperty("estado");
  });

  it("[positivo] filtra solo activas por defecto (sin incluirInactivas)", async () => {
    vi.mocked(prisma.parroquia.findMany).mockResolvedValue([] as any);

    await GET(makeRequest({ "x-mobile-sync-key": API_KEY }));

    const [call] = vi.mocked(prisma.parroquia.findMany).mock.calls;
    expect(call[0].where).toMatchObject({ estado: "ACTIVO" });
  });

  it("[positivo] aplica búsqueda por texto cuando se pasa q", async () => {
    vi.mocked(prisma.parroquia.findMany).mockResolvedValue([] as any);

    await GET(makeRequest({ "x-mobile-sync-key": API_KEY }, "?q=San Pedro"));

    const [call] = vi.mocked(prisma.parroquia.findMany).mock.calls;
    expect(call[0].where).toMatchObject({ OR: expect.any(Array) });
  });

  it("[negativo] error de BD → 500", async () => {
    vi.mocked(prisma.parroquia.findMany).mockRejectedValue(new Error("DB error"));

    const res = await GET(makeRequest({ "x-mobile-sync-key": API_KEY }));
    expect(res.status).toBe(500);
  });
});
