"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/app/lib/prisma";
import { verifySession } from "@/app/lib/dal";
import { makeBrigadistaUseCases } from "@/core/infrastructure/factories/makeBrigadistaUseCases";
import { DomainError } from "@/core/domain/errors/DomainError";
import { logGRDAction } from "@/app/lib/audit";
import {
  provisionKeycloakUser,
  deleteKeycloakUser,
  generateTempPassword,
} from "@/app/lib/keycloak-admin";
import { sendBrigadistaWelcomeEmail } from "@/app/lib/email";

export type BrigadistaFormData = {
  nombres: string;
  apellidos: string;
  dni: string;
  celular: string;
  correo: string;
  idParroquia: string;
  disponibilidad: string;
};

/**
 * Capa de presentación (delgada). Conserva las MISMAS firmas que ya usa la UI;
 * la lógica vive ahora en los casos de uso de core/. Los errores de dominio se
 * traducen al mismo formato `{ message }` que la UI ya entiende.
 */
function fail(err: unknown, fallback: string) {
  if (err instanceof DomainError) return { message: err.message };
  console.error("[Brigadistas] Error inesperado:", err);
  return { message: fallback };
}

export async function createBrigadista(data: BrigadistaFormData) {
  if (!data.correo?.trim()) return { message: "El correo es obligatorio para crear la cuenta." };

  const session = await verifySession();
  const tempPassword = generateTempPassword();

  // 1. Crear cuenta en Keycloak. Si falla → abortar sin tocar la BD.
  let kcUserId: string;
  try {
    kcUserId = await provisionKeycloakUser({
      email: data.correo,
      firstName: data.nombres,
      lastName: data.apellidos ?? "",
      tempPassword,
      role: "BRIGADISTA",
    });
  } catch (err) {
    return { message: err instanceof Error ? err.message : "No se pudo crear la cuenta de acceso." };
  }

  // 2. Guardar en BD. Si falla → compensar eliminando el usuario de Keycloak.
  let brigadistaId: string = data.dni;
  try {
    const result = await makeBrigadistaUseCases().crear.execute(data);
    brigadistaId = result.id;
  } catch (err) {
    await deleteKeycloakUser(kcUserId);
    return fail(err, "No se pudo crear el brigadista.");
  }

  // 3. Enviar email de bienvenida (no bloquea ni revierte si falla).
  sendBrigadistaWelcomeEmail(data.correo, data.nombres, tempPassword).catch((e) =>
    console.error("[Brigadistas] Error enviando email de bienvenida:", e)
  );

  await logGRDAction({
    userId: session.userId,
    action: "CREAR",
    entity: "Brigadista",
    entityId: brigadistaId,
    entityName: `${data.nombres} ${data.apellidos}`,
    module: "Brigadistas",
  });
  revalidatePath("/brigadistas");
  revalidatePath("/grd", "layout");
}

export async function updateBrigadista(id: string, data: BrigadistaFormData) {
  const session = await verifySession();

  const anterior = await prisma.brigadistaParroquial.findUnique({
    where: { idBrigadistaParroquial: id },
    select: { nombres: true, apellidos: true, celular: true, correo: true, disponibilidad: true },
  });

  try {
    await makeBrigadistaUseCases().actualizar.execute(id, data);
  } catch (err) {
    return fail(err, "No se pudo actualizar el brigadista.");
  }

  const entityName = `${data.nombres} ${data.apellidos}`;
  const campos = [
    { field: "Nombres", prev: anterior?.nombres, next: data.nombres },
    { field: "Apellidos", prev: anterior?.apellidos, next: data.apellidos },
    { field: "Celular", prev: anterior?.celular, next: data.celular },
    { field: "Correo", prev: anterior?.correo, next: data.correo },
    { field: "Disponibilidad", prev: anterior?.disponibilidad, next: data.disponibilidad },
  ];

  for (const c of campos) {
    if (c.prev !== c.next) {
      await logGRDAction({
        userId: session.userId,
        action: "EDITAR",
        entity: "Brigadista",
        entityId: id,
        entityName,
        module: "Brigadistas",
        field: c.field,
        prevValue: c.prev ?? undefined,
        newValue: c.next ?? undefined,
      });
    }
  }

  revalidatePath("/brigadistas");
}

// El 2º parámetro se conserva por compatibilidad con la UI; el estado real se lee en el caso de uso.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function toggleEstadoBrigadista(id: string, _estadoActual: string) {
  await verifySession();
  try {
    await makeBrigadistaUseCases().toggleEstado.execute(id);
  } catch (err) {
    return fail(err, "No se pudo cambiar el estado.");
  }
  revalidatePath("/brigadistas");
}

// El 2º parámetro se conserva por compatibilidad con la UI; la disponibilidad real se lee en el caso de uso.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function toggleDisponibilidadBrigadista(id: string, _dispActual: string) {
  await verifySession();
  try {
    await makeBrigadistaUseCases().toggleDisponibilidad.execute(id);
  } catch (err) {
    return fail(err, "No se pudo cambiar la disponibilidad.");
  }
  revalidatePath("/brigadistas");
}
