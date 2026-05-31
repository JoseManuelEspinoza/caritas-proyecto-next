'use server'

import { revalidatePath } from 'next/cache'
import { verifySession } from '@/app/lib/dal'
import { getUsuarioGRDId } from '@/app/lib/usuario-grd'
import { makeCursoUseCases } from '@/core/infrastructure/factories/makeCursoUseCases'
import { DomainError } from '@/core/domain/errors/DomainError'
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
  await verifySession()
  const idUsuarioResponsableGRD = await getUsuarioGRDId()
  if (!idUsuarioResponsableGRD) return { message: 'Tu usuario no tiene perfil GRD asociado.' }
  try {
    await makeCursoUseCases().crear.execute({ ...input, idUsuarioResponsableGRD })
  } catch (err) {
    return fail(err, 'No se pudo crear el curso.')
  }
  revalidatePath(REVALIDATE)
}

export async function cambiarEstadoCurso(id: string, accion: 'PUBLICAR' | 'CERRAR') {
  await verifySession()
  try {
    await makeCursoUseCases().cambiarEstado.execute(id, accion)
  } catch (err) {
    return fail(err, 'No se pudo cambiar el estado del curso.')
  }
  revalidatePath(REVALIDATE)
}

export async function inscribirParticipante(idCurso: string, participante: ParticipanteData) {
  await verifySession()
  try {
    await makeCursoUseCases().inscribir.execute(idCurso, participante)
  } catch (err) {
    return fail(err, 'No se pudo inscribir al participante.')
  }
  revalidatePath(REVALIDATE)
}

export async function registrarEvaluacion(idInscripcion: string, nota: number, opts?: { tipoEvaluacion?: string; numeroIntento?: number }) {
  await verifySession()
  try {
    const r = await makeCursoUseCases().evaluar.execute(idInscripcion, nota, opts)
    revalidatePath(REVALIDATE)
    return { message: `Evaluación registrada: ${r.resultado}.` }
  } catch (err) {
    return fail(err, 'No se pudo registrar la evaluación.')
  }
}

export async function certificarParticipante(idInscripcion: string, constanciaUrl?: string) {
  await verifySession()
  try {
    await makeCursoUseCases().certificar.execute(idInscripcion, constanciaUrl)
  } catch (err) {
    return fail(err, 'No se pudo certificar.')
  }
  revalidatePath(REVALIDATE)
}
