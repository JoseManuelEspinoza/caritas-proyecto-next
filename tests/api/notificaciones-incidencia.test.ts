import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/app/lib/dal", () => ({ verifySession: vi.fn() }));
vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    notificacion: { findMany: vi.fn() },
  },
}));

import { GET } from "@/app/api/notificaciones/incidencia/[id]/route";
import { verifySession } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";

const SESSION = { isAuth: true as const, userId: "u-1", role: "GRD", name: "X", email: "x@x.com" };

function makeRequest(id: string) {
  return new Request(`http://localhost/api/notificaciones/incidencia/${id}`);
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => vi.resetAllMocks());

describe("GET /api/notificaciones/incidencia/[id]", () => {
  it("[negativo] sin sesión válida → 401", async () => {
    vi.mocked(verifySession).mockRejectedValue(new Error("No autenticado"));
    const res = await GET(makeRequest("inc-1") as any, makeParams("inc-1") as any);
    expect(res.status).toBe(401);
  });

  it("[positivo] agrupa por tipo, enviadoAt es el timestamp del primer registro del grupo", async () => {
    vi.mocked(verifySession).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.notificacion.findMany).mockResolvedValue([
      {
        tipo: "INCIDENCIA_NUEVA",
        titulo: "Nueva incidencia registrada",
        createdAt: new Date("2026-06-23T10:00:00Z"),
        user: { name: "Admin", email: "admin@x.com", role: "ADMINISTRADOR" },
      },
      {
        tipo: "INFORME_ENVIADO_COMITE",
        titulo: "Informe enviado al Comité",
        createdAt: new Date("2026-06-23T14:32:00Z"),
        user: { name: "Ana Torres", email: "ana@x.com", role: "COMITEDONACIONES" },
      },
      {
        tipo: "INFORME_ENVIADO_COMITE",
        titulo: "Informe enviado al Comité",
        createdAt: new Date("2026-06-23T14:32:01Z"),
        user: { name: "Luis Ríos", email: "luis@x.com", role: "COMITEDONACIONES" },
      },
    ] as any);

    const res = await GET(makeRequest("inc-1") as any, makeParams("inc-1") as any);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toHaveLength(2);

    expect(body[0].tipo).toBe("INCIDENCIA_NUEVA");
    expect(body[0].enviadoAt).toBe("2026-06-23T10:00:00.000Z");
    expect(body[0].destinatarios).toHaveLength(1);
    expect(body[0].destinatarios[0].nombre).toBe("Admin");

    expect(body[1].tipo).toBe("INFORME_ENVIADO_COMITE");
    expect(body[1].enviadoAt).toBe("2026-06-23T14:32:00.000Z");
    expect(body[1].destinatarios).toHaveLength(2);
    expect(body[1].destinatarios[0].nombre).toBe("Ana Torres");
    expect(body[1].destinatarios[1].nombre).toBe("Luis Ríos");

    expect(prisma.notificacion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { idIncidencia: "inc-1" } })
    );
  });

  it("[positivo] sin notificaciones devuelve array vacío", async () => {
    vi.mocked(verifySession).mockResolvedValue(SESSION as any);
    vi.mocked(prisma.notificacion.findMany).mockResolvedValue([] as any);

    const res = await GET(makeRequest("inc-1") as any, makeParams("inc-1") as any);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });
});
