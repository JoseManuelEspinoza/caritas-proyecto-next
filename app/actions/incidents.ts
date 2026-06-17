"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/app/lib/prisma";
import { verifySession } from "@/app/lib/dal";
import { getUsuarioGRDId } from "@/app/lib/usuario-grd";
import { makeIncidenciaUseCases } from "@/core/infrastructure/factories/makeIncidenciaUseCases";
import { DomainError } from "@/core/domain/errors/DomainError";
import { logGRDAction } from "@/app/lib/audit";
import { sendAsignacionEmergenciaEmail, sendDecisionComiteEmail } from "@/app/lib/email";
import { notificarUsuario, notificarRoles, notificarBrigadistas } from "@/app/lib/notificaciones";
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

function notificarEquipoAsignado(
  incidenciaId: string,
  responsableId: string,
  equipoIds: string[],
  instrucciones?: string
) {
  prisma.incidencia
    .findUnique({
      where: { idIncidencia: incidenciaId },
      select: { tituloIncidencia: true, tipoEvento: true, direccionEvento: true },
    })
    .then((inc) => {
      const nombreCaso =
        inc?.tituloIncidencia ?? inc?.tipoEvento ?? "emergencia registrada";
      const lugar = inc?.direccionEvento ? ` en ${inc.direccionEvento}` : "";
      const detalle = instrucciones?.trim()
        ? `Instrucciones: ${instrucciones.trim()}`
        : `Caso: "${nombreCaso}"${lugar}. Ingresa al sistema para revisar los detalles.`;

      notificarBrigadistas(
        [responsableId],
        "RESPONSABLE_ASIGNADO",
        "Eres el responsable del equipo de respuesta",
        detalle,
        `/grd/${incidenciaId}`
      );

      if (equipoIds.length > 0) {
        notificarBrigadistas(
          equipoIds,
          "BRIGADISTA_ASIGNADO",
          "Has sido asignado a un caso de emergencia",
          detalle,
          `/grd/${incidenciaId}`
        );
      }
    })
    .catch((e) => console.error("[GRD] Error enviando notificaciones de equipo:", e));
}

// Fire-and-forget: notifica por correo a los brigadistas asignados a la incidencia.
function notificarAsignacion(incidenciaId: string, brigadistaIds: string[], instrucciones?: string) {
  prisma.incidencia
    .findUnique({
      where: { idIncidencia: incidenciaId },
      select: { tituloIncidencia: true, tipoEvento: true, fechaRegistro: true, direccionEvento: true },
    })
    .then(async (inc) => {
      if (!inc) return;
      const nombreActividad =
        inc.tituloIncidencia ?? inc.tipoEvento ?? "Incidencia de emergencia";
      const brigadistas = await prisma.brigadistaParroquial.findMany({
        where: { idBrigadistaParroquial: { in: brigadistaIds } },
        select: { correo: true, nombres: true, apellidos: true },
      });
      await Promise.allSettled(
        brigadistas
          .filter((b) => b.correo)
          .map((b) =>
            sendAsignacionEmergenciaEmail(
              b.correo!,
              b.nombres,
              nombreActividad,
              inc.fechaRegistro?.toISOString() ?? null,
              inc.direccionEvento ?? null,
              instrucciones ?? ""
            )
          )
      );
    })
    .catch((e) => console.error("[GRD] Error enviando notificaciones de asignación:", e));
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
  notificarRoles(
    ["ESPECIALISTAGRD", "ADMINISTRADOR"],
    "INCIDENCIA_NUEVA",
    "Nueva incidencia registrada",
    `Se registró: ${data.categoria} en ${data.distrito}`,
    `/grd/${id}`
  );
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
  const session = await verifySession();
  if (!["ESPECIALISTAGRD", "ADMINISTRADOR"].includes(session.role)) {
    return { message: "No tienes permisos para esta acción." };
  }
  try {
    await makeIncidenciaUseCases().asignar.execute(incidenciaId, brigadistaId, instrucciones);
  } catch (err) {
    return asMessage(err);
  }
  notificarAsignacion(incidenciaId, [brigadistaId], instrucciones);
  notificarBrigadistas(
    [brigadistaId],
    "BRIGADISTA_ASIGNADO",
    "Has sido asignado a una incidencia",
    instrucciones?.trim()
      ? `Instrucciones: ${instrucciones.trim()}`
      : "Revisa el sistema para ver los detalles.",
    `/grd/${incidenciaId}`
  );
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
  const session = await verifySession();
  if (!["ESPECIALISTAGRD", "ADMINISTRADOR"].includes(session.role)) {
    return { message: "No tienes permisos para esta acción." };
  }
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
  const todosIds = [...new Set([responsableId, ...equipoIds])];
  notificarAsignacion(incidenciaId, todosIds, instrucciones);
  notificarEquipoAsignado(incidenciaId, responsableId, equipoIds, instrucciones);
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
  // Si ya está EN EVALUACION solo actualizamos el informe, sin re-transicionar
  const inc = await prisma.incidencia.findUnique({
    where: { idIncidencia: incidenciaId },
    select: { estadoActual: true, tituloIncidencia: true, tipoEvento: true },
  });
  if (inc?.estadoActual === "EN EVALUACION") {
    return saveBorradorInformeEvaluacion(incidenciaId, data);
  }
  const elaboradoPor = (await nombreUsuario()) ?? "";
  try {
    await makeIncidenciaUseCases().generarInforme.execute(incidenciaId, data, elaboradoPor);
  } catch (err) {
    return asMessage(err);
  }
  const titulo = inc?.tituloIncidencia ?? inc?.tipoEvento ?? "Incidencia GRD";
  notificarRoles(
    ["COMITEDONACIONES", "JEFAOGP"],
    "INFORME_ENVIADO_COMITE",
    "Informe enviado al Comité",
    `El especialista GRD envió el informe del caso "${titulo}" para su evaluación.`,
    `/grd/${incidenciaId}`
  );
  revalidar(incidenciaId);
}

