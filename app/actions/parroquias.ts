"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/app/lib/prisma";
import { verifySession } from "@/app/lib/dal";
import { toFrontendRole } from "@/app/lib/roles";
import { findAndDeleteKeycloakUserByEmail } from "@/app/lib/keycloak-admin";

export type ParroquiaFormData = {
  nombre: string;
  direccion: string;
  referencia: string;
  telefono: string;
  correo: string;
  latitud?: string;
  longitud?: string;
};

async function requireAdmin() {
  const session = await verifySession();
  const role = toFrontendRole(session.role);
  if (role !== "admin") return { message: "No autorizado" };
  return null;
}

export async function createParroquia(data: ParroquiaFormData) {
  const err = await requireAdmin();
  if (err) return err;

  const nombre = data.nombre.trim();
  if (!nombre) return { message: "El nombre es obligatorio." };

  const existe = await prisma.parroquia.findFirst({ where: { nombre: { equals: nombre, mode: "insensitive" } } });
  if (existe) return { message: "Ya existe una parroquia con ese nombre." };

  const correo = data.correo.trim();
  if (correo) {
    const correoDup = await prisma.parroquia.findFirst({
      where: { correo: { equals: correo, mode: "insensitive" } },
      select: { nombre: true },
    });
    if (correoDup) return { message: `Ese correo ya está registrado en "${correoDup.nombre}".` };
  }

  const telefono = data.telefono.trim();
  if (telefono) {
    const telDup = await prisma.parroquia.findFirst({
      where: { telefono },
      select: { nombre: true },
    });
    if (telDup) return { message: `Ese teléfono ya está registrado en "${telDup.nombre}".` };
  }

  await prisma.parroquia.create({
    data: {
      nombre,
      direccion: data.direccion.trim() || null,
      referencia: data.referencia.trim() || null,
      telefono: data.telefono.trim() || null,
      correo: data.correo.trim() || null,
      latitud: data.latitud && data.latitud.trim() ? parseFloat(data.latitud) : null,
      longitud: data.longitud && data.longitud.trim() ? parseFloat(data.longitud) : null,
      estado: "ACTIVO",
    },
  });

  revalidatePath("/parroquias");
}

export async function updateParroquia(id: string, data: ParroquiaFormData) {
  const err = await requireAdmin();
  if (err) return err;

  const nombre = data.nombre.trim();
  if (!nombre) return { message: "El nombre es obligatorio." };

  const existe = await prisma.parroquia.findFirst({
    where: { nombre: { equals: nombre, mode: "insensitive" }, NOT: { idParroquia: id } },
  });
  if (existe) return { message: "Ya existe una parroquia con ese nombre." };

  const correo = data.correo.trim();
  if (correo) {
    const correoDup = await prisma.parroquia.findFirst({
      where: { correo: { equals: correo, mode: "insensitive" }, NOT: { idParroquia: id } },
      select: { nombre: true },
    });
    if (correoDup) return { message: `Ese correo ya está registrado en "${correoDup.nombre}".` };
  }

  const telefono = data.telefono.trim();
  if (telefono) {
    const telDup = await prisma.parroquia.findFirst({
      where: { telefono, NOT: { idParroquia: id } },
      select: { nombre: true },
    });
    if (telDup) return { message: `Ese teléfono ya está registrado en "${telDup.nombre}".` };
  }

  await prisma.parroquia.update({
    where: { idParroquia: id },
    data: {
      nombre,
      direccion: data.direccion.trim() || null,
      referencia: data.referencia.trim() || null,
      telefono: data.telefono.trim() || null,
      correo: data.correo.trim() || null,
      latitud: data.latitud && data.latitud.trim() ? parseFloat(data.latitud) : null,
      longitud: data.longitud && data.longitud.trim() ? parseFloat(data.longitud) : null,
    },
  });

  revalidatePath("/parroquias");
}

export async function toggleEstadoParroquia(id: string, estadoActual: string) {
  const err = await requireAdmin();
  if (err) return err;

  const nuevoEstado = estadoActual === "ACTIVO" ? "INACTIVO" : "ACTIVO";
  await prisma.parroquia.update({
    where: { idParroquia: id },
    data: { estado: nuevoEstado },
  });

  revalidatePath("/parroquias");
}

// ─── Tipos para eliminación ────────────────────────────────────────────────────

export type BrigadistaCheckItem = {
  id: string;
  nombre: string;
  correo: string | null;
  razones: string[];
};

export type ParroquiaDeleteCheck = {
  blockingReasons: string[];
  brigadistasSinRelaciones: BrigadistaCheckItem[];
  brigadistasConRelaciones: BrigadistaCheckItem[];
};

