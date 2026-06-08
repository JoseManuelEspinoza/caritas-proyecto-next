"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/app/lib/dal";
import { getUsuarioGRDId } from "@/app/lib/usuario-grd";
import { makeCursoUseCases } from "@/core/infrastructure/factories/makeCursoUseCases";
import { DomainError } from "@/core/domain/errors/DomainError";
import { logGRDAction } from "@/app/lib/audit";
import { prisma } from "@/app/lib/prisma";
import type { ParticipanteData } from "@/core/domain/repositories/ICursoRepository";

const REVALIDATE = "/capacitaciones";

function fail(err: unknown, fallback: string) {
  if (err instanceof DomainError) return { message: err.message };
  console.error("[Capacitaciones] Error inesperado:", err);
  return { message: fallback };
}
const TIPOS_MATERIAL_VALIDOS = [
  "Documento (PDF, Word, Excel)",
  "Presentación",
  "Video",
  "Enlace web",
  "Otro",
];

const TIPOS_EVALUACION_VALIDOS = ["INICIAL", "FINAL", "UNICO"];

function texto(value?: string | null): string {
  return value?.trim() ?? "";
}

function validarId(value: string | undefined | null, mensaje: string): { message: string } | null {
  if (!texto(value)) return { message: mensaje };
  return null;
}

function validarTextoMinimo(
  value: string | undefined | null,
  campo: string,
  min: number,
  obligatorio = true
): { message: string } | null {
  const limpio = texto(value);

  if (!limpio && obligatorio) {
    return { message: `${campo} es obligatorio.` };
  }

  if (limpio && limpio.length < min) {
    return { message: `${campo} debe tener al menos ${min} caracteres.` };
  }

  return null;
}

function validarEnteroPositivo(
  value: number | undefined | null,
  campo: string
): { message: string } | null {
  if (value == null) return null;

  if (!Number.isFinite(value)) {
    return { message: `${campo} debe ser un número válido.` };
  }

  if (!Number.isInteger(value)) {
    return { message: `${campo} debe ser un número entero.` };
  }

  if (value <= 0) {
    return { message: `${campo} debe ser mayor que cero.` };
  }

  return null;
}

function validarUrlOpcional(value?: string | null): { message: string } | null {
  const limpio = texto(value);
  if (!limpio) return null;

  try {
    const url = new URL(limpio);
    if (!["http:", "https:"].includes(url.protocol)) {
      return { message: "El enlace del material debe iniciar con http:// o https://." };
    }
    return null;
  } catch {
    return { message: "El enlace del material no tiene un formato válido." };
  }
}
// ── Shared types ──────────────────────────────────────────────────────────────

export type Material = {
  id: string;
  titulo: string;
  tipoMaterial: string | null;
  enlaceMaterial: string | null;
};

export type Sesion = {
  id: string;
  numeroOrden: number;
  tituloUnidad: string;
  materiales: Material[];
};

export type CursoDetalle = {
  id: string;
  codigoCurso: string | null;
  nombreCurso: string;
  descripcion: string | null;
  modalidadGeneral: string;
  estadoCurso: string;
  fechaPublicacion: string | null;
  fechaCierre: string | null;
  responsable: string;
  idResponsable: string;
  totalInscritos: number;
  sesiones: Sesion[];
};

export type CursoInscrito = {
  id: string;
  codigoCurso: string | null;
  nombreCurso: string;
  descripcion: string | null;
  modalidadGeneral: string;
  estadoCurso: string;
  fechaPublicacion: string | null;
  fechaCierre: string | null;
  responsable: string;
  idInscripcion: string;
  estadoInscripcion: string;
  evalInicial: number | null;
  evalFinal: number | null;
  resultado: string | null;
  certificado: boolean;
  sesiones: Sesion[];
};

export type CursoDisponible = {
  id: string;
  codigoCurso: string | null;
  nombreCurso: string;
  descripcion: string | null;
  modalidadGeneral: string;
  fechaPublicacion: string | null;
  fechaCierre: string | null;
  responsable: string;
  totalInscritos: number;
  totalSesiones: number;
};

