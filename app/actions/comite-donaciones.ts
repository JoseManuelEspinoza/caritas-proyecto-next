"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/app/lib/dal";
import { getUsuarioGRDId } from "@/app/lib/usuario-grd";
import { logGRDAction } from "@/app/lib/audit";
import { makeComiteDonacionesUseCases } from "@/core/infrastructure/factories/makeComiteDonacionesUseCases";
import { notificarDecisionComite } from "./incidents";
import { TallyRonda } from "@/core/domain/entities/comite-donaciones/VotoComite";

function asMessage(err: unknown): { message: string } {
  const message = err instanceof Error ? err.message : "Error desconocido.";
  return { message };
}

function revalidar(incidenciaId: string) {
  revalidatePath("/donaciones");
  revalidatePath(`/grd/${incidenciaId}`);
}

export async function votarComite(
  incidenciaId: string,
  decision: "A_FAVOR" | "EN_CONTRA"
): Promise<{ message?: string }> {
  const session = await verifySession();
  const idUsuarioGRD = await getUsuarioGRDId();
  if (!idUsuarioGRD) return { message: "Tu usuario no tiene perfil GRD asociado." };

  try {
    const res = await makeComiteDonacionesUseCases().registrarVoto.execute(
      incidenciaId,
      idUsuarioGRD,
      decision
    );

    await logGRDAction({
      userId: session.userId,
      action: "VOTAR",
      entity: "VotoComite",
      entityId: incidenciaId,
      entityName: incidenciaId,
      module: "Donaciones",
      notes: `decision=${decision} estado=${res.estado}`,
    });

    if (res.estado === "APROBADA") {
      notificarDecisionComite(incidenciaId, "APROBAR");
    } else if (res.estado === "RECHAZADA") {
      notificarDecisionComite(incidenciaId, "RECHAZAR");
    }

    revalidar(incidenciaId);
    return {};
  } catch (err) {
    // P2025: cerrarRonda found the round already closed by a concurrent winning vote.
    // The user's vote was persisted earlier in the use case via upsertVoto.
    const code = (err as { code?: string })?.code;
    if (code === "P2025") {
      revalidar(incidenciaId);
      return { message: "El caso ya fue resuelto por el Comité; tu voto quedó registrado." };
    }
    return asMessage(err);
  }
}

export async function observarCasoComite(
  incidenciaId: string,
  observaciones: string
): Promise<{ message?: string }> {
  const session = await verifySession();
  const idUsuarioGRD = await getUsuarioGRDId();
  if (!idUsuarioGRD) return { message: "Tu usuario no tiene perfil GRD asociado." };

  try {
    await makeComiteDonacionesUseCases().observarCaso.execute(
      incidenciaId,
      idUsuarioGRD,
      observaciones
    );
    await logGRDAction({
      userId: session.userId,
      action: "OBSERVAR",
      entity: "RondaVotacionComite",
      entityId: incidenciaId,
      entityName: incidenciaId,
      module: "Donaciones",
      notes: observaciones,
    });
    notificarDecisionComite(incidenciaId, "OBSERVAR", observaciones);
  } catch (err) {
    return asMessage(err);
  }
  revalidar(incidenciaId);
  return {};
}

export async function obtenerTallyComite(incidenciaId: string): Promise<TallyRonda | null> {
  await verifySession();
  return makeComiteDonacionesUseCases().tally(incidenciaId);
}
