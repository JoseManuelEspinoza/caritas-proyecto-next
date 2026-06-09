"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/app/lib/dal";
import { getUsuarioGRDId } from "@/app/lib/usuario-grd";
import { makeActividadUseCases } from "@/core/infrastructure/factories/makeActividadUseCases";
import { DomainError } from "@/core/domain/errors/DomainError";
import { logGRDAction } from "@/app/lib/audit";

const REVALIDATE = "/simulacros";

function fail(err: unknown, fallback: string) {
  if (err instanceof DomainError) return { message: err.message };
  console.error("[Simulacros] Error inesperado:", err);
  return { message: fallback };
}

export async function programarSimulacro(input: {
  idParroquia: string;
  idTipoActividadPreventiva: string;
  nombreActividad: string;
  idPlanTrabajoGRD?: string;
  fechaProgramada?: string;
  lugarActividad?: string;
  publicoObjetivo?: string;
  numeroParticipantesEstimado?: number;
  descripcionActividad?: string;
}) {
  const session = await verifySession();
  const idUsuarioRegistroGRD = await getUsuarioGRDId();
  if (!idUsuarioRegistroGRD) return { message: "Tu usuario no tiene perfil GRD asociado." };
  try {
    await makeActividadUseCases().programar.execute({ ...input, idUsuarioRegistroGRD });
  } catch (err) {
    return fail(err, "No se pudo programar el simulacro.");
  }
  await logGRDAction({
    userId: session.userId,
    action: "CREAR",
    entity: "Simulacro",
    entityId: idUsuarioRegistroGRD,
    entityName: input.nombreActividad,
    module: "Simulacros",
  });
  revalidatePath(REVALIDATE);
}

export async function ejecutarSimulacro(
  id: string,
  datos: { resultadoGeneral: string; numeroParticipantesReal?: number; recomendaciones?: string }
) {
  const session = await verifySession();
  try {
    await makeActividadUseCases().ejecutar.execute(id, datos);
  } catch (err) {
    return fail(err, "No se pudo registrar la ejecución.");
  }
  await logGRDAction({
    userId: session.userId,
    action: "EDITAR",
    entity: "Simulacro",
    entityId: id,
    entityName: id,
    module: "Simulacros",
    field: "Estado",
    newValue: "EJECUTADO",
  });
  revalidatePath(REVALIDATE);
}

export async function cancelarSimulacro(id: string, motivo: string) {
  const session = await verifySession();
  try {
    await makeActividadUseCases().cancelar.execute(id, motivo);
  } catch (err) {
    return fail(err, "No se pudo cancelar el simulacro.");
  }
  await logGRDAction({
    userId: session.userId,
    action: "EDITAR",
    entity: "Simulacro",
    entityId: id,
    entityName: id,
    module: "Simulacros",
    field: "Estado",
    newValue: "CANCELADO",
    notes: motivo,
  });
  revalidatePath(REVALIDATE);
}
