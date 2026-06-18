import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    usuarioGRD: { findUnique: vi.fn() },
  },
}));

import { POST } from "@/app/api/mobile/auth/login/route";
import { prisma } from "@/app/lib/prisma";

const KC_ISSUER = "http://keycloak.test/realms/test";
const KC_ID = "my-client";
const KC_SECRET = "my-secret";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/mobile/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function mockKeycloakOk(accessToken = "tok-abc") {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: accessToken }),
    })
  );
}

describe("POST /api/mobile/auth/login", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.AUTH_KEYCLOAK_INTERNAL_URL = KC_ISSUER;
    process.env.AUTH_KEYCLOAK_ID = KC_ID;
    process.env.AUTH_KEYCLOAK_SECRET = KC_SECRET;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  // ── Validación de entrada ───────────────────────────────────────────────────

  it("[negativo] body JSON inválido → 400", async () => {
    const req = new Request("http://localhost/api/mobile/auth/login", {
      method: "POST",
      body: "not-json",
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  it("[negativo] email vacío → 400", async () => {
    const res = await POST(makeRequest({ email: "", password: "pass123" }));
    expect(res.status).toBe(400);
    expect((await res.json()).ok).toBe(false);
  });

  it("[negativo] password vacío → 400", async () => {
    const res = await POST(makeRequest({ email: "user@test.com", password: "" }));
    expect(res.status).toBe(400);
  });

  it("[negativo] email y password ausentes → 400", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  // ── Keycloak no configurado ─────────────────────────────────────────────────

  it("[negativo] AUTH_KEYCLOAK_ID no configurado → 500", async () => {
    vi.stubEnv("AUTH_KEYCLOAK_ID", "");
    const res = await POST(makeRequest({ email: "user@test.com", password: "pass" }));
    expect(res.status).toBe(500);
  });

  // ── Errores de Keycloak ─────────────────────────────────────────────────────

  it("[negativo] Keycloak devuelve credenciales inválidas (401 invalid_grant) → 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: "invalid_grant" }),
      })
    );
    const res = await POST(makeRequest({ email: "user@test.com", password: "wrong" }));
    expect(res.status).toBe(401);
    expect((await res.json()).ok).toBe(false);
  });

  it("[negativo] Keycloak devuelve error genérico → 502", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: "server_error" }),
      })
    );
    const res = await POST(makeRequest({ email: "user@test.com", password: "pass" }));
    expect(res.status).toBe(502);
  });

  it("[negativo] Keycloak no responde (error de red) → 503", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));
    const res = await POST(makeRequest({ email: "user@test.com", password: "pass" }));
    expect(res.status).toBe(503);
  });

  // ── Errores de BD ───────────────────────────────────────────────────────────

  it("[negativo] usuario no existe en el sistema → 403", async () => {
    mockKeycloakOk();
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    const res = await POST(makeRequest({ email: "nuevo@test.com", password: "pass" }));
    expect(res.status).toBe(403);
  });

  it("[negativo] perfil GRD no encontrado → 403", async () => {
    mockKeycloakOk();
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "user-1", role: "GRD" } as any);
    vi.mocked(prisma.usuarioGRD.findUnique).mockResolvedValue(null);
    const res = await POST(makeRequest({ email: "user@test.com", password: "pass" }));
    expect(res.status).toBe(403);
  });

  // ── Caso exitoso ────────────────────────────────────────────────────────────

  it("[positivo] login exitoso → 200 con token y perfil GRD", async () => {
    mockKeycloakOk("tok-abc-123");
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "user-1", role: "GRD" } as any);
    vi.mocked(prisma.usuarioGRD.findUnique).mockResolvedValue({
      idUsuarioGRD: "grd-1",
      nombres: "Juan",
      apellidos: "Pérez",
    } as any);

    const res = await POST(makeRequest({ email: "juan@test.com", password: "pass123" }));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.accessToken).toBe("tok-abc-123");
    expect(body.nombres).toBe("Juan");
    expect(body.apellidos).toBe("Pérez");
    expect(body.idUsuarioGRD).toBe("grd-1");
    expect(body.email).toBe("juan@test.com");
  });
});
