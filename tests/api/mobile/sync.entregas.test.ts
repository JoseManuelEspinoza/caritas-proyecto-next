import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    entregaAyudaHumanitaria: { findUnique: vi.fn() },
    movimientoKit: { findUnique: vi.fn() },
    incidencia: { findUnique: vi.fn() },
    solicitudAyudaHumanitaria: { findUnique: vi.fn() },
    kitEmergencia: { findUnique: vi.fn() },
    usuarioGRD: { findUnique: vi.fn() },
    grupoFamiliarAfectado: { findUnique: vi.fn(), findFirst: vi.fn() },
    personaAfectada: { findUnique: vi.fn(), findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { GET, POST } from "@/app/api/mobile/sync/entregas/route";
import { prisma } from "@/app/lib/prisma";

const API_KEY = "test-sync-key-123";

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/mobile/sync/entregas", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-mobile-sync-key": API_KEY, ...headers },
    body: JSON.stringify(body),
  });
}

const PAYLOAD_BASE = {
  uuidEntrega: "uuid-ent-001",
  tipoAyuda: "Alimentos",
  idIncidenciaRemota: "inc-server-1",
};

const INCIDENCIA_MOCK = {
  idIncidencia: "inc-server-1",
  codigoCaso: "GRD-2026-0001",
  idParroquia: "par-1",
  estadoActual: "APROBADO",
};

const ENTREGA_BD = {
  idEntrega: "ent-server-1",
  idIncidencia: "inc-server-1",
  codigoEntrega: null,
  fechaEntrega: new Date(),
  lugarEntrega: null,
  tipoAyuda: "Alimentos",
  descripcionAyuda: null,
  cantidadEntregada: 1,
  conformidadRecepcion: null,
  entregaParcial: false,
  observaciones: null,
  idGrupoFamiliar: null,
  idPersonaAfectada: null,
  uuidAfectadoMovil: null,
  syncEstado: "SINCRONIZADO",
  fechaSincronizacion: new Date(),
};

const TX_ENTREGA_RESULT = {
  idEntrega: "ent-server-1",
  idIncidencia: "inc-server-1",
  codigoEntrega: null,
  fechaEntrega: new Date(),
  tipoAyuda: "Alimentos",
  descripcionAyuda: null,
  cantidadEntregada: 1,
  conformidadRecepcion: null,
  entregaParcial: false,
  idGrupoFamiliar: null,
  idPersonaAfectada: null,
  uuidAfectadoMovil: null,
  syncEstado: "SINCRONIZADO",
  fechaSincronizacion: new Date(),
};

describe("GET /api/mobile/sync/entregas — heartbeat", () => {
  beforeEach(() => { process.env.MOBILE_SYNC_API_KEY = API_KEY; });
  afterEach(() => vi.unstubAllEnvs());

  it("[positivo] heartbeat con API key válida → 200", async () => {
    const req = new Request("http://localhost/api/mobile/sync/entregas", {
      headers: { "x-mobile-sync-key": API_KEY },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });

  it("[negativo] sin API key → 401", async () => {
    const req = new Request("http://localhost/api/mobile/sync/entregas");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});

describe("POST /api/mobile/sync/entregas — sincronización", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.MOBILE_SYNC_API_KEY = API_KEY;
    vi.mocked(prisma.entregaAyudaHumanitaria.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.incidencia.findUnique).mockResolvedValue(INCIDENCIA_MOCK as any);
    vi.mocked((prisma as any).$transaction).mockImplementation(async (fn: (tx: any) => Promise<any>) => {
      const tx = {
        entregaAyudaHumanitaria: { create: vi.fn().mockResolvedValue(TX_ENTREGA_RESULT) },
        kitEmergencia: { update: vi.fn() },
        movimientoKit: { create: vi.fn() },
      };
      return fn(tx);
    });
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

  it("[negativo] uuidEntrega ausente → 400", async () => {
    const res = await POST(makeRequest({ tipoAyuda: "Alimentos" }));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toContain("uuidEntrega");
  });

  it("[negativo] ni tipoAyuda ni descripcionAyuda → 400", async () => {
    const { tipoAyuda: _t, ...sinTipo } = PAYLOAD_BASE;
    const res = await POST(makeRequest(sinTipo));
    expect(res.status).toBe(400);
  });

  it("[negativo] tipoAyuda demasiado corto (< 3 chars) → 400", async () => {
    const res = await POST(makeRequest({ ...PAYLOAD_BASE, tipoAyuda: "Ab" }));
    expect(res.status).toBe(400);
  });

  it("[negativo] descripcionAyuda demasiado corta (< 5 chars) → 400", async () => {
    const { tipoAyuda: _t, ...sinTipo } = PAYLOAD_BASE;
    const res = await POST(makeRequest({ ...sinTipo, descripcionAyuda: "abc" }));
    expect(res.status).toBe(400);
  });

  // ── Duplicado ───────────────────────────────────────────────────────────────

  it("[positivo] entrega duplicada → 200 con duplicated: true", async () => {
    vi.mocked(prisma.entregaAyudaHumanitaria.findUnique).mockResolvedValue(ENTREGA_BD as any);
    vi.mocked(prisma.movimientoKit.findUnique).mockResolvedValue(null);

    const res = await POST(makeRequest(PAYLOAD_BASE));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.duplicated).toBe(true);
    expect(body.idEntregaRemota).toBe("ent-server-1");
  });

  // ── Nueva entrega ────────────────────────────────────────────────────────────

  it("[positivo] nueva entrega sin kit → 200 con duplicated: false", async () => {
    const res = await POST(makeRequest(PAYLOAD_BASE));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.duplicated).toBe(false);
    expect(body.idEntregaRemota).toBe("ent-server-1");
    expect(body.codigoCaso).toBe("GRD-2026-0001");
  });

  // ── Errores ─────────────────────────────────────────────────────────────────

  it("[negativo] incidencia no encontrada → 400", async () => {
    vi.mocked(prisma.incidencia.findUnique).mockResolvedValue(null);
    const res = await POST(makeRequest(PAYLOAD_BASE));
    expect(res.status).toBe(400);
  });

  it("[negativo] error de BD → 500", async () => {
    vi.mocked(prisma.entregaAyudaHumanitaria.findUnique).mockRejectedValue(new Error("DB error"));
    const res = await POST(makeRequest(PAYLOAD_BASE));
    expect(res.status).toBe(500);
    expect((await res.json()).ok).toBe(false);
  });
});
