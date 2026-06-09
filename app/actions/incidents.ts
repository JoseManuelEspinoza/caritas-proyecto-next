"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/app/lib/prisma";
import { verifySession } from "@/app/lib/dal";
import { getUsuarioGRDId } from "@/app/lib/usuario-grd";
import { makeIncidenciaUseCases } from "@/core/infrastructure/factories/makeIncidenciaUseCases";
import { DomainError } from "@/core/domain/errors/DomainError";
import { logGRDAction } from "@/app/lib/audit";
import type {
  CreateIncidenteData,
  InfoCampoData,
  InformeEvaluacionData,
  CorreccionData,
  AtencionData,
  SeguimientoData,
} from "@/core/application/dtos/IncidenciaDTO";

// Se re-exportan los tipos para no romper los imports de la UI de intermedia.
export type {
  PersonaForm,
  FamiliaForm,
  CreateIncidenteData,
} from "@/core/application/dtos/IncidenciaDTO";

/**
 * Capa de presentación DELGADA del flujo GRD. Conserva las mismas firmas que la
 * UI ya consume; toda la lógica vive en los casos de uso de core/. La sesión y
 * la identidad del usuario (presentación) se resuelven aquí y se pasan al core.
 */
function asMessage(err: unknown): { message: string } {
  if (err instanceof DomainError) return { message: err.message };
  throw err;
}

function revalidar(incidenciaId: string): void {
  revalidatePath("/grd");
  revalidatePath(`/grd/${incidenciaId}`);
}

async function nombreUsuario(): Promise<string | undefined> {
  const session = await verifySession();
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { name: true },
  });
  return user?.name ?? undefined;
}

// ─── Registro / edición ────────────────────────────────────────────────────

export async function createIncidente(data: CreateIncidenteData) {
  const session = await verifySession();
  const idUsuarioGRD = await getUsuarioGRDId();
  let id: string;
  try {
    id = await makeIncidenciaUseCases().registrar.execute(data, idUsuarioGRD);
  } catch (err) {
    return asMessage(err);
  }
  await logGRDAction({
    userId: session.userId,
    action: "CREAR",
    entity: "Incidencia",
    entityId: id,
    entityName: `${data.categoria} en ${data.distrito}`,
    module: "GRD",
  });
  redirect(`/grd/${id}`);
}

export async function updateIncidente(incidenciaId: string, data: CreateIncidenteData) {
  const session = await verifySession();

  const anterior = await prisma.incidencia.findUnique({
    where: { idIncidencia: incidenciaId },
    select: { tipoEvento: true, direccionEvento: true, descripcionEvento: true, gravedad: true },
  });

  try {
    await makeIncidenciaUseCases().actualizar.execute(incidenciaId, data);
  } catch (err) {
    return asMessage(err);
  }

  const entityName = `${data.categoria} en ${data.distrito}`;
  const campos = [
    { field: "Categoría", prev: anterior?.tipoEvento, next: data.categoria },
    { field: "Dirección", prev: anterior?.direccionEvento, next: data.direccion },
    { field: "Descripción", prev: anterior?.descripcionEvento, next: data.descripcion },
    { field: "Nivel de afectación", prev: anterior?.gravedad, next: data.nivelAfectacion },
  ];

  for (const c of campos) {
    if (c.prev !== c.next) {
      await logGRDAction({
        userId: session.userId,
        action: "EDITAR",
        entity: "Incidencia",
        entityId: incidenciaId,
        entityName,
        module: "GRD",
        field: c.field,
        prevValue: c.prev ?? undefined,
        newValue: c.next ?? undefined,
      });
    }
  }

  revalidar(incidenciaId);
  redirect(`/grd/${incidenciaId}`);
}

// ─── Flujo de campo y evaluación ────────────────────────────────────────────

export async function assignBrigadista(
  incidenciaId: string,
  brigadistaId: string,
  instrucciones?: string
) {
  await verifySession();
  try {
    await makeIncidenciaUseCases().asignar.execute(incidenciaId, brigadistaId, instrucciones);
  } catch (err) {
    return asMessage(err);
  }
  revalidar(incidenciaId);
}

/**
 * Asigna equipo de brigadistas: un responsable y opcionales integrantes.
 * Transiciona ABIERTO → ASIGNADO en el primer guardado.
 */
export async function assignEquipo(
  incidenciaId: string,
  responsableId: string,
  equipoIds: string[],
  instrucciones?: string
) {
  await verifySession();
  const idUsuarioAsignador = await getUsuarioGRDId();
  try {
    await makeIncidenciaUseCases().asignarEquipo.execute(
      incidenciaId,
      responsableId,
      equipoIds,
      instrucciones,
      idUsuarioAsignador ?? undefined
    );
  } catch (err) {
    return asMessage(err);
  }
  revalidar(incidenciaId);
}

/**
 * Autoasignación del especialista GRD: único responsable de campo.
 * Transiciona ABIERTO → ASIGNADO.
 */
