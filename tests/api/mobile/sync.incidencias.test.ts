import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    incidencia: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    avisoEmergencia: { update: vi.fn() },
  },
}));

vi.mock("@/core/infrastructure/factories/makeIncidenciaUseCases", () => ({
  makeIncidenciaUseCases: vi.fn(() => ({
    registrar: { execute: vi.fn().mockResolvedValue("inc-server-1") },
  })),
}));

import { GET, POST } from "@/app/api/mobile/sync/incidencias/route";
import { prisma } from "@/app/lib/prisma";
import { makeIncidenciaUseCases } from "@/core/infrastructure/factories/makeIncidenciaUseCases";

const API_KEY = "test-sync-key-123";

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/mobile/sync/incidencias", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-mobile-sync-key": API_KEY, ...headers },
    body: JSON.stringify(body),
  });
}

const PAYLOAD_BASE = {
  uuidIncidencia: "uuid-movil-001",
  categoria: "SISMO",
  descripcion: "Sismo leve registrado en la zona sur.",
  direccion: "Av. Principal 123",
  distrito: "Miraflores",
};

const INCIDENCIA_BD = {
  idIncidencia: "inc-server-1",
  codigoCaso: "GRD-2026-0001",
  uuidMovil: "uuid-movil-001",
  syncEstado: "SINCRONIZADO",
  fechaSincronizacion: new Date("2026-06-18T10:00:00Z"),
};

describe("GET /api/mobile/sync/incidencias — heartbeat", () => {
  beforeEach(() => {
    process.env.MOBILE_SYNC_API_KEY = API_KEY;
  });

  afterEach(() => vi.unstubAllEnvs());

  it("[positivo] heartbeat con API key válida → 200", async () => {
    const req = new Request("http://localhost/api/mobile/sync/incidencias", {
      headers: { "x-mobile-sync-key": API_KEY },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("[negativo] heartbeat sin API key → 401", async () => {
    const req = new Request("http://localhost/api/mobile/sync/incidencias");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});

describe("POST /api/mobile/sync/incidencias — sincronización", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.MOBILE_SYNC_API_KEY = API_KEY;
    vi.mocked(prisma.incidencia.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.incidencia.update).mockResolvedValue({
      ...INCIDENCIA_BD,
      idAviso: null,
    } as any);
    vi.mocked(makeIncidenciaUseCases).mockReturnValue({
      registrar: { execute: vi.fn().mockResolvedValue("inc-server-1") },
    } as any);
  });

  afterEach(() => vi.unstubAllEnvs());

  // ── Autenticación ───────────────────────────────────────────────────────────

  it("[negativo] sin API key → 401", async () => {
    const res = await POST(makeRequest(PAYLOAD_BASE, { "x-mobile-sync-key": "bad" }));
    expect(res.status).toBe(401);
  });

  it("[negativo] MOBILE_SYNC_API_KEY no configurada → 503", async () => {
    vi.stubEnv("MOBILE_SYNC_API_KEY", "");
    const res = await POST(makeRequest(PAYLOAD_BASE));
    expect(res.status).toBe(503);
  });

  // ── Validación de entrada ───────────────────────────────────────────────────

  it("[negativo] body JSON inválido → 400", async () => {
    const req = new Request("http://localhost/api/mobile/sync/incidencias", {
      method: "POST",
      headers: { "x-mobile-sync-key": API_KEY },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("[negativo] uuidIncidencia ausente → 400", async () => {
    const res = await POST(makeRequest({ categoria: "SISMO" }));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toContain("uuidIncidencia");
  });

  it("[negativo] uuidIncidencia vacío → 400", async () => {
    const res = await POST(makeRequest({ ...PAYLOAD_BASE, uuidIncidencia: "  " }));
    expect(res.status).toBe(400);
  });

  // ── Duplicado ───────────────────────────────────────────────────────────────

  it("[positivo] incidencia duplicada → 200 con duplicated: true", async () => {
    vi.mocked(prisma.incidencia.findUnique).mockResolvedValue(INCIDENCIA_BD as any);

    const res = await POST(makeRequest(PAYLOAD_BASE));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.duplicated).toBe(true);
    expect(body.codigoCaso).toBe("GRD-2026-0001");
  });

  it("[positivo] duplicado con estado válido actualiza el estado en BD", async () => {
    vi.mocked(prisma.incidencia.findUnique).mockResolvedValue(INCIDENCIA_BD as any);
    vi.mocked(prisma.incidencia.update).mockResolvedValue(INCIDENCIA_BD as any);

    await POST(makeRequest({ ...PAYLOAD_BASE, estado: "EN CAMPO" }));

    expect(prisma.incidencia.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { estadoActual: "EN CAMPO" } })
    );
  });

  it("[borde] duplicado con estado inválido no actualiza el estado", async () => {
    vi.mocked(prisma.incidencia.findUnique).mockResolvedValue(INCIDENCIA_BD as any);

    await POST(makeRequest({ ...PAYLOAD_BASE, estado: "CERRADO" }));

    expect(prisma.incidencia.update).not.toHaveBeenCalled();
  });

  // ── Creación nueva ──────────────────────────────────────────────────────────

  it("[positivo] incidencia nueva → 200 con duplicated: false y código de caso", async () => {
    vi.mocked(prisma.incidencia.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.incidencia.update).mockResolvedValue({
      ...INCIDENCIA_BD,
      idAviso: null,
    } as any);

    const res = await POST(makeRequest(PAYLOAD_BASE));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.duplicated).toBe(false);
    expect(body.codigoCaso).toBe("GRD-2026-0001");
  });

  it("[negativo] error inesperado → 500", async () => {
    vi.mocked(prisma.incidencia.findUnique).mockRejectedValue(new Error("DB failure"));

    const res = await POST(makeRequest(PAYLOAD_BASE));
    expect(res.status).toBe(500);
    expect((await res.json()).ok).toBe(false);
  });
});
