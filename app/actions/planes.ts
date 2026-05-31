'use server'

import { revalidatePath } from 'next/cache'
import { verifySession } from '@/app/lib/dal'
import { getUsuarioGRDId } from '@/app/lib/usuario-grd'
import { makePlanUseCases } from '@/core/infrastructure/factories/makePlanUseCases'
import { DomainError } from '@/core/domain/errors/DomainError'
import type { DatosEditables } from '@/core/domain/entities/plan/PlanTrabajo'

const REVALIDATE = '/planes'

function fail(err: unknown, fallback: string) {
  if (err instanceof DomainError) return { message: err.message }
  console.error('[Planes] Error inesperado:', err)
  return { message: fallback }
}

export async function crearPlan(input: { idParroquia: string; nombrePlan: string; diagnosticoRiesgo?: string; objetivos?: string; fechaInicio?: string; fechaFin?: string }) {
  await verifySession()
  const idUsuarioResponsableGRD = await getUsuarioGRDId()
  if (!idUsuarioResponsableGRD) return { message: 'Tu usuario no tiene perfil GRD asociado.' }
  try {
    await makePlanUseCases().crear.execute({ ...input, idUsuarioResponsableGRD })
  } catch (err) {
    return fail(err, 'No se pudo crear el plan.')
  }
  revalidatePath(REVALIDATE)
}

export async function actualizarPlan(id: string, datos: DatosEditables) {
  await verifySession()
  try {
    await makePlanUseCases().actualizar.execute(id, datos)
  } catch (err) {
    return fail(err, 'No se pudo actualizar el plan.')
  }
  revalidatePath(REVALIDATE)
}

export async function cambiarAprobacionPlan(id: string, accion: 'ENVIAR' | 'APROBAR' | 'OBSERVAR', observaciones?: string) {
  await verifySession()
  try {
    await makePlanUseCases().cambiarAprobacion.execute(id, accion, observaciones)
  } catch (err) {
    return fail(err, 'No se pudo cambiar el estado del plan.')
  }
  revalidatePath(REVALIDATE)
}