// ── Read actions ──────────────────────────────────────────────────────────────

export async function listarInscripciones(idCurso: string) {
  await verifySession();
  return makeCursoUseCases().listarInscripciones.execute(idCurso);
}

export async function listarCursosConSesiones(idResponsable?: string): Promise<CursoDetalle[]> {
  await verifySession();
  const rows = await prisma.cursoCapacitacion.findMany({
    where: idResponsable ? { idUsuarioResponsableGRD: idResponsable } : undefined,
    orderBy: { fechaCreacion: "desc" },
    include: {
      usuarioResponsable: { select: { nombres: true, apellidos: true } },
      unidades: {
        where: { estado: "ACTIVO" },
        orderBy: { numeroOrden: "asc" },
        include: {
          materiales: {
            where: { estado: "ACTIVO" },
            select: {
              idMaterialCapacitacion: true,
              titulo: true,
              tipoMaterial: true,
              enlaceMaterial: true,
            },
          },
        },
      },
      _count: { select: { inscripciones: true } },
    },
  });
  return rows.map((r) => ({
    id: r.idCursoCapacitacion,
    codigoCurso: r.codigoCurso,
    nombreCurso: r.nombreCurso,
    descripcion: r.descripcion,
    modalidadGeneral: r.modalidadGeneral,
    estadoCurso: r.estadoCurso,
    fechaPublicacion: r.fechaPublicacion?.toISOString() ?? null,
    fechaCierre: r.fechaCierre?.toISOString() ?? null,
    responsable: `${r.usuarioResponsable.nombres} ${r.usuarioResponsable.apellidos}`.trim(),
    idResponsable: r.idUsuarioResponsableGRD,
    totalInscritos: r._count.inscripciones,
    sesiones: r.unidades.map((u) => ({
      id: u.idUnidadContenido,
      numeroOrden: u.numeroOrden,
      tituloUnidad: u.tituloUnidad,
      materiales: u.materiales.map((m) => ({
        id: m.idMaterialCapacitacion,
        titulo: m.titulo,
        tipoMaterial: m.tipoMaterial,
        enlaceMaterial: m.enlaceMaterial,
      })),
    })),
  }));
}

export async function listarEspecialistas(): Promise<{ id: string; nombre: string }[]> {
  await verifySession();
  const rows = await prisma.usuarioGRD.findMany({
    where: { credencial: { role: "ESPECIALISTAGRD" }, estado: "ACTIVO" },
    select: { idUsuarioGRD: true, nombres: true, apellidos: true },
    orderBy: { nombres: "asc" },
  });
  return rows.map((r) => ({ id: r.idUsuarioGRD, nombre: `${r.nombres} ${r.apellidos}`.trim() }));
}

