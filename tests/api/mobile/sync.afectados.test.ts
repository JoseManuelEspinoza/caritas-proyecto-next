import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    personaAfectada: { findUnique: vi.fn(), create: vi.fn() },
    incidencia: { findUnique: vi.fn() },
    grupoFamiliarAfectado: { findFirst: vi.fn(), create: vi.fn() },
  },
}));

import { GET, POST } from "@/app/api/mobile/sync/afectados/route";
import { prisma } from "@/app/lib/prisma";

const API_KEY = "test-sync-key-123";

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/mobile/sync/afectados", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-mobile-sync-key": API_KEY, ...headers },
    body: JSON.stringify(body),
  });
}

const PAYLOAD_BASE = {
  uuidAfectado: "uuid-af-001",
  nombres: "María López",
  idIncidenciaRemota: "inc-server-1",
};

const PERSONA_BD = {
  idPersonaAfectada: "persona-1",
  idGrupoFamiliar: "grupo-1",
  uuidMovil: "uuid-af-001",
  tipoDocumento: "DNI",
  numeroDocumento: "12345678",
  nombres: "María López",
  apellidos: "García",
  esVulnerable: false,
  syncEstado: "SINCRONIZADO",
  fechaSincronizacion: new Date("2026-06-18T10:00:00Z"),
  grupoFamiliar: {
    idIncidencia: "inc-server-1",
    codigoGrupo: "MOVIL-GRD-2026-0001",
    incidencia: { codigoCaso: "GRD-2026-0001" },
  },
};

const INCIDENCIA_MOCK = {
  idIncidencia: "inc-server-1",
  codigoCaso: "GRD-2026-0001",
};

describe("GET /api/mobile/sync/afectados — heartbeat", () => {
  beforeEach(() => { process.env.MOBILE_SYNC_API_KEY = API_KEY; });
  afterEach(() => vi.unstubAllEnvs());

  it("[positivo] heartbeat con API key válida → 200", async () => {
    const req = new Request("http://localhost/api/mobile/sync/afectados", {
      headers: { "x-mobile-sync-key": API_KEY },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });

  it("[negativo] sin API key → 401", async () => {
    const req = new Request("http://localhost/api/mobile/sync/afectados");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});

describe("POST /api/mobile/sync/afectados — sincronización", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.MOBILE_SYNC_API_KEY = API_KEY;
    vi.mocked(prisma.personaAfectada.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.incidencia.findUnique).mockResolvedValue(INCIDENCIA_MOCK as any);
    vi.mocked(prisma.grupoFamiliarAfectado.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.grupoFamiliarAfectado.create).mockResolvedValue({
      idGrupoFamiliar: "grupo-1",
    } as any);
    vi.mocked(prisma.personaAfectada.create).mockResolvedValue({
      idPersonaAfectada: "persona-1",
      idGrupoFamiliar: "grupo-1",
      tipoDocumento: null,
      numeroDocumento: null,
      nombres: "María López",
      apellidos: null,
      esVulnerable: false,
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
    const req = new Request("http://localhost/api/mobile/sync/afectados", {
      method: "POST",
      headers: { "x-mobile-sync-key": API_KEY },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("[negativo] uuidAfectado ausente → 400", async () => {
    const res = await POST(makeRequest({ nombres: "María" }));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toContain("uuidAfectado");
  });

  it("[negativo] nombres ausente → 400", async () => {
    const res = await POST(makeRequest({ uuidAfectado: "uuid-1", idIncidenciaRemota: "inc-1" }));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toContain("nombres");
  });

  it("[negativo] nombres demasiado corto (1 char) → 400", async () => {
    const res = await POST(makeRequest({ ...PAYLOAD_BASE, nombres: "A" }));
    expect(res.status).toBe(400);
  });

  it("[negativo] fechaNacimiento inválida → 400", async () => {
    const res = await POST(makeRequest({ ...PAYLOAD_BASE, fechaNacimiento: "not-a-date" }));
    expect(res.status).toBe(400);
  });

  it("[negativo] esVulnerable con valor inválido → 400", async () => {
    const res = await POST(makeRequest({ ...PAYLOAD_BASE, esVulnerable: "maybe" }));
    expect(res.status).toBe(400);
  });

  // ── Duplicado ───────────────────────────────────────────────────────────────

  it("[positivo] afectado duplicado → 200 con duplicated: true", async () => {
    vi.mocked(prisma.personaAfectada.findUnique).mockResolvedValue(PERSONA_BD as any);

    const res = await POST(makeRequest(PAYLOAD_BASE));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.duplicated).toBe(true);
    expect(body.nombres).toBe("María López");
    expect(body.codigoCaso).toBe("GRD-2026-0001");
  });

  // ── Nuevo afectado ──────────────────────────────────────────────────────────

  it("[positivo] nuevo afectado → 200 con duplicated: false", async () => {
    const res = await POST(makeRequest(PAYLOAD_BASE));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.duplicated).toBe(false);
    expect(body.idServidor).toBe("persona-1");
    expect(body.codigoCaso).toBe("GRD-2026-0001");
  });

  it("[positivo] reutiliza grupo familiar existente", async () => {
    vi.mocked(prisma.grupoFamiliarAfectado.findFirst).mockResolvedValue({
      idGrupoFamiliar: "grupo-existente",
    } as any);

    const res = await POST(makeRequest(PAYLOAD_BASE));
    expect(res.status).toBe(200);
    expect(prisma.grupoFamiliarAfectado.create).not.toHaveBeenCalled();
  });

  // ── Error ────────────────────────────────────────────────────────────────────

  it("[negativo] incidencia no encontrada → 400", async () => {
    vi.mocked(prisma.incidencia.findUnique).mockResolvedValue(null);
    const res = await POST(makeRequest(PAYLOAD_BASE));
    expect(res.status).toBe(400);
  });

  it("[negativo] error de BD → 500", async () => {
    vi.mocked(prisma.personaAfectada.findUnique).mockRejectedValue(new Error("DB error"));
    const res = await POST(makeRequest(PAYLOAD_BASE));
    expect(res.status).toBe(500);
    expect((await res.json()).ok).toBe(false);
  });
});
