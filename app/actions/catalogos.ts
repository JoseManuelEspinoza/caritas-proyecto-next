"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/app/lib/dal";
import { makeCatalogoUseCases } from "@/core/infrastructure/factories/makeCatalogoUseCases";
import { DomainError } from "@/core/domain/errors/DomainError";
import { logGRDAction } from "@/app/lib/audit";

const REVALIDATE = "/catalogos";

function fail(err: unknown, fallback: string) {
  if (err instanceof DomainError) return { message: err.message };
  console.error("[Catálogos] Error inesperado:", err);
  return { message: fallback };
}

export async function crearCatalogo(nombreCatalogo: string, descripcion?: string) {
  const session = await verifySession();
  try {
    await makeCatalogoUseCases().crearCatalogo.execute(nombreCatalogo, descripcion);
  } catch (err) {
    return fail(err, "No se pudo crear el catálogo.");
  }
  await logGRDAction({
    userId: session.userId,
    action: "CREAR",
    entity: "Catálogo",
    entityId: nombreCatalogo,
    entityName: nombreCatalogo,
    module: "Catálogos",
  });
  revalidatePath(REVALIDATE);
}

export async function agregarItemCatalogo(input: {
  idCatalogoGRD: string;
  codigo: string;
  valor: string;
  descripcion?: string;
  orden?: number;
}) {
  const session = await verifySession();
  try {
    await makeCatalogoUseCases().agregarDetalle.execute(input);
  } catch (err) {
    return fail(err, "No se pudo agregar el ítem.");
  }
  await logGRDAction({
    userId: session.userId,
    action: "CREAR",
    entity: "Item Catálogo",
    entityId: input.idCatalogoGRD,
    entityName: input.valor,
    module: "Catálogos",
  });
  revalidatePath(REVALIDATE);
}

export async function editarItemCatalogo(id: string, valor: string, descripcion?: string) {
  const session = await verifySession();
  try {
    await makeCatalogoUseCases().editarDetalle.execute(id, valor, descripcion);
  } catch (err) {
    return fail(err, "No se pudo editar el ítem.");
  }
  await logGRDAction({
    userId: session.userId,
    action: "EDITAR",
    entity: "Item Catálogo",
    entityId: id,
    entityName: valor,
    module: "Catálogos",
    field: "Valor",
    newValue: valor,
  });
  revalidatePath(REVALIDATE);
}

export async function toggleItemCatalogo(id: string) {
  const session = await verifySession();
  try {
    await makeCatalogoUseCases().toggleDetalle.execute(id);
  } catch (err) {
    return fail(err, "No se pudo cambiar el estado del ítem.");
  }
  await logGRDAction({
    userId: session.userId,
    action: "EDITAR",
    entity: "Item Catálogo",
    entityId: id,
    entityName: id,
    module: "Catálogos",
    field: "Estado",
    newValue: "toggled",
  });
  revalidatePath(REVALIDATE);
}