export async function listarMisCursos(): Promise<CursoInscrito[]> {
  const session = await verifySession();
  const participante = await prisma.participante.findFirst({
    where: { correo: session.email },
    select: { idParticipante: true },
  });
  if (!participante) return [];

  const inscripciones = await prisma.inscripcionCurso.findMany({
    where: { idParticipante: participante.idParticipante },
    orderBy: { fechaInscripcion: "desc" },
    include: {
      curso: {
        include: {
          usuarioResponsable: { select: { nombres: true, apellidos: true } },
          unidades: {
            where: { estado: "ACTIVO" },
            orderBy: { numeroOrden: "asc" },
            include: {
              materiales: {
                where: { estado: "ACTIVO" },
                select: {
                  idMaterialCapacitacion: true,
                  titulo: true,
                  tipoMaterial: true,
                  enlaceMaterial: true,
                },
              },
            },
          },
        },
      },
      evaluaciones: { orderBy: { fechaEvaluacion: "asc" } },
      certificacion: { select: { idCertificacionCurso: true } },
    },
  });

  return inscripciones.map((i) => {
    const evals = i.evaluaciones;
    return {
      id: i.curso.idCursoCapacitacion,
      codigoCurso: i.curso.codigoCurso,
      nombreCurso: i.curso.nombreCurso,
      descripcion: i.curso.descripcion,
      modalidadGeneral: i.curso.modalidadGeneral,
      estadoCurso: i.curso.estadoCurso,
      fechaPublicacion: i.curso.fechaPublicacion?.toISOString() ?? null,
      fechaCierre: i.curso.fechaCierre?.toISOString() ?? null,
      responsable: `${i.curso.usuarioResponsable.nombres} ${i.curso.usuarioResponsable.apellidos}`.trim(),
      idInscripcion: i.idInscripcionCurso,
      estadoInscripcion: i.estadoInscripcion,
      evalInicial: evals[0]?.nota != null ? Number(evals[0].nota) : null,
      evalFinal:
        evals.length > 1 && evals[evals.length - 1].nota != null
          ? Number(evals[evals.length - 1].nota)
          : null,
      resultado: evals.length > 0 ? (evals[evals.length - 1].resultado ?? null) : null,
      certificado: i.certificacion !== null,
      sesiones: i.curso.unidades.map((u) => ({
        id: u.idUnidadContenido,
        numeroOrden: u.numeroOrden,
        tituloUnidad: u.tituloUnidad,
        materiales: u.materiales.map((m) => ({
          id: m.idMaterialCapacitacion,
          titulo: m.titulo,
          tipoMaterial: m.tipoMaterial,
          enlaceMaterial: m.enlaceMaterial,
        })),
      })),
    };
  });
}

export async function listarCursosDisponiblesBrigadista(): Promise<CursoDisponible[]> {
  const session = await verifySession();
  const participante = await prisma.participante.findFirst({
    where: { correo: session.email },
    select: { idParticipante: true },
  });
  const enrolledIds = participante
    ? (
        await prisma.inscripcionCurso.findMany({
          where: { idParticipante: participante.idParticipante },
          select: { idCursoCapacitacion: true },
        })
      ).map((r) => r.idCursoCapacitacion)
    : [];

  const rows = await prisma.cursoCapacitacion.findMany({
    where: {
      estadoCurso: "PUBLICADO",
      ...(enrolledIds.length > 0 ? { idCursoCapacitacion: { notIn: enrolledIds } } : {}),
    },
    orderBy: { fechaCreacion: "desc" },
    include: {
      usuarioResponsable: { select: { nombres: true, apellidos: true } },
      _count: { select: { inscripciones: true, unidades: true } },
    },
  });

  return rows.map((r) => ({
    id: r.idCursoCapacitacion,
    codigoCurso: r.codigoCurso,
    nombreCurso: r.nombreCurso,
    descripcion: r.descripcion,
    modalidadGeneral: r.modalidadGeneral,
    fechaPublicacion: r.fechaPublicacion?.toISOString() ?? null,
    fechaCierre: r.fechaCierre?.toISOString() ?? null,
    responsable: `${r.usuarioResponsable.nombres} ${r.usuarioResponsable.apellidos}`.trim(),
    totalInscritos: r._count.inscripciones,
    totalSesiones: r._count.unidades,
  }));
}

// ── Mutation actions ──────────────────────────────────────────────────────────

