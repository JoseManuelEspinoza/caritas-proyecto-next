import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    brigadistaParroquial: { findFirst: vi.fn(), findUnique: vi.fn() },
    asignacionBrigadistaIncidencia: { findMany: vi.fn() },
    incidencia: { findMany: vi.fn() },
    tipoReferencia: { findMany: vi.fn() },
    observacionGRD: { findMany: vi.fn() },
    evidenciaGRD: { findMany: vi.fn() },
    informe: { findMany: vi.fn() },
  },
}));

vi.mock("@/app/lib/s3", () => ({
  isS3Configured: vi.fn().mockReturnValue(false),
  presignGet: vi.fn(),
}));

import { GET } from "@/app/api/mobile/incidencias-asignadas/route";
import { prisma } from "@/app/lib/prisma";

const API_KEY = "test-sync-key-123";

function makeRequest(search = "") {
  return new Request(`http://localhost/api/mobile/incidencias-asignadas${search}`, {
    headers: { "x-mobile-sync-key": API_KEY },
  });
}

const BRIGADISTA_MOCK = {
  idBrigadistaParroquial: "bri-1",
  idUsuarioGRD: "usr-grd-1",
  idParroquia: "par-1",
  nombres: "Juan",
  apellidos: "Pérez",
  celular: null,
  correo: null,
  disponibilidad: "DISPONIBLE",
  estado: "ACTIVO",
};

const INCIDENCIA_MOCK = {
  idIncidencia: "inc-1",
  codigoCaso: "GRD-2026-0001",
  tipoEvento: "SISMO",
  descripcionEvento: "Sismo leve",
  estadoActual: "ABIERTO",
  fechaRegistro: new Date(),
  fechaSuceso: "2026-06-18",
  horaSuceso: "10:00",
  distritoEvento: "Miraflores",
  direccionEvento: "Av. Larco 100",
  referenciaEvento: null,
  latitud: null,
  longitud: null,
  gravedad: null,
  numAfectadosReportado: null,
  tituloIncidencia: "Sismo",
  relatoActual: null,
  causaEvento: null,
  necesidades: null,
  necesidadesObs: null,
  observacionesGenerales: null,
  reportadoPorNombre: "Juan",
  reportadoPorDni: "12345678",
  reportadoPorCelular: "999111222",
  reportadoPorRol: "BRIGADISTA",
  parroquiaNombreSnapshot: "San Pedro",
  contextoCaso: null,
  uuidMovil: null,
  syncEstado: null,
  fechaSincronizacion: null,
  idUsuarioResponsableGRD: null,
  parroquia: null,
  gruposFamiliares: [],
};

const ASIGNACION_MOCK = {
  idAsignacionBrigadista: "asig-1",
  idIncidencia: "inc-1",
  idBrigadistaParroquial: "bri-1",
  fechaAsignacion: new Date(),
  fechaInicioCampo: null,
  fechaLlegadaCampo: null,
  fechaCierreCampo: null,
  estadoAsignacion: "ASIGNADO",
  rolEnEquipo: null,
  esResponsableEquipo: false,
  origenAsignacion: "MANUAL",
  progresoEvidencias: 0,
  observaciones: null,
  uuidMovil: null,
  syncEstado: null,
  fechaSincronizacion: null,
  incidencia: INCIDENCIA_MOCK,
};

describe("GET /api/mobile/incidencias-asignadas", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.MOBILE_SYNC_API_KEY = API_KEY;
    vi.mocked(prisma.brigadistaParroquial.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.brigadistaParroquial.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.asignacionBrigadistaIncidencia.findMany).mockResolvedValue([]);
    vi.mocked(prisma.incidencia.findMany).mockResolvedValue([]);
    vi.mocked(prisma.tipoReferencia.findMany).mockResolvedValue([]);
    vi.mocked(prisma.observacionGRD.findMany).mockResolvedValue([]);
    vi.mocked(prisma.evidenciaGRD.findMany).mockResolvedValue([]);
    vi.mocked(prisma.informe.findMany).mockResolvedValue([]);
  });
  afterEach(() => vi.unstubAllEnvs());

  // ── Auth ────────────────────────────────────────────────────────────────────

  it("[negativo] sin API key → 401", async () => {
    const req = new Request("http://localhost/api/mobile/incidencias-asignadas");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("[negativo] MOBILE_SYNC_API_KEY no configurada → 503", async () => {
    vi.stubEnv("MOBILE_SYNC_API_KEY", "");
    const res = await GET(makeRequest());
    expect(res.status).toBe(503);
  });

  // ── Sin brigadista ──────────────────────────────────────────────────────────

  it("[positivo] sin brigadista → retorna lista vacía", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.total).toBe(0);
    expect(body.incidencias).toEqual([]);
    expect(body.brigadista).toBeNull();
  });

  // ── Con brigadista ──────────────────────────────────────────────────────────

  it("[positivo] retorna incidencias asignadas al brigadista", async () => {
    vi.mocked(prisma.brigadistaParroquial.findFirst).mockResolvedValue(BRIGADISTA_MOCK as any);
    vi.mocked(prisma.asignacionBrigadistaIncidencia.findMany).mockResolvedValue([ASIGNACION_MOCK] as any);
    vi.mocked(prisma.tipoReferencia.findMany).mockResolvedValue([{ idTipoReferencia: "tipo-1" }] as any);

    const res = await GET(makeRequest("?idUsuarioGRD=usr-grd-1"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.total).toBe(1);
    expect(body.incidencias[0].asignacion.idAsignacionBrigadista).toBe("asig-1");
    expect(body.incidencias[0].incidencia.codigoCaso).toBe("GRD-2026-0001");
  });

  it("[positivo] usa idBrigadistaParroquial del query param", async () => {
    await GET(makeRequest("?idBrigadistaParroquial=bri-1"));

    expect(prisma.brigadistaParroquial.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { idBrigadistaParroquial: "bri-1" } })
    );
  });

  it("[positivo] combina asignaciones e incidencias por responsable", async () => {
    vi.mocked(prisma.brigadistaParroquial.findFirst).mockResolvedValue(BRIGADISTA_MOCK as any);
    vi.mocked(prisma.asignacionBrigadistaIncidencia.findMany).mockResolvedValue([ASIGNACION_MOCK] as any);
    vi.mocked(prisma.incidencia.findMany).mockResolvedValue([
      { ...INCIDENCIA_MOCK, idIncidencia: "inc-2", codigoCaso: "GRD-2026-0002" },
    ] as any);
    vi.mocked(prisma.tipoReferencia.findMany).mockResolvedValue([{ idTipoReferencia: "tipo-1" }] as any);

    const res = await GET(makeRequest("?idUsuarioGRD=usr-grd-1"));
    const body = await res.json();
    expect(body.total).toBe(2);
  });

  // ── Error ────────────────────────────────────────────────────────────────────

  it("[negativo] error de BD → 500", async () => {
    vi.mocked(prisma.brigadistaParroquial.findFirst).mockRejectedValue(new Error("DB error"));

    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
    expect((await res.json()).ok).toBe(false);
  });
});
