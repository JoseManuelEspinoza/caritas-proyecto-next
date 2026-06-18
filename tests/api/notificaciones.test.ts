import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/app/lib/dal", () => ({
  verifySession: vi.fn(),
}));

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    notificacion: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

import { GET, PATCH } from "@/app/api/notificaciones/route";
import { verifySession } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";

const SESSION = {
  isAuth: true as const,
  userId: "user-1",
  role: "GRD",
  name: "Juan Pérez",
  email: "juan@test.com",
};

const NOTIF_MOCK = {
  idNotificacion: "n-1",
  tipo: "INCIDENCIA",
  titulo: "Nueva incidencia",
  mensaje: "Se registró una incidencia en tu zona.",
  enlace: "/grd/incidencias/inc-1",
  leida: false,
  createdAt: new Date("2026-06-18T10:00:00Z"),
};

// ── GET /api/notificaciones ─────────────────────────────────────────────────────

describe("GET /api/notificaciones", () => {
  beforeEach(() => vi.resetAllMocks());

  it("[negativo] sin sesión válida → 401", async () => {
    vi.mocked(verifySession).mockRejectedValue(new Error("No autenticado"));
    const res = await GET();
    expect(res.status).toBe(401);
    expect((await res.json()).message).toBe("No autorizado.");
  });

  it("[positivo] retorna las notificaciones del usuario autenticado", async () => {
    vi.mocked(verifySession).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.notificacion.findMany).mockResolvedValue([NOTIF_MOCK] as any);

    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].idNotificacion).toBe("n-1");
    expect(body[0].tipo).toBe("INCIDENCIA");

    expect(prisma.notificacion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1" }, take: 30 })
    );
  });

  it("[positivo] retorna array vacío cuando no hay notificaciones", async () => {
    vi.mocked(verifySession).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.notificacion.findMany).mockResolvedValue([] as any);

    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });
});

// ── PATCH /api/notificaciones ───────────────────────────────────────────────────

describe("PATCH /api/notificaciones", () => {
  beforeEach(() => vi.resetAllMocks());

  function makeRequest(body: unknown = {}) {
    return new Request("http://localhost/api/notificaciones", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("[negativo] sin sesión válida → 401", async () => {
    vi.mocked(verifySession).mockRejectedValue(new Error("No autenticado"));
    const res = await PATCH(makeRequest() as any);
    expect(res.status).toBe(401);
  });

  it("[positivo] sin ids marca todas las no leídas", async () => {
    vi.mocked(verifySession).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.notificacion.updateMany).mockResolvedValue({ count: 3 });

    const res = await PATCH(makeRequest({}) as any);
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);

    expect(prisma.notificacion.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: "user-1", leida: false }),
        data: { leida: true },
      })
    );
  });

  it("[positivo] con ids específicos solo marca esos", async () => {
    vi.mocked(verifySession).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.notificacion.updateMany).mockResolvedValue({ count: 2 });

    const res = await PATCH(makeRequest({ ids: ["n-1", "n-2"] }) as any);
    expect(res.status).toBe(200);

    expect(prisma.notificacion.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-1",
          idNotificacion: { in: ["n-1", "n-2"] },
        }),
      })
    );
  });

  it("[borde] body no JSON no lanza error — usa body vacío", async () => {
    vi.mocked(verifySession).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.notificacion.updateMany).mockResolvedValue({ count: 0 });

    const req = new Request("http://localhost/api/notificaciones", {
      method: "PATCH",
      body: "invalid-json",
    });
    const res = await PATCH(req as any);
    expect(res.status).toBe(200);
  });
});
