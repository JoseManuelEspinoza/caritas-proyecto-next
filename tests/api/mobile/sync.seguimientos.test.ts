import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    seguimientoIncidencia: { findUnique: vi.fn(), create: vi.fn() },
    incidencia: { findUnique: vi.fn() },
  },
}));

import { GET, POST } from "@/app/api/mobile/sync/seguimientos/route";
import { prisma } from "@/app/lib/prisma";

const API_KEY = "test-sync-key-123";

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/mobile/sync/seguimientos", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-mobile-sync-key": API_KEY, ...headers },
    body: JSON.stringify(body),
  });
}

const PAYLOAD_BASE = {
  uuidSeguimiento: "uuid-seg-001",
  situacion: "Situación estable",
  idIncidenciaRemota: "inc-server-1",
};

const SEGUIMIENTO_BD = {
  idSeguimiento: "seg-server-1",
  idIncidencia: "inc-server-1",
  uuidMovil: "uuid-seg-001",
  estado: "REGISTRADO",
  syncEstado: "SINCRONIZADO",
  fechaSincronizacion: new Date("2026-06-18T10:00:00Z"),
};

const INCIDENCIA_MOCK = {
  idIncidencia: "inc-server-1",
  codigoCaso: "GRD-2026-0001",
};

describe("GET /api/mobile/sync/seguimientos — heartbeat", () => {
  beforeEach(() => { process.env.MOBILE_SYNC_API_KEY = API_KEY; });
  afterEach(() => vi.unstubAllEnvs());

  it("[positivo] heartbeat con API key válida → 200", async () => {
    const req = new Request("http://localhost/api/mobile/sync/seguimientos", {
      headers: { "x-mobile-sync-key": API_KEY },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });

  it("[negativo] sin API key → 401", async () => {
    const req = new Request("http://localhost/api/mobile/sync/seguimientos");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});

describe("POST /api/mobile/sync/seguimientos — sincronización", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.MOBILE_SYNC_API_KEY = API_KEY;
    vi.mocked(prisma.seguimientoIncidencia.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.incidencia.findUnique).mockResolvedValue(INCIDENCIA_MOCK as any);
    vi.mocked(prisma.seguimientoIncidencia.create).mockResolvedValue({
      idSeguimiento: "seg-server-1",
      idIncidencia: "inc-server-1",
      estado: "REGISTRADO",
      syncEstado: "SINCRONIZADO",
      fechaSincronizacion: new Date(),
    } as any);
  });
  afterEach(() => vi.unstubAllEnvs());

  // ── Auth ────────────────────────────────────────────────────────────────────

  it("[negativo] sin API key → 401", async () => {
    const res = await POST(makeRequest(PAYLOAD_BASE, { "x-mobile-sync-key": "bad" }));
    expect(res.status).toBe(401);
  });

  it("[negativo] MOBILE_SYNC_API_KEY no configurada → 503", async () => {
    vi.stubEnv("MOBILE_SYNC_API_KEY", "");
    const res = await POST(makeRequest(PAYLOAD_BASE));
    expect(res.status).toBe(503);
  });

  // ── Validación ──────────────────────────────────────────────────────────────

  it("[negativo] body JSON inválido → 400", async () => {
    const req = new Request("http://localhost/api/mobile/sync/seguimientos", {
      method: "POST",
      headers: { "x-mobile-sync-key": API_KEY },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("[negativo] uuidSeguimiento ausente → 400", async () => {
    const res = await POST(makeRequest({ situacion: "Estable" }));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toContain("uuidSeguimiento");
  });

  it("[negativo] ni situacion ni descripcion → 400", async () => {
    const res = await POST(makeRequest({ uuidSeguimiento: "uuid-1", idIncidenciaRemota: "inc-1" }));
    expect(res.status).toBe(400);
  });

  it("[negativo] descripcion demasiado corta (< 5 chars) → 400", async () => {
    const res = await POST(makeRequest({ ...PAYLOAD_BASE, situacion: undefined, descripcion: "abc" }));
    expect(res.status).toBe(400);
  });

  it("[negativo] situacion demasiado corta (< 3 chars) → 400", async () => {
    const res = await POST(makeRequest({ ...PAYLOAD_BASE, situacion: "ab" }));
    expect(res.status).toBe(400);
  });

  // ── Duplicado ───────────────────────────────────────────────────────────────

  it("[positivo] seguimiento duplicado → 200 con duplicated: true", async () => {
    vi.mocked(prisma.seguimientoIncidencia.findUnique).mockResolvedValue(SEGUIMIENTO_BD as any);

    const res = await POST(makeRequest(PAYLOAD_BASE));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.duplicated).toBe(true);
    expect(body.idSeguimientoRemoto).toBe("seg-server-1");
  });

  // ── Nuevo seguimiento ───────────────────────────────────────────────────────

  it("[positivo] nuevo seguimiento → 200 con duplicated: false", async () => {
    const res = await POST(makeRequest(PAYLOAD_BASE));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.duplicated).toBe(false);
    expect(body.codigoCaso).toBe("GRD-2026-0001");
  });

  it("[positivo] acepta solo descripcion sin situacion", async () => {
    const { situacion: _s, ...sinSituacion } = PAYLOAD_BASE;
    const res = await POST(makeRequest({ ...sinSituacion, descripcion: "Descripcion larga" }));
    expect(res.status).toBe(200);
  });

  // ── Error ────────────────────────────────────────────────────────────────────

  it("[negativo] incidencia no encontrada → 400", async () => {
    vi.mocked(prisma.incidencia.findUnique).mockResolvedValue(null);
    const res = await POST(makeRequest(PAYLOAD_BASE));
    expect(res.status).toBe(400);
  });

  it("[negativo] error de BD → 500", async () => {
    vi.mocked(prisma.seguimientoIncidencia.findUnique).mockRejectedValue(new Error("DB error"));
    const res = await POST(makeRequest(PAYLOAD_BASE));
    expect(res.status).toBe(500);
    expect((await res.json()).ok).toBe(false);
  });
});
