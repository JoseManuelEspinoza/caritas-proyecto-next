"use server";

import { revalidatePath } from "next/cache";
import { verifySession } from "@/app/lib/dal";
import { getUsuarioGRDId } from "@/app/lib/usuario-grd";
import { makeCursoUseCases } from "@/core/infrastructure/factories/makeCursoUseCases";
import { DomainError } from "@/core/domain/errors/DomainError";
import { logGRDAction } from "@/app/lib/audit";
import { prisma } from "@/app/lib/prisma";
import { TIPOS_MATERIAL as TIPOS_MATERIAL_VALIDOS } from "@/app/lib/capacitaciones-tipos";
import type { ParticipanteData } from "@/core/domain/repositories/ICursoRepository";
import { sendCertificadoEmail } from "@/app/lib/email";
import { notificarRoles, notificarUsuario, notificarPorEmail } from "@/app/lib/notificaciones";

const REVALIDATE = "/capacitaciones";

// Fire-and-forget: envía constancia por email al participante tras certificación.
function notificarCertificado(idInscripcion: string) {
  prisma.inscripcionCurso
    .findUnique({
      where: { idInscripcionCurso: idInscripcion },
      select: {
        participante: { select: { nombres: true, apellidos: true, correo: true } },
        curso: { select: { nombreCurso: true, codigoCurso: true } },
        certificacion: { select: { fechaCertificacion: true, idCertificacionCurso: true } },
        evaluaciones: {
          orderBy: { fechaEvaluacion: "desc" },
          take: 1,
          select: { nota: true },
        },
      },
    })
    .then(async (ins) => {
      if (!ins || !ins.certificacion || !ins.participante.correo) return;
      const constanciaData = {
        nombreParticipante: `${ins.participante.nombres} ${ins.participante.apellidos ?? ""}`.trim(),
        nombreCurso: ins.curso.nombreCurso,
        codigoCurso: ins.curso.codigoCurso,
        fechaCertificacion: ins.certificacion.fechaCertificacion?.toISOString() ?? null,
        idCertificacion: ins.certificacion.idCertificacionCurso,
        nota: ins.evaluaciones[0]?.nota != null ? Number(ins.evaluaciones[0].nota) : null,
      };
      await sendCertificadoEmail(
        ins.participante.correo,
        ins.participante.nombres,
        constanciaData
      );
    })
    .catch((e) => console.error("[Capacitaciones] Error enviando constancia por email:", e));
}

function fail(err: unknown, fallback: string) {
  if (err instanceof DomainError) return { message: err.message };
  console.error("[Capacitaciones] Error inesperado:", err);
  return { message: fallback };
}

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

  // Rutas internas del proxy S3 siempre son válidas
  if (limpio.startsWith("/api/")) return null;

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
  descripcion: string | null;
  materiales: Material[];
};

export type CursoDetalle = {
  id: string;
  codigoCurso: string | null;
  nombreCurso: string;
  descripcion: string | null;
  duracionEstimadaHoras: number | null;
  modalidadGeneral: string;
  estadoCurso: string;
  fechaPublicacion: string | null;
  fechaCierre: string | null;
  inscripcion_desde: string | null;
  inscripcion_hasta: string | null;
  duracionRealizacionDias: number | null;
  responsable: string;
  idResponsable: string;
  totalInscritos: number;
  sesiones: Sesion[];

  // Compatibilidad con la UI actual, que usa curso.cuestionario
  cuestionario?: {
    id: string;
    titulo: string;
    totalPreguntas: number;
    notaAprobatoria: number;
    maxIntentos: number;
    estado: string;
  } | null;

  // Compatibilidad con la UI que ya estaba preparada para inicial/final
  cuestionarioInicial?: {
    id: string;
    titulo: string;
    totalPreguntas: number;
    notaAprobatoria: number;
    maxIntentos: number;
    estado: string;
  } | null;

  cuestionarioFinal?: {
    id: string;
    titulo: string;
    totalPreguntas: number;
    notaAprobatoria: number;
    maxIntentos: number;
    estado: string;
  } | null;
};

export type CursoInscrito = {
  id: string;
  codigoCurso: string | null;
  nombreCurso: string;
  descripcion: string | null;
  duracionEstimadaHoras: number | null;
  modalidadGeneral: string;
  estadoCurso: string;
  fechaPublicacion: string | null;
  fechaCierre: string | null;
  responsable: string;
  idInscripcion: string;
  estadoInscripcion: string;
  fechaInscripcion: string;
  duracionRealizacionDias: number | null;
  fechaLimiteRealizacion: string | null;
  diasRestantesRealizacion: number | null;
  evalInicial: number | null;
  evalFinal: number | null;
  resultado: string | null;
  certificado: boolean;
  constanciaUrl: string | null;
  sesiones: Sesion[];

  // Compatibilidad con la UI actual del brigadista
  cuestionario?: {
    id: string;
    titulo: string;
    notaAprobatoria: number;
    maxIntentos: number;
    totalPreguntas: number;
    intentosUsados: number;
  } | null;

  // Compatibilidad futura/inicial-final
  cuestionarioInicial?: {
    id: string;
    titulo: string;
    notaAprobatoria: number;
    maxIntentos: number;
    tiempoLimiteMinutos: number | null;
    totalPreguntas: number;
    intentosUsados: number;
  } | null;

  cuestionarioFinal?: {
    id: string;
    titulo: string;
    notaAprobatoria: number;
    maxIntentos: number;
    tiempoLimiteMinutos: number | null;
    totalPreguntas: number;
    intentosUsados: number;
  } | null;
};

export type CursoDisponible = {
  id: string;
  codigoCurso: string | null;
  nombreCurso: string;
  descripcion: string | null;
  duracionEstimadaHoras: number | null;
  modalidadGeneral: string;
  fechaPublicacion: string | null;
  fechaCierre: string | null;
  responsable: string;
  totalInscritos: number;
  totalSesiones: number;
  unidades: { id: string; numeroOrden: number; tituloUnidad: string; descripcion: string | null }[];
};

// ── Read actions ──────────────────────────────────────────────────────────────

export async function listarInscripciones(idCurso: string) {
  await verifySession();
  return makeCursoUseCases().listarInscripciones.execute(idCurso);
}

export type ParticipanteCurso = {
  idInscripcion: string;
  nombre: string;
  documento: string | null;
  correo: string | null;
  estadoInscripcion: string;
  fechaInscripcion: string;
  ultimaActividad: string | null;
  notaInicial: number | null;
  nota: number | null;
  resultado: string | null;
  certificado: boolean;
  constanciaUrl: string | null;
  intentosInicial: number;
  intentosFinal: number;
};