/**
 * Guarda el borrador del informe de evaluación SIN transicionar el estado de la incidencia.
 * Se usa al "Generar PDF" para persistir la última versión sin enviar al Comité.
 */
export async function saveBorradorInformeEvaluacion(
  incidenciaId: string,
  data: InformeEvaluacionData
) {
  const elaboradoPor = (await nombreUsuario()) ?? "";
  try {
    const existente = await prisma.informe.findFirst({
      where: { idIncidencia: incidenciaId, tipoInforme: "EVALUACION" },
      select: { idInforme: true },
    });
    const payload = {
      tituloInforme: "Informe de Evaluación Social",
      tipoInforme: "EVALUACION",
      resumen: data.analisisSituacion,
      contenido: JSON.stringify({ ...data, elaboradoPor }),
      estadoInforme: "BORRADOR",
    };
    if (existente) {
      await prisma.informe.update({
        where: { idInforme: existente.idInforme },
        data: payload,
      });
    } else {
      await prisma.informe.create({
        data: { idIncidencia: incidenciaId, ...payload },
      });
    }
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

// Fire-and-forget: notifica al especialista GRD responsable sobre la decisión del comité.
function notificarDecisionComite(
  incidenciaId: string,
  decision: "APROBAR" | "OBSERVAR" | "RECHAZAR",
  observaciones?: string | null
) {
  prisma.incidencia
    .findUnique({
      where: { idIncidencia: incidenciaId },
      select: {
        tituloIncidencia: true,
        tipoEvento: true,
        usuarioResponsable: {
          select: {
            nombres: true,
            correoReferencia: true,
            credencial: { select: { id: true, email: true } },
          },
        },
      },
    })
    .then(async (inc) => {
      if (!inc?.usuarioResponsable) return;
      const resp = inc.usuarioResponsable;
      const email = resp.correoReferencia ?? resp.credencial?.email;
      const userId = resp.credencial?.id;
      const incTitulo = inc.tituloIncidencia ?? inc.tipoEvento ?? "Incidencia GRD";

      if (email) {
        await sendDecisionComiteEmail(email, resp.nombres, incTitulo, decision, observaciones);
      }

      if (userId) {
        const tipoNotif =
          decision === "APROBAR"
            ? "DECISION_APROBADO"
            : decision === "OBSERVAR"
            ? "DECISION_OBSERVADO"
            : "DECISION_RECHAZADO";
        const titulos = {
          APROBAR: "Caso aprobado por el Comité",
          OBSERVAR: "Caso devuelto con observaciones",
          RECHAZAR: "Caso rechazado por el Comité",
        };
        notificarUsuario(
          userId,
          tipoNotif,
          titulos[decision],
          observaciones?.trim()
            ? `"${incTitulo}" — ${observaciones.trim()}`
            : `"${incTitulo}"`,
          `/grd/${incidenciaId}`
        );
      }
    })
    .catch((e) => console.error("[GRD] Error notificando decisión del comité:", e));
}

export async function aprobarCaso(incidenciaId: string, observaciones?: string) {
  const session = await verifySession();
  if (!["COMITEDONACIONES", "ADMINISTRADOR"].includes(session.role)) {
    return { message: "No tienes permisos para esta acción." };
  }
  try {
    await makeIncidenciaUseCases().decisionComite.execute(incidenciaId, "APROBAR", observaciones);
  } catch (err) {
    return asMessage(err);
  }
  notificarDecisionComite(incidenciaId, "APROBAR", observaciones);
  revalidar(incidenciaId);
}

export async function observarCaso(incidenciaId: string, observaciones: string) {
  const session = await verifySession();
  if (!["COMITEDONACIONES", "ADMINISTRADOR"].includes(session.role)) {
    return { message: "No tienes permisos para esta acción." };
  }
  try {
    await makeIncidenciaUseCases().decisionComite.execute(incidenciaId, "OBSERVAR", observaciones);
  } catch (err) {
    return asMessage(err);
  }
  notificarDecisionComite(incidenciaId, "OBSERVAR", observaciones);
  revalidar(incidenciaId);
}

export async function rechazarCaso(incidenciaId: string, observaciones: string) {
  const session = await verifySession();
  if (!["COMITEDONACIONES", "ADMINISTRADOR"].includes(session.role)) {
    return { message: "No tienes permisos para esta acción." };
  }
  try {
    await makeIncidenciaUseCases().decisionComite.execute(incidenciaId, "RECHAZAR", observaciones);
  } catch (err) {
    return asMessage(err);
  }
  notificarDecisionComite(incidenciaId, "RECHAZAR", observaciones);
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

export async function iniciarSeguimientoCaso(incidenciaId: string) {
  await verifySession();
  try {
    await makeIncidenciaUseCases().iniciarSeguimiento.execute(incidenciaId);
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

/**
 * Registra el (único) seguimiento y cierra el caso en una sola operación.
 * SEGUIMIENTO ABIERTO → (guarda seguimiento) → CERRADO.
 */
export async function registrarSeguimientoYCerrar(incidenciaId: string, data: SeguimientoData) {
  await verifySession();
  try {
    const uc = makeIncidenciaUseCases();
    await uc.agregarSeguimiento.execute(incidenciaId, data);
    await uc.cerrar.execute(incidenciaId);
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

// ─── Empadronamiento: CRUD directo ──────────────────────────────────────────

/** Agrega una persona a un grupo familiar específico (por ID). */
export async function agregarPersonaAFamiliaCampo(
  incidenciaId: string,
  familiaId: string,
  persona: {
    nombres: string;
    apellidos?: string | null;
    edad?: number | null;
    sexo?: string | null;
    tipoDocumento?: string | null;
    numeroDocumento?: string | null;
    parentesco?: string | null;
    condicionEspecial?: string | null;
    telefono?: string | null;
  }
) {
  await verifySession();
  const fechaNacimiento =
    persona.edad != null && persona.edad > 0
      ? new Date(new Date().getFullYear() - persona.edad, 0, 1)
      : null;
  try {
    await prisma.personaAfectada.create({
      data: {
        idGrupoFamiliar: familiaId,
        nombres: persona.nombres.trim(),
        apellidos: persona.apellidos?.trim() || null,
        fechaNacimiento,
        sexo: persona.sexo || null,
        tipoDocumento: persona.tipoDocumento || null,
        numeroDocumento: persona.numeroDocumento || null,
        parentesco: persona.parentesco || null,
        condicionEspecial: persona.condicionEspecial || null,
        telefono: persona.telefono || null,
      },
    });
  } catch (err) {
    return asMessage(err);
  }
  revalidar(incidenciaId);
}

/** Actualiza los datos de una persona afectada. */
export async function updatePersonaCampo(
  incidenciaId: string,
  personaId: string,
  persona: {
    nombres: string;
    apellidos?: string | null;
    edad?: number | null;
    sexo?: string | null;
    tipoDocumento?: string | null;
    numeroDocumento?: string | null;
    parentesco?: string | null;
    condicionEspecial?: string | null;
    telefono?: string | null;
  }
) {
  await verifySession();
  const fechaNacimiento =
    persona.edad != null && persona.edad > 0
      ? new Date(new Date().getFullYear() - persona.edad, 0, 1)
      : null;
  try {
    await prisma.personaAfectada.update({
      where: { idPersonaAfectada: personaId },
      data: {
        nombres: persona.nombres.trim(),
        apellidos: persona.apellidos?.trim() || null,
        fechaNacimiento,
        sexo: persona.sexo || null,
        tipoDocumento: persona.tipoDocumento || null,
        numeroDocumento: persona.numeroDocumento || null,
        parentesco: persona.parentesco || null,
        condicionEspecial: persona.condicionEspecial || null,
        telefono: persona.telefono || null,
      },
    });
  } catch (err) {
    return asMessage(err);
  }
  revalidar(incidenciaId);
}

/** Elimina una persona afectada del empadronamiento. */
export async function deletePersonaCampo(personaId: string, incidenciaId: string) {
  await verifySession();
  try {
    await prisma.personaAfectada.delete({ where: { idPersonaAfectada: personaId } });
  } catch (err) {
    return asMessage(err);
  }
  revalidar(incidenciaId);
}

/** Crea un nuevo grupo familiar en la incidencia. */
export async function addGrupoFamiliarCampo(incidenciaId: string, nombre: string) {
  await verifySession();
  try {
    await prisma.grupoFamiliarAfectado.create({
      data: { idIncidencia: incidenciaId, nombreReferencia: nombre.trim() },
    });
  } catch (err) {
    return asMessage(err);
  }
  revalidar(incidenciaId);
}

/** Elimina un grupo familiar y todas sus personas. */
export async function deleteGrupoFamiliarCampo(grupoId: string, incidenciaId: string) {
  await verifySession();
  try {
    await prisma.$transaction([
      prisma.personaAfectada.deleteMany({ where: { idGrupoFamiliar: grupoId } }),
      prisma.grupoFamiliarAfectado.delete({ where: { idGrupoFamiliar: grupoId } }),
    ]);
  } catch (err) {
    return asMessage(err);
  }
  revalidar(incidenciaId);
}
