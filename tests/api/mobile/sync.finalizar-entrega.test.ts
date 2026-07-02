import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    incidencia: { findUnique: vi.fn() },
    informe: { findFirst: vi.fn() },
    entregaAyudaHumanitaria: { findMany: vi.fn() },
    personaAfectada: { findUnique: vi.fn() },
    historialEstadoIncidencia: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { POST } from "@/app/api/mobile/sync/finalizar-entrega/route";
import { prisma } from "@/app/lib/prisma";

const API_KEY = "test-sync-key-123";

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/mobile/sync/finalizar-entrega", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-mobile-sync-key": API_KEY, ...headers },
    body: JSON.stringify(body),
  });
}

const INCIDENCIA_APROBADA = {
  idIncidencia: "inc-server-1",
  codigoCaso: "GRD-2026-0001",
  uuidMovil: "uuid-inc-1",
  estadoActual: "APROBADO",
};

const INCIDENCIA_ATENDIDA = {
  ...INCIDENCIA_APROBADA,
  estadoActual: "ATENDIDO",
};

const INFORME_EVALUACION = {
  contenido: JSON.stringify({
    asignacionFamilias: [
      { refId: "fam-1" },
      { refId: "fam-2" },
    ],
  }),
};

const PAYLOAD_BASE = {
  idIncidenciaRemota: "inc-server-1",
  codigoCaso: "GRD-2026-0001",
  fechaFinalizacion: "2026-07-01T10:00:00.000Z",
  kitsEntregados: [
    {
      uuidKitAsignado: "kit-1",
      idGrupoFamiliar: "fam-1",
      refIdFamilia: "fam-1",
      tipoKit: "ALIMENTOS",
      estadoEntrega: "ENTREGADO",
      articulos: [
        {
          uuidArticuloAsignado: "art-1",
          codigo: "ALM-001",
          descripcion: "Arroz 5kg",
          cantidadAsignada: 2,
          cantidadEntregada: 2,
          confirmado: true,
        },
      ],
    },
  ],
};

let lastTx: any = null;

function mockTransaction(options?: {
  entregasIniciales?: { idGrupoFamiliar: string | null }[];
  entregasFinales?: { idGrupoFamiliar: string | null }[];
}) {
  const entregasIniciales = options?.entregasIniciales ?? [
    { idGrupoFamiliar: "fam-1" },
    { idGrupoFamiliar: "fam-2" },
  ];
  const entregasFinales = options?.entregasFinales ?? entregasIniciales;

  vi.mocked((prisma as any).$transaction).mockImplementation(async (fn: (tx: any) => Promise<any>) => {
    const tx = lastTx = {
      incidencia: { update: vi.fn() },
      entregaAyudaHumanitaria: {
        findMany: vi.fn()
          .mockResolvedValueOnce(entregasIniciales)
          .mockResolvedValue(entregasFinales),
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ idEntrega: "ent-1" }),
      },
      personaAfectada: { findUnique: vi.fn().mockResolvedValue(null) },
      historialEstadoIncidencia: { create: vi.fn() },
    };

    return fn(tx);
  });
}

