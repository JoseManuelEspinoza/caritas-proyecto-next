'use server'

import { revalidatePath } from 'next/cache'
import { makeCourseUseCases } from '@/core/infrastructure/factories/makeCourseUseCases'
import { DomainError } from '@/core/domain/errors/DomainError'
import type { CrearCursoInput } from '@/core/application/dtos/CourseDTO'
import type { FormState } from '@/app/lib/definitions'

const REVALIDATE = '/dashboard/capacitaciones'

function fail(err: unknown, fallback: string): FormState {
  if (err instanceof DomainError) return { message: err.message }
  console.error('[Capacitaciones] Error inesperado:', err)
  return { message: fallback }
}

export async function crearCurso(input: CrearCursoInput): Promise<FormState> {
  try {
    const { crear } = makeCourseUseCases()
    const c = await crear.execute(input)
    revalidatePath(REVALIDATE)
    return { message: `Curso ${c.id} creado.` }
  } catch (err) {
    return fail(err, 'No se pudo crear el curso.')
  }
}

export async function inscribirParticipante(
  courseId: string,
  participante: { brigadistaId: string; nombreCompleto: string; parroquia: string; rol: string },
): Promise<FormState> {
  try {
    const { inscribir } = makeCourseUseCases()
    await inscribir.execute(courseId, participante)
    revalidatePath(REVALIDATE)
    return { message: 'Inscripción registrada.' }
  } catch (err) {
    return fail(err, 'No se pudo inscribir al participante.')
  }
}

export async function evaluarParticipante(
  courseId: string,
  participantId: string,
  campo: 'evalInicial' | 'evalFinal',
  valor: number,
): Promise<FormState> {
  try {
    const { evaluar } = makeCourseUseCases()
    await evaluar.execute(courseId, participantId, campo, valor)
    revalidatePath(REVALIDATE)
    return { message: 'Evaluación registrada.' }
  } catch (err) {
    return fail(err, 'No se pudo registrar la evaluación.')
  }
}
