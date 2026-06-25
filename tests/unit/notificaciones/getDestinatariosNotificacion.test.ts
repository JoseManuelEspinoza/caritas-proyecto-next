import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/app/lib/dal", () => ({ verifySession: vi.fn() }));
vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    user: { findMany: vi.fn() },
    incidencia: { findUnique: vi.fn() },
  },
}));

import { getDestinatariosNotificacion } from "@/app/actions/incidents";
import { verifySession } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";

const SESSION = { isAuth: true as const, userId: "u-1", role: "GRD", name: "X", email: "x@x.com" };

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(verifySession).mockResolvedValue(SESSION as any);
});

describe("getDestinatariosNotificacion — step: informe", () => {
  it("[positivo] devuelve miembros activos del comité y jefa OGP", async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { name: "Ana Torres", email: "ana@x.com", role: "COMITEDONACIONES" },
      { name: "María Díaz", email: "maria@x.com", role: "JEFAOGP" },
    ] as any);

    const result = await getDestinatariosNotificacion("informe", "inc-1");

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ nombre: "Ana Torres", email: "ana@x.com", rol: "COMITEDONACIONES" });
    expect(result[1]).toEqual({ nombre: "María Díaz", email: "maria@x.com", rol: "JEFAOGP" });
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { role: { in: ["COMITEDONACIONES", "JEFAOGP"] }, estado: "ACTIVO" },
      })
    );
  });

  it("[borde] sin usuarios activos devuelve array vacío", async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([] as any);
    const result = await getDestinatariosNotificacion("informe", "inc-1");
    expect(result).toEqual([]);
  });
});

describe("getDestinatariosNotificacion — step: decision", () => {
  it("[positivo] devuelve el responsable GRD de la incidencia", async () => {
    vi.mocked(prisma.incidencia.findUnique).mockResolvedValue({
      usuarioResponsable: {
        nombres: "Carlos",
        apellidos: "Mamani",
        correoReferencia: null,
        credencial: { email: "carlos@x.com", role: "ESPECIALISTAGRD" },
      },
    } as any);

    const result = await getDestinatariosNotificacion("decision", "inc-1");

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ nombre: "Carlos Mamani", email: "carlos@x.com", rol: "ESPECIALISTAGRD" });
  });

  it("[borde] incidencia sin responsable asignado devuelve array vacío", async () => {
    vi.mocked(prisma.incidencia.findUnique).mockResolvedValue({
      usuarioResponsable: null,
    } as any);
    const result = await getDestinatariosNotificacion("decision", "inc-1");
    expect(result).toEqual([]);
  });
});
