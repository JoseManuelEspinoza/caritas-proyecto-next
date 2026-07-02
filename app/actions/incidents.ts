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
import type { Role } from "@prisma/client";
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
        `/grd/${incidenciaId}`,
        incidenciaId
      );

      if (equipoIds.length > 0) {
        notificarBrigadistas(
          equipoIds,
          "BRIGADISTA_ASIGNADO",
          "Has sido asignado a un caso de emergencia",
          detalle,
          `/grd/${incidenciaId}`,
          incidenciaId
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
    `/grd/${id}`,
    id
  );
  // ?registrado=1 → el detalle muestra la confirmación tras el redirect.
  redirect(`/grd/${id}?registrado=1`);
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
  redirect(`/grd/${incidenciaId}?actualizado=1`);
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
    `/grd/${incidenciaId}`,
    incidenciaId
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
  // Notifica al Especialista GRD que el brigadista envió el levantamiento.
  const inc = await prisma.incidencia.findUnique({
    where: { idIncidencia: incidenciaId },
    select: { tituloIncidencia: true, tipoEvento: true },
  });
  const titulo = inc?.tituloIncidencia ?? inc?.tipoEvento ?? "Incidencia GRD";
  notificarRoles(
    ["ESPECIALISTAGRD", "ADMINISTRADOR"],
    "LEVANTAMIENTO_ENVIADO",
    "Levantamiento de campo recibido",
    `${responsable} envió el levantamiento de campo del caso "${titulo}". Listo para elaborar el informe.`,
    `/grd/${incidenciaId}`
  );
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
  // Validación de stock ANTES de enviar al Comité: si los kits solicitados no
  // tienen stock suficiente, se bloquea el envío y se listan los faltantes para
  // que el especialista reponga o ajuste la asignación.
  const { faltantesStockAsignacion } = await import(
    "@/core/infrastructure/database/validar-stock-kits"
  );
  const faltantes = await faltantesStockAsignacion(data.asignacionFamilias ?? []);
  if (faltantes.length > 0) {
    return {
      message:
        `No hay stock suficiente para los kits solicitados:\n${faltantes.join("\n")}\n\n` +
        `Repón el stock en el módulo de Kits o ajusta la asignación antes de enviar al Comité.`,
    };
  }

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
    `/grd/${incidenciaId}`,
    incidenciaId
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
export async function notificarDecisionComite(
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
          `/grd/${incidenciaId}`,
          incidenciaId
        );
      }
    })
    .catch((e) => console.error("[GRD] Error notificando decisión del comité:", e));
}

// ─── Atención, seguimiento y cierre ─────────────────────────────────────────

type ArticuloEntregaConfirmado = {
  codigo: string;
  descripcion: string;
  cantidadAsignada: number;
  cantidadEntregada: number;
};

type KitEntregaConfirmado = {
  tipoKit: string;
  articulos: ArticuloEntregaConfirmado[];
};

type EvidenciaEntregaInput = {
  key: string;
  nombreArchivo: string;
  formato: string | null;
  tamano: number | null;
};

const CODIGO_TIPO_ENTREGA = "ENTREGA_AYUDA_HUMANITARIA";

function parseInformeJson(raw: string | null | undefined): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function refsFamiliasAprobadas(contenido: string | null | undefined): string[] {
  const parsed = parseInformeJson(contenido);
  const asignaciones = Array.isArray(parsed?.asignacionFamilias)
    ? parsed.asignacionFamilias
    : [];
  return asignaciones
    .map((item) => {
      const row = item as Record<string, unknown>;
      return typeof row.refId === "string" ? row.refId.trim() : "";
    })
    .filter(Boolean);
}

async function getTipoReferenciaEntrega(tx: Pick<typeof prisma, "tipoReferencia">) {
  return tx.tipoReferencia.upsert({
    where: { codigoEntidad: CODIGO_TIPO_ENTREGA },
    update: { estado: "ACTIVO" },
    create: {
      codigoEntidad: CODIGO_TIPO_ENTREGA,
      nombreEntidad: "Entrega de ayuda humanitaria",
      descripcion: "Evidencias vinculadas a una entrega de ayuda humanitaria",
      estado: "ACTIVO",
    },
  });
}

