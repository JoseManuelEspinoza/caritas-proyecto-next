import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

// H8 — El login móvil también exige la API key de sincronización (mismo
// transporte que el resto de endpoints móviles). Evita exponer un proxy de
// autenticación abierto a fuerza bruta desde cualquier origen.
function requireMobileSyncKey(request: Request): NextResponse | null {
  const expected = process.env.MOBILE_SYNC_API_KEY?.trim();
  if (!expected) {
    return NextResponse.json(
      { ok: false, message: "Sincronización móvil no configurada." },
      { status: 503 }
    );
  }
  const received = request.headers.get("x-mobile-sync-key")?.trim() ?? "";
  if (received !== expected) {
    return jsonError("No autorizado.", 401);
  }
  return null;
}

export async function POST(request: Request) {
  const unauthorized = requireMobileSyncKey(request);
  if (unauthorized) return unauthorized;

  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError("Body JSON inválido.");
  }

  const email = body.email?.trim();
  const password = body.password?.trim();

  if (!email || !password) {
    return jsonError("Email y contraseña son obligatorios.");
  }

  // Keycloak ROPC (Resource Owner Password Credentials)
  const issuer = (
    process.env.AUTH_KEYCLOAK_INTERNAL_URL ?? process.env.AUTH_KEYCLOAK_ISSUER ?? ""
  ).replace(/\/$/, "");
  const clientId = process.env.AUTH_KEYCLOAK_ID ?? "";
  const clientSecret = process.env.AUTH_KEYCLOAK_SECRET ?? "";

  if (!issuer || !clientId) {
    return jsonError("Autenticación no configurada en el servidor.", 500);
  }

  const tokenUrl = `${issuer}/protocol/openid-connect/token`;

  let keycloakRes: Response;
  try {
    keycloakRes = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "password",
        client_id: clientId,
        ...(clientSecret ? { client_secret: clientSecret } : {}),
        username: email,
        password,
        scope: "openid",
      }),
    });
  } catch {
    return jsonError("No se pudo conectar con el servidor de autenticación.", 503);
  }

  if (!keycloakRes.ok) {
    const errBody = await keycloakRes.json().catch(() => ({})) as Record<string, string>;
    if (keycloakRes.status === 401 || errBody.error === "invalid_grant") {
      return jsonError("Email o contraseña incorrectos.", 401);
    }
    return jsonError("Error en el servidor de autenticación.", 502);
  }

  const keycloakData = await keycloakRes.json() as { access_token: string };
  const accessToken = keycloakData.access_token;

  // Find user and their GRD profile
  const appUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true },
  });

  // H9 — Anti-enumeración: si las credenciales son válidas en Keycloak pero el
  // usuario no está aprovisionado en el sistema (sin cuenta o sin perfil GRD),
  // se responde con el MISMO mensaje genérico que una credencial incorrecta,
  // para no revelar qué cuentas existen. El detalle queda solo en el log.
  if (!appUser) {
    console.warn("[Mobile Auth] Login válido en Keycloak sin usuario en el sistema:", email);
    return jsonError("Email o contraseña incorrectos.", 401);
  }

  const usuarioGRD = await prisma.usuarioGRD.findUnique({
    where: { idCredencial: appUser.id },
    select: { idUsuarioGRD: true, nombres: true, apellidos: true },
  });

  if (!usuarioGRD) {
    console.warn("[Mobile Auth] Login válido sin perfil GRD asociado:", email);
    return jsonError("Email o contraseña incorrectos.", 401);
  }

  return NextResponse.json({
    ok: true,
    idUsuarioGRD: usuarioGRD.idUsuarioGRD,
    nombres: usuarioGRD.nombres,
    apellidos: usuarioGRD.apellidos,
    email,
    rol: appUser.role,
    accessToken,
  });
}
