import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    observacionGRD: { findUnique: vi.fn(), create: vi.fn() },
    tipoReferencia: { findFirst: vi.fn() },
    incidencia: { findUnique: vi.fn() },
    seguimientoIncidencia: { findUnique: vi.fn() },
    avisoEmergencia: { findUnique: vi.fn() },
    usuarioGRD: { findUnique: vi.fn() },
  },
}));

import { GET, POST } from "@/app/api/mobile/sync/observaciones/route";
import { prisma } from "@/app/lib/prisma";

const API_KEY = "test-sync-key-123";

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/mobile/sync/observaciones", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-mobile-sync-key": API_KEY, ...headers },
    body: JSON.stringify(body),
  });
}

const PAYLOAD_BASE = {
  uuidObservacion: "uuid-obs-001",
  textoObservacion: "Observación de prueba detallada",
  idIncidenciaRemota: "inc-server-1",
  idUsuarioGRD: "usr-grd-1",
};

const OBSERVACION_BD = {
  idObservacionGRD: "obs-server-1",
  idTipoReferencia: "tipo-1",
  idReferencia: "inc-server-1",
  textoObservacion: "Observación existente",
  estado: "ACTIVO",
  syncEstado: "SINCRONIZADO",
  fechaSincronizacion: new Date("2026-06-18T10:00:00Z"),
};

const TIPO_REF_MOCK = {
  idTipoReferencia: "tipo-1",
  codigoEntidad: "INCIDENCIA",
  nombreEntidad: "Incidencia GRD",
};

describe("GET /api/mobile/sync/observaciones — heartbeat", () => {
  beforeEach(() => { process.env.MOBILE_SYNC_API_KEY = API_KEY; });
  afterEach(() => vi.unstubAllEnvs());

  it("[positivo] heartbeat con API key válida → 200", async () => {
    const req = new Request("http://localhost/api/mobile/sync/observaciones", {
      headers: { "x-mobile-sync-key": API_KEY },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });

  it("[negativo] sin API key → 401", async () => {
    const req = new Request("http://localhost/api/mobile/sync/observaciones");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});

describe("POST /api/mobile/sync/observaciones — sincronización", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.MOBILE_SYNC_API_KEY = API_KEY;
    vi.mocked(prisma.observacionGRD.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.tipoReferencia.findFirst).mockResolvedValue(TIPO_REF_MOCK as any);
    vi.mocked(prisma.incidencia.findUnique).mockResolvedValue({ idIncidencia: "inc-server-1" } as any);
    vi.mocked(prisma.usuarioGRD.findUnique).mockResolvedValue({ idUsuarioGRD: "usr-grd-1" } as any);
    vi.mocked(prisma.observacionGRD.create).mockResolvedValue({
      idObservacionGRD: "obs-server-1",
      idTipoReferencia: "tipo-1",
      idReferencia: "inc-server-1",
      textoObservacion: "Observación de prueba detallada",
      estado: "ACTIVO",
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
    const req = new Request("http://localhost/api/mobile/sync/observaciones", {
      method: "POST",
      headers: { "x-mobile-sync-key": API_KEY },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("[negativo] uuidObservacion ausente → 400", async () => {
    const res = await POST(makeRequest({ textoObservacion: "Texto largo" }));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toContain("uuidObservacion");
  });

  it("[negativo] textoObservacion ausente → 400", async () => {
    const res = await POST(makeRequest({ uuidObservacion: "uuid-1" }));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toContain("textoObservacion");
  });

  it("[negativo] textoObservacion demasiado corto (< 5 chars) → 400", async () => {
    const res = await POST(makeRequest({ ...PAYLOAD_BASE, textoObservacion: "abc" }));
    expect(res.status).toBe(400);
  });

  // ── Duplicado ───────────────────────────────────────────────────────────────

  it("[positivo] observación duplicada → 200 con duplicated: true", async () => {
    vi.mocked(prisma.observacionGRD.findUnique).mockResolvedValue(OBSERVACION_BD as any);

    const res = await POST(makeRequest(PAYLOAD_BASE));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.duplicated).toBe(true);
    expect(body.idObservacionRemota).toBe("obs-server-1");
  });

  // ── Nueva observación ───────────────────────────────────────────────────────

  it("[positivo] nueva observación → 200 con duplicated: false", async () => {
    const res = await POST(makeRequest(PAYLOAD_BASE));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.duplicated).toBe(false);
    expect(body.idObservacionRemota).toBe("obs-server-1");
  });

  // ── Errores ─────────────────────────────────────────────────────────────────

  it("[negativo] tipoReferencia no encontrado → 400", async () => {
    vi.mocked(prisma.tipoReferencia.findFirst).mockResolvedValue(null);
    const res = await POST(makeRequest(PAYLOAD_BASE));
    expect(res.status).toBe(400);
  });

  it("[negativo] idUsuarioGRD ausente → 400", async () => {
    const { idUsuarioGRD: _u, ...sinUsuario } = PAYLOAD_BASE;
    const res = await POST(makeRequest(sinUsuario));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toContain("idUsuarioGRD");
  });

  it("[negativo] usuario GRD no encontrado → 400", async () => {
    vi.mocked(prisma.usuarioGRD.findUnique).mockResolvedValue(null);
    const res = await POST(makeRequest(PAYLOAD_BASE));
    expect(res.status).toBe(400);
  });

  it("[negativo] error de BD → 500", async () => {
    vi.mocked(prisma.observacionGRD.findUnique).mockRejectedValue(new Error("DB error"));
    const res = await POST(makeRequest(PAYLOAD_BASE));
    expect(res.status).toBe(500);
    expect((await res.json()).ok).toBe(false);
  });
});