export async function confirmarEntregaFamilia(
  incidenciaId: string,
  data: {
    idGrupoFamiliar: string;
    nombreFamilia: string;
    fechaEntrega: string;
    lugarEntrega?: string | null;
    descripcionEntrega: string;
    kits: KitEntregaConfirmado[];
    evidencias: EvidenciaEntregaInput[];
  }
) {
  await verifySession();
  const idUsuarioGRD = await getUsuarioGRDId();
  if (!idUsuarioGRD) return { message: "No se encontró tu perfil GRD para confirmar la entrega." };

  const descripcion = data.descripcionEntrega.trim();
  if (!descripcion) return { message: "La descripción de entrega es obligatoria." };
  if (!data.evidencias.length) return { message: "Adjunta al menos una evidencia de entrega." };

  const kits = data.kits
    .map((kit) => ({
      tipoKit: kit.tipoKit.trim(),
      articulos: kit.articulos.filter((a) => a.cantidadEntregada > 0),
    }))
    .filter((kit) => kit.tipoKit && kit.articulos.length > 0);
  const totalArticulos = kits.reduce(
    (total, kit) => total + kit.articulos.reduce((sum, art) => sum + art.cantidadEntregada, 0),
    0
  );
  if (totalArticulos <= 0) return { message: "Marca al menos un artículo entregado." };

  const fechaEntrega =
    data.fechaEntrega && !Number.isNaN(new Date(data.fechaEntrega).getTime())
      ? new Date(data.fechaEntrega)
      : new Date();

  try {
    await prisma.$transaction(async (tx) => {
      const grupo = await tx.grupoFamiliarAfectado.findUnique({
        where: { idGrupoFamiliar: data.idGrupoFamiliar },
        select: { idIncidencia: true },
      });
      if (!grupo || grupo.idIncidencia !== incidenciaId) {
        throw new Error("El grupo familiar no pertenece a la incidencia.");
      }

      const existente = await tx.entregaAyudaHumanitaria.findFirst({
        where: {
          idIncidencia: incidenciaId,
          idGrupoFamiliar: data.idGrupoFamiliar,
          deletedAt: null,
        },
        select: { idEntrega: true },
      });
      if (existente) {
        throw new Error("Esta familia ya tiene una entrega confirmada.");
      }

      const entrega = await tx.entregaAyudaHumanitaria.create({
        data: {
          idIncidencia: incidenciaId,
          idUsuarioResponsableGRD: idUsuarioGRD,
          idGrupoFamiliar: data.idGrupoFamiliar,
          fechaEntrega,
          lugarEntrega: data.lugarEntrega?.trim() || null,
          tipoAyuda: "Donación en especie",
          descripcionAyuda: descripcion,
          cantidadEntregada: totalArticulos,
          conformidadRecepcion: true,
          entregaParcial: false,
          observaciones: JSON.stringify({
            version: 1,
            tipo: "ENTREGA_KITS_FAMILIA",
            estadoEntrega: "ENTREGADO",
            nombreFamilia: data.nombreFamilia,
            descripcionEntrega: descripcion,
            kits,
          }),
          syncEstado: "SINCRONIZADO",
          fechaSincronizacion: new Date(),
        },
        select: { idEntrega: true },
      });

      const tipoReferencia = await getTipoReferenciaEntrega(tx);
      await tx.evidenciaGRD.createMany({
        data: data.evidencias.map((ev) => ({
          idTipoReferencia: tipoReferencia.idTipoReferencia,
          idReferencia: entrega.idEntrega,
          idUsuarioCargaGRD: idUsuarioGRD,
          nombreArchivo: ev.nombreArchivo,
          urlArchivo: ev.key,
          formatoArchivo: ev.formato,
          descripcion: "Evidencia de entrega",
          tamanoArchivo: ev.tamano,
          estado: "ACTIVO",
          syncEstado: "SINCRONIZADO",
          fechaSincronizacion: new Date(),
        })),
      });
    });
  } catch (err) {
    return { message: err instanceof Error ? err.message : "No se pudo confirmar la entrega." };
  }

  revalidar(incidenciaId);
}

export async function marcarIncidenciaAtendidaSiEntregasCompletas(incidenciaId: string) {
  await verifySession();

  try {
    await prisma.$transaction(async (tx) => {
      const inc = await tx.incidencia.findUnique({
        where: { idIncidencia: incidenciaId },
        select: { estadoActual: true },
      });
      if (!inc) throw new Error("Incidencia no encontrada.");
      if (inc.estadoActual === "ATENDIDO") return;
      if (inc.estadoActual !== "APROBADO") {
        throw new Error("Solo se puede marcar como Atendido una incidencia APROBADA.");
      }

      const informe = await tx.informe.findFirst({
        where: { idIncidencia: incidenciaId, tipoInforme: "EVALUACION" },
        orderBy: { fechaElaboracion: "desc" },
        select: { contenido: true },
      });
      const refsAprobadas = refsFamiliasAprobadas(informe?.contenido);
      if (refsAprobadas.length === 0) {
        throw new Error("El informe aprobado no registra familias/kits para entregar.");
      }

      const entregas = await tx.entregaAyudaHumanitaria.findMany({
        where: { idIncidencia: incidenciaId, idGrupoFamiliar: { in: refsAprobadas }, deletedAt: null },
        select: { idGrupoFamiliar: true },
      });
      const entregadas = new Set(entregas.map((e) => e.idGrupoFamiliar).filter(Boolean));
      const faltantes = refsAprobadas.filter((ref) => !entregadas.has(ref));
      if (faltantes.length > 0) {
        throw new Error("Aún hay familias/kits sin confirmar. Confirma todas las entregas antes de marcar Atendido.");
      }

      await tx.incidencia.update({
        where: { idIncidencia: incidenciaId },
        data: { estadoActual: "ATENDIDO" },
      });
      await tx.historialEstadoIncidencia.create({
        data: {
          idIncidencia: incidenciaId,
          estadoAnterior: "APROBADO",
          estadoNuevo: "ATENDIDO",
          motivoCambio: "Kits entregados a todas las familias aprobadas",
        },
      });

      const asignaciones = await tx.asignacionBrigadistaIncidencia.findMany({
        where: { idIncidencia: incidenciaId, estadoAsignacion: "ASIGNADA" },
        select: { idBrigadistaParroquial: true },
      });
      if (asignaciones.length) {
        await tx.brigadistaParroquial.updateMany({
          where: { idBrigadistaParroquial: { in: asignaciones.map((a) => a.idBrigadistaParroquial) } },
          data: { disponibilidad: "DISPONIBLE" },
        });
      }
    });
  } catch (err) {
    return { message: err instanceof Error ? err.message : "No se pudo marcar como Atendido." };
  }

  revalidar(incidenciaId);
}

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
    observaciones?: string | null;
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
        observaciones: persona.observaciones || null,
      },
    });
  } catch (err) {
    return asMessage(err);
  }
  revalidar(incidenciaId);
}

