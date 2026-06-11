"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/app/lib/prisma";
import { verifySession } from "@/app/lib/dal";
import { toFrontendRole } from "@/app/lib/roles";

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
