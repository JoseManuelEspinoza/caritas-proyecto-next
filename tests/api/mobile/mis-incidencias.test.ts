import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    brigadistaParroquial: { findFirst: vi.fn() },
    incidencia: { findMany: vi.fn() },
    evidenciaGRD: { findMany: vi.fn() },
  },
}));

vi.mock("@/app/lib/s3", () => ({
  isS3Configured: vi.fn().mockReturnValue(false),
  presignGet: vi.fn(),
}));

import { GET } from "@/app/api/mobile/mis-incidencias/route";
import { prisma } from "@/app/lib/prisma";

const API_KEY = "test-sync-key-123";

function makeRequest(search = "") {
  return new Request(`http://localhost/api/mobile/mis-incidencias${search}`, {
    headers: { "x-mobile-sync-key": API_KEY },
  });
}

const BRIGADISTA_MOCK = {
  idBrigadistaParroquial: "bri-1",
  nombres: "Juan",
  apellidos: "Pérez",
};

const INCIDENCIA_MOCK = {
  idIncidencia: "inc-1",
  codigoCaso: "GRD-2026-0001",
  tipoEvento: "SISMO",
  tituloIncidencia: "Sismo en Miraflores",
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
  idUsuarioResponsableGRD: null,
  parroquia: null,
  gruposFamiliares: [],
};

describe("GET /api/mobile/mis-incidencias", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.MOBILE_SYNC_API_KEY = API_KEY;
    vi.mocked(prisma.brigadistaParroquial.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.incidencia.findMany).mockResolvedValue([]);
    vi.mocked(prisma.evidenciaGRD.findMany).mockResolvedValue([]);
  });

  // ── Sin brigadista ──────────────────────────────────────────────────────────

  it("[positivo] retorna lista vacía cuando no hay brigadista ni incidencias", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.total).toBe(0);
    expect(body.incidencias).toEqual([]);
  });

  it("[positivo] usa idUsuarioGRD del query param", async () => {
    await GET(makeRequest("?idUsuarioGRD=usr-grd-custom"));

    expect(prisma.brigadistaParroquial.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ idUsuarioGRD: "usr-grd-custom" }) })
    );
  });

  it("[positivo] usa fallback de idUsuarioGRD cuando no se pasa query param", async () => {
    await GET(makeRequest());

    const [call] = vi.mocked(prisma.brigadistaParroquial.findFirst).mock.calls;
    expect(call[0].where.idUsuarioGRD).toBeTruthy();
  });

  // ── Con brigadista ──────────────────────────────────────────────────────────

  it("[positivo] retorna incidencias de brigadista activo", async () => {
    vi.mocked(prisma.brigadistaParroquial.findFirst).mockResolvedValue(BRIGADISTA_MOCK as any);
    // Primera llamada: por asignación; segunda: por responsable (sin duplicados)
    vi.mocked(prisma.incidencia.findMany)
      .mockResolvedValueOnce([INCIDENCIA_MOCK] as any)
      .mockResolvedValueOnce([] as any);

    const res = await GET(makeRequest("?idUsuarioGRD=usr-grd-1"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.total).toBe(1);
    expect(body.incidencias[0].incidencia.codigoCaso).toBe("GRD-2026-0001");
  });

  it("[positivo] combina incidencias por asignación y por responsabilidad sin duplicar", async () => {
    vi.mocked(prisma.brigadistaParroquial.findFirst).mockResolvedValue(BRIGADISTA_MOCK as any);
    // Primera llamada: por asignación; segunda: por responsable
    vi.mocked(prisma.incidencia.findMany)
      .mockResolvedValueOnce([INCIDENCIA_MOCK] as any)
      .mockResolvedValueOnce([{ ...INCIDENCIA_MOCK, idIncidencia: "inc-2", codigoCaso: "GRD-2026-0002" }] as any);

    const res = await GET(makeRequest("?idUsuarioGRD=usr-grd-1"));
    const body = await res.json();
    expect(body.total).toBe(2);
  });

  it("[positivo] adjunta evidencias a cada incidencia", async () => {
    vi.mocked(prisma.brigadistaParroquial.findFirst).mockResolvedValue(BRIGADISTA_MOCK as any);
    vi.mocked(prisma.incidencia.findMany)
      .mockResolvedValueOnce([INCIDENCIA_MOCK] as any)
      .mockResolvedValueOnce([] as any);
    vi.mocked(prisma.evidenciaGRD.findMany).mockResolvedValue([
      {
        idEvidenciaGRD: "ev-1",
        idReferencia: "inc-1",
        uuidMovil: null,
        nombreArchivo: "foto.jpg",
        urlArchivo: "https://s3.test/foto.jpg",
        formatoArchivo: "image/jpeg",
        descripcion: null,
        tamanoArchivo: null,
      },
    ] as any);

    const res = await GET(makeRequest("?idUsuarioGRD=usr-grd-1"));
    const body = await res.json();
    expect(body.incidencias[0].incidencia.evidencias).toHaveLength(1);
  });

  // ── Errores ─────────────────────────────────────────────────────────────────

  it("[negativo] error de BD → 500", async () => {
    vi.mocked(prisma.brigadistaParroquial.findFirst).mockRejectedValue(new Error("DB error"));

    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
    expect((await res.json()).ok).toBe(false);
  });
});