async function _buildDeleteCheck(id: string): Promise<ParroquiaDeleteCheck> {
  const parroquia = await prisma.parroquia.findUnique({
    where: { idParroquia: id },
    select: {
      _count: { select: { incidencias: true, planesTrabajo: true, actividades: true } },
      brigadistas: {
        select: {
          idBrigadistaParroquial: true,
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
      },
    },
  });

  if (!parroquia) throw new Error("Parroquia no encontrada.");

  const blockingReasons: string[] = [];
  if (parroquia._count.incidencias > 0)
    blockingReasons.push(`${parroquia._count.incidencias} incidencia(s) registrada(s)`);
  if (parroquia._count.planesTrabajo > 0)
    blockingReasons.push(`${parroquia._count.planesTrabajo} plan(es) de trabajo GRD`);
  if (parroquia._count.actividades > 0)
    blockingReasons.push(`${parroquia._count.actividades} actividad(es)/simulacro(s)`);

  const brigadistasSinRelaciones: BrigadistaCheckItem[] = [];
  const brigadistasConRelaciones: BrigadistaCheckItem[] = [];

  for (const b of parroquia.brigadistas) {
    const razones: string[] = [];
    if (b._count.asignacionesIncidencia > 0)
      razones.push(`${b._count.asignacionesIncidencia} incidencia(s)`);
    if (b._count.asignacionesSimulacro > 0)
      razones.push(`${b._count.asignacionesSimulacro} simulacro(s)`);
    if (b._count.actividadesResponsable > 0)
      razones.push(`${b._count.actividadesResponsable} actividad(es)`);

    const item: BrigadistaCheckItem = {
      id: b.idBrigadistaParroquial,
      nombre: `${b.nombres} ${b.apellidos ?? ""}`.trim(),
      correo: b.correo,
      razones,
    };

    if (razones.length === 0) brigadistasSinRelaciones.push(item);
    else brigadistasConRelaciones.push(item);
  }

  return { blockingReasons, brigadistasSinRelaciones, brigadistasConRelaciones };
}

export async function checkParroquiaDelete(id: string): Promise<ParroquiaDeleteCheck | { message: string }> {
  const err = await requireAdmin();
  if (err) return err;
  try {
    return await _buildDeleteCheck(id);
  } catch (e) {
    return { message: e instanceof Error ? e.message : "Error al verificar la parroquia." };
  }
}

export async function deleteParroquia(
  id: string,
  options?: { reassignToId?: string }
): Promise<{ message: string } | undefined> {
  const err = await requireAdmin();
  if (err) return err;

  const check = await _buildDeleteCheck(id);

  if (check.blockingReasons.length > 0) {
    return {
      message: `No se puede eliminar: esta parroquia tiene ${check.blockingReasons.join(", ")}.`,
    };
  }

  if (check.brigadistasConRelaciones.length > 0 && !options?.reassignToId) {
    return {
      message: "Debes seleccionar una parroquia destino para reasignar los brigadistas con relaciones.",
    };
  }

  const correosParaEliminar = check.brigadistasSinRelaciones
    .map((b) => b.correo)
    .filter(Boolean) as string[];

  await prisma.$transaction(async (tx) => {
    // Eliminar brigadistas sin relaciones
    if (check.brigadistasSinRelaciones.length > 0) {
      await tx.brigadistaParroquial.deleteMany({
        where: {
          idBrigadistaParroquial: { in: check.brigadistasSinRelaciones.map((b) => b.id) },
        },
      });
    }

    // Reasignar brigadistas con relaciones
    if (options?.reassignToId && check.brigadistasConRelaciones.length > 0) {
      await tx.brigadistaParroquial.updateMany({
        where: {
          idBrigadistaParroquial: { in: check.brigadistasConRelaciones.map((b) => b.id) },
        },
        data: { idParroquia: options.reassignToId },
      });
    }

    // Eliminar la parroquia
    await tx.parroquia.delete({ where: { idParroquia: id } });
  });

  // Limpiar cuentas Keycloak (best-effort, fuera de la transacción)
  for (const correo of correosParaEliminar) {
    findAndDeleteKeycloakUserByEmail(correo).catch(() => {});
  }

  revalidatePath("/parroquias");
  revalidatePath("/brigadistas");
  revalidatePath("/grd", "layout");
}

// ─── Importación masiva ────────────────────────────────────────────────────────

export type ImportParroquiaRow = {
  nombre: string;
  direccion?: string;
  referencia?: string;
  telefono?: string;
  correo?: string;
  latitud?: string | number;
  longitud?: string | number;
};

export type ImportParroquiaResult = {
  created: number;
  errors: { row: number; reason: string }[];
};

export async function importParroquias(
  rows: ImportParroquiaRow[]
): Promise<ImportParroquiaResult> {
  const err = await requireAdmin();
  if (err) return { created: 0, errors: [{ row: 0, reason: err.message }] };

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const result: ImportParroquiaResult = { created: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    try {
      const nombre = (row.nombre ?? "").trim();
      if (!nombre) throw new Error("El nombre de la parroquia es obligatorio.");

      const correo = (row.correo ?? "").trim() || undefined;
      if (correo && !EMAIL_RE.test(correo)) throw new Error("Correo no tiene formato válido.");

      const existe = await prisma.parroquia.findFirst({
        where: { nombre: { equals: nombre, mode: "insensitive" } },
      });
      if (existe) throw new Error(`Ya existe una parroquia con el nombre "${nombre}".`);

      if (correo) {
        const correoDup = await prisma.parroquia.findFirst({
          where: { correo: { equals: correo, mode: "insensitive" } },
          select: { nombre: true },
        });
        if (correoDup) throw new Error(`Correo ya registrado en "${correoDup.nombre}".`);
      }

      const latRaw = row.latitud != null ? String(row.latitud).trim() : "";
      const lngRaw = row.longitud != null ? String(row.longitud).trim() : "";
      const latitud = latRaw ? parseFloat(latRaw) : null;
      const longitud = lngRaw ? parseFloat(lngRaw) : null;

      if (latRaw && isNaN(latitud!)) throw new Error("Latitud no es un número válido.");
      if (lngRaw && isNaN(longitud!)) throw new Error("Longitud no es un número válido.");

      await prisma.parroquia.create({
        data: {
          nombre,
          direccion: (row.direccion ?? "").trim() || null,
          referencia: (row.referencia ?? "").trim() || null,
          telefono: (row.telefono ?? "").toString().replace(/\D/g, "").slice(0, 9) || null,
          correo: correo ?? null,
          latitud: latitud ?? undefined,
          longitud: longitud ?? undefined,
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

  revalidatePath("/parroquias");
  return result;
}
