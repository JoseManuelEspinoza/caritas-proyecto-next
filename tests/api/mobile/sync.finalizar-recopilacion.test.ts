import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    incidencia: { findUnique: vi.fn() },
    usuarioGRD: { findUnique: vi.fn() },
    brigadistaParroquial: { findFirst: vi.fn() },
    asignacionBrigadistaIncidencia: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { POST } from "@/app/api/mobile/sync/finalizar-recopilacion/route";
import { prisma } from "@/app/lib/prisma";

const API_KEY = "test-sync-key-123";

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/mobile/sync/finalizar-recopilacion", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-mobile-sync-key": API_KEY, ...headers },
    body: JSON.stringify(body),
  });
}

const PAYLOAD_BASE = {
  idIncidenciaRemota: "inc-server-1",
  idUsuarioGRD: "usr-grd-1",
};

const INCIDENCIA_MOCK = {
  idIncidencia: "inc-server-1",
  codigoCaso: "GRD-2026-0001",
  uuidMovil: "uuid-movil-001",
  estadoActual: "EN CAMPO",
};

const USUARIO_MOCK = { idUsuarioGRD: "usr-grd-1" };

const BRIGADISTA_MOCK = {
  idBrigadistaParroquial: "bri-1",
  idUsuarioGRD: "usr-grd-1",
  estado: "ACTIVO",
  disponibilidad: "EN_CAMPO",
};

const ASIGNACION_MOCK = {
  idAsignacionBrigadista: "asig-1",
  fechaCierreCampo: null,
  estadoAsignacion: "EN_CAMPO",
};

const TX_RESULT = {
  incidencia: {
    idIncidencia: "inc-server-1",
    codigoCaso: "GRD-2026-0001",
    uuidMovil: "uuid-movil-001",
    estadoActual: "DATA RECOPILADA",
    fechaSincronizacion: new Date(),
  },
  asignacion: {
    idAsignacionBrigadista: "asig-1",
    estadoAsignacion: "EN_CAMPO",
    fechaCierreCampo: new Date(),
    fechaSincronizacion: new Date(),
  },
  historial: {
    idHistorial: "hist-1",
    estadoAnterior: "EN CAMPO",
    estadoNuevo: "DATA RECOPILADA",
    fechaCambio: new Date(),
  },
};

describe("POST /api/mobile/sync/finalizar-recopilacion", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.MOBILE_SYNC_API_KEY = API_KEY;
    vi.mocked(prisma.incidencia.findUnique).mockResolvedValue(INCIDENCIA_MOCK as any);
    vi.mocked(prisma.usuarioGRD.findUnique).mockResolvedValue(USUARIO_MOCK as any);
    vi.mocked(prisma.brigadistaParroquial.findFirst).mockResolvedValue(BRIGADISTA_MOCK as any);
    vi.mocked(prisma.asignacionBrigadistaIncidencia.findFirst).mockResolvedValue(ASIGNACION_MOCK as any);
    vi.mocked((prisma as any).$transaction).mockImplementation(async (fn: (tx: any) => Promise<any>) => {
      const tx = {
        incidencia: { update: vi.fn().mockResolvedValue(TX_RESULT.incidencia) },
        asignacionBrigadistaIncidencia: { update: vi.fn().mockResolvedValue(TX_RESULT.asignacion) },
        historialEstadoIncidencia: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue(TX_RESULT.historial),
        },
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

  // ── Resolución de entidades ──────────────────────────────────────────────────

  it("[negativo] incidencia no encontrada → 404", async () => {
    vi.mocked(prisma.incidencia.findUnique).mockResolvedValue(null);
    const res = await POST(makeRequest(PAYLOAD_BASE));
    expect(res.status).toBe(404);
  });

  it("[negativo] idUsuarioGRD ausente → 400", async () => {
    const { idUsuarioGRD: _u, ...sinUsuario } = PAYLOAD_BASE;
    const res = await POST(makeRequest(sinUsuario));
    expect(res.status).toBe(400);
  });

  it("[negativo] usuario GRD no encontrado → 404", async () => {
    vi.mocked(prisma.usuarioGRD.findUnique).mockResolvedValue(null);
    const res = await POST(makeRequest(PAYLOAD_BASE));
    expect(res.status).toBe(404);
  });

  it("[negativo] brigadista activo no encontrado → 404", async () => {
    vi.mocked(prisma.brigadistaParroquial.findFirst).mockResolvedValue(null);
    const res = await POST(makeRequest(PAYLOAD_BASE));
    expect(res.status).toBe(404);
  });

  it("[negativo] asignación activa no encontrada → 404", async () => {
    vi.mocked(prisma.asignacionBrigadistaIncidencia.findFirst).mockResolvedValue(null);
    const res = await POST(makeRequest(PAYLOAD_BASE));
    expect(res.status).toBe(404);
  });

  // ── Éxito ────────────────────────────────────────────────────────────────────

  it("[positivo] finaliza recopilación → 200 con estadoActual DATA RECOPILADA", async () => {
    const res = await POST(makeRequest(PAYLOAD_BASE));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.estadoActual).toBe("DATA RECOPILADA");
    expect(body.estadoAnterior).toBe("EN CAMPO");
    expect(body.codigoCaso).toBe("GRD-2026-0001");
    expect(body.idHistorial).toBe("hist-1");
  });

  // ── Error ────────────────────────────────────────────────────────────────────

  it("[negativo] error inesperado → 500", async () => {
    vi.mocked(prisma.incidencia.findUnique).mockRejectedValue(new Error("DB error"));
    const res = await POST(makeRequest(PAYLOAD_BASE));
    expect(res.status).toBe(500);
    expect((await res.json()).ok).toBe(false);
  });
});
