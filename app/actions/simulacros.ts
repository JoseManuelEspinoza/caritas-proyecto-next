"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/app/lib/dal";
import { getUsuarioGRDId } from "@/app/lib/usuario-grd";
import { makeActividadUseCases } from "@/core/infrastructure/factories/makeActividadUseCases";
import { DomainError } from "@/core/domain/errors/DomainError";
import { logGRDAction } from "@/app/lib/audit";
import { prisma } from "@/app/lib/prisma";

const REVALIDATE = "/simulacros";

function fail(err: unknown, fallback: string) {
  if (err instanceof DomainError) return { message: err.message };
  console.error("[Simulacros] Error inesperado:", err);
  return { message: fallback };
}

// ── Programar ──────────────────────────────────────────────────────────────
export async function programarSimulacro(input: {
  idParroquia: string;
  idTipoActividadPreventiva: string;
  nombreActividad: string;
  idPlanTrabajoGRD?: string;
  fechaProgramada?: string;
  horarioInicio?: string;
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

// ── Editar ─────────────────────────────────────────────────────────────────
export async function editarSimulacro(
  id: string,
  input: {
    idParroquia?: string;
    idTipoActividadPreventiva?: string;
    nombreActividad?: string;
    fechaProgramada?: string;
    horarioInicio?: string;
    lugarActividad?: string;
    numeroParticipantesEstimado?: number;
    descripcionActividad?: string;
  }
) {
  const session = await verifySession();
  // Regla: solo editable en PROGRAMADA o ASIGNADA, y antes de la fecha programada
  const actual = await prisma.actividadPreventiva.findUnique({
    where: { idActividadPreventiva: id },
    select: { estadoActividad: true, fechaProgramada: true },
  });
  if (!actual) return { message: "Simulacro no encontrado." };
  if (!["PROGRAMADA", "ASIGNADA"].includes(actual.estadoActividad))
    return { message: "Solo se puede editar un simulacro en estado PROGRAMADA o ASIGNADA." };
  if (actual.fechaProgramada && new Date() > actual.fechaProgramada)
    return { message: "No se puede editar un simulacro cuya fecha ya pasó." };

  try {
    await prisma.actividadPreventiva.update({
      where: { idActividadPreventiva: id },
      data: {
        idParroquia: input.idParroquia,
        idTipoActividadPreventiva: input.idTipoActividadPreventiva,
        nombreActividad: input.nombreActividad,
        fechaProgramada: input.fechaProgramada ? new Date(input.fechaProgramada) : undefined,
        horarioInicio: input.horarioInicio !== undefined ? input.horarioInicio || null : undefined,
        lugarActividad: input.lugarActividad !== undefined ? input.lugarActividad || null : undefined,
        numeroParticipantesEstimado: input.numeroParticipantesEstimado ?? undefined,
        descripcionActividad:
          input.descripcionActividad !== undefined ? input.descripcionActividad || null : undefined,
      },
    });
  } catch (err) {
    return fail(err, "No se pudo editar el simulacro.");
  }
  await logGRDAction({
    userId: session.userId,
    action: "EDITAR",
    entity: "Simulacro",
    entityId: id,
    entityName: input.nombreActividad ?? id,
    module: "Simulacros",
  });
  revalidatePath(REVALIDATE);
}

// ── Asignar equipo (PROGRAMADA → ASIGNADA) ────────────────────────────────
export async function asignarEquipoSimulacro(
  id: string,
  responsableId: string | null,
  equipoIds: string[],
  indicaciones: string
) {
  const session = await verifySession();
  const asignadorId = await getUsuarioGRDId();
  if (!asignadorId) return { message: "Tu usuario no tiene perfil GRD asociado." };
  try {
    await makeActividadUseCases().asignarEquipo.execute(
      id,
      responsableId,
      equipoIds,
      indicaciones,
      asignadorId
    );
  } catch (err) {
    return fail(err, "No se pudo asignar el equipo.");
  }
  await logGRDAction({
    userId: session.userId,
    action: "EDITAR",
    entity: "Simulacro",
    entityId: id,
    entityName: id,
    module: "Simulacros",
    field: "Estado",
    newValue: "ASIGNADA",
  });

  revalidatePath(REVALIDATE);
}

// ── Autoasignación (PROGRAMADA → ASIGNADA) ────────────────────────────────
export async function autoasignarmeSimulacro(id: string, indicaciones?: string) {
  const session = await verifySession();
  const idUsuarioGRD = await getUsuarioGRDId();
  if (!idUsuarioGRD) return { message: "Tu usuario no tiene perfil GRD asociado." };
  try {
    await makeActividadUseCases().autoasignarme.execute(id, idUsuarioGRD, indicaciones);
  } catch (err) {
    return fail(err, "No se pudo autoasignar.");
  }
  await logGRDAction({
    userId: session.userId,
    action: "EDITAR",
    entity: "Simulacro",
    entityId: id,
    entityName: id,
    module: "Simulacros",
    field: "Estado",
    newValue: "ASIGNADA (autoasignación)",
  });
  revalidatePath(REVALIDATE);
}

// ── Registrar ejecución completa (ASIGNADA|OBSERVADA → EJECUTADA) ────────
export async function registrarEjecucionSimulacro(
  id: string,
  datos: { duracion: string; participantesReales: number; hallazgos: string }
) {
  const session = await verifySession();
  try {
    await makeActividadUseCases().enviarReporte.execute(id, datos.hallazgos);
    await prisma.actividadPreventiva.update({
      where: { idActividadPreventiva: id },
      data: {
        // duracionSimulacro: datos.duracion || null, // TODO: habilitar tras db push (campo nuevo)
        numeroParticipantesReal: datos.participantesReales || null,
        resultadoGeneral: datos.hallazgos || null,
      },
    });
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
    newValue: "EJECUTADA",
  });
  revalidatePath(REVALIDATE);
}

// ── Adjuntar evidencias al simulacro ──────────────────────────────────────
export async function addEvidenciasSimulacro(
  idActividad: string,
  evidencias: {
    key: string;
    nombreArchivo: string;
    formato: string | null;
    tamano: number | null;
    descripcion?: string | null;
  }[]
) {
  const session = await verifySession();
  const idUsuarioGRD = await getUsuarioGRDId();
  if (!idUsuarioGRD) return { message: "Tu usuario no tiene perfil GRD asociado." };
  try {
    let tipoRef = await prisma.tipoReferencia.findUnique({
      where: { codigoEntidad: "SIMULACRO" },
    });
    if (!tipoRef) {
      tipoRef = await prisma.tipoReferencia.create({
        data: {
          codigoEntidad: "SIMULACRO",
          nombreEntidad: "Simulacro / Actividad Preventiva",
          descripcion: "Evidencias de simulacros y actividades preventivas",
          estado: "ACTIVO",
        },
      });
    }
    await prisma.evidenciaGRD.createMany({
      data: evidencias.map((ev) => ({
        idTipoReferencia: tipoRef!.idTipoReferencia,
        idReferencia: idActividad,
        idUsuarioCargaGRD: idUsuarioGRD,
        nombreArchivo: ev.nombreArchivo,
        urlArchivo: ev.key,
        formatoArchivo: ev.formato ?? null,
        tamanoArchivo: ev.tamano ?? null,
        descripcion: ev.descripcion ?? null,
        estado: "ACTIVO",
      })),
    });
  } catch (err) {
    return fail(err, "No se pudo guardar la evidencia.");
  }
  await logGRDAction({
    userId: session.userId,
    action: "CREAR",
    entity: "EvidenciaSimulacro",
    entityId: idActividad,
    entityName: idActividad,
    module: "Simulacros",
  });
  revalidatePath(REVALIDATE);
}

// ── Brigadista envía reporte (ASIGNADA|OBSERVADA → EJECUTADA) ─────────────
export async function enviarReporteSimulacro(id: string, notas: string) {
  const session = await verifySession();
  try {
    await makeActividadUseCases().enviarReporte.execute(id, notas);
  } catch (err) {
    return fail(err, "No se pudo enviar el reporte.");
  }
  await logGRDAction({
    userId: session.userId,
    action: "EDITAR",
    entity: "Simulacro",
    entityId: id,
    entityName: id,
    module: "Simulacros",
    field: "Estado",
    newValue: "EJECUTADA",
  });
  revalidatePath(REVALIDATE);
}

// ── Especialista observa (EJECUTADA → OBSERVADA) ──────────────────────────
export async function observarSimulacro(id: string, comentario: string) {
  const session = await verifySession();
  try {
    await makeActividadUseCases().observar.execute(id, comentario);
  } catch (err) {
    return fail(err, "No se pudo enviar la observación.");
  }
  await logGRDAction({
    userId: session.userId,
    action: "EDITAR",
    entity: "Simulacro",
    entityId: id,
    entityName: id,
    module: "Simulacros",
    field: "Estado",
    newValue: "OBSERVADA",
  });
  revalidatePath(REVALIDATE);
}

// ── Especialista valida (EJECUTADA → VALIDADA) ────────────────────────────
export async function validarSimulacro(id: string) {
  const session = await verifySession();
  try {
    await makeActividadUseCases().validar.execute(id);
  } catch (err) {
    return fail(err, "No se pudo validar el simulacro.");
  }
  await logGRDAction({
    userId: session.userId,
    action: "EDITAR",
    entity: "Simulacro",
    entityId: id,
    entityName: id,
    module: "Simulacros",
    field: "Estado",
    newValue: "VALIDADA",
  });
  revalidatePath(REVALIDATE);
}

// ── Cancelar ──────────────────────────────────────────────────────────────
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
    newValue: "CANCELADA",
    notes: motivo,
  });
  revalidatePath(REVALIDATE);
}