export async function crearCurso(input: {
  nombreCurso: string;
  descripcion?: string;
  idInstitucionAliada?: string;
  duracionEstimadaHoras?: number;
  idResponsable?: string;
}) {
  const session = await verifySession();
  const errorNombre = validarTextoMinimo(input.nombreCurso, "El nombre del curso", 3);
  if (errorNombre) return errorNombre;

  const errorDescripcion = validarTextoMinimo(
    input.descripcion,
    "La descripción del curso",
    5,
    false
  );
  if (errorDescripcion) return errorDescripcion;

  const duracionRecibida = input.duracionEstimadaHoras;
  const duracionNormalizada =
    duracionRecibida == null || duracionRecibida === 0 ? undefined : duracionRecibida;

  const errorDuracion = validarEnteroPositivo(duracionNormalizada, "La duración estimada");
  if (errorDuracion) return errorDuracion;  
  const { idResponsable, ...rest } = input;
  const idUsuarioResponsableGRD = idResponsable ?? (await getUsuarioGRDId());
  if (!idUsuarioResponsableGRD) return { message: "Tu usuario no tiene perfil GRD asociado." };
  try {
    await makeCursoUseCases().crear.execute({
      ...rest,
      nombreCurso: input.nombreCurso.trim(),
      descripcion: texto(input.descripcion) || undefined,
      duracionEstimadaHoras: duracionNormalizada,
      idUsuarioResponsableGRD,
    });
  } catch (err) {
    return fail(err, "No se pudo crear el curso.");
  }
  await logGRDAction({
    userId: session.userId,
    action: "CREAR",
    entity: "Curso",
    entityId: idUsuarioResponsableGRD,
    entityName: input.nombreCurso.trim(),
    module: "Capacitaciones",
  });
  revalidatePath(REVALIDATE);
}

export async function editarCurso(
  id: string,
  data: { nombreCurso: string; descripcion?: string; idResponsable: string }
): Promise<void | { message: string }> {
  const session = await verifySession();

  const errorId = validarId(id, "No se encontró el curso a editar.");
  if (errorId) return errorId;

  const errorNombre = validarTextoMinimo(data.nombreCurso, "El nombre del curso", 3);
  if (errorNombre) return errorNombre;

  const errorResponsable = validarId(data.idResponsable, "Selecciona el responsable del curso.");
  if (errorResponsable) return errorResponsable;

  const errorDescripcion = validarTextoMinimo(
    data.descripcion,
    "La descripción del curso",
    5,
    false
  );
  if (errorDescripcion) return errorDescripcion;

  try {
    await prisma.cursoCapacitacion.update({
      where: { idCursoCapacitacion: id },
      data: {
        nombreCurso: data.nombreCurso.trim(),
        descripcion: texto(data.descripcion) || null,
        idUsuarioResponsableGRD: data.idResponsable,
      },
    });
    await logGRDAction({
      userId: session.userId,
      action: "EDITAR",
      entity: "Curso",
      entityId: id,
      entityName: data.nombreCurso.trim(),
      module: "Capacitaciones",
    });
  } catch (err) {
    return fail(err, "No se pudo editar el curso.");
  }
  revalidatePath(REVALIDATE);
}

export async function cambiarEstadoCurso(id: string, accion: "PUBLICAR" | "CERRAR") {
  const session = await verifySession();
  const curso = await prisma.cursoCapacitacion.findUnique({
    where: { idCursoCapacitacion: id },
    select: { nombreCurso: true },
  });
  try {
    await makeCursoUseCases().cambiarEstado.execute(id, accion);
  } catch (err) {
    return fail(err, "No se pudo cambiar el estado del curso.");
  }
  await logGRDAction({
    userId: session.userId,
    action: "EDITAR",
    entity: "Curso",
    entityId: id,
    entityName: curso?.nombreCurso ?? id,
    module: "Capacitaciones",
    field: "Estado",
    newValue: accion,
  });
  revalidatePath(REVALIDATE);
}

export async function crearSesion(
  idCurso: string,
  data: { tituloUnidad: string }
): Promise<void | { message: string }> {
  const session = await verifySession();

  const errorCurso = validarId(idCurso, "No se encontró el curso.");
  if (errorCurso) return errorCurso;

  const errorTitulo = validarTextoMinimo(data.tituloUnidad, "El título de la sesión", 3);
  if (errorTitulo) return errorTitulo;

  try {
    const curso = await prisma.cursoCapacitacion.findUnique({
      where: { idCursoCapacitacion: idCurso },
      select: { estadoCurso: true },
    });

    if (!curso) return { message: "Curso no encontrado." };
    if (curso.estadoCurso === "CERRADO") {
      return { message: "No se pueden agregar sesiones a un curso cerrado." };
    }

    const count = await prisma.unidadContenido.count({ where: { idCursoCapacitacion: idCurso } });
    await prisma.unidadContenido.create({
      data: {
        idCursoCapacitacion: idCurso,
        numeroOrden: count + 1,
        tituloUnidad: data.tituloUnidad.trim(),
        estado: "ACTIVO",
      },
    });
    await logGRDAction({
      userId: session.userId,
      action: "CREAR",
      entity: "Sesión",
      entityId: idCurso,
      entityName: data.tituloUnidad.trim(),
      module: "Capacitaciones",
    });
  } catch (err) {
    return fail(err, "No se pudo crear la sesión.");
  }
  revalidatePath(REVALIDATE);
}

