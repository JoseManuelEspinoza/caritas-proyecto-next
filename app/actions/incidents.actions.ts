'use server'

import { revalidatePath } from 'next/cache'
import { makeIncidentUseCases } from '@/core/infrastructure/factories/makeIncidentUseCases'
import { DomainError } from '@/core/domain/errors/DomainError'
import type { DecisionComite } from '@/core/application/use-cases/incidents/DecisionComite.usecase'
import type { RegistrarIncidenteInput } from '@/core/application/dtos/IncidentDTO'
import type { FormState } from '@/app/lib/definitions'

const REVALIDATE = '/dashboard/grd'

/** Traduce errores de dominio a un FormState seguro para la UI. */
function fail(err: unknown, fallback: string): FormState {
  if (err instanceof DomainError) return { message: err.message }
  console.error('[Incidentes] Error inesperado:', err)
  return { message: fallback }
}

export async function registrarIncidente(input: RegistrarIncidenteInput): Promise<FormState> {
  try {
    const { registrar } = makeIncidentUseCases()
    const incident = await registrar.execute(input)
    revalidatePath(REVALIDATE)
    return { message: `Incidente ${incident.id} registrado.` }
  } catch (err) {
    return fail(err, 'No se pudo registrar el incidente.')
  }
}

export async function asignarBrigadista(
  id: string,
  brig: { id: string; nombre: string; parroquia: string; celular?: string },
  asignadoPor: string,
  notas?: string,
): Promise<FormState> {
  try {
    const { asignarBrigadista } = makeIncidentUseCases()
    await asignarBrigadista.execute(id, brig, asignadoPor, notas)
    revalidatePath(REVALIDATE)
    return { message: 'Brigadista asignado.' }
  } catch (err) {
    return fail(err, 'No se pudo asignar el brigadista.')
  }
}

export async function decisionComite(
  id: string,
  decision: DecisionComite,
  user: string,
  notas: string,
): Promise<FormState> {
  try {
    const { decisionComite } = makeIncidentUseCases()
    await decisionComite.execute(id, decision, user, notas)
    revalidatePath(REVALIDATE)
    return { message: 'Decisión del Comité registrada.' }
  } catch (err) {
    return fail(err, 'No se pudo registrar la decisión.')
  }
}

export async function cerrarCaso(id: string, user: string, notas: string): Promise<FormState> {
  try {
    const { cerrar } = makeIncidentUseCases()
    await cerrar.execute(id, user, notas)
    revalidatePath(REVALIDATE)
    return { message: 'Caso cerrado.' }
  } catch (err) {
    return fail(err, 'No se pudo cerrar el caso.')
  }
}