// ── Editar observación propia ─────────────────────────────────────────────
export async function editarObservacionSimulacro(idObservacion: string, texto: string) {
  await verifySession();
  const idUsuarioGRD = await getUsuarioGRDId();
  if (!idUsuarioGRD) return { message: "Sin perfil GRD." };
  const obs = await prisma.observacionSimulacro.findUnique({
    where: { idObservacion },
    select: { idUsuarioGRD: true },
  });
  if (!obs) return { message: "Observación no encontrada." };
  if (obs.idUsuarioGRD !== idUsuarioGRD) return { message: "Solo puedes editar tus propias observaciones." };
  try {
    await prisma.observacionSimulacro.update({
      where: { idObservacion },
      data: { texto: texto.trim(), fechaEdicion: new Date() },
    });
  } catch (err) {
    return fail(err, "No se pudo editar la observación.");
  }
  revalidatePath(REVALIDATE);
}

// ── Borrar observación propia ─────────────────────────────────────────────
export async function borrarObservacionSimulacro(idObservacion: string) {
  await verifySession();
  const idUsuarioGRD = await getUsuarioGRDId();
  if (!idUsuarioGRD) return { message: "Sin perfil GRD." };
  const obs = await prisma.observacionSimulacro.findUnique({
    where: { idObservacion },
    select: { idUsuarioGRD: true },
  });
  if (!obs) return { message: "Observación no encontrada." };
  if (obs.idUsuarioGRD !== idUsuarioGRD) return { message: "Solo puedes borrar tus propias observaciones." };
  try {
    await prisma.observacionSimulacro.delete({ where: { idObservacion } });
  } catch (err) {
    return fail(err, "No se pudo borrar la observación.");
  }
  revalidatePath(REVALIDATE);
}

