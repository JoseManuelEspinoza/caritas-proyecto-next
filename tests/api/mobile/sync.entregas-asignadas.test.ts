import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    incidencia: { findUnique: vi.fn() },
    usuarioGRD: { findUnique: vi.fn() },
    informe: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  },
}));

import { POST } from "@/app/api/mobile/sync/entregas-asignadas/route";
import { prisma } from "@/app/lib/prisma";

// RF83 — Registrar avance de entrega de kits desde la app móvil, con
// resolución de incidencia por múltiples identificadores e idempotencia.

const API_KEY = "test-sync-key-123";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/mobile/sync/entregas-asignadas", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-mobile-sync-key": API_KEY },
    body: JSON.stringify(body),
  });
}

const KIT_VALIDO = {
  uuidKitAsignado: "kit-uuid-1",
  tipoKit: "ALIMENTOS",
  refIdFamilia: "fam-1",
  nombreFamilia: "Familia García",
  estadoEntrega: "ENTREGADO",
  articulos: [
    { codigo: "ALM-001", descripcion: "Arroz 5kg", cantidadAsignada: 1, cantidadEntregada: 1, confirmado: true },
  ],
};

const PAYLOAD_VALIDO = {
  uuidEntregaMovil: "entrega-uuid-1",
  idIncidenciaRemota: "inc-1",
  idUsuarioGRD: "usr-1",
  fechaEntrega: "2026-07-01T10:00:00.000Z",
  descripcionEntrega: "Kits entregados a las familias afectadas",
  kits: [KIT_VALIDO],
};

const INCIDENCIA_APROBADA = { idIncidencia: "inc-1", codigoCaso: "GRD-2026-0001", estadoActual: "APROBADO" };
const USUARIO_GRD = { idUsuarioGRD: "usr-1" };
const INFORME_CREADO = { idInforme: "inf-1", tipoInforme: "ENTREGA_MOVIL", estadoInforme: "REGISTRADO" };

