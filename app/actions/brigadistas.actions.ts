'use server'

import { revalidatePath } from 'next/cache'
import { makeBrigadistaUseCases } from '@/core/infrastructure/factories/makeBrigadistaUseCases'
import { DomainError } from '@/core/domain/errors/DomainError'
import type { RegistrarBrigadistaInput } from '@/core/application/dtos/BrigadistaDTO'
import type { FormState } from '@/app/lib/definitions'

const REVALIDATE = '/dashboard/brigadistas'

function fail(err: unknown, fallback: string): FormState {
  if (err instanceof DomainError) return { message: err.message }
  console.error('[Brigadistas] Error inesperado:', err)
  return { message: fallback }
}

export async function registrarBrigadista(_state: FormState, formData: FormData): Promise<FormState> {
  try {
    const { registrar } = makeBrigadistaUseCases()
    const input: RegistrarBrigadistaInput = {
      dni: String(formData.get('dni') ?? ''),
      nombres: String(formData.get('nombres') ?? ''),
      apellidoPaterno: String(formData.get('apellidoPaterno') ?? ''),
      apellidoMaterno: String(formData.get('apellidoMaterno') ?? ''),
      celular: String(formData.get('celular') ?? ''),
      parroquia: String(formData.get('parroquia') ?? ''),
      rolPastoral: (String(formData.get('rolPastoral') ?? 'BRIGADISTA')) as RegistrarBrigadistaInput['rolPastoral'],
      email: formData.get('email') ? String(formData.get('email')) : undefined,
    }
    await registrar.execute(input)
    revalidatePath(REVALIDATE)
    return { message: 'Brigadista registrado correctamente.' }
  } catch (err) {
    return fail(err, 'No se pudo registrar el brigadista.')
  }
}

export async function toggleActivoBrigadista(id: string): Promise<FormState> {
  try {
    const { toggleActivo } = makeBrigadistaUseCases()
    await toggleActivo.execute(id)
    revalidatePath(REVALIDATE)
    return { message: 'Estado actualizado.' }
  } catch (err) {
    return fail(err, 'No se pudo actualizar el estado.')
  }
}

export async function marcarDisponibilidad(id: string, disponible: boolean): Promise<FormState> {
  try {
    const { marcarDisponibilidad } = makeBrigadistaUseCases()
    await marcarDisponibilidad.execute(id, disponible)
    revalidatePath(REVALIDATE)
    return { message: 'Disponibilidad actualizada.' }
  } catch (err) {
    return fail(err, 'No se pudo actualizar la disponibilidad.')
  }
}