describe("POST /api/mobile/sync/finalizar-entrega", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    lastTx = null;
    process.env.MOBILE_SYNC_API_KEY = API_KEY;
    vi.mocked(prisma.incidencia.findUnique).mockResolvedValue(INCIDENCIA_APROBADA as any);
    vi.mocked(prisma.informe.findFirst).mockResolvedValue(INFORME_EVALUACION as any);
    vi.mocked(prisma.entregaAyudaHumanitaria.findMany).mockResolvedValue([
      { idGrupoFamiliar: "fam-1" },
      { idGrupoFamiliar: "fam-2" },
    ] as any);
    mockTransaction();
  });

  afterEach(() => vi.unstubAllEnvs());

  it("[negativo] sin x-mobile-sync-key → 401", async () => {
    const req = new Request("http://localhost/api/mobile/sync/finalizar-entrega", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(PAYLOAD_BASE),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("[positivo] resuelve incidencia por idIncidenciaRemota", async () => {
    const res = await POST(makeRequest(PAYLOAD_BASE));

    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.incidencia.findUnique)).toHaveBeenCalledWith(
      expect.objectContaining({ where: { idIncidencia: "inc-server-1" } })
    );
  });

  it("[positivo] ATENDIDO y crea historial cuando todas las familias tienen entrega", async () => {
    const res = await POST(makeRequest(PAYLOAD_BASE));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.estadoIncidencia).toBe("ATENDIDO");
    expect(body.incidenciaAtendida).toBe(true);
    expect(body.message).toBe("Entrega finalizada.");

    const tx = (vi.mocked(prisma as any).$transaction.mock.calls[0]?.[0] ?? null) as unknown;
    expect(tx).not.toBeNull();
    expect(vi.mocked(prisma.$transaction)).toHaveBeenCalledOnce();
    expect(vi.mocked(prisma.informe.findFirst)).toHaveBeenCalledOnce();
  });

  it("[negativo] si falta una familia con entrega → 409 y no cambia estado", async () => {
    mockTransaction({ entregasIniciales: [{ idGrupoFamiliar: "fam-1" }], entregasFinales: [{ idGrupoFamiliar: "fam-1" }] });

    const res = await POST(makeRequest(PAYLOAD_BASE));

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.incidenciaAtendida).toBe(false);
    expect(body.message).toContain("familias/kits");
    expect(body.entregasFaltantes).toEqual(["fam-2"]);
    expect(lastTx.incidencia.update).not.toHaveBeenCalled();
    expect(lastTx.historialEstadoIncidencia.create).not.toHaveBeenCalled();
  });

  it("[positivo] si faltan entregas en BD pero kitsEntregados trae todas las familias completas, crea entregas faltantes y pasa a ATENDIDO", async () => {
    mockTransaction({
      entregasIniciales: [{ idGrupoFamiliar: "fam-1" }],
      entregasFinales: [{ idGrupoFamiliar: "fam-1" }, { idGrupoFamiliar: "fam-2" }],
    });

    const res = await POST(
      makeRequest({
        ...PAYLOAD_BASE,
        kitsEntregados: [
          {
            uuidKitAsignado: "kit-1",
            idGrupoFamiliar: "fam-2",
            refIdFamilia: "fam-2",
            tipoKit: "ALIMENTOS",
            estadoEntrega: "ENTREGADO",
            articulos: [
              {
                uuidArticuloAsignado: "art-2",
                codigo: "ALM-002",
                descripcion: "Aceite 1L",
                cantidadAsignada: 1,
                cantidadEntregada: 1,
                confirmado: true,
              },
            ],
          },
        ],
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.estadoIncidencia).toBe("ATENDIDO");
    expect(body.incidenciaAtendida).toBe(true);
    expect(body.message).toBe("Entrega finalizada.");
    expect(lastTx.entregaAyudaHumanitaria.create).toHaveBeenCalledOnce();
    expect(lastTx.incidencia.update).toHaveBeenCalledOnce();
    expect(lastTx.historialEstadoIncidencia.create).toHaveBeenCalledOnce();
  });

  it("[positivo] ya ATENDIDO responde idempotente y no duplica historial", async () => {
    vi.mocked(prisma.incidencia.findUnique).mockResolvedValue(INCIDENCIA_ATENDIDA as any);

    const res = await POST(makeRequest(PAYLOAD_BASE));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.estadoIncidencia).toBe("ATENDIDO");
    expect(body.incidenciaAtendida).toBe(true);
    expect(body.message).toBe("La incidencia ya estaba atendida.");
    expect(vi.mocked(prisma.$transaction)).not.toHaveBeenCalled();
  });

  it("[negativo] kitsEntregados incompleto → 409", async () => {
    const res = await POST(
      makeRequest({
        ...PAYLOAD_BASE,
        kitsEntregados: [
          {
            ...PAYLOAD_BASE.kitsEntregados[0],
            estadoEntrega: "PARCIAL",
            articulos: [
              {
                uuidArticuloAsignado: "art-1",
                codigo: "ALM-001",
                descripcion: "Arroz 5kg",
                cantidadAsignada: 2,
                cantidadEntregada: 0,
                confirmado: false,
              },
            ],
          },
        ],
      })
    );

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.message).toContain("kits sin entrega completa");
  });
});