export async function autoasignarme(incidenciaId: string, instrucciones?: string) {
  await verifySession();
  const idUsuarioGRD = await getUsuarioGRDId();
  if (!idUsuarioGRD) {
    return { message: "No se encontró tu perfil GRD para autoasignarte." };
  }
  try {
    await makeIncidenciaUseCases().autoasignarme.execute(incidenciaId, idUsuarioGRD, instrucciones);
  } catch (err) {
    return asMessage(err);
  }
  revalidar(incidenciaId);
}

export async function saveInfoCampo(incidenciaId: string, data: InfoCampoData) {
  const responsable = (await nombreUsuario()) ?? data.responsable;
  try {
    await makeIncidenciaUseCases().registrarCampo.execute(incidenciaId, data, responsable);
  } catch (err) {
    return asMessage(err);
  }
  revalidar(incidenciaId);
}

/** Empadronamiento editable: agrega una persona afectada durante el campo. */
export async function agregarPersonaCampo(
  incidenciaId: string,
  persona: {
    nombres: string;
    apellidos?: string | null;
    edad?: number | null;
    sexo?: string | null;
    tipoDocumento?: string | null;
    numeroDocumento?: string | null;
    parentesco?: string | null;
    familiaNombre?: string | null;
  }
) {
  await verifySession();
  try {
    await makeIncidenciaUseCases().agregarPersona.execute(incidenciaId, persona);
  } catch (err) {
    return asMessage(err);
  }
  revalidar(incidenciaId);
}

/** Registra evidencias de campo (ya subidas a S3) en la incidencia. */
export async function addEvidenciasCampo(
  incidenciaId: string,
  evidencias: {
    key: string;
    nombreArchivo: string;
    formato: string | null;
    tamano: number | null;
    descripcion?: string | null;
  }[]
) {
  await verifySession();
  const idUsuarioGRD = await getUsuarioGRDId();
  if (!idUsuarioGRD) {
    return { message: "No se encontró tu perfil GRD para registrar evidencias." };
  }
  try {
    await makeIncidenciaUseCases().agregarEvidencias.execute(
      incidenciaId,
      idUsuarioGRD,
      evidencias
    );
  } catch (err) {
    return asMessage(err);
  }
  revalidar(incidenciaId);
}

export async function saveInformeEvaluacion(incidenciaId: string, data: InformeEvaluacionData) {
  const elaboradoPor = (await nombreUsuario()) ?? "";
  try {
    await makeIncidenciaUseCases().generarInforme.execute(incidenciaId, data, elaboradoPor);
  } catch (err) {
    return asMessage(err);
  }
  revalidar(incidenciaId);
}

export async function corregirYReenviar(incidenciaId: string, data: CorreccionData) {
  const elaboradoPor = (await nombreUsuario()) ?? "";
  try {
    await makeIncidenciaUseCases().corregir.execute(incidenciaId, data, elaboradoPor);
  } catch (err) {
    return asMessage(err);
  }
  revalidar(incidenciaId);
}

// ─── Decisiones del Comité ──────────────────────────────────────────────────

export async function aprobarCaso(incidenciaId: string, observaciones?: string) {
  await verifySession();
  try {
    await makeIncidenciaUseCases().decisionComite.execute(incidenciaId, "APROBAR", observaciones);
  } catch (err) {
    return asMessage(err);
  }
  revalidar(incidenciaId);
}

export async function observarCaso(incidenciaId: string, observaciones: string) {
  await verifySession();
  try {
    await makeIncidenciaUseCases().decisionComite.execute(incidenciaId, "OBSERVAR", observaciones);
  } catch (err) {
    return asMessage(err);
  }
  revalidar(incidenciaId);
}

export async function rechazarCaso(incidenciaId: string, observaciones: string) {
  await verifySession();
  try {
    await makeIncidenciaUseCases().decisionComite.execute(incidenciaId, "RECHAZAR", observaciones);
  } catch (err) {
    return asMessage(err);
  }
  revalidar(incidenciaId);
}

// ─── Atención, seguimiento y cierre ─────────────────────────────────────────

export async function registrarAtencion(incidenciaId: string, data: AtencionData) {
  await verifySession();
  try {
    await makeIncidenciaUseCases().registrarAtencion.execute(incidenciaId, data);
  } catch (err) {
    return asMessage(err);
  }
  revalidar(incidenciaId);
}

export async function addSeguimiento(incidenciaId: string, data: SeguimientoData) {
  await verifySession();
  try {
    await makeIncidenciaUseCases().agregarSeguimiento.execute(incidenciaId, data);
  } catch (err) {
    return asMessage(err);
  }
  revalidar(incidenciaId);
}

export async function cerrarCaso(incidenciaId: string) {
  await verifySession();
  try {
    await makeIncidenciaUseCases().cerrar.execute(incidenciaId);
  } catch (err) {
    return asMessage(err);
  }
  revalidar(incidenciaId);
}
