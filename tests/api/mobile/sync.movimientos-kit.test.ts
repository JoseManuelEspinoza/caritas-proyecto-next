import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    movimientoKit: { findUnique: vi.fn() },
    kitEmergencia: { findUnique: vi.fn(), findFirst: vi.fn() },
    usuarioGRD: { findUnique: vi.fn() },
    parroquia: { findUnique: vi.fn() },
    actividadPreventiva: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { GET, POST } from "@/app/api/mobile/sync/movimientos-kit/route";
import { prisma } from "@/app/lib/prisma";

const API_KEY = "test-sync-key-123";

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/mobile/sync/movimientos-kit", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-mobile-sync-key": API_KEY, ...headers },
    body: JSON.stringify(body),
  });
}

const PAYLOAD_INGRESO = {
  uuidMovimiento: "uuid-mov-001",
  idKitEmergenciaRemoto: "kit-1",
  idUsuarioResponsableGRD: "usr-grd-1",
  tipoMovimiento: "INGRESO",
  cantidad: 5,
};

const PAYLOAD_ENTREGA = {
  uuidMovimiento: "uuid-mov-002",
  idKitEmergenciaRemoto: "kit-1",
  idUsuarioResponsableGRD: "usr-grd-1",
  tipoMovimiento: "ENTREGA",
  cantidad: 3,
  idParroquiaDestino: "par-1",
};

const KIT_MOCK = {
  idKitEmergencia: "kit-1",
  tipoKit: "PRIMEROS_AUXILIOS",
  stockActual: 10,
  estadoKit: "ACTIVO",
};

const MOVIMIENTO_BD = {
  idMovimientoKit: "mov-server-1",
  idKitEmergencia: "kit-1",
  idUsuarioResponsableGRD: "usr-grd-1",
  idParroquiaDestino: null,
  tipoMovimiento: "INGRESO",
  cantidad: 5,
  motivoMovimiento: null,
  observaciones: null,
  fechaMovimiento: new Date(),
  syncEstado: "SINCRONIZADO",
  fechaSincronizacion: new Date(),
  kitEmergencia: { tipoKit: "PRIMEROS_AUXILIOS", stockActual: 15 },
};

const TX_RESULT = {
  kit: { idKitEmergencia: "kit-1", tipoKit: "PRIMEROS_AUXILIOS", stockActual: 15 },
  movimiento: {
    idMovimientoKit: "mov-server-1",
    idKitEmergencia: "kit-1",
    idUsuarioResponsableGRD: "usr-grd-1",
    idParroquiaDestino: null,
    tipoMovimiento: "INGRESO",
    cantidad: 5,
    motivoMovimiento: null,
    observaciones: null,
    fechaMovimiento: new Date(),
    syncEstado: "SINCRONIZADO",
    fechaSincronizacion: new Date(),
  },
};