export async function listarParticipantesCurso(idCurso: string): Promise<ParticipanteCurso[]> {
  await verifySession();
  const rows = await prisma.inscripcionCurso.findMany({
    where: { idCursoCapacitacion: idCurso },
    orderBy: { fechaInscripcion: "asc" },
    include: {
      participante: { select: { nombres: true, apellidos: true, tipoDocumento: true, numeroDocumento: true, correo: true } },
      evaluaciones: {
        orderBy: { fechaEvaluacion: "desc" },
        select: { nota: true, resultado: true, tipoEvaluacion: true, fechaEvaluacion: true },
      },
      certificacion: { select: { idCertificacionCurso: true, constanciaUrl: true } },
    },
  });
  return rows.map((r) => {
    const evalFinal = r.evaluaciones.find((e) => e.tipoEvaluacion === "FINAL" || e.tipoEvaluacion == null);
    const evalInicial = r.evaluaciones.find((e) => e.tipoEvaluacion === "INICIAL");
    return {
      idInscripcion: r.idInscripcionCurso,
      nombre: `${r.participante.nombres} ${r.participante.apellidos ?? ""}`.trim(),
      documento: r.participante.numeroDocumento ?? null,
      correo: r.participante.correo ?? null,
      estadoInscripcion: r.estadoInscripcion,
      fechaInscripcion: r.fechaInscripcion.toISOString(),
      notaInicial: evalInicial?.nota != null ? Number(evalInicial.nota) : null,
      ultimaActividad: (() => {
        const fechas = [
          r.evaluaciones[0]?.fechaEvaluacion,
          r.fechaFinalizacionContenido,
        ].filter((f): f is Date => f instanceof Date);
        if (fechas.length === 0) return null;
        return new Date(Math.max(...fechas.map((f) => f.getTime()))).toISOString();
      })(),
      nota: evalFinal?.nota != null ? Number(evalFinal.nota) : null,
      resultado: evalFinal?.resultado ?? null,
      certificado: r.certificacion !== null,
      constanciaUrl: r.certificacion?.constanciaUrl ?? null,
      intentosInicial: r.evaluaciones.filter((e) => e.tipoEvaluacion === "INICIAL").length,
      intentosFinal: r.evaluaciones.filter((e) => e.tipoEvaluacion === "FINAL" || e.tipoEvaluacion == null).length,
    };
  });
}

export async function reiniciarIntentos(
  idInscripcion: string,
  tipo: "INICIAL" | "FINAL"
): Promise<void | { message: string }> {
  const session = await verifySession();
  if (!["ADMIN", "ESPECIALISTAGRD"].includes(session.role))
    return { message: "Sin permiso para reiniciar intentos." };
  try {
    const ultimo = await prisma.evaluacionCurso.findFirst({
      where: tipo === "INICIAL"
        ? { idInscripcionCurso: idInscripcion, tipoEvaluacion: "INICIAL", resultado: { not: null } }
        : { idInscripcionCurso: idInscripcion, OR: [{ tipoEvaluacion: "FINAL" }, { tipoEvaluacion: null }], resultado: { not: null } },
      orderBy: { fechaEvaluacion: "desc" },
      select: { idEvaluacionCurso: true },
    });
    if (!ultimo) return { message: "No hay intentos registrados para este examen." };
    await prisma.respuestaEvaluacion.deleteMany({ where: { idEvaluacionCurso: ultimo.idEvaluacionCurso } });
    await prisma.evaluacionCurso.delete({ where: { idEvaluacionCurso: ultimo.idEvaluacionCurso } });
  } catch (err) {
    return fail(err, "No se pudo otorgar el intento adicional.");
  }
  await logGRDAction({
    userId: session.userId,
    action: "EDITAR",
    entity: "EvaluacionCurso",
    entityId: idInscripcion,
    entityName: `Intento adicional ${tipo}`,
    module: "Capacitaciones",
    notes: `Se otorgó 1 intento adicional de evaluación ${tipo} para inscripción ${idInscripcion}`,
  });
  revalidatePath(REVALIDATE);
}

export type IntentoEvaluacion = {
  idEvaluacion: string;
  tipoEvaluacion: string | null;
  numeroIntento: number | null;
  nota: number | null;
  resultado: string | null;
  fechaEvaluacion: string;
};

export type DetalleEvaluacion = {
  idEvaluacion: string;
  tipoEvaluacion: string | null;
  numeroIntento: number | null;
  nota: number | null;
  puntajeObtenido: number | null;
  puntajeTotal: number | null;
  resultado: string | null;
  fechaEvaluacion: string;
  preguntas: {
    idPregunta: string;
    enunciado: string;
    puntaje: number;
    orden: number;
    opciones: { id: string; texto: string; esCorrecta: boolean }[];
    respuesta: {
      idOpcionSeleccionada: string | null;
      textoOpcionSeleccionada: string | null;
      esCorrecta: boolean | null;
      puntajeObtenido: number | null;
    } | null;
  }[];
};

export async function listarIntentosInscripcion(idInscripcion: string): Promise<IntentoEvaluacion[]> {
  await verifySession();
  const rows = await prisma.evaluacionCurso.findMany({
    where: { idInscripcionCurso: idInscripcion },
    orderBy: [{ tipoEvaluacion: "asc" }, { fechaEvaluacion: "asc" }],
    select: {
      idEvaluacionCurso: true,
      tipoEvaluacion: true,
      nota: true,
      resultado: true,
      fechaEvaluacion: true,
    },
  });
  const contadores: Record<string, number> = {};
  return rows.map((r) => {
    const key = r.tipoEvaluacion ?? "FINAL";
    contadores[key] = (contadores[key] ?? 0) + 1;
    return {
      idEvaluacion: r.idEvaluacionCurso,
      tipoEvaluacion: r.tipoEvaluacion,
      numeroIntento: contadores[key],
      nota: r.nota != null ? Number(r.nota) : null,
      resultado: r.resultado,
      fechaEvaluacion: r.fechaEvaluacion ? r.fechaEvaluacion.toISOString() : new Date().toISOString(),
    };
  });
}

export async function listarDetalleEvaluacion(idEvaluacion: string): Promise<DetalleEvaluacion | null> {
  await verifySession();
  const row = await prisma.evaluacionCurso.findUnique({
    where: { idEvaluacionCurso: idEvaluacion },
    include: {
      respuestas: {
        include: {
          pregunta: {
            include: {
              opciones: { orderBy: { orden: "asc" } },
            },
          },
          opcion: true,
        },
        orderBy: { pregunta: { orden: "asc" } },
      },
    },
  });
  if (!row) return null;
  return {
    idEvaluacion: row.idEvaluacionCurso,
    tipoEvaluacion: row.tipoEvaluacion,
    numeroIntento: row.numeroIntento,
    nota: row.nota != null ? Number(row.nota) : null,
    puntajeObtenido: row.puntajeObtenido != null ? Number(row.puntajeObtenido) : null,
    puntajeTotal: row.puntajeTotal != null ? Number(row.puntajeTotal) : null,
    resultado: row.resultado,
    fechaEvaluacion: row.fechaEvaluacion ? row.fechaEvaluacion.toISOString() : new Date().toISOString(),
    preguntas: row.respuestas.map((r) => ({
      idPregunta: r.idPreguntaCuestionario,
      enunciado: r.pregunta.enunciado,
      puntaje: Number(r.pregunta.puntaje),
      orden: r.pregunta.orden,
      opciones: r.pregunta.opciones.map((o) => ({
        id: o.idOpcionPregunta,
        texto: o.textoOpcion,
        esCorrecta: o.esCorrecta,
      })),
      respuesta: {
        idOpcionSeleccionada: r.idOpcionPregunta,
        textoOpcionSeleccionada: r.opcion?.textoOpcion ?? null,
        esCorrecta: r.esCorrecta,
        puntajeObtenido: r.puntajeObtenido != null ? Number(r.puntajeObtenido) : null,
      },
    })),
  };
}