export async function agregarMaterial(
  idCurso: string,
  idUnidad: string,
  data: { titulo: string; tipoMaterial: string; enlaceMaterial: string }
): Promise<void | { message: string }> {
  const session = await verifySession();

  const errorCurso = validarId(idCurso, "No se encontró el curso.");
  if (errorCurso) return errorCurso;

  const errorUnidad = validarId(idUnidad, "Selecciona la sesión a la que pertenece el material.");
  if (errorUnidad) return errorUnidad;

  const errorTitulo = validarTextoMinimo(data.titulo, "El título del material", 3);
  if (errorTitulo) return errorTitulo;

  const tipoMaterial = texto(data.tipoMaterial);
  if (!tipoMaterial) {
    return { message: "Selecciona el tipo de material." };
  }

  if (!TIPOS_MATERIAL_VALIDOS.includes(tipoMaterial)) {
    return { message: "Selecciona un tipo de material válido." };
  }

  const errorUrl = validarUrlOpcional(data.enlaceMaterial);
  if (errorUrl) return errorUrl;

  try {
    await prisma.materialCapacitacion.create({
      data: {
        idCursoCapacitacion: idCurso,
        idUnidadContenido: idUnidad,
        titulo: data.titulo.trim(),
        tipoMaterial,
        enlaceMaterial: texto(data.enlaceMaterial) || null,
        estado: "ACTIVO",
      },
    });
    await logGRDAction({
      userId: session.userId,
      action: "CREAR",
      entity: "Material",
      entityId: idCurso,
      entityName: data.titulo.trim(),
      module: "Capacitaciones",
    });
  } catch (err) {
    return fail(err, "No se pudo agregar el material.");
  }
  revalidatePath(REVALIDATE);
}

export async function inscribirParticipante(idCurso: string, participante: ParticipanteData) {
  const session = await verifySession();
  try {
    await makeCursoUseCases().inscribir.execute(idCurso, participante);
  } catch (err) {
    return fail(err, "No se pudo inscribir al participante.");
  }
  await logGRDAction({
    userId: session.userId,
    action: "CREAR",
    entity: "Inscripción",
    entityId: idCurso,
    entityName: `${participante.nombres} ${participante.apellidos ?? ""}`.trim(),
    module: "Capacitaciones",
  });
  revalidatePath(REVALIDATE);
}

