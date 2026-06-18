import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

export async function POST(request: Request) {
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

  if (!appUser) {
    return jsonError("Usuario no encontrado en el sistema.", 403);
  }

  const usuarioGRD = await prisma.usuarioGRD.findUnique({
    where: { idCredencial: appUser.id },
    select: { idUsuarioGRD: true, nombres: true, apellidos: true },
  });

  if (!usuarioGRD) {
    return jsonError("Perfil GRD no encontrado para este usuario.", 403);
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