describe("POST /api/mobile/sync/entregas-asignadas", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.MOBILE_SYNC_API_KEY = API_KEY;
    vi.mocked(prisma.incidencia.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.usuarioGRD.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.informe.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.informe.create).mockResolvedValue(INFORME_CREADO as any);
    vi.mocked(prisma.informe.update).mockResolvedValue(INFORME_CREADO as any);
  });

  // ── Autenticación ───────────────────────────────────────────────────────────

  it("[negativo] sin API key → 401", async () => {
    const req = new Request("http://localhost/api/mobile/sync/entregas-asignadas", {
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

  // ── Resolución de incidencia ─────────────────────────────────────────────────

  it("[negativo] sin ningún identificador de incidencia → 400", async () => {
    const { idIncidenciaRemota: _, ...sinId } = PAYLOAD_VALIDO;
    const res = await POST(makeRequest(sinId));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toContain("incidencia");
  });

  it("[positivo] resuelve incidencia por codigoCaso cuando no se envía idIncidenciaRemota", async () => {
    // Sin idIncidenciaRemota, el primer lookup es directamente por codigoCaso
    vi.mocked(prisma.incidencia.findUnique).mockResolvedValueOnce(INCIDENCIA_APROBADA as any);
    vi.mocked(prisma.usuarioGRD.findUnique).mockResolvedValue(USUARIO_GRD as any);

    const { idIncidenciaRemota: _, ...sinId } = PAYLOAD_VALIDO;
    const res = await POST(makeRequest({ ...sinId, codigoCaso: "GRD-2026-0001" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("[negativo] incidencia en estado no permitido (ABIERTO) → 409", async () => {
    vi.mocked(prisma.incidencia.findUnique).mockResolvedValue({
      ...INCIDENCIA_APROBADA,
      estadoActual: "ABIERTO",
    } as any);

    const res = await POST(makeRequest(PAYLOAD_VALIDO));
    expect(res.status).toBe(409);
    expect((await res.json()).message).toContain("aprobada por el Comité");
  });

  it("[negativo] incidencia en estado EN EVALUACION → 409", async () => {
    vi.mocked(prisma.incidencia.findUnique).mockResolvedValue({
      ...INCIDENCIA_APROBADA,
      estadoActual: "EN EVALUACION",
    } as any);

    const res = await POST(makeRequest(PAYLOAD_VALIDO));
    expect(res.status).toBe(409);
  });

  // ── Validación de usuario GRD ─────────────────────────────────────────────

  it("[negativo] sin idUsuarioGRD → 400", async () => {
    vi.mocked(prisma.incidencia.findUnique).mockResolvedValue(INCIDENCIA_APROBADA as any);
    const { idUsuarioGRD: _, ...sinUsuario } = PAYLOAD_VALIDO;

    const res = await POST(makeRequest(sinUsuario));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toContain("idUsuarioGRD");
  });

  it("[negativo] usuario GRD no encontrado en BD → 400", async () => {
    vi.mocked(prisma.incidencia.findUnique).mockResolvedValue(INCIDENCIA_APROBADA as any);
    vi.mocked(prisma.usuarioGRD.findUnique).mockResolvedValue(null);

    const res = await POST(makeRequest(PAYLOAD_VALIDO));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toContain("usuario GRD");
  });

  it("[positivo] acepta idUsuarioResponsableGRD como alternativa a idUsuarioGRD", async () => {
    vi.mocked(prisma.incidencia.findUnique).mockResolvedValue(INCIDENCIA_APROBADA as any);
    vi.mocked(prisma.usuarioGRD.findUnique).mockResolvedValue(USUARIO_GRD as any);

    const { idUsuarioGRD: _, ...sinIdUsuario } = PAYLOAD_VALIDO;
    const res = await POST(makeRequest({ ...sinIdUsuario, idUsuarioResponsableGRD: "usr-1" }));
    expect(res.status).toBe(200);
  });

  // ── Validación de kits ────────────────────────────────────────────────────

  it("[negativo] sin kits → 400", async () => {
    vi.mocked(prisma.incidencia.findUnique).mockResolvedValue(INCIDENCIA_APROBADA as any);
    vi.mocked(prisma.usuarioGRD.findUnique).mockResolvedValue(USUARIO_GRD as any);

    const res = await POST(makeRequest({ ...PAYLOAD_VALIDO, kits: [] }));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toContain("kit");
  });

  it("[negativo] kits sin uuidKitAsignado → descartados → 400 por lista vacía", async () => {
    vi.mocked(prisma.incidencia.findUnique).mockResolvedValue(INCIDENCIA_APROBADA as any);
    vi.mocked(prisma.usuarioGRD.findUnique).mockResolvedValue(USUARIO_GRD as any);

    const res = await POST(makeRequest({
      ...PAYLOAD_VALIDO,
      kits: [{ tipoKit: "ALIMENTOS" }], // sin uuidKitAsignado → descartado
    }));
    expect(res.status).toBe(400);
  });

  // ── Validación de fecha ───────────────────────────────────────────────────

  it("[negativo] fechaEntrega con formato inválido → 400", async () => {
    vi.mocked(prisma.incidencia.findUnique).mockResolvedValue(INCIDENCIA_APROBADA as any);
    vi.mocked(prisma.usuarioGRD.findUnique).mockResolvedValue(USUARIO_GRD as any);

    const res = await POST(makeRequest({ ...PAYLOAD_VALIDO, fechaEntrega: "no-es-fecha" }));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toContain("fechaEntrega");
  });

  // ── Registro exitoso ──────────────────────────────────────────────────────

  it("[positivo] primer registro → crea informe → 200 con idInforme", async () => {
    vi.mocked(prisma.incidencia.findUnique).mockResolvedValue(INCIDENCIA_APROBADA as any);
    vi.mocked(prisma.usuarioGRD.findUnique).mockResolvedValue(USUARIO_GRD as any);
    vi.mocked(prisma.informe.findFirst).mockResolvedValue(null);

    const res = await POST(makeRequest(PAYLOAD_VALIDO));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.idInforme).toBe("inf-1");
    expect(body.estadoGeneral).toBe("COMPLETA");
    expect(body.kitsReportados).toBe(1);
    expect(prisma.informe.create).toHaveBeenCalledOnce();
    expect(prisma.informe.update).not.toHaveBeenCalled();
  });

  it("[positivo] informe existente → actualiza en lugar de crear (idempotencia)", async () => {
    vi.mocked(prisma.incidencia.findUnique).mockResolvedValue(INCIDENCIA_APROBADA as any);
    vi.mocked(prisma.usuarioGRD.findUnique).mockResolvedValue(USUARIO_GRD as any);
    vi.mocked(prisma.informe.findFirst).mockResolvedValue({ idInforme: "inf-1", contenido: null } as any);

    const res = await POST(makeRequest(PAYLOAD_VALIDO));
    expect(res.status).toBe(200);
    expect(prisma.informe.update).toHaveBeenCalledOnce();
    expect(prisma.informe.create).not.toHaveBeenCalled();
  });

  it("[positivo] estadoGeneral PARCIAL cuando no todos los kits están ENTREGADO", async () => {
    vi.mocked(prisma.incidencia.findUnique).mockResolvedValue(INCIDENCIA_APROBADA as any);
    vi.mocked(prisma.usuarioGRD.findUnique).mockResolvedValue(USUARIO_GRD as any);

    const res = await POST(makeRequest({
      ...PAYLOAD_VALIDO,
      kits: [
        { ...KIT_VALIDO, estadoEntrega: "ENTREGADO" },
        { ...KIT_VALIDO, uuidKitAsignado: "kit-uuid-2", estadoEntrega: "PARCIAL" },
      ],
    }));
    expect(res.status).toBe(200);
    expect((await res.json()).estadoGeneral).toBe("PARCIAL");
  });

  it("[positivo] estados APROBADO, ATENDIDO, SEGUIMIENTO ABIERTO y CERRADO son válidos", async () => {
    const estadosValidos = ["APROBADO", "ATENDIDO", "SEGUIMIENTO ABIERTO", "CERRADO"];

    for (const estado of estadosValidos) {
      vi.mocked(prisma.incidencia.findUnique).mockResolvedValue({
        ...INCIDENCIA_APROBADA,
        estadoActual: estado,
      } as any);
      vi.mocked(prisma.usuarioGRD.findUnique).mockResolvedValue(USUARIO_GRD as any);
      vi.mocked(prisma.informe.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.informe.create).mockResolvedValue(INFORME_CREADO as any);

      const res = await POST(makeRequest(PAYLOAD_VALIDO));
      expect(res.status, `Estado ${estado} debería ser válido`).toBe(200);

      vi.resetAllMocks();
      process.env.MOBILE_SYNC_API_KEY = API_KEY;
    }
  });

  // ── Error ─────────────────────────────────────────────────────────────────

  it("[negativo] error de BD → 500", async () => {
    vi.mocked(prisma.incidencia.findUnique).mockRejectedValue(new Error("DB error"));
    const res = await POST(makeRequest(PAYLOAD_VALIDO));
    expect(res.status).toBe(500);
    expect((await res.json()).ok).toBe(false);
  });
});
