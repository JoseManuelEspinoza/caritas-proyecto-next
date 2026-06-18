import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    evidenciaGRD: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("@/app/lib/s3", () => ({
  isS3Configured: vi.fn().mockReturnValue(false),
}));

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn().mockImplementation(() => ({ send: vi.fn() })),
  DeleteObjectCommand: vi.fn(),
}));

import { POST } from "@/app/api/mobile/sync/evidencias/eliminar/route";
import { prisma } from "@/app/lib/prisma";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/mobile/sync/evidencias/eliminar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const EVIDENCIA_BD = {
  idEvidenciaGRD: "ev-server-1",
  urlArchivo: "https://bucket.s3.amazonaws.com/foto.jpg",
};

describe("POST /api/mobile/sync/evidencias/eliminar", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(prisma.evidenciaGRD.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.evidenciaGRD.update).mockResolvedValue({} as any);
  });

  // ── Validación ──────────────────────────────────────────────────────────────

  it("[negativo] body JSON inválido → 400", async () => {
    const req = new Request("http://localhost/api/mobile/sync/evidencias/eliminar", {
      method: "POST",
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect((await res.json()).message).toContain("JSON");
  });

  it("[negativo] uuidEvidencia ausente → 400", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toContain("uuidEvidencia");
  });

  it("[negativo] uuidEvidencia vacío → 400", async () => {
    const res = await POST(makeRequest({ uuidEvidencia: "   " }));
    expect(res.status).toBe(400);
  });

  // ── Evidencia no encontrada ─────────────────────────────────────────────────

  it("[positivo] evidencia no encontrada → 200 con mensaje informativo", async () => {
    vi.mocked(prisma.evidenciaGRD.findUnique).mockResolvedValue(null);

    const res = await POST(makeRequest({ uuidEvidencia: "uuid-no-existe" }));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.message).toContain("no encontrada");
  });

  // ── Evidencia encontrada y eliminada ────────────────────────────────────────

  it("[positivo] evidencia encontrada → marca como INACTIVO → 200 con idEvidenciaGRD", async () => {
    vi.mocked(prisma.evidenciaGRD.findUnique).mockResolvedValueOnce(EVIDENCIA_BD as any);
    vi.mocked(prisma.evidenciaGRD.findUnique).mockResolvedValueOnce(null);

    const res = await POST(makeRequest({ uuidEvidencia: "ev-server-1" }));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.idEvidenciaGRD).toBe("ev-server-1");

    expect(prisma.evidenciaGRD.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { idEvidenciaGRD: "ev-server-1" },
        data: expect.objectContaining({ estado: "INACTIVO" }),
      })
    );
  });

  it("[positivo] busca primero por uuidMovil, luego por idEvidenciaGRD", async () => {
    vi.mocked(prisma.evidenciaGRD.findUnique)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(EVIDENCIA_BD as any);

    const res = await POST(makeRequest({ uuidEvidencia: "ev-server-1" }));
    expect(res.status).toBe(200);
    expect(prisma.evidenciaGRD.findUnique).toHaveBeenCalledTimes(2);
  });

  // ── Error ────────────────────────────────────────────────────────────────────

  it("[negativo] error de BD → 500", async () => {
    vi.mocked(prisma.evidenciaGRD.findUnique).mockRejectedValue(new Error("DB error"));

    const res = await POST(makeRequest({ uuidEvidencia: "ev-server-1" }));
    expect(res.status).toBe(500);
    expect((await res.json()).ok).toBe(false);
  });
});
