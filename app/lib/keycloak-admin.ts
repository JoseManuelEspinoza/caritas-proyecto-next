import "server-only";
import { randomBytes } from "crypto";

const BASE = () => process.env.KEYCLOAK_ADMIN_URL ?? "http://localhost:8080";
const REALM = () => process.env.KEYCLOAK_REALM ?? "caritas";
const ADMIN_USER = () => process.env.KEYCLOAK_ADMIN_USER ?? "admin";
const ADMIN_PASS = () => process.env.KEYCLOAK_ADMIN_PASS ?? "";

export function generateTempPassword(): string {
  return randomBytes(10).toString("hex");
}

// Usa admin-cli del master realm (password grant). No requiere configurar
// service accounts — funciona con la instalación por defecto de Keycloak.
async function getAdminToken(): Promise<string> {
  const res = await fetch(
    `${BASE()}/realms/master/protocol/openid-connect/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "password",
        client_id: "admin-cli",
        username: ADMIN_USER(),
        password: ADMIN_PASS(),
      }),
      cache: "no-store",
    }
  );
  if (!res.ok) throw new Error("No se pudo conectar con el servidor de autenticación.");
  const data = await res.json();
  return data.access_token as string;
}

async function createUser(
  token: string,
  params: { email: string; firstName: string; lastName: string }
): Promise<string> {
  const res = await fetch(`${BASE()}/admin/realms/${REALM()}/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      username: params.email,
      email: params.email,
      firstName: params.firstName,
      lastName: params.lastName,
      enabled: true,
      emailVerified: false,
    }),
    cache: "no-store",
  });

  if (res.status === 409) throw new Error("Ya existe una cuenta con ese correo en el sistema.");
  if (!res.ok) throw new Error("No se pudo registrar la cuenta de acceso.");

  const location = res.headers.get("Location") ?? "";
  const kcUserId = location.split("/").pop() ?? "";
  if (!kcUserId) throw new Error("Error interno al crear la cuenta.");
  return kcUserId;
}

async function setTempPassword(token: string, kcUserId: string, password: string): Promise<void> {
  const res = await fetch(
    `${BASE()}/admin/realms/${REALM()}/users/${kcUserId}/reset-password`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ type: "password", value: password, temporary: true }),
      cache: "no-store",
    }
  );
  if (!res.ok) throw new Error("No se pudo establecer la contraseña temporal.");
}

async function assignRealmRole(token: string, kcUserId: string, roleName: string): Promise<void> {
  const roleRes = await fetch(`${BASE()}/admin/realms/${REALM()}/roles/${roleName}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (roleRes.status === 404)
    throw new Error(`Error de configuración: rol ${roleName} no encontrado en el realm.`);
  if (!roleRes.ok) throw new Error("No se pudo obtener la definición del rol.");

  const role = await roleRes.json();

  const assignRes = await fetch(
    `${BASE()}/admin/realms/${REALM()}/users/${kcUserId}/role-mappings/realm`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify([role]),
      cache: "no-store",
    }
  );
  if (!assignRes.ok) throw new Error("No se pudo asignar el rol al usuario.");
}

export async function deleteKeycloakUser(kcUserId: string): Promise<void> {
  try {
    const token = await getAdminToken();
    await fetch(`${BASE()}/admin/realms/${REALM()}/users/${kcUserId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  } catch {
    // Best-effort: log but don't rethrow — caller already handling a failure
    console.error("[KeycloakAdmin] Error al eliminar usuario de compensación:", kcUserId);
  }
}

/**
 * Crea un usuario en Keycloak, le asigna una contraseña temporal y el rol indicado.
 * Si algún paso falla lanza un error (y limpia lo creado). El llamador debe
 * asegurarse de no persistir en BD si esta función lanza.
 */
export async function provisionKeycloakUser(params: {
  email: string;
  firstName: string;
  lastName: string;
  tempPassword: string;
  role: string;
}): Promise<string> {
  const token = await getAdminToken();
  const kcUserId = await createUser(token, params);

  try {
    await setTempPassword(token, kcUserId, params.tempPassword);
    await assignRealmRole(token, kcUserId, params.role);
  } catch (err) {
    await deleteKeycloakUser(kcUserId);
    throw err;
  }

  return kcUserId;
}