export async function inscribirme(idCurso: string): Promise<void | { message: string }> {
  const session = await verifySession();
  const errorCurso = validarId(idCurso, "No se encontró el curso.");
  if (errorCurso) return errorCurso;

  if (!texto(session.email)) {
    return { message: "Tu usuario no tiene correo asociado para registrar la inscripción." };
  }

  const nombreSesion = texto(session.name);
  if (!nombreSesion) {
    return { message: "Tu usuario no tiene nombre asociado para registrar la inscripción." };
  }  
  try {
    const curso = await prisma.cursoCapacitacion.findUnique({
      where: { idCursoCapacitacion: idCurso },
      select: { estadoCurso: true },
    });
    if (!curso) return { message: "Curso no encontrado." };
    if (curso.estadoCurso !== "PUBLICADO")
      return { message: "El curso no está disponible para inscripción." };

    let participante = await prisma.participante.findFirst({
      where: { correo: session.email },
      select: { idParticipante: true },
    });
    if (!participante) {
      const parts = nombreSesion.split(/\s+/);
      const mid = Math.ceil(parts.length / 2);
      participante = await prisma.participante.create({
        data: {
          nombres: parts.slice(0, mid).join(" "),
          apellidos: parts.slice(mid).join(" ") || undefined,
          correo: session.email.trim(),
        },
        select: { idParticipante: true },
      });
    }

    const exists = await prisma.inscripcionCurso.findUnique({
      where: {
        idCursoCapacitacion_idParticipante: {
          idCursoCapacitacion: idCurso,
          idParticipante: participante.idParticipante,
        },
      },
    });
    if (exists) return { message: "Ya estás inscrito en este curso." };

    await prisma.inscripcionCurso.create({
      data: { idCursoCapacitacion: idCurso, idParticipante: participante.idParticipante },
    });
    await logGRDAction({
      userId: session.userId,
      action: "CREAR",
      entity: "Inscripción",
      entityId: idCurso,
      entityName: nombreSesion,
      module: "Capacitaciones",
    });
  } catch (err) {
    return fail(err, "No se pudo completar la inscripción.");
  }
  revalidatePath(REVALIDATE);
}

async function nombreDeInscripcion(idInscripcion: string): Promise<string> {
  const ins = await prisma.inscripcionCurso.findUnique({
    where: { idInscripcionCurso: idInscripcion },
    select: {
      curso: { select: { nombreCurso: true } },
      participante: { select: { nombres: true, apellidos: true } },
    },
  });
  if (!ins) return idInscripcion;
  const p = `${ins.participante?.nombres ?? ""} ${ins.participante?.apellidos ?? ""}`.trim();
  return `${ins.curso?.nombreCurso ?? ""} — ${p}`;
}

export async function registrarEvaluacion(
  idInscripcion: string,
  nota: number,
  opts?: { tipoEvaluacion?: string; numeroIntento?: number }
) {
  const session = await verifySession();
  const errorInscripcion = validarId(idInscripcion, "No se encontró la inscripción.");
  if (errorInscripcion) return errorInscripcion;

  if (!Number.isFinite(nota)) {
    return { message: "La nota debe ser un número válido." };
  }

  if (nota < 0 || nota > 20) {
    return { message: "La nota debe estar entre 0 y 20." };
  }

  if (opts?.numeroIntento != null) {
    if (!Number.isInteger(opts.numeroIntento) || opts.numeroIntento <= 0) {
      return { message: "El número de intento debe ser un entero positivo." };
    }
  }

  if (opts?.tipoEvaluacion && !TIPOS_EVALUACION_VALIDOS.includes(opts.tipoEvaluacion)) {
    return { message: "Selecciona un tipo de evaluación válido." };
  }  
  try {
    const r = await makeCursoUseCases().evaluar.execute(idInscripcion, nota, opts);
    const nombre = await nombreDeInscripcion(idInscripcion);
    await logGRDAction({
      userId: session.userId,
      action: "EDITAR",
      entity: "Evaluación",
      entityId: idInscripcion,
      entityName: nombre,
      module: "Capacitaciones",
      field: "Nota",
      newValue: nota.toString(),
    });
    revalidatePath(REVALIDATE);
    return { message: `Evaluación registrada: ${r.resultado}.` };
  } catch (err) {
    return fail(err, "No se pudo registrar la evaluación.");
  }
}

export async function certificarParticipante(idInscripcion: string, constanciaUrl?: string) {
  const session = await verifySession();
  const nombre = await nombreDeInscripcion(idInscripcion);
  try {
    await makeCursoUseCases().certificar.execute(idInscripcion, constanciaUrl);
  } catch (err) {
    return fail(err, "No se pudo certificar.");
  }
  await logGRDAction({
    userId: session.userId,
    action: "EDITAR",
    entity: "Certificación",
    entityId: idInscripcion,
    entityName: nombre,
    module: "Capacitaciones",
    field: "Estado",
    newValue: "CERTIFICADO",
  });
  revalidatePath(REVALIDATE);
}
