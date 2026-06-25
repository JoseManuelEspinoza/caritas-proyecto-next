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
  findAndDeleteKeycloakUserByEmail,
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

export async function deleteBrigadista(id: string) {
  const session = await verifySession();

  const brigadista = await prisma.brigadistaParroquial.findUnique({
    where: { idBrigadistaParroquial: id },
    select: {
      nombres: true,
      apellidos: true,
      correo: true,
      _count: {
        select: {
          asignacionesIncidencia: true,
          asignacionesSimulacro: true,
          actividadesResponsable: true,
        },
      },
    },
  });

  if (!brigadista) return { message: "Brigadista no encontrado." };

  const bloques: string[] = [];
  if (brigadista._count.asignacionesIncidencia > 0)
    bloques.push(`${brigadista._count.asignacionesIncidencia} incidencia(s)`);
  if (brigadista._count.asignacionesSimulacro > 0)
    bloques.push(`${brigadista._count.asignacionesSimulacro} simulacro(s)`);
  if (brigadista._count.actividadesResponsable > 0)
    bloques.push(`${brigadista._count.actividadesResponsable} actividad(es)`);

  if (bloques.length > 0) {
    return {
      message: `No se puede eliminar: este brigadista tiene ${bloques.join(", ")} relacionada(s).`,
    };
  }

  await prisma.brigadistaParroquial.delete({ where: { idBrigadistaParroquial: id } });

  if (brigadista.correo) {
    findAndDeleteKeycloakUserByEmail(brigadista.correo).catch(() => {});
  }

  await logGRDAction({
    userId: session.userId,
    action: "ELIMINAR",
    entity: "Brigadista",
    entityId: id,
    entityName: `${brigadista.nombres} ${brigadista.apellidos ?? ""}`,
    module: "Brigadistas",
  });

  revalidatePath("/brigadistas");
  revalidatePath("/grd", "layout");
}

export type ImportBrigadistaRow = {
  nombres: string;
  apellidos: string;
  dni: string;
  celular: string;
  correo?: string;
  parroquia: string;
  disponibilidad?: string;
};

export type ImportBrigadistaResult = {
  created: number;
  errors: { row: number; reason: string }[];
};

export async function importBrigadistas(
  rows: ImportBrigadistaRow[]
): Promise<ImportBrigadistaResult> {
  await verifySession();

  const parroquias = await prisma.parroquia.findMany({
    where: { estado: "ACTIVO" },
    select: { idParroquia: true, nombre: true },
  });
  const parroquiaMap = new Map(
    parroquias.map((p) => [p.nombre.toLowerCase().trim(), p.idParroquia])
  );

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const result: ImportBrigadistaResult = { created: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    try {
      const nombres = (row.nombres ?? "").trim();
      const apellidos = (row.apellidos ?? "").trim();
      const dni = (row.dni ?? "").toString().replace(/\D/g, "");
      const celularRaw = (row.celular ?? "").toString().replace(/\D/g, "");
      const celular = celularRaw.startsWith("51") ? celularRaw.slice(2) : celularRaw;
      const correo = (row.correo ?? "").trim() || undefined;
      const disponibilidad = (row.disponibilidad ?? "DISPONIBLE").trim().toUpperCase();

      if (!nombres || nombres.length < 2) throw new Error("Nombres inválidos o muy cortos.");
      if (!apellidos || apellidos.length < 2) throw new Error("Apellidos inválidos o muy cortos.");
      if (dni.length !== 8) throw new Error("DNI debe tener exactamente 8 dígitos.");
      if (!/^9\d{8}$/.test(celular))
        throw new Error("Celular inválido (debe empezar con 9, tener 9 dígitos).");
      if (correo && !EMAIL_RE.test(correo)) throw new Error("Correo no tiene formato válido.");
      if (!["DISPONIBLE", "EN CAMPO", "NO DISPONIBLE"].includes(disponibilidad))
        throw new Error("Disponibilidad inválida (use: DISPONIBLE, EN CAMPO, NO DISPONIBLE).");

      const parroquiaNombre = (row.parroquia ?? "").trim();
      const idParroquia = parroquiaMap.get(parroquiaNombre.toLowerCase());
      if (!idParroquia) throw new Error(`Parroquia "${parroquiaNombre}" no encontrada.`);

      const existeDni = await prisma.brigadistaParroquial.findUnique({ where: { dni } });
      if (existeDni) throw new Error(`DNI ${dni} ya está registrado.`);

      await prisma.brigadistaParroquial.create({
        data: {
          idParroquia,
          nombres,
          apellidos,
          dni,
          celular: `+51${celular}`,
          correo: correo ?? null,
          disponibilidad,
          estado: "ACTIVO",
        },
      });

      result.created++;
    } catch (err) {
      result.errors.push({
        row: rowNum,
        reason: err instanceof Error ? err.message : "Error desconocido",
      });
    }
  }

  revalidatePath("/brigadistas");
  revalidatePath("/grd", "layout");
  return result;
}