describe("GET /api/mobile/sync/movimientos-kit — heartbeat", () => {
  beforeEach(() => { process.env.MOBILE_SYNC_API_KEY = API_KEY; });
  afterEach(() => vi.unstubAllEnvs());

  it("[positivo] heartbeat con API key válida → 200", async () => {
    const req = new Request("http://localhost/api/mobile/sync/movimientos-kit", {
      headers: { "x-mobile-sync-key": API_KEY },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });

  it("[negativo] sin API key → 401", async () => {
    const req = new Request("http://localhost/api/mobile/sync/movimientos-kit");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});

describe("POST /api/mobile/sync/movimientos-kit — sincronización", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.MOBILE_SYNC_API_KEY = API_KEY;
    vi.mocked(prisma.movimientoKit.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.kitEmergencia.findUnique).mockResolvedValue(KIT_MOCK as any);
    vi.mocked(prisma.usuarioGRD.findUnique).mockResolvedValue({ idUsuarioGRD: "usr-grd-1" } as any);
    vi.mocked(prisma.parroquia.findUnique).mockResolvedValue({ idParroquia: "par-1", estado: "ACTIVO" } as any);
    vi.mocked((prisma as any).$transaction).mockImplementation(async (fn: (tx: any) => Promise<any>) => {
      const tx = {
        kitEmergencia: { update: vi.fn().mockResolvedValue(TX_RESULT.kit) },
        movimientoKit: { create: vi.fn().mockResolvedValue(TX_RESULT.movimiento) },
      };
      return fn(tx);
    });
  });
  afterEach(() => vi.unstubAllEnvs());

  // ── Auth ────────────────────────────────────────────────────────────────────

  it("[negativo] sin API key → 401", async () => {
    const res = await POST(makeRequest(PAYLOAD_INGRESO, { "x-mobile-sync-key": "bad" }));
    expect(res.status).toBe(401);
  });

  it("[negativo] MOBILE_SYNC_API_KEY no configurada → 503", async () => {
    vi.stubEnv("MOBILE_SYNC_API_KEY", "");
    const res = await POST(makeRequest(PAYLOAD_INGRESO));
    expect(res.status).toBe(503);
  });

  // ── Validación ──────────────────────────────────────────────────────────────

  it("[negativo] uuidMovimiento ausente → 400", async () => {
    const res = await POST(makeRequest({ tipoMovimiento: "INGRESO", cantidad: 5 }));
    expect(res.status).toBe(400);
  });

  it("[negativo] tipoMovimiento inválido → 400", async () => {
    const res = await POST(makeRequest({ ...PAYLOAD_INGRESO, tipoMovimiento: "INVALIDO" }));
    expect(res.status).toBe(400);
  });

  it("[negativo] cantidad no proporcionada → 400", async () => {
    const { cantidad: _c, ...sinCantidad } = PAYLOAD_INGRESO;
    const res = await POST(makeRequest(sinCantidad));
    expect(res.status).toBe(400);
  });

  it("[negativo] cantidad cero → 400", async () => {
    const res = await POST(makeRequest({ ...PAYLOAD_INGRESO, cantidad: 0 }));
    expect(res.status).toBe(400);
  });

  it("[negativo] ENTREGA sin idParroquiaDestino → 400", async () => {
    const { idParroquiaDestino: _p, ...sinParroquia } = PAYLOAD_ENTREGA;
    const res = await POST(makeRequest(sinParroquia));
    expect(res.status).toBe(400);
  });

  // ── Duplicado ───────────────────────────────────────────────────────────────

  it("[positivo] movimiento duplicado → 200 con duplicated: true", async () => {
    vi.mocked(prisma.movimientoKit.findUnique).mockResolvedValue(MOVIMIENTO_BD as any);

    const res = await POST(makeRequest(PAYLOAD_INGRESO));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.duplicated).toBe(true);
    expect(body.idMovimientoKitRemoto).toBe("mov-server-1");
  });

  // ── Nuevo movimiento ─────────────────────────────────────────────────────────

  it("[positivo] nuevo movimiento INGRESO → 200 con duplicated: false", async () => {
    const res = await POST(makeRequest(PAYLOAD_INGRESO));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.duplicated).toBe(false);
    expect(body.tipoMovimiento).toBe("INGRESO");
    expect(body.stockAnterior).toBe(10);
  });

  it("[positivo] nuevo movimiento ENTREGA → 200", async () => {
    const txEntregaResult = {
      kit: { ...TX_RESULT.kit, stockActual: 7 },
      movimiento: { ...TX_RESULT.movimiento, tipoMovimiento: "ENTREGA", cantidad: 3 },
    };
    vi.mocked((prisma as any).$transaction).mockImplementation(async (fn: (tx: any) => Promise<any>) => {
      const tx = {
        kitEmergencia: { update: vi.fn().mockResolvedValue(txEntregaResult.kit) },
        movimientoKit: { create: vi.fn().mockResolvedValue(txEntregaResult.movimiento) },
      };
      return fn(tx);
    });

    const res = await POST(makeRequest(PAYLOAD_ENTREGA));
    expect(res.status).toBe(200);
    expect((await res.json()).stockActual).toBe(7);
  });

  // ── Errores ─────────────────────────────────────────────────────────────────

  it("[negativo] kit no encontrado → 400", async () => {
    vi.mocked(prisma.kitEmergencia.findUnique).mockResolvedValue(null);
    const res = await POST(makeRequest(PAYLOAD_INGRESO));
    expect(res.status).toBe(400);
  });

  it("[negativo] kit inactivo → 400", async () => {
    vi.mocked(prisma.kitEmergencia.findUnique).mockResolvedValue({ ...KIT_MOCK, estadoKit: "INACTIVO" } as any);
    const res = await POST(makeRequest(PAYLOAD_INGRESO));
    expect(res.status).toBe(400);
  });

  it("[negativo] stock insuficiente en ENTREGA → 400", async () => {
    vi.mocked(prisma.kitEmergencia.findUnique).mockResolvedValue({ ...KIT_MOCK, stockActual: 1 } as any);
    const res = await POST(makeRequest({ ...PAYLOAD_ENTREGA, cantidad: 10 }));
    expect(res.status).toBe(400);
  });

  it("[negativo] error de BD → 500", async () => {
    vi.mocked(prisma.movimientoKit.findUnique).mockRejectedValue(new Error("DB error"));
    const res = await POST(makeRequest(PAYLOAD_INGRESO));
    expect(res.status).toBe(500);
    expect((await res.json()).ok).toBe(false);
  });
});
