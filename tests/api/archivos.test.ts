import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/app/lib/dal", () => ({
  verifySession: vi.fn(),
}));

vi.mock("@/app/lib/s3", () => ({
  isS3Configured: vi.fn(),
  presignGet: vi.fn(),
}));

vi.mock("@/app/lib/upload-config", () => ({
  TIPOS_UPLOAD: {
    "evidencia-incidencia": { prefijo: "evidencias/incidencias", categoria: "evidencia" },
    "evidencia-kit": { prefijo: "kits", categoria: "evidencia" },
  },
}));

import { NextRequest } from "next/server";
import { GET } from "@/app/api/archivos/route";
import { verifySession } from "@/app/lib/dal";
import { isS3Configured, presignGet } from "@/app/lib/s3";

function makeRequest(search = "") {
  return new NextRequest(`http://localhost/api/archivos${search}`);
}

describe("GET /api/archivos", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(verifySession).mockResolvedValue(undefined as any);
    vi.mocked(isS3Configured).mockReturnValue(true);
    vi.mocked(presignGet).mockResolvedValue("https://bucket.s3.amazonaws.com/signed-url");
  });

  // ── Autenticación ───────────────────────────────────────────────────────────

  it("[negativo] sin sesión → 401", async () => {
    vi.mocked(verifySession).mockRejectedValue(new Error("Unauthorized"));

    const res = await GET(makeRequest("?key=evidencias/incidencias/foto.jpg"));
    expect(res.status).toBe(401);
  });

  // ── S3 no configurado ────────────────────────────────────────────────────────

  it("[negativo] S3 no configurado → 503", async () => {
    vi.mocked(isS3Configured).mockReturnValue(false);

    const res = await GET(makeRequest("?key=evidencias/incidencias/foto.jpg"));
    expect(res.status).toBe(503);
  });

  // ── Validación del parámetro key ─────────────────────────────────────────────

  it("[negativo] sin parámetro key → 400", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(400);
    expect((await res.json()).message).toContain("key");
  });

  it("[negativo] key con path traversal (..) → 403", async () => {
    const res = await GET(makeRequest("?key=evidencias/incidencias/../../../etc/passwd"));
    expect(res.status).toBe(403);
  });

  it("[negativo] key con prefijo no permitido → 403", async () => {
    const res = await GET(makeRequest("?key=uploads/secreto/archivo.txt"));
    expect(res.status).toBe(403);
  });

  // ── Redireccionamiento ──────────────────────────────────────────────────────

  it("[positivo] key válida con prefijo conocido → 302 redirect", async () => {
    const res = await GET(makeRequest("?key=evidencias/incidencias/foto.jpg"));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://bucket.s3.amazonaws.com/signed-url");
  });

  it("[positivo] acepta prefijo 'kits/'", async () => {
    const res = await GET(makeRequest("?key=kits/foto.jpg"));
    expect(res.status).toBe(302);
  });

  // ── Error al generar URL firmada ─────────────────────────────────────────────

  it("[negativo] presignGet falla → 500", async () => {
    vi.mocked(presignGet).mockRejectedValue(new Error("S3 error"));

    const res = await GET(makeRequest("?key=evidencias/incidencias/foto.jpg"));
    expect(res.status).toBe(500);
  });
});