export async function actualizarConstancia(
  idInscripcion: string,
  constanciaUrl: string
): Promise<void | { message: string }> {
  await verifySession();
  if (!constanciaUrl.trim()) return { message: "La URL de la constancia es obligatoria." };
  try {
    await prisma.certificacionCurso.update({
      where: { idInscripcionCurso: idInscripcion },
      data: { constanciaUrl: constanciaUrl.trim() },
    });
  } catch (err) {
    return fail(err, "No se pudo actualizar la constancia.");
  }
  revalidatePath(REVALIDATE);
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

  // Intentar obtener cuestionarios; si la tabla aún no existe en la BD, continuar sin ellos.
  type CuestionarioRow = { idCursoCapacitacion: string; idCuestionarioCurso: string; titulo: string; notaAprobatoria: unknown; tipoCuestionario: string; estado: string; maxIntentos: number; _count: { preguntas: number } };
  let inicialesPorCurso: Record<string, CuestionarioRow> = {};
  let finalesPorCurso: Record<string, CuestionarioRow> = {};
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cuestionarios = await (prisma as any).cuestionarioCurso.findMany({
      where: { estado: "ACTIVO" },
      include: { _count: { select: { preguntas: true } } },
    });
    for (const c of cuestionarios as CuestionarioRow[]) {
      if (c.tipoCuestionario === "INICIAL") {
        if (!inicialesPorCurso[c.idCursoCapacitacion]) inicialesPorCurso[c.idCursoCapacitacion] = c;
      } else {
        if (!finalesPorCurso[c.idCursoCapacitacion]) finalesPorCurso[c.idCursoCapacitacion] = c;
      }
    }
  } catch {
    // La tabla cuestionario_curso todavía no existe en la BD — se muestra sin cuestionario.
  }

  const mapCuestionario = (c: CuestionarioRow | undefined) => c ? {
    id: c.idCuestionarioCurso,
    titulo: c.titulo,
    totalPreguntas: c._count.preguntas,
    notaAprobatoria: Number(c.notaAprobatoria),
    maxIntentos: c.maxIntentos ?? 1,
    estado: c.estado,
  } : null;

  return rows.map((r) => ({
    id: r.idCursoCapacitacion,
    codigoCurso: r.codigoCurso,
    nombreCurso: r.nombreCurso,
    descripcion: r.descripcion,
    modalidadGeneral: r.modalidadGeneral,
    estadoCurso: r.estadoCurso,
    fechaPublicacion: r.fechaPublicacion?.toISOString() ?? null,
    fechaCierre: r.fechaCierre?.toISOString() ?? null,
    inscripcion_desde: r.inscripcion_desde?.toISOString() ?? null,
    inscripcion_hasta: r.inscripcion_hasta?.toISOString() ?? null,
    duracionRealizacionDias: r.duracionRealizacionDias ?? null,
    responsable: `${r.usuarioResponsable.nombres} ${r.usuarioResponsable.apellidos}`.trim(),
    idResponsable: r.idUsuarioResponsableGRD,
    totalInscritos: r._count.inscripciones,
    duracionEstimadaHoras: r.duracionEstimadaHoras ?? null,
    sesiones: r.unidades.map((u) => ({
      id: u.idUnidadContenido,
      numeroOrden: u.numeroOrden,
      tituloUnidad: u.tituloUnidad,
      descripcion: u.descripcion,
      materiales: u.materiales.map((m) => ({
        id: m.idMaterialCapacitacion,
        titulo: m.titulo,
        tipoMaterial: m.tipoMaterial,
        enlaceMaterial: m.enlaceMaterial,
      })),
    })),
    cuestionarioInicial: mapCuestionario(inicialesPorCurso[r.idCursoCapacitacion]),
    cuestionarioFinal: mapCuestionario(finalesPorCurso[r.idCursoCapacitacion]),
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
      // Selección explícita para evitar columnas que aún no existen en AWS (idCuestionarioCurso)
      evaluaciones: {
        orderBy: { fechaEvaluacion: "asc" },
        select: {
          idEvaluacionCurso: true,
          tipoEvaluacion: true,
          numeroIntento: true,
          nota: true,
          resultado: true,
          observacion: true,
          fechaEvaluacion: true,
          idInscripcionCurso: true,
        },
      },
      certificacion: { select: { idCertificacionCurso: true, constanciaUrl: true } },
    },
  });

  // Cuestionarios en tabla separada — puede no existir aún en AWS
  type CuestionarioRow = { idCursoCapacitacion: string; idCuestionarioCurso: string; titulo: string; notaAprobatoria: unknown; maxIntentos: number; tiempoLimiteMinutos: number | null; tipoCuestionario: string; estado: string; _count: { preguntas: number } };
  let inicialesPorCurso: Record<string, CuestionarioRow> = {};
  let finalesPorCurso: Record<string, CuestionarioRow> = {};
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cuestionarios = await (prisma as any).cuestionarioCurso.findMany({
      where: { estado: "ACTIVO" },
      include: { _count: { select: { preguntas: true } } },
    });
    for (const c of cuestionarios as CuestionarioRow[]) {
      if (c.tipoCuestionario === "INICIAL") {
        if (!inicialesPorCurso[c.idCursoCapacitacion]) inicialesPorCurso[c.idCursoCapacitacion] = c;
      } else {
        if (!finalesPorCurso[c.idCursoCapacitacion]) finalesPorCurso[c.idCursoCapacitacion] = c;
      }
    }
  } catch {
    // La tabla cuestionario_curso todavía no existe en la BD.
  }

  // Migración lazy: certificar aprobados sin certificación, y completar URL faltante
  for (const i of inscripciones) {
    const evals = i.evaluaciones;
    // Usar tipos explícitos para evitar que evaluaciones con tipoEvaluacion=null cuenten como final
    const finalAprobado = evals.some((e) =>
      e.resultado === "APROBADO" &&
      (e.tipoEvaluacion === "FINAL" || e.tipoEvaluacion === "UNICO")
    );
    const inicialAprobado = evals.some((e) => e.resultado === "APROBADO" && e.tipoEvaluacion === "INICIAL");
    // Verificar si el CURSO tiene examen inicial, no si el alumno lo rindió
    const tieneExamenInicial = !!inicialesPorCurso[i.curso.idCursoCapacitacion];
    const aprobado = finalAprobado && (!tieneExamenInicial || inicialAprobado);
    const constanciaUrl = `/capacitaciones/constancia/${i.idInscripcionCurso}`;
    if (aprobado && i.certificacion === null) {
      try {
        await makeCursoUseCases().certificar.execute(i.idInscripcionCurso, constanciaUrl);
        i.certificacion = { idCertificacionCurso: "pending", constanciaUrl };
      } catch {
        // Ignorar si falla
      }
    } else if (aprobado && i.certificacion !== null && !i.certificacion.constanciaUrl) {
      try {
        await makeCursoUseCases().certificar.execute(i.idInscripcionCurso, constanciaUrl);
        i.certificacion = { ...i.certificacion, constanciaUrl };
      } catch {
        // Ignorar si falla
      }
    }
  }

  return inscripciones.map((i) => {
    const evals = i.evaluaciones;
    const cInicial = inicialesPorCurso[i.curso.idCursoCapacitacion];
    const cFinal = finalesPorCurso[i.curso.idCursoCapacitacion];
    const evalsInicial = evals.filter((e) => e.tipoEvaluacion === "INICIAL");
    const evalsFinal = evals.filter((e) => e.tipoEvaluacion === "FINAL" || e.tipoEvaluacion == null);
    const evalsAll = evals;
    return {
      id: i.curso.idCursoCapacitacion,
      codigoCurso: i.curso.codigoCurso,
      nombreCurso: i.curso.nombreCurso,
      descripcion: i.curso.descripcion,
      duracionEstimadaHoras: i.curso.duracionEstimadaHoras ?? null,
      modalidadGeneral: i.curso.modalidadGeneral,
      estadoCurso: i.curso.estadoCurso,
      fechaPublicacion: i.curso.fechaPublicacion?.toISOString() ?? null,
      fechaCierre: i.curso.fechaCierre?.toISOString() ?? null,
      responsable: `${i.curso.usuarioResponsable.nombres} ${i.curso.usuarioResponsable.apellidos}`.trim(),
      idInscripcion: i.idInscripcionCurso,
      estadoInscripcion: i.estadoInscripcion,
      fechaInscripcion: i.fechaInscripcion.toISOString(),
      duracionRealizacionDias: i.curso.duracionRealizacionDias ?? null,
      fechaLimiteRealizacion: i.curso.duracionRealizacionDias
        ? new Date(i.fechaInscripcion.getTime() + i.curso.duracionRealizacionDias * 86_400_000).toISOString()
        : null,
      diasRestantesRealizacion: i.curso.duracionRealizacionDias
        ? Math.ceil(
            (i.fechaInscripcion.getTime() + i.curso.duracionRealizacionDias * 86_400_000 - Date.now()) / 86_400_000
          )
        : null,
      evalInicial: evalsInicial.length > 0 && evalsInicial[evalsInicial.length - 1].nota != null
        ? Number(evalsInicial[evalsInicial.length - 1].nota)
        : null,
      evalFinal: evalsFinal.length > 0 && evalsFinal[evalsFinal.length - 1].nota != null
        ? Number(evalsFinal[evalsFinal.length - 1].nota)
        : null,
      resultado: evalsAll.length > 0 ? (evalsAll[evalsAll.length - 1].resultado ?? null) : null,
      certificado: i.certificacion !== null,
      constanciaUrl: i.certificacion?.constanciaUrl ?? null,
      cuestionarioInicial: cInicial ? {
        id: cInicial.idCuestionarioCurso,
        titulo: cInicial.titulo,
        notaAprobatoria: Number(cInicial.notaAprobatoria),
        maxIntentos: cInicial.maxIntentos,
        tiempoLimiteMinutos: cInicial.tiempoLimiteMinutos ?? null,
        totalPreguntas: cInicial._count.preguntas,
        intentosUsados: evalsInicial.length,
      } : null,
      cuestionarioFinal: cFinal ? {
        id: cFinal.idCuestionarioCurso,
        titulo: cFinal.titulo,
        notaAprobatoria: Number(cFinal.notaAprobatoria),
        maxIntentos: cFinal.maxIntentos,
        tiempoLimiteMinutos: cFinal.tiempoLimiteMinutos ?? null,
        totalPreguntas: cFinal._count.preguntas,
        intentosUsados: evalsFinal.length,
      } : null,
      sesiones: i.curso.unidades.map((u) => ({
        id: u.idUnidadContenido,
        numeroOrden: u.numeroOrden,
        tituloUnidad: u.tituloUnidad,
        descripcion: u.descripcion,
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

  const ahora = new Date();
  const rows = await prisma.cursoCapacitacion.findMany({
    where: {
      estadoCurso: "PUBLICADO",
      OR: [{ inscripcion_desde: null }, { inscripcion_desde: { lte: ahora } }],
      AND: [{ OR: [{ inscripcion_hasta: null }, { inscripcion_hasta: { gte: ahora } }] }],
      ...(enrolledIds.length > 0 ? { idCursoCapacitacion: { notIn: enrolledIds } } : {}),
    },
    orderBy: { fechaCreacion: "desc" },
    include: {
      usuarioResponsable: { select: { nombres: true, apellidos: true } },
      _count: { select: { inscripciones: true, unidades: true } },
      unidades: {
        where: { estado: "ACTIVO" },
        orderBy: { numeroOrden: "asc" },
        select: {
          idUnidadContenido: true,
          numeroOrden: true,
          tituloUnidad: true,
          descripcion: true,
        },
      },
    },
  });

  return rows.map((r) => ({
    id: r.idCursoCapacitacion,
    codigoCurso: r.codigoCurso,
    nombreCurso: r.nombreCurso,
    descripcion: r.descripcion,
    duracionEstimadaHoras: r.duracionEstimadaHoras ?? null,
    modalidadGeneral: r.modalidadGeneral,
    fechaPublicacion: r.fechaPublicacion?.toISOString() ?? null,
    fechaCierre: r.fechaCierre?.toISOString() ?? null,
    responsable: `${r.usuarioResponsable.nombres} ${r.usuarioResponsable.apellidos}`.trim(),
    totalInscritos: r._count.inscripciones,
    totalSesiones: r._count.unidades,
    unidades: r.unidades.map((u) => ({
      id: u.idUnidadContenido,
      numeroOrden: u.numeroOrden,
      tituloUnidad: u.tituloUnidad,
      descripcion: u.descripcion,
    })),
  }));
}

// ── Mutation actions ──────────────────────────────────────────────────────────

/** Valida el rango de inscripción: no puede iniciar en el pasado ni terminar antes de empezar. */
function validarRangoInscripcion(desde?: string | null, hasta?: string | null): { message: string } | null {
  if (!desde && !hasta) return null;
  const d = new Date();
  const hoy = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  if (desde) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(desde)) return { message: "La fecha de inicio de inscripción no es válida." };
    if (desde < hoy) return { message: "La fecha de inicio de inscripción no puede ser anterior a hoy." };
  }
  if (hasta) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(hasta)) return { message: "La fecha de fin de inscripción no es válida." };
    if (hasta < hoy) return { message: "La fecha de fin de inscripción no puede ser anterior a hoy." };
    if (desde && hasta < desde)
      return { message: "La fecha de fin de inscripción no puede ser anterior a la fecha de inicio." };
  }
  return null;
}

export async function crearCurso(input: {
  nombreCurso: string;
  descripcion?: string;
  idInstitucionAliada?: string;
  duracionEstimadaHoras?: number;
  idResponsable?: string;
  inscripcion_desde?: string;
  inscripcion_hasta?: string;
  duracionRealizacionDias?: number;
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

  const errorInscripcion = validarRangoInscripcion(input.inscripcion_desde, input.inscripcion_hasta);
  if (errorInscripcion) return errorInscripcion;

  if (input.duracionRealizacionDias != null && (!Number.isInteger(input.duracionRealizacionDias) || input.duracionRealizacionDias < 1))
    return { message: "Los días para completar el curso deben ser un número entero mayor a 0." };

  const duracionRecibida = input.duracionEstimadaHoras;
  const duracionNormalizada =
    duracionRecibida == null || duracionRecibida === 0 ? undefined : duracionRecibida;

  const errorDuracion = validarEnteroPositivo(duracionNormalizada, "La duración estimada");
  if (errorDuracion) return errorDuracion;
  const { idResponsable, inscripcion_desde, inscripcion_hasta, duracionRealizacionDias, ...rest } = input;
  const idUsuarioResponsableGRD = idResponsable ?? (await getUsuarioGRDId());
  if (!idUsuarioResponsableGRD) return { message: "Tu usuario no tiene perfil GRD asociado." };
  let nuevoCursoId: string;
  try {
    const creado = await makeCursoUseCases().crear.execute({
      ...rest,
      nombreCurso: input.nombreCurso.trim(),
      descripcion: texto(input.descripcion) || undefined,
      duracionEstimadaHoras: duracionNormalizada,
      idUsuarioResponsableGRD,
    });
    nuevoCursoId = creado.id;
    if (inscripcion_desde || inscripcion_hasta || duracionRealizacionDias) {
      await prisma.cursoCapacitacion.update({
        where: { idCursoCapacitacion: nuevoCursoId },
        data: {
          inscripcion_desde: inscripcion_desde ? new Date(inscripcion_desde) : undefined,
          inscripcion_hasta: inscripcion_hasta ? new Date(inscripcion_hasta) : undefined,
          duracionRealizacionDias: duracionRealizacionDias ?? undefined,
        },
      });
    }
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
  return { id: nuevoCursoId };
}

export async function editarCurso(
  id: string,
  data: {
    nombreCurso: string;
    descripcion?: string;
    idResponsable: string;
    inscripcion_desde?: string | null;
    inscripcion_hasta?: string | null;
    duracionRealizacionDias?: number | null;
  }
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

  const errorInscripcion = validarRangoInscripcion(data.inscripcion_desde, data.inscripcion_hasta);
  if (errorInscripcion) return errorInscripcion;

  if (data.duracionRealizacionDias != null && (!Number.isInteger(data.duracionRealizacionDias) || data.duracionRealizacionDias < 1))
    return { message: "Los días para completar el curso deben ser un número entero mayor a 0." };

  try {
    await prisma.cursoCapacitacion.update({
      where: { idCursoCapacitacion: id },
      data: {
        nombreCurso: data.nombreCurso.trim(),
        descripcion: texto(data.descripcion) || null,
        idUsuarioResponsableGRD: data.idResponsable,
        inscripcion_desde: data.inscripcion_desde ? new Date(data.inscripcion_desde) : null,
        inscripcion_hasta: data.inscripcion_hasta ? new Date(data.inscripcion_hasta) : null,
        duracionRealizacionDias: data.duracionRealizacionDias ?? null,
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
  if (accion === "PUBLICAR") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cuestionarioActivo = await (prisma as any).cuestionarioCurso.findFirst({
      where: { idCursoCapacitacion: id, estado: "ACTIVO" },
      select: { idCuestionarioCurso: true },
    }).catch(() => null);
    if (!cuestionarioActivo) {
      return { message: "No puedes publicar un curso sin al menos una evaluación activa. Crea y activa un cuestionario primero." };
    }
  }
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
  if (accion === "PUBLICAR" && curso) {
    notificarRoles(
      ["BRIGADISTA", "ESPECIALISTAGRD"],
      "CAPACITACION_PUBLICADA",
      "Nueva capacitación disponible",
      `Se publicó el curso "${curso.nombreCurso}". Ya puedes inscribirte.`,
      "/capacitaciones"
    );
  }
  revalidatePath(REVALIDATE);
}

export async function crearSesion(
  idCurso: string,
  data: { tituloUnidad: string; descripcion?: string }
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
        descripcion: data.descripcion?.trim() || null,
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

export async function editarSesion(
  idUnidad: string,
  data: { tituloUnidad: string; descripcion?: string }
): Promise<void | { message: string }> {
  await verifySession();
  if (!data.tituloUnidad.trim()) return { message: "El título es obligatorio." };
  try {
    await prisma.unidadContenido.update({
      where: { idUnidadContenido: idUnidad },
      data: {
        tituloUnidad: data.tituloUnidad.trim(),
        ...(data.descripcion !== undefined ? { descripcion: data.descripcion.trim() || null } : {}),
      },
    });
  } catch (err) {
    return fail(err, "No se pudo editar la unidad.");
  }
  revalidatePath(REVALIDATE);
}

export async function eliminarSesion(
  idUnidad: string
): Promise<void | { message: string }> {
  await verifySession();
  try {
    await prisma.materialCapacitacion.deleteMany({ where: { idUnidadContenido: idUnidad } });
    await prisma.unidadContenido.delete({ where: { idUnidadContenido: idUnidad } });
  } catch (err) {
    return fail(err, "No se pudo eliminar la unidad.");
  }
  revalidatePath(REVALIDATE);
}

export async function editarMaterial(
  idMaterial: string,
  data: { titulo: string; tipoMaterial: string; enlaceMaterial: string }
): Promise<void | { message: string }> {
  await verifySession();
  if (!data.titulo.trim()) return { message: "El título del material es obligatorio." };
  const urlErr = validarUrlOpcional(data.enlaceMaterial);
  if (urlErr) return urlErr;
  try {
    await prisma.materialCapacitacion.update({
      where: { idMaterialCapacitacion: idMaterial },
      data: {
        titulo: data.titulo.trim(),
        tipoMaterial: data.tipoMaterial || null,
        enlaceMaterial: data.enlaceMaterial.trim() || null,
      },
    });
  } catch (err) {
    return fail(err, "No se pudo editar el material.");
  }
  revalidatePath(REVALIDATE);
}

export async function moverMaterial(
  idMaterial: string,
  idUnidadDestino: string
): Promise<void | { message: string }> {
  await verifySession();
  try {
    await prisma.materialCapacitacion.update({
      where: { idMaterialCapacitacion: idMaterial },
      data: { idUnidadContenido: idUnidadDestino },
    });
  } catch (err) {
    return fail(err, "No se pudo mover el material.");
  }
  revalidatePath(REVALIDATE);
}

export async function eliminarMaterial(
  idMaterial: string
): Promise<void | { message: string }> {
  await verifySession();
  try {
    await prisma.materialCapacitacion.delete({ where: { idMaterialCapacitacion: idMaterial } });
  } catch (err) {
    return fail(err, "No se pudo eliminar el material.");
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
      select: { estadoCurso: true, nombreCurso: true, idUsuarioResponsableGRD: true, inscripcion_desde: true, inscripcion_hasta: true },
    });
    if (!curso) return { message: "Curso no encontrado." };
    if (curso.estadoCurso !== "PUBLICADO")
      return { message: "El curso no está disponible para inscripción." };
    const hoy = new Date();
    if (curso.inscripcion_desde && hoy < curso.inscripcion_desde)
      return { message: "Las inscripciones aún no han comenzado." };
    if (curso.inscripcion_hasta && hoy > curso.inscripcion_hasta)
      return { message: "El período de inscripción ha finalizado." };

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
    // Notificar al responsable del curso
    if (curso.idUsuarioResponsableGRD) {
      const responsable = await prisma.usuarioGRD.findUnique({
        where: { idUsuarioGRD: curso.idUsuarioResponsableGRD },
        select: { idCredencial: true },
      });
      if (responsable) {
        notificarUsuario(
          responsable.idCredencial,
          "CAPACITACION_INSCRIPCION",
          "Nueva inscripción en tu curso",
          `${nombreSesion} se inscribió en "${curso.nombreCurso}".`,
          "/capacitaciones"
        );
      }
    }
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
    if (r.resultado === "APROBADO" && opts?.tipoEvaluacion !== "INICIAL") {
      try {
        const constanciaUrl = `/capacitaciones/constancia/${idInscripcion}`;
        await makeCursoUseCases().certificar.execute(idInscripcion, constanciaUrl);
        notificarCertificado(idInscripcion);
        revalidatePath("/reportes");
      } catch {
        // Ya certificado o sin evaluación aprobada — no bloquea
      }
    }
    revalidatePath(REVALIDATE);
    return { message: `Evaluación registrada: ${r.resultado}.` };
  } catch (err) {
    return fail(err, "No se pudo registrar la evaluación.");
  }
}

// ── Cuestionario actions ──────────────────────────────────────────────────────

export type OpcionInput = { textoOpcion: string; esCorrecta: boolean };
export type PreguntaInput = {
  enunciado: string;
  tipoPregunta: "OPCION_UNICA" | "VERDADERO_FALSO" | "OPCION_MULTIPLE";
  puntaje: number;
  opciones: OpcionInput[];
};

export type CuestionarioDetalle = {
  id: string;
  titulo: string;
  descripcion: string | null;
  tipoCuestionario: string;
  notaAprobatoria: number;
  maxIntentos: number;
  tiempoLimiteMinutos: number | null;
  estado: string;
  preguntas: {
    id: string;
    enunciado: string;
    tipoPregunta: string;
    puntaje: number;
    orden: number;
    opciones: { id: string; textoOpcion: string; esCorrecta: boolean; orden: number }[];
  }[];
};

export async function obtenerCuestionarioPorId(
  idCuestionario: string
): Promise<CuestionarioDetalle | null> {
  await verifySession();
  const c = await prisma.cuestionarioCurso.findUnique({
    where: { idCuestionarioCurso: idCuestionario },
    include: {
      preguntas: {
        where: { estado: "ACTIVO" },
        orderBy: { orden: "asc" },
        include: {
          opciones: { orderBy: { orden: "asc" } },
        },
      },
    },
  });
  if (!c) return null;
  return {
    id: c.idCuestionarioCurso,
    titulo: c.titulo,
    descripcion: c.descripcion,
    tipoCuestionario: c.tipoCuestionario,
    notaAprobatoria: Number(c.notaAprobatoria),
    maxIntentos: c.maxIntentos,
    tiempoLimiteMinutos: c.tiempoLimiteMinutos ?? null,
    estado: c.estado,
    preguntas: c.preguntas.map((p) => ({
      id: p.idPreguntaCuestionario,
      enunciado: p.enunciado,
      tipoPregunta: p.tipoPregunta,
      puntaje: Number(p.puntaje),
      orden: p.orden,
      opciones: p.opciones.map((o) => ({
        id: o.idOpcionPregunta,
        textoOpcion: o.textoOpcion,
        esCorrecta: o.esCorrecta,
        orden: o.orden,
      })),
    })),
  };
}

export async function obtenerCuestionarioCurso(
  idCurso: string
): Promise<CuestionarioDetalle | null> {
  await verifySession();
  const c = await prisma.cuestionarioCurso.findFirst({
    where: { idCursoCapacitacion: idCurso, estado: "ACTIVO" },
    include: {
      preguntas: {
        where: { estado: "ACTIVO" },
        orderBy: { orden: "asc" },
        include: {
          opciones: { orderBy: { orden: "asc" } },
        },
      },
    },
  });
  if (!c) return null;
  return {
    id: c.idCuestionarioCurso,
    titulo: c.titulo,
    descripcion: c.descripcion,
    tipoCuestionario: c.tipoCuestionario,
    notaAprobatoria: Number(c.notaAprobatoria),
    maxIntentos: c.maxIntentos,
    tiempoLimiteMinutos: c.tiempoLimiteMinutos ?? null,
    estado: c.estado,
    preguntas: c.preguntas.map((p) => ({
      id: p.idPreguntaCuestionario,
      enunciado: p.enunciado,
      tipoPregunta: p.tipoPregunta,
      puntaje: Number(p.puntaje),
      orden: p.orden,
      opciones: p.opciones.map((o) => ({
        id: o.idOpcionPregunta,
        textoOpcion: o.textoOpcion,
        esCorrecta: o.esCorrecta,
        orden: o.orden,
      })),
    })),
  };
}

export async function crearCuestionario(
  idCurso: string,
  data: {
    titulo: string;
    descripcion?: string;
    tipoCuestionario: "INICIAL" | "FINAL";
    notaAprobatoria: number;
    maxIntentos: number;
    tiempoLimiteMinutos?: number | null;
    preguntas: PreguntaInput[];
  }
): Promise<void | { message: string }> {
  const session = await verifySession();
  if (!data.titulo.trim()) return { message: "El título del cuestionario es obligatorio." };
  if (data.preguntas.length === 0) return { message: "Agrega al menos una pregunta." };
  if (data.tiempoLimiteMinutos != null && (!Number.isInteger(data.tiempoLimiteMinutos) || data.tiempoLimiteMinutos < 1))
    return { message: "El tiempo límite debe ser un número entero de minutos mayor a 0." };
  for (const p of data.preguntas) {
    if (!p.enunciado.trim()) return { message: "Todas las preguntas deben tener enunciado." };
    if (p.opciones.length < 2) return { message: "Cada pregunta debe tener al menos 2 opciones." };
    for (const o of p.opciones) {
      if (!o.textoOpcion.trim()) return { message: "Todas las opciones de respuesta deben tener texto." };
    }
    if (!p.opciones.some((o) => o.esCorrecta)) return { message: "Cada pregunta debe tener una opción correcta." };
  }
  const sumaPuntajes = data.preguntas.reduce((s, p) => s + (p.puntaje ?? 0), 0);
  if (sumaPuntajes !== 20) return { message: `La suma de puntajes debe ser exactamente 20 (actual: ${sumaPuntajes}).` };
  try {
    const existing = await prisma.cuestionarioCurso.findFirst({
      where: { idCursoCapacitacion: idCurso, tipoCuestionario: data.tipoCuestionario, estado: "ACTIVO" },
      select: { idCuestionarioCurso: true },
    });
    if (existing) return { message: `Este curso ya tiene un cuestionario ${data.tipoCuestionario === "INICIAL" ? "inicial" : "final"} activo.` };

    await prisma.cuestionarioCurso.create({
      data: {
        idCursoCapacitacion: idCurso,
        titulo: data.titulo.trim(),
        descripcion: data.descripcion?.trim() || null,
        tipoCuestionario: data.tipoCuestionario,
        notaAprobatoria: data.notaAprobatoria,
        maxIntentos: data.maxIntentos,
        tiempoLimiteMinutos: data.tiempoLimiteMinutos ?? null,
        preguntas: {
          create: data.preguntas.map((p, pi) => ({
            enunciado: p.enunciado.trim(),
            tipoPregunta: p.tipoPregunta,
            puntaje: p.puntaje,
            orden: pi + 1,
            opciones: {
              create: p.opciones.map((o, oi) => ({
                textoOpcion: o.textoOpcion.trim(),
                esCorrecta: o.esCorrecta,
                orden: oi + 1,
                estado: "ACTIVO",
              })),
            },
          })),
        },
      },
    });
    await logGRDAction({
      userId: session.userId,
      action: "CREAR",
      entity: "Cuestionario",
      entityId: idCurso,
      entityName: data.titulo,
      module: "Capacitaciones",
    });
  } catch (err) {
    return fail(err, "No se pudo crear el cuestionario.");
  }
  revalidatePath(REVALIDATE);
}

// ─── Anti-plagio: inicio de examen con bloqueo de intento y tiempo límite ──────

export type PreguntaParaRendir = {
  id: string;
  enunciado: string;
  tipoPregunta: string;
  puntaje: number;
  orden: number;
  opciones: { id: string; textoOpcion: string; orden: number }[];
};

export type ExamenParaRendir = {
  idEvaluacion: string;
  idCuestionario: string;
  titulo: string;
  tiempoLimiteMinutos: number | null;
  fechaInicio: string;
  preguntas: PreguntaParaRendir[];
};

/**
 * Inicia (o retoma) un intento de examen. Si ya hay un intento sin enviar,
 * lo retoma en vez de crear uno nuevo (bloquea intentos duplicados en paralelo).
 * Las opciones devueltas nunca incluyen `esCorrecta`, para que el examen no
 * pueda leerse desde la respuesta de red antes de enviarlo.
 */
export async function iniciarExamen(
  idInscripcion: string,
  idCuestionario: string
): Promise<ExamenParaRendir | { message: string }> {
  await verifySession();
  const cuestionario = await prisma.cuestionarioCurso.findUnique({
    where: { idCuestionarioCurso: idCuestionario },
    include: {
      preguntas: {
        where: { estado: "ACTIVO" },
        orderBy: { orden: "asc" },
        include: { opciones: { where: { estado: "ACTIVO" }, orderBy: { orden: "asc" } } },
      },
    },
  });
  if (!cuestionario) return { message: "Cuestionario no encontrado." };

  const limiteMs = cuestionario.tiempoLimiteMinutos ? cuestionario.tiempoLimiteMinutos * 60_000 : null;
  const GRACIA_MS = 60_000;
  const puntajeTotal = cuestionario.preguntas.reduce((s, p) => s + Number(p.puntaje), 0);

  // Transacción serializable: garantiza que si dos peticiones llegan a la vez
  // solo una crea el intento; la otra retoma el ya creado.
  type TxResult =
    | { ok: true; idEvaluacionCurso: string; fechaInicio: Date | null }
    | { ok: false; message: string };

  let txResult: TxResult;
  try {
    txResult = await prisma.$transaction<TxResult>(async (tx) => {
      const enCurso = await tx.evaluacionCurso.findFirst({
        where: { idInscripcionCurso: idInscripcion, idCuestionarioCurso: idCuestionario, resultado: null },
        orderBy: { fechaInicio: "desc" },
        select: { idEvaluacionCurso: true, fechaInicio: true },
      });

      let cerradoPorTiempo = false;
      if (enCurso) {
        if (limiteMs != null && enCurso.fechaInicio &&
            Date.now() - enCurso.fechaInicio.getTime() > limiteMs + GRACIA_MS) {
          await tx.evaluacionCurso.update({
            where: { idEvaluacionCurso: enCurso.idEvaluacionCurso },
            data: {
              resultado: "DESAPROBADO",
              nota: 0,
              puntajeObtenido: 0,
              puntajeTotal,
              porcentajeObtenido: 0,
              fechaEvaluacion: new Date(),
              observacion: "Tiempo agotado: el intento no fue enviado a tiempo.",
            },
          });
          cerradoPorTiempo = true;
        } else {
          // Retomar el intento en curso (reconexión o doble clic)
          return { ok: true, ...enCurso };
        }
      }

      const finalizados = await tx.evaluacionCurso.count({
        where: { idInscripcionCurso: idInscripcion, idCuestionarioCurso: idCuestionario, resultado: { not: null } },
      });

      if (finalizados >= cuestionario.maxIntentos) {
        return {
          ok: false,
          message: cerradoPorTiempo
            ? "Se agotó el tiempo de tu intento anterior y no te quedan intentos disponibles."
            : "Has agotado todos tus intentos.",
        };
      }

      const nueva = await tx.evaluacionCurso.create({
        data: {
          idInscripcionCurso: idInscripcion,
          idCuestionarioCurso: idCuestionario,
          tipoEvaluacion: cuestionario.tipoCuestionario,
          numeroIntento: finalizados + 1,
          fechaInicio: new Date(),
        },
        select: { idEvaluacionCurso: true, fechaInicio: true },
      });

      return { ok: true, ...nueva };
    }, { isolationLevel: "Serializable" });
  } catch (err: unknown) {
    // P2034: fallo de serialización por concurrencia — pedir reintento al usuario
    if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "P2034") {
      return { message: "El servidor estaba procesando otra solicitud. Por favor, intenta nuevamente." };
    }
    throw err;
  }

  if (!txResult.ok) return { message: txResult.message };

  return {
    idEvaluacion: txResult.idEvaluacionCurso,
    idCuestionario: cuestionario.idCuestionarioCurso,
    titulo: cuestionario.titulo,
    tiempoLimiteMinutos: cuestionario.tiempoLimiteMinutos ?? null,
    fechaInicio: txResult.fechaInicio!.toISOString(),
    preguntas: cuestionario.preguntas.map((p) => ({
      id: p.idPreguntaCuestionario,
      enunciado: p.enunciado,
      tipoPregunta: p.tipoPregunta,
      puntaje: Number(p.puntaje),
      orden: p.orden,
      opciones: p.opciones.map((o) => ({ id: o.idOpcionPregunta, textoOpcion: o.textoOpcion, orden: o.orden })),
    })),
  };
}

/** Registra un cambio de pestaña/pérdida de foco durante un examen en curso. */
export async function registrarPerdidaFoco(idEvaluacion: string): Promise<void> {
  await verifySession();
  try {
    await prisma.evaluacionCurso.update({
      where: { idEvaluacionCurso: idEvaluacion },
      data: { cambiosFoco: { increment: 1 } },
    });
  } catch {
    // Best-effort: si el intento ya no existe (fue enviado o venció), se ignora.
  }
}

export async function enviarRespuestasExamen(
  idEvaluacion: string,
  idInscripcion: string,
  idCuestionario: string,
  respuestas: Record<string, string | string[]> // { idPregunta: idOpcion } | { idPregunta: [idOpcion, ...] }
): Promise<
  | { resultado: { nota: number; puntajeObtenido: number; puntajeTotal: number; porcentaje: number; aprobado: boolean } }
  | { message: string }
> {
  await verifySession();
  try {
    const evaluacionEnCurso = await prisma.evaluacionCurso.findUnique({ where: { idEvaluacionCurso: idEvaluacion } });
    if (!evaluacionEnCurso || evaluacionEnCurso.idInscripcionCurso !== idInscripcion || evaluacionEnCurso.idCuestionarioCurso !== idCuestionario)
      return { message: "El intento de examen no es válido. Vuelve a iniciar el examen." };
    if (evaluacionEnCurso.resultado !== null)
      return { message: "Este intento ya fue enviado." };

    const cuestionario = await prisma.cuestionarioCurso.findUnique({
      where: { idCuestionarioCurso: idCuestionario },
      include: {
        preguntas: {
          where: { estado: "ACTIVO" },
          include: { opciones: { where: { estado: "ACTIVO" } } },
        },
      },
    });
    if (!cuestionario) return { message: "Cuestionario no encontrado." };

    // Calcular puntaje
    let puntajeObtenido = 0;
    const puntajeTotal = cuestionario.preguntas.reduce((s, p) => s + Number(p.puntaje), 0);

    const respuestasData = cuestionario.preguntas.map((p) => {
      const respuestaPregunta = respuestas[p.idPreguntaCuestionario];
      let esCorrecta = false;
      let idOpcionSeleccionada: string | null = null;

      if (p.tipoPregunta === "OPCION_MULTIPLE") {
        // Para opción múltiple: el conjunto seleccionado debe coincidir exactamente con el conjunto correcto
        const idsSeleccionados = Array.isArray(respuestaPregunta)
          ? respuestaPregunta
          : respuestaPregunta ? [respuestaPregunta] : [];
        const idsCorrectos = p.opciones.filter((o) => o.esCorrecta).map((o) => o.idOpcionPregunta);
        esCorrecta =
          idsSeleccionados.length === idsCorrectos.length &&
          idsSeleccionados.every((id) => idsCorrectos.includes(id));
      } else {
        idOpcionSeleccionada = typeof respuestaPregunta === "string" ? respuestaPregunta : null;
        const opcionElegida = p.opciones.find((o) => o.idOpcionPregunta === idOpcionSeleccionada);
        esCorrecta = opcionElegida?.esCorrecta ?? false;
      }

      const pts = esCorrecta ? Number(p.puntaje) : 0;
      puntajeObtenido += pts;
      return {
        idPreguntaCuestionario: p.idPreguntaCuestionario,
        idOpcionPregunta: idOpcionSeleccionada,
        esCorrecta,
        puntajeObtenido: pts,
      };
    });

    const porcentaje = puntajeTotal > 0 ? (puntajeObtenido / puntajeTotal) * 100 : 0;
    const nota = (puntajeObtenido / puntajeTotal) * 20;
    const aprobado = nota >= Number(cuestionario.notaAprobatoria);
    const resultado = aprobado ? "APROBADO" : "DESAPROBADO";

    // Guardar el resultado en el intento ya iniciado + sus respuestas
    await prisma.evaluacionCurso.update({
      where: { idEvaluacionCurso: idEvaluacion },
      data: {
        nota,
        puntajeObtenido,
        puntajeTotal,
        porcentajeObtenido: porcentaje,
        resultado,
        fechaEvaluacion: new Date(),
        respuestas: {
          create: respuestasData,
        },
      },
    });

    // Auto-certificar: solo si aprobó el examen final/único
    // y (si el curso tiene examen inicial) también lo aprobó
    if (aprobado && cuestionario.tipoCuestionario !== "INICIAL") {
      try {
        const tieneExamenInicial = await prisma.cuestionarioCurso.count({
          where: { idCursoCapacitacion: cuestionario.idCursoCapacitacion, tipoCuestionario: "INICIAL" },
        });
        const inicialAprobado =
          tieneExamenInicial === 0 ||
          (await prisma.evaluacionCurso.count({
            where: { idInscripcionCurso: idInscripcion, tipoEvaluacion: "INICIAL", resultado: "APROBADO" },
          })) > 0;

        if (inicialAprobado) {
          const constanciaUrl = `/capacitaciones/constancia/${idInscripcion}`;
          await makeCursoUseCases().certificar.execute(idInscripcion, constanciaUrl);
          notificarCertificado(idInscripcion);
          revalidatePath("/reportes");
        }
      } catch {
        // No bloquear el resultado si falla la certificación
      }
    }

    revalidatePath(REVALIDATE);
    return { resultado: { nota, puntajeObtenido, puntajeTotal, porcentaje, aprobado } };
  } catch (err) {
    return fail(err, "No se pudo registrar el examen.");
  }
}

export async function editarCuestionario(
  idCuestionario: string,
  data: {
    titulo: string;
    descripcion?: string;
    notaAprobatoria: number;
    maxIntentos: number;
    tiempoLimiteMinutos?: number | null;
    preguntas: PreguntaInput[];
  }
): Promise<void | { message: string }> {
  const session = await verifySession();
  if (!data.titulo.trim()) return { message: "El título del cuestionario es obligatorio." };
  if (data.preguntas.length === 0) return { message: "Agrega al menos una pregunta." };
  if (data.tiempoLimiteMinutos != null && (!Number.isInteger(data.tiempoLimiteMinutos) || data.tiempoLimiteMinutos < 1))
    return { message: "El tiempo límite debe ser un número entero de minutos mayor a 0." };
  for (const p of data.preguntas) {
    if (!p.enunciado.trim()) return { message: "Todas las preguntas deben tener enunciado." };
    if (p.opciones.length < 2) return { message: "Cada pregunta debe tener al menos 2 opciones." };
    for (const o of p.opciones) {
      if (!o.textoOpcion.trim()) return { message: "Todas las opciones de respuesta deben tener texto." };
    }
    if (!p.opciones.some((o) => o.esCorrecta)) return { message: "Cada pregunta debe tener una opción correcta." };
  }
  const sumaPuntajes = data.preguntas.reduce((s, p) => s + (p.puntaje ?? 0), 0);
  if (sumaPuntajes !== 20) return { message: `La suma de puntajes debe ser exactamente 20 (actual: ${sumaPuntajes}).` };
  try {
    await prisma.$transaction(async (tx) => {
      const preguntasExistentes = await tx.preguntaCuestionario.findMany({
        where: { idCuestionarioCurso: idCuestionario },
        select: { idPreguntaCuestionario: true },
      });
      const idPreguntas = preguntasExistentes.map((p) => p.idPreguntaCuestionario);

      if (idPreguntas.length > 0) {
        // Las respuestas individuales se eliminan (el puntaje total queda en EvaluacionCurso)
        await tx.respuestaEvaluacion.deleteMany({
          where: { idPreguntaCuestionario: { in: idPreguntas } },
        });
        await tx.opcionPregunta.deleteMany({
          where: { idPreguntaCuestionario: { in: idPreguntas } },
        });
        await tx.preguntaCuestionario.deleteMany({
          where: { idCuestionarioCurso: idCuestionario },
        });
      }

      await tx.cuestionarioCurso.update({
        where: { idCuestionarioCurso: idCuestionario },
        data: {
          titulo: data.titulo.trim(),
          descripcion: data.descripcion?.trim() || null,
          notaAprobatoria: data.notaAprobatoria,
          maxIntentos: data.maxIntentos,
          tiempoLimiteMinutos: data.tiempoLimiteMinutos ?? null,
          preguntas: {
            create: data.preguntas.map((p, pi) => ({
              enunciado: p.enunciado.trim(),
              tipoPregunta: p.tipoPregunta,
              puntaje: p.puntaje,
              orden: pi + 1,
              opciones: {
                create: p.opciones.map((o, oi) => ({
                  textoOpcion: o.textoOpcion.trim(),
                  esCorrecta: o.esCorrecta,
                  orden: oi + 1,
                  estado: "ACTIVO",
                })),
              },
            })),
          },
        },
      });
    });

    await logGRDAction({
      userId: session.userId,
      action: "EDITAR",
      entity: "Cuestionario",
      entityId: idCuestionario,
      entityName: data.titulo,
      module: "Capacitaciones",
    });
  } catch (err) {
    return fail(err, "No se pudo editar el cuestionario.");
  }
  revalidatePath(REVALIDATE);
}

export async function obtenerDatosConstancia(idInscripcion: string) {
  const ins = await prisma.inscripcionCurso.findUnique({
    where: { idInscripcionCurso: idInscripcion },
    select: {
      idInscripcionCurso: true,
      participante: { select: { nombres: true, apellidos: true } },
      curso: { select: { nombreCurso: true, codigoCurso: true } },
      certificacion: { select: { fechaCertificacion: true, idCertificacionCurso: true } },
      evaluaciones: {
        orderBy: { fechaEvaluacion: "desc" },
        take: 1,
        select: { nota: true, resultado: true },
      },
    },
  });
  if (!ins || !ins.certificacion) return null;
  return {
    nombreParticipante: `${ins.participante.nombres} ${ins.participante.apellidos ?? ""}`.trim(),
    nombreCurso: ins.curso.nombreCurso,
    codigoCurso: ins.curso.codigoCurso,
    fechaCertificacion: ins.certificacion.fechaCertificacion?.toISOString() ?? null,
    idCertificacion: ins.certificacion.idCertificacionCurso,
    nota: ins.evaluaciones[0]?.nota != null ? Number(ins.evaluaciones[0].nota) : null,
  };
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
  // Notificar al participante por su correo
  const ins = await prisma.inscripcionCurso.findUnique({
    where: { idInscripcionCurso: idInscripcion },
    select: {
      curso: { select: { nombreCurso: true } },
      participante: { select: { correo: true } },
    },
  });
  if (ins?.participante.correo) {
    notificarPorEmail(
      ins.participante.correo,
      "CAPACITACION_CERTIFICADO",
      "¡Obtuviste tu certificado!",
      `Completaste exitosamente el curso "${ins.curso.nombreCurso}". Tu constancia ya está disponible.`,
      "/capacitaciones"
    );
  }
  notificarCertificado(idInscripcion);
  revalidatePath(REVALIDATE);
}
