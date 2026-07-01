import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    actividadPreventiva: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

import { POST } from "@/app/api/mobile/sync/simulacros/route";
import { prisma } from "@/app/lib/prisma";

const API_KEY = "test-sync-key-123";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/mobile/sync/simulacros", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-mobile-sync-key": API_KEY },
    body: JSON.stringify(body),
  });
}

const PAYLOAD_VALIDO = {
  uuidSync: "sync-uuid-1",
  idActividadPreventivaRemota: "act-1",
  idUsuarioGRD: "usr-1",
  estadoActividad: "EJECUTADA",
  resultadoGeneral: "Simulacro ejecutado correctamente",
  fechaEjecucion: "2026-07-15T10:00:00.000Z",
};

const ACTIVIDAD_ASIGNADA = {
  idActividadPreventiva: "act-1",
  estadoActividad: "ASIGNADA",
  idUsuarioResponsableGRD: "usr-1",
  syncEstado: null,
  fechaSincronizacion: null,
  simulacroBrigadistas: [],
};

const ACTIVIDAD_ACTUALIZADA = {
  idActividadPreventiva: "act-1",
  estadoActividad: "EJECUTADA",
  syncEstado: "SINCRONIZADO",
  fechaSincronizacion: new Date(),
};

describe("POST /api/mobile/sync/simulacros", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.MOBILE_SYNC_API_KEY = API_KEY;
    vi.mocked(prisma.actividadPreventiva.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.actividadPreventiva.update).mockResolvedValue(ACTIVIDAD_ACTUALIZADA as any);
  });

  // ── Autenticación ───────────────────────────────────────────────────────────

  it("[negativo] sin API key → 401", async () => {
    const req = new Request("http://localhost/api/mobile/sync/simulacros", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(PAYLOAD_VALIDO),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("[negativo] MOBILE_SYNC_API_KEY no configurada → 503", async () => {
    delete process.env.MOBILE_SYNC_API_KEY;
    const res = await POST(makeRequest(PAYLOAD_VALIDO));
    expect(res.status).toBe(503);
  });

  // ── Validación de payload ───────────────────────────────────────────────────

  it("[negativo] body JSON inválido → 400", async () => {
    const req = new Request("http://localhost/api/mobile/sync/simulacros", {
      method: "POST",
      headers: { "x-mobile-sync-key": API_KEY },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("[negativo] uuidSync ausente → 400", async () => {
    const { uuidSync: _, ...sinUuid } = PAYLOAD_VALIDO;
    const res = await POST(makeRequest(sinUuid));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toContain("uuidSync");
  });

  it("[negativo] idActividadPreventivaRemota ausente → 400", async () => {
    const res = await POST(makeRequest({ ...PAYLOAD_VALIDO, idActividadPreventivaRemota: "" }));
    expect(res.status).toBe(400);
  });

  it("[negativo] estadoActividad distinto de EJECUTADA → 400", async () => {
    const res = await POST(makeRequest({ ...PAYLOAD_VALIDO, estadoActividad: "PROGRAMADA" }));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toContain("EJECUTADA");
  });

  it("[negativo] sin idUsuarioGRD ni idBrigadistaParroquial → 400", async () => {
    const { idUsuarioGRD: _, ...sinUsuario } = PAYLOAD_VALIDO;
    const res = await POST(makeRequest(sinUsuario));
    expect(res.status).toBe(400);
  });

  it("[negativo] sin resultadoGeneral ni reporteBrigadista → 400", async () => {
    const res = await POST(makeRequest({
      ...PAYLOAD_VALIDO,
      resultadoGeneral: "",
      reporteBrigadista: "",
    }));
    expect(res.status).toBe(400);
  });

  it("[negativo] resultadoGeneral con menos de 5 caracteres → 400", async () => {
    const res = await POST(makeRequest({ ...PAYLOAD_VALIDO, resultadoGeneral: "OK" }));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toContain("5 caracteres");
  });

  // ── Lógica de negocio ────────────────────────────────────────────────────────

  it("[negativo] simulacro no encontrado → 404", async () => {
    vi.mocked(prisma.actividadPreventiva.findUnique).mockResolvedValue(null);
    const res = await POST(makeRequest(PAYLOAD_VALIDO));
    expect(res.status).toBe(404);
  });

  it("[positivo] simulacro ya EJECUTADA → 200 con duplicated:true", async () => {
    vi.mocked(prisma.actividadPreventiva.findUnique).mockResolvedValue({
      ...ACTIVIDAD_ASIGNADA,
      estadoActividad: "EJECUTADA",
      syncEstado: "SINCRONIZADO",
      fechaSincronizacion: new Date(),
    } as any);

    const res = await POST(makeRequest(PAYLOAD_VALIDO));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.duplicated).toBe(true);
    expect(body.alreadySynced).toBe(true);
  });

  it("[negativo] simulacro CANCELADA no puede ejecutarse → 400", async () => {
    vi.mocked(prisma.actividadPreventiva.findUnique).mockResolvedValue({
      ...ACTIVIDAD_ASIGNADA,
      estadoActividad: "CANCELADA",
    } as any);
    const res = await POST(makeRequest(PAYLOAD_VALIDO));
    expect(res.status).toBe(400);
  });

  it("[negativo] usuario no asignado al simulacro → 403", async () => {
    vi.mocked(prisma.actividadPreventiva.findUnique).mockResolvedValue({
      ...ACTIVIDAD_ASIGNADA,
      idUsuarioResponsableGRD: "otro-usuario",
      simulacroBrigadistas: [],
    } as any);

    const res = await POST(makeRequest(PAYLOAD_VALIDO));
    expect(res.status).toBe(403);
    expect((await res.json()).message).toContain("no esta asignado");
  });

  it("[positivo] sincronización exitosa → 200 con estado EJECUTADA", async () => {
    vi.mocked(prisma.actividadPreventiva.findUnique).mockResolvedValue(ACTIVIDAD_ASIGNADA as any);

    const res = await POST(makeRequest(PAYLOAD_VALIDO));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.duplicated).toBe(false);
    expect(body.estadoActividad).toBe("EJECUTADA");
    expect(body.syncEstado).toBe("SINCRONIZADO");
  });

  it("[negativo] error de BD → 500", async () => {
    vi.mocked(prisma.actividadPreventiva.findUnique).mockRejectedValue(new Error("DB error"));
    const res = await POST(makeRequest(PAYLOAD_VALIDO));
    expect(res.status).toBe(500);
    expect((await res.json()).ok).toBe(false);
  });
});
