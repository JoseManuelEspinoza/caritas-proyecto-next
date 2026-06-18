import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    catalogoGRD: { findMany: vi.fn() },
  },
}));

import { GET } from "@/app/api/mobile/catalogos/route";
import { prisma } from "@/app/lib/prisma";

const API_KEY = "test-sync-key-123";

function makeRequest(headers: Record<string, string> = {}, search = "") {
  return new Request(`http://localhost/api/mobile/catalogos${search}`, { headers });
}

const CATALOGO_MOCK = {
  idCatalogoGRD: "cat-1",
  nombreCatalogo: "Tipos de evento",
  descripcion: null,
  estado: "ACTIVO",
  detalles: [
    { idCatalogoDetalleGRD: "det-1", codigo: "SIS", valor: "Sismo", descripcion: null, orden: 1, estado: "ACTIVO" },
  ],
};

describe("GET /api/mobile/catalogos", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.MOBILE_SYNC_API_KEY = API_KEY;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // ── Autenticación ───────────────────────────────────────────────────────────

  it("[negativo] sin header x-mobile-sync-key → 401", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    expect((await res.json()).ok).toBe(false);
  });

  it("[negativo] API key incorrecta → 401", async () => {
    const res = await GET(makeRequest({ "x-mobile-sync-key": "wrong-key" }));
    expect(res.status).toBe(401);
  });

  it("[negativo] MOBILE_SYNC_API_KEY no configurada → 503", async () => {
    vi.stubEnv("MOBILE_SYNC_API_KEY", "");
    const res = await GET(makeRequest({ "x-mobile-sync-key": API_KEY }));
    expect(res.status).toBe(503);
  });

  // ── Respuestas exitosas ─────────────────────────────────────────────────────

  it("[positivo] retorna lista de catálogos con detalles", async () => {
    vi.mocked(prisma.catalogoGRD.findMany).mockResolvedValue([CATALOGO_MOCK] as any);

    const res = await GET(makeRequest({ "x-mobile-sync-key": API_KEY }));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.total).toBe(1);
    expect(body.catalogos[0].nombreCatalogo).toBe("Tipos de evento");
    expect(body.catalogos[0].detalles).toHaveLength(1);
    expect(body.serverTime).toBeDefined();
  });

  it("[positivo] retorna array vacío cuando no hay catálogos activos", async () => {
    vi.mocked(prisma.catalogoGRD.findMany).mockResolvedValue([] as any);

    const res = await GET(makeRequest({ "x-mobile-sync-key": API_KEY }));
    const body = await res.json();
    expect(body.total).toBe(0);
    expect(body.catalogos).toEqual([]);
  });

  it("[positivo] filtra por nombreCatalogo cuando se pasa el query param", async () => {
    vi.mocked(prisma.catalogoGRD.findMany).mockResolvedValue([CATALOGO_MOCK] as any);

    const res = await GET(
      makeRequest({ "x-mobile-sync-key": API_KEY }, "?nombreCatalogo=Tipos de evento")
    );
    expect(res.status).toBe(200);

    const [call] = vi.mocked(prisma.catalogoGRD.findMany).mock.calls;
    expect(call[0].where).toMatchObject({
      nombreCatalogo: { equals: "Tipos de evento", mode: "insensitive" },
    });
  });

  it("[positivo] no filtra por nombre cuando el query param está ausente", async () => {
    vi.mocked(prisma.catalogoGRD.findMany).mockResolvedValue([] as any);

    await GET(makeRequest({ "x-mobile-sync-key": API_KEY }));

    const [call] = vi.mocked(prisma.catalogoGRD.findMany).mock.calls;
    expect(call[0].where).not.toHaveProperty("nombreCatalogo");
  });

  it("[negativo] error de BD → 500", async () => {
    vi.mocked(prisma.catalogoGRD.findMany).mockRejectedValue(new Error("DB error"));

    const res = await GET(makeRequest({ "x-mobile-sync-key": API_KEY }));
    expect(res.status).toBe(500);
    expect((await res.json()).ok).toBe(false);
  });
});
