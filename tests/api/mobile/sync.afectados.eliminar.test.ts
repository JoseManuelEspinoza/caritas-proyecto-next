import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    personaAfectada: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("@/app/lib/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { POST } from "@/app/api/mobile/sync/afectados/eliminar/route";
import { prisma } from "@/app/lib/prisma";

// RF14 — Eliminar/desactivar afectados desde la app móvil (baja lógica con trazabilidad).

const API_KEY = "test-sync-key-123";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/mobile/sync/afectados/eliminar", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-mobile-sync-key": API_KEY },
    body: JSON.stringify(body),
  });
}

const PERSONA = { idPersonaAfectada: "persona-1" };

describe("POST /api/mobile/sync/afectados/eliminar", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.MOBILE_SYNC_API_KEY = API_KEY;
    vi.mocked(prisma.personaAfectada.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.personaAfectada.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.personaAfectada.update).mockResolvedValue({} as any);
  });

  // ── Autenticación ───────────────────────────────────────────────────────────

  it("[negativo] sin API key → 401", async () => {
    const req = new Request("http://localhost/api/mobile/sync/afectados/eliminar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idAfectadoRemoto: "persona-1" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("[negativo] MOBILE_SYNC_API_KEY no configurada → 503", async () => {
    delete process.env.MOBILE_SYNC_API_KEY;
    const res = await POST(makeRequest({ idAfectadoRemoto: "persona-1" }));
    expect(res.status).toBe(503);
  });

  // ── Validación de payload ───────────────────────────────────────────────────

  it("[negativo] body JSON inválido → 400", async () => {
    const req = new Request("http://localhost/api/mobile/sync/afectados/eliminar", {
      method: "POST",
      headers: { "x-mobile-sync-key": API_KEY },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("[negativo] sin idAfectadoRemoto ni uuidAfectado → 400", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toContain("idAfectadoRemoto");
  });

  // ── Afectado no encontrado ──────────────────────────────────────────────────

  it("[positivo] afectado no encontrado por idAfectadoRemoto → 200 idempotente", async () => {
    vi.mocked(prisma.personaAfectada.findUnique).mockResolvedValue(null);
    const res = await POST(makeRequest({ idAfectadoRemoto: "persona-inexistente" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(prisma.personaAfectada.update).not.toHaveBeenCalled();
  });

  it("[positivo] afectado no encontrado por uuidAfectado → 200 idempotente", async () => {
    vi.mocked(prisma.personaAfectada.findFirst).mockResolvedValue(null);
    const res = await POST(makeRequest({ uuidAfectado: "uuid-inexistente" }));
    expect(res.status).toBe(200);
    expect(prisma.personaAfectada.update).not.toHaveBeenCalled();
  });

  // ── Eliminación exitosa ─────────────────────────────────────────────────────

  it("[positivo] elimina por idAfectadoRemoto → 200 con idPersonaAfectada", async () => {
    vi.mocked(prisma.personaAfectada.findUnique).mockResolvedValue(PERSONA as any);

    const res = await POST(makeRequest({ idAfectadoRemoto: "persona-1" }));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.idPersonaAfectada).toBe("persona-1");

    expect(prisma.personaAfectada.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { idPersonaAfectada: "persona-1" },
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      })
    );
  });

  it("[positivo] elimina por uuidAfectado cuando no se provee idAfectadoRemoto", async () => {
    vi.mocked(prisma.personaAfectada.findFirst).mockResolvedValue(PERSONA as any);

    const res = await POST(makeRequest({ uuidAfectado: "uuid-afectado-1" }));
    expect(res.status).toBe(200);

    expect(prisma.personaAfectada.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { uuidMovil: "uuid-afectado-1" } })
    );
    expect(prisma.personaAfectada.update).toHaveBeenCalledOnce();
  });

  // ── Error ────────────────────────────────────────────────────────────────────

  it("[negativo] error de BD → 500", async () => {
    vi.mocked(prisma.personaAfectada.findUnique).mockRejectedValue(new Error("DB error"));
    const res = await POST(makeRequest({ idAfectadoRemoto: "persona-1" }));
    expect(res.status).toBe(500);
    expect((await res.json()).ok).toBe(false);
  });
});