/**
 * Agrega una persona INDIVIDUAL (sin familia). Reutiliza —o crea si no existe—
 * el grupo "Personas individuales" de la incidencia (mismo criterio que el
 * registro inicial), y agrega ahí la persona.
 */
export async function agregarPersonaIndividualCampo(
  incidenciaId: string,
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
    observaciones?: string | null;
  }
) {
  await verifySession();
  const fechaNacimiento =
    persona.edad != null && persona.edad > 0
      ? new Date(new Date().getFullYear() - persona.edad, 0, 1)
      : null;
  try {
    let grupo = await prisma.grupoFamiliarAfectado.findFirst({
      where: { idIncidencia: incidenciaId, nombreReferencia: "Personas individuales" },
      select: { idGrupoFamiliar: true },
    });
    if (!grupo) {
      grupo = await prisma.grupoFamiliarAfectado.create({
        data: {
          idIncidencia: incidenciaId,
          nombreReferencia: "Personas individuales",
          codigoGrupo: "SIN_FAMILIA",
        },
        select: { idGrupoFamiliar: true },
      });
    }
    await prisma.personaAfectada.create({
      data: {
        idGrupoFamiliar: grupo.idGrupoFamiliar,
        nombres: persona.nombres.trim(),
        apellidos: persona.apellidos?.trim() || null,
        fechaNacimiento,
        sexo: persona.sexo || null,
        tipoDocumento: persona.tipoDocumento || null,
        numeroDocumento: persona.numeroDocumento || null,
        parentesco: persona.parentesco || null,
        condicionEspecial: persona.condicionEspecial || null,
        telefono: persona.telefono || null,
        observaciones: persona.observaciones || null,
      },
    });
  } catch (err) {
    return asMessage(err);
  }
  revalidar(incidenciaId);
}

/**
 * Guarda las anotaciones por familia en `GrupoFamiliar.observaciones` (fuente
 * única de la anotación: la crea el registro y la edita el brigadista aquí).
 */
export async function guardarNotasFamiliasCampo(
  incidenciaId: string,
  notas: { grupoId: string; nota: string }[]
) {
  await verifySession();
  try {
    for (const { grupoId, nota } of notas) {
      await prisma.grupoFamiliarAfectado.update({
        where: { idGrupoFamiliar: grupoId },
        data: { observaciones: nota.trim() || null },
      });
    }
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
    observaciones?: string | null;
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
        observaciones: persona.observaciones || null,
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

// ─── Preview de destinatarios ────────────────────────────────────────────────

export type DestinatarioNotif = { nombre: string; email: string; rol: string };

export async function getDestinatariosNotificacion(
  step: "informe" | "decision",
  incidenciaId: string
): Promise<DestinatarioNotif[]> {
  await verifySession();

  if (step === "informe") {
    const roles = ["COMITEDONACIONES", "JEFAOGP"] as Role[];
    const usuarios = await prisma.user.findMany({
      where: { role: { in: roles }, estado: "ACTIVO" },
      select: { name: true, email: true, role: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });
    return usuarios.map((u) => ({ nombre: u.name ?? u.email, email: u.email, rol: u.role }));
  }

  // step === "decision": notify the GRD responsible for this incidencia
  const inc = await prisma.incidencia.findUnique({
    where: { idIncidencia: incidenciaId },
    select: {
      usuarioResponsable: {
        select: {
          nombres: true,
          apellidos: true,
          correoReferencia: true,
          credencial: { select: { email: true, role: true } },
        },
      },
    },
  });

  const resp = inc?.usuarioResponsable;
  if (!resp) return [];

  const nombre = [resp.nombres, resp.apellidos].filter(Boolean).join(" ");
  const email = resp.correoReferencia ?? resp.credencial?.email ?? "";
  // credencial can be null for UsuarioGRD rows not linked to a User account; rol is display-only
  const rol = resp.credencial?.role ?? "ESPECIALISTAGRD";
  return [{ nombre, email, rol }];
}
