import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    kitEmergencia: { findMany: vi.fn() },
  },
}));

import { GET } from "@/app/api/mobile/kits/route";
import { prisma } from "@/app/lib/prisma";

const API_KEY = "test-sync-key-123";

function makeRequest(headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/mobile/kits", { headers });
}

const KIT_MOCK = {
  idKitEmergencia: "kit-1",
  idParroquiaBeneficiaria: "par-1",
  codigoAlmacen: "ALM-001",
  tipoKit: "PRIMEROS_AUXILIOS",
  descripcion: "Kit básico de primeros auxilios",
  stockActual: 10,
  estadoKit: "ACTIVO",
  fechaRegistro: new Date("2026-01-01"),
  ubicacionAlmacen: "Depósito A",
  observaciones: null,
  articulos: [
    { idKitArticulo: "art-1", codigo: "VEN", descripcion: "Vendas", cantidad: 20, orden: 1 },
  ],
};

describe("GET /api/mobile/kits", () => {
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
    const res = await GET(makeRequest({ "x-mobile-sync-key": "wrong" }));
    expect(res.status).toBe(401);
  });

  it("[negativo] MOBILE_SYNC_API_KEY no configurada → 503", async () => {
    vi.stubEnv("MOBILE_SYNC_API_KEY", "");
    const res = await GET(makeRequest({ "x-mobile-sync-key": API_KEY }));
    expect(res.status).toBe(503);
  });

  // ── Respuestas exitosas ─────────────────────────────────────────────────────

  it("[positivo] retorna lista de kits activos con artículos", async () => {
    vi.mocked(prisma.kitEmergencia.findMany).mockResolvedValue([KIT_MOCK] as any);

    const res = await GET(makeRequest({ "x-mobile-sync-key": API_KEY }));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.total).toBe(1);
    expect(body.kits[0].codigoAlmacen).toBe("ALM-001");
    expect(body.kits[0].articulos).toHaveLength(1);
    expect(body.serverTime).toBeDefined();
  });

  it("[positivo] consulta solo kits con estadoKit ACTIVO", async () => {
    vi.mocked(prisma.kitEmergencia.findMany).mockResolvedValue([] as any);

    await GET(makeRequest({ "x-mobile-sync-key": API_KEY }));

    const [call] = vi.mocked(prisma.kitEmergencia.findMany).mock.calls;
    expect(call[0].where).toMatchObject({ estadoKit: "ACTIVO" });
  });

  it("[positivo] retorna array vacío cuando no hay kits activos", async () => {
    vi.mocked(prisma.kitEmergencia.findMany).mockResolvedValue([] as any);

    const res = await GET(makeRequest({ "x-mobile-sync-key": API_KEY }));
    const body = await res.json();
    expect(body.total).toBe(0);
    expect(body.kits).toEqual([]);
  });

  it("[negativo] error de BD → 500", async () => {
    vi.mocked(prisma.kitEmergencia.findMany).mockRejectedValue(new Error("DB down"));

    const res = await GET(makeRequest({ "x-mobile-sync-key": API_KEY }));
    expect(res.status).toBe(500);
    expect((await res.json()).ok).toBe(false);
  });
});