// ── Añadir observación / comentario ───────────────────────────────────────
export async function addObservacionSimulacro(
  idActividad: string,
  texto: string,
  tipo: "ESPECIALISTA" | "BRIGADISTA"
) {
  const session = await verifySession();
  const idUsuarioGRD = await getUsuarioGRDId();
  if (!idUsuarioGRD) return { message: "Tu usuario no tiene perfil GRD asociado." };
  try {
    await prisma.observacionSimulacro.create({
      data: {
        idActividadPreventiva: idActividad,
        idUsuarioGRD,
        texto: texto.trim(),
        tipo,
      },
    });
  } catch (err) {
    return fail(err, "No se pudo guardar la observación.");
  }
  revalidatePath(REVALIDATE);
}

// ── Legacy ─────────────────────────────────────────────────────────────────
/** @deprecated usar asignarEquipoSimulacro */
export async function asignarBrigadistaSimulacro(id: string, idBrigadista: string | null) {
  const session = await verifySession();
  try {
    await prisma.actividadPreventiva.update({
      where: { idActividadPreventiva: id },
      data: { idBrigadistaResponsable: idBrigadista },
    });
  } catch (err) {
    return fail(err, "No se pudo asignar el brigadista.");
  }
  await logGRDAction({
    userId: session.userId,
    action: "EDITAR",
    entity: "Simulacro",
    entityId: id,
    entityName: id,
    module: "Simulacros",
    field: "BrigadistaResponsable",
    newValue: idBrigadista ?? "ninguno",
  });
  revalidatePath(REVALIDATE);
}

/** @deprecated usar enviarReporteSimulacro */
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
