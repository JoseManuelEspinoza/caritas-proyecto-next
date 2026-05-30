'use server'

import { revalidatePath } from 'next/cache'
import { makePlanUseCases } from '@/core/infrastructure/factories/makePlanUseCases'
import { DomainError } from '@/core/domain/errors/DomainError'
import type { CrearPlanInput } from '@/core/application/dtos/PlanDTO'
import type { ActivityState } from '@/core/domain/entities/plan/Plan'
import type { FormState } from '@/app/lib/definitions'

const REVALIDATE = '/dashboard/planes'

function fail(err: unknown, fallback: string): FormState {
  if (err instanceof DomainError) return { message: err.message }
  console.error('[Planes] Error inesperado:', err)
  return { message: fallback }
}

export async function crearPlan(input: CrearPlanInput): Promise<FormState> {
  try {
    const { crear } = makePlanUseCases()
    const p = await crear.execute(input)
    revalidatePath(REVALIDATE)
    return { message: `Plan ${p.id} creado.` }
  } catch (err) {
    return fail(err, 'No se pudo crear el plan.')
  }
}

export async function agregarActividad(
  planId: string,
  act: { descripcion: string; responsable: string; fechaInicio: string; fechaFin: string },
): Promise<FormState> {
  try {
    const { agregarActividad } = makePlanUseCases()
    await agregarActividad.execute(planId, act)
    revalidatePath(REVALIDATE)
    return { message: 'Actividad agregada.' }
  } catch (err) {
    return fail(err, 'No se pudo agregar la actividad.')
  }
}

export async function cambiarEstadoActividad(
  planId: string,
  actividadId: string,
  estado: ActivityState,
): Promise<FormState> {
  try {
    const { cambiarEstadoActividad } = makePlanUseCases()
    await cambiarEstadoActividad.execute(planId, actividadId, estado)
    revalidatePath(REVALIDATE)
    return { message: 'Estado de actividad actualizado.' }
  } catch (err) {
    return fail(err, 'No se pudo actualizar la actividad.')
  }
}
