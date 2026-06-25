import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    evidenciaGRD: { findUnique: vi.fn(), create: vi.fn() },
    tipoReferencia: { upsert: vi.fn() },
    incidencia: { findUnique: vi.fn() },
    usuarioGRD: { findUnique: vi.fn() },
  },
}));

vi.mock("@/app/lib/s3", () => ({
  isS3Configured: vi.fn().mockReturnValue(false),
  presignPut: vi.fn(),
  presignGet: vi.fn(),
  safeFilename: vi.fn((n: string) => n ?? "evidencia-movil"),
}));

import { GET, POST } from "@/app/api/mobile/sync/evidencias/route";
import { prisma } from "@/app/lib/prisma";
import { isS3Configured } from "@/app/lib/s3";

const API_KEY = "test-sync-key-123";

function makeRequest(body: unknown, extraHeaders: Record<string, string> = {}) {
  return new Request("http://localhost/api/mobile/sync/evidencias", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-mobile-sync-key": API_KEY, ...extraHeaders },
    body: JSON.stringify(body),
  });
}

const EVIDENCIA_BD = {
  idEvidenciaGRD: "ev-server-1",
  uuidMovil: "uuid-ev-001",
  idReferencia: "inc-server-1",
  nombreArchivo: "foto.jpg",
  urlArchivo: "https://bucket.s3.amazonaws.com/foto.jpg",
  syncEstado: "SINCRONIZADO",
  fechaSincronizacion: new Date("2026-06-18T10:00:00Z"),
};

const PAYLOAD_BASE = {
  uuidEvidencia: "uuid-ev-001",
  idReferenciaRemota: "inc-server-1",
  idUsuarioCargaGRD: "usr-grd-1",
  urlArchivo: "https://bucket.s3.amazonaws.com/foto.jpg",
  nombreArchivo: "foto.jpg",
  formatoArchivo: "image/jpeg",
  tamanoArchivo: 12345,
};

describe("GET /api/mobile/sync/evidencias — heartbeat", () => {
  beforeEach(() => { process.env.MOBILE_SYNC_API_KEY = API_KEY; });
  afterEach(() => vi.unstubAllEnvs());

  it("[positivo] heartbeat con API key válida → 200", async () => {
    const req = new Request("http://localhost/api/mobile/sync/evidencias", {
      headers: { "x-mobile-sync-key": API_KEY },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });

  it("[negativo] sin API key → 401", async () => {
    const req = new Request("http://localhost/api/mobile/sync/evidencias");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});

describe("POST /api/mobile/sync/evidencias — sincronización", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.MOBILE_SYNC_API_KEY = API_KEY;
    // H4 — bucket configurado: las URLs del bucket propio se aceptan.
    process.env.AWS_S3_BUCKET = "bucket";
    vi.mocked(isS3Configured).mockReturnValue(false);
    vi.mocked(prisma.evidenciaGRD.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.tipoReferencia.upsert).mockResolvedValue({ idTipoReferencia: "tipo-1" } as any);
    vi.mocked(prisma.incidencia.findUnique).mockResolvedValue({ idIncidencia: "inc-server-1" } as any);
    vi.mocked(prisma.usuarioGRD.findUnique).mockResolvedValue({ idUsuarioGRD: "usr-grd-1" } as any);
    vi.mocked(prisma.evidenciaGRD.create).mockResolvedValue({
      idEvidenciaGRD: "ev-server-1",
      idReferencia: "inc-server-1",
      nombreArchivo: "foto.jpg",
      urlArchivo: "https://bucket.s3.amazonaws.com/foto.jpg",
      syncEstado: "SINCRONIZADO",
      fechaSincronizacion: new Date(),
    } as any);
  });

  afterEach(() => vi.unstubAllEnvs());

  // ── Auth ────────────────────────────────────────────────────────────────────

  it("[negativo] sin API key → 401", async () => {
    const res = await POST(makeRequest(PAYLOAD_BASE, { "x-mobile-sync-key": "bad" }));
    expect(res.status).toBe(401);
  });

  it("[negativo] API key no configurada → 503", async () => {
    vi.stubEnv("MOBILE_SYNC_API_KEY", "");
    const res = await POST(makeRequest(PAYLOAD_BASE));
    expect(res.status).toBe(503);
  });

  // ── Validación ──────────────────────────────────────────────────────────────

  it("[negativo] body JSON inválido → 400", async () => {
    const req = new Request("http://localhost/api/mobile/sync/evidencias", {
      method: "POST",
      headers: { "x-mobile-sync-key": API_KEY },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("[negativo] uuidEvidencia ausente → 400", async () => {
    const res = await POST(makeRequest({ urlArchivo: "https://s3.test/foto.jpg" }));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toContain("uuidEvidencia");
  });

  it("[negativo] tipo referencia distinto de INCIDENCIA → 500", async () => {
    const res = await POST(makeRequest({ ...PAYLOAD_BASE, tipoReferencia: "OTRO" }));
    expect(res.status).toBe(500);
  });

  it("[negativo] no se puede resolver la incidencia asociada → 500", async () => {
    vi.mocked(prisma.incidencia.findUnique).mockResolvedValue(null);
    const res = await POST(makeRequest({ ...PAYLOAD_BASE, idReferenciaRemota: "no-existe" }));
    expect(res.status).toBe(500);
  });

  it("[negativo] no se puede identificar usuario de carga → 500", async () => {
    vi.mocked(prisma.usuarioGRD.findUnique).mockResolvedValue(null);
    const res = await POST(makeRequest({ ...PAYLOAD_BASE, idUsuarioCargaGRD: "no-existe" }));
    expect(res.status).toBe(500);
  });

  it("[negativo] sin urlArchivo ni base64 → 400", async () => {
    const { urlArchivo: _url, ...sinUrl } = PAYLOAD_BASE;
    const res = await POST(makeRequest(sinUrl));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toContain("No se recibió archivo");
  });

  // ── H4: validación de la URL del archivo ─────────────────────────────────────

  it("[negativo][H4] urlArchivo externa (no es del bucket propio) → 400", async () => {
    const res = await POST(
      makeRequest({ ...PAYLOAD_BASE, urlArchivo: "https://sitio-malicioso.com/phishing" })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).message).toContain("No se recibió archivo");
  });

  it("[positivo][H4] key relativo con prefijo conocido (evidencias/...) → 200", async () => {
    const res = await POST(
      makeRequest({ ...PAYLOAD_BASE, urlArchivo: "evidencias/incidencias/inc-server-1/foto.jpg" })
    );
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });

  // ── Duplicado ───────────────────────────────────────────────────────────────

  it("[positivo] evidencia duplicada → 200 con duplicated: true", async () => {
    vi.mocked(prisma.evidenciaGRD.findUnique).mockResolvedValue(EVIDENCIA_BD as any);

    const res = await POST(makeRequest(PAYLOAD_BASE));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.duplicated).toBe(true);
    expect(body.nombreArchivo).toBe("foto.jpg");
  });

  // ── Nueva evidencia ─────────────────────────────────────────────────────────

  it("[positivo] nueva evidencia con urlArchivo → 200 con duplicated: false", async () => {
    const res = await POST(makeRequest(PAYLOAD_BASE));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.duplicated).toBe(false);
    expect(body.idServidor).toBe("ev-server-1");
  });
});
