"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { prisma } from "@/app/lib/prisma";
import { verifySession } from "@/app/lib/dal";
import { toFrontendRole } from "@/app/lib/roles";
import { logGRDAction } from "@/app/lib/audit";
import { provisionKeycloakUser, generateTempPassword } from "@/app/lib/keycloak-admin";
import { ROLES_ALTA } from "@/app/lib/roles-alta";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Resultado = { ok: true; tempPassword: string } | { ok: false; message: string };

/**
 * Da de alta un usuario del sistema (especialista, comité, jefa OGP o admin):
 * lo crea en Keycloak con rol y contraseña temporal. El perfil GRD local se
 * aprovisiona solo en el primer inicio de sesión (ver signIn en auth.ts).
 */
export async function crearUsuarioSistema(input: {
  nombres: string;
  apellidos: string;
  correo: string;
  role: Role;
}): Promise<Resultado> {
  const session = await verifySession();
  if (toFrontendRole(session.role) !== "admin") {
    return { ok: false, message: "Solo un administrador puede crear usuarios." };
  }

  const nombres = input.nombres.trim();
  const apellidos = input.apellidos.trim();
  const correo = input.correo.trim().toLowerCase();

  if (nombres.length < 2) return { ok: false, message: "Ingresa el nombre." };
  if (!EMAIL_RE.test(correo)) return { ok: false, message: "El correo no tiene un formato válido." };
  if (!ROLES_ALTA.some((r) => r.value === input.role)) {
    return { ok: false, message: "Rol no válido. Los brigadistas se registran desde su módulo." };
  }

  // Aviso temprano si el correo ya existe en la app (Keycloak también valida con 409).
  const yaExiste = await prisma.user.findFirst({
    where: { email: { equals: correo, mode: "insensitive" } },
    select: { id: true },
  });
  if (yaExiste) return { ok: false, message: "Ya existe un usuario con ese correo." };

  const tempPassword = generateTempPassword();
  try {
    await provisionKeycloakUser({
      email: correo,
      firstName: nombres,
      lastName: apellidos,
      tempPassword,
      role: input.role,
    });
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "No se pudo crear la cuenta." };
  }

  await logGRDAction({
    userId: session.userId,
    action: "CREAR",
    entity: "Usuario",
    entityId: correo,
    entityName: `${nombres} ${apellidos}`.trim(),
    module: "Usuarios",
    newValue: input.role,
  });

  revalidatePath("/usuarios");
  return { ok: true, tempPassword };
}
