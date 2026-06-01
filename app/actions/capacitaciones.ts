'use server'

import { revalidatePath } from 'next/cache'
import { verifySession } from '@/app/lib/dal'
import { getUsuarioGRDId } from '@/app/lib/usuario-grd'
import { makeCursoUseCases } from '@/core/infrastructure/factories/makeCursoUseCases'
import { DomainError } from '@/core/domain/errors/DomainError'
import { logGRDAction } from '@/app/lib/audit'
import { prisma } from '@/app/lib/prisma'
import type { ParticipanteData } from '@/core/domain/repositories/ICursoRepository'

const REVALIDATE = '/capacitaciones'

function fail(err: unknown, fallback: string) {
  if (err instanceof DomainError) return { message: err.message }
  console.error('[Capacitaciones] Error inesperado:', err)
  return { message: fallback }
}

export async function listarInscripciones(idCurso: string) {
  await verifySession()
  return makeCursoUseCases().listarInscripciones.execute(idCurso)
}

export async function crearCurso(input: { nombreCurso: string; descripcion?: string; idInstitucionAliada?: string; duracionEstimadaHoras?: number }) {
  const session = await verifySession()
  const idUsuarioResponsableGRD = await getUsuarioGRDId()
  if (!idUsuarioResponsableGRD) return { message: 'Tu usuario no tiene perfil GRD asociado.' }
  try {
    await makeCursoUseCases().crear.execute({ ...input, idUsuarioResponsableGRD })
  } catch (err) {
    return fail(err, 'No se pudo crear el curso.')
  }
  await logGRDAction({ userId: session.userId, action: 'CREAR', entity: 'Curso', entityId: idUsuarioResponsableGRD, entityName: input.nombreCurso, module: 'Capacitaciones' })
  revalidatePath(REVALIDATE)
}

export async function cambiarEstadoCurso(id: string, accion: 'PUBLICAR' | 'CERRAR') {
  const session = await verifySession()
  const curso = await prisma.cursoCapacitacion.findUnique({ where: { idCursoCapacitacion: id }, select: { nombreCurso: true } })
  try {
    await makeCursoUseCases().cambiarEstado.execute(id, accion)
  } catch (err) {
    return fail(err, 'No se pudo cambiar el estado del curso.')
  }
  await logGRDAction({ userId: session.userId, action: 'EDITAR', entity: 'Curso', entityId: id, entityName: curso?.nombreCurso ?? id, module: 'Capacitaciones', field: 'Estado', newValue: accion })
  revalidatePath(REVALIDATE)
}

export async function inscribirParticipante(idCurso: string, participante: ParticipanteData) {
  const session = await verifySession()
  try {
    await makeCursoUseCases().inscribir.execute(idCurso, participante)
  } catch (err) {
    return fail(err, 'No se pudo inscribir al participante.')
  }
  await logGRDAction({ userId: session.userId, action: 'CREAR', entity: 'Inscripción', entityId: idCurso, entityName: `${participante.nombres} ${participante.apellidos ?? ''}`.trim(), module: 'Capacitaciones' })
  revalidatePath(REVALIDATE)
}

async function nombreDeInscripcion(idInscripcion: string): Promise<string> {
  const ins = await prisma.inscripcionCurso.findUnique({
    where: { idInscripcionCurso: idInscripcion },
    select: { curso: { select: { nombreCurso: true } }, participante: { select: { nombres: true, apellidos: true } } },
  })
  if (!ins) return idInscripcion
  const participante = `${ins.participante?.nombres ?? ''} ${ins.participante?.apellidos ?? ''}`.trim()
  return `${ins.curso?.nombreCurso ?? ''} — ${participante}`
}

export async function registrarEvaluacion(idInscripcion: string, nota: number, opts?: { tipoEvaluacion?: string; numeroIntento?: number }) {
  const session = await verifySession()
  try {
    const r = await makeCursoUseCases().evaluar.execute(idInscripcion, nota, opts)
    const nombre = await nombreDeInscripcion(idInscripcion)
    await logGRDAction({ userId: session.userId, action: 'EDITAR', entity: 'Evaluación', entityId: idInscripcion, entityName: nombre, module: 'Capacitaciones', field: 'Nota', newValue: nota.toString() })
    revalidatePath(REVALIDATE)
    return { message: `Evaluación registrada: ${r.resultado}.` }
  } catch (err) {
    return fail(err, 'No se pudo registrar la evaluación.')
  }
}

export async function certificarParticipante(idInscripcion: string, constanciaUrl?: string) {
  const session = await verifySession()
  const nombre = await nombreDeInscripcion(idInscripcion)
  try {
    await makeCursoUseCases().certificar.execute(idInscripcion, constanciaUrl)
  } catch (err) {
    return fail(err, 'No se pudo certificar.')
  }
  await logGRDAction({ userId: session.userId, action: 'EDITAR', entity: 'Certificación', entityId: idInscripcion, entityName: nombre, module: 'Capacitaciones', field: 'Estado', newValue: 'CERTIFICADO' })
  revalidatePath(REVALIDATE)
}
