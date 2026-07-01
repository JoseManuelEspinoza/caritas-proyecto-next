import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    tipoReferencia: { findUnique: vi.fn() },
    actividadPreventiva: { findMany: vi.fn() },
    evidenciaGRD: { findMany: vi.fn() },
  },
}));

import { GET } from "@/app/api/mobile/simulacros/route";
import { prisma } from "@/app/lib/prisma";

const API_KEY = "test-sync-key-123";

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost/api/mobile/simulacros");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new Request(url.toString(), {
    headers: { "x-mobile-sync-key": API_KEY },
  });
}

const ACTIVIDAD_BASE = {
  idActividadPreventiva: "act-1",
  uuidMovil: "uuid-act-1",
  codigoActividad: "ACT-2026-0001",
  estadoActividad: "PROGRAMADA",
  idParroquia: "par-1",
  idPlanTrabajoGRD: null,
  idTipoActividadPreventiva: "tipo-1",
  nombreActividad: "Simulacro de sismo",
  fechaProgramada: new Date("2026-07-15"),
  horarioInicio: "09:00",
  horarioFin: "11:00",
  lugarActividad: "Plaza principal",
  publicoObjetivo: "Vecinos del sector",
  numeroParticipantesEstimado: 50,
  numeroParticipantesReal: null,
  descripcionActividad: "Simulacro de evacuación ante sismo",
  resultadoGeneral: null,
  recomendaciones: null,
  observaciones: null,
  indicacionesEquipo: null,
  reporteBrigadista: null,
  duracionSimulacro: null,
  fechaEjecucion: null,
  updatedAt: new Date("2026-06-20"),
  idUsuarioResponsableGRD: "usr-1",
  parroquia: { idParroquia: "par-1", nombre: "Parroquia San Marcos" },
  planTrabajo: null,
  usuarioResponsable: {
    idUsuarioGRD: "usr-1",
    nombres: "Juan",
    apellidos: "Pérez",
    correoReferencia: "juan@caritas.pe",
    telefono: "999111222",
  },
  simulacroBrigadistas: [],
  observacionesSimulacro: [],
};

describe("GET /api/mobile/simulacros", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.MOBILE_SYNC_API_KEY = API_KEY;
    vi.mocked(prisma.tipoReferencia.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.actividadPreventiva.findMany).mockResolvedValue([]);
    vi.mocked(prisma.evidenciaGRD.findMany).mockResolvedValue([]);
  });

  it("[negativo] sin API key → 401", async () => {
    const req = new Request("http://localhost/api/mobile/simulacros");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("[negativo] MOBILE_SYNC_API_KEY no configurada → 503", async () => {
    delete process.env.MOBILE_SYNC_API_KEY;
    const res = await GET(makeRequest());
    expect(res.status).toBe(503);
  });

  it("[positivo] sin simulacros → 200 con lista vacía", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.simulacros).toEqual([]);
    expect(body.total).toBe(0);
  });

  it("[positivo] retorna simulacros con estructura correcta", async () => {
    vi.mocked(prisma.actividadPreventiva.findMany).mockResolvedValue([ACTIVIDAD_BASE] as any);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.total).toBe(1);

    const s = body.simulacros[0];
    expect(s.idActividadPreventiva).toBe("act-1");
    expect(s.nombreActividad).toBe("Simulacro de sismo");
    expect(s.estadoActividad).toBe("PROGRAMADA");
    expect(s.parroquiaNombre).toBe("Parroquia San Marcos");
    expect(s.equipo).toEqual([]);
    expect(s.evidencias).toEqual([]);
  });

  it("[positivo] responsable es usuario GRD cuando no hay brigadistas asignados", async () => {
    vi.mocked(prisma.actividadPreventiva.findMany).mockResolvedValue([ACTIVIDAD_BASE] as any);

    const res = await GET(makeRequest());
    const body = await res.json();
    const responsable = body.simulacros[0].responsable;

    expect(responsable.tipo).toBe("USUARIO_GRD");
    expect(responsable.idUsuarioGRD).toBe("usr-1");
    expect(responsable.nombre).toBe("Juan Pérez");
  });

  it("[positivo] filtra por estado válido", async () => {
    vi.mocked(prisma.actividadPreventiva.findMany).mockResolvedValue([ACTIVIDAD_BASE] as any);

    const res = await GET(makeRequest({ estado: "PROGRAMADA" }));
    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.actividadPreventiva.findMany)).toHaveBeenCalledOnce();
  });

  it("[negativo] estado inválido → 400", async () => {
    const res = await GET(makeRequest({ estado: "ESTADO_INVENTADO" }));
    expect(res.status).toBe(400);
  });

  it("[negativo] error de BD → 500", async () => {
    vi.mocked(prisma.actividadPreventiva.findMany).mockRejectedValue(new Error("DB error"));
    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
    expect((await res.json()).ok).toBe(false);
  });
});
