'use server'

import { revalidatePath } from 'next/cache'
import { verifySession } from '@/app/lib/dal'
import { makeBrigadistaUseCases } from '@/core/infrastructure/factories/makeBrigadistaUseCases'
import { DomainError } from '@/core/domain/errors/DomainError'

export type BrigadistaFormData = {
  nombres: string
  apellidos: string
  dni: string
  celular: string
  correo: string
  idParroquia: string
  disponibilidad: string
}

/**
 * Capa de presentación (delgada). Conserva las MISMAS firmas que ya usa la UI;
 * la lógica vive ahora en los casos de uso de core/. Los errores de dominio se
 * traducen al mismo formato `{ message }` que la UI ya entiende.
 */
function fail(err: unknown, fallback: string) {
  if (err instanceof DomainError) return { message: err.message }
  console.error('[Brigadistas] Error inesperado:', err)
  return { message: fallback }
}

export async function createBrigadista(data: BrigadistaFormData) {
  await verifySession()
  try {
    await makeBrigadistaUseCases().crear.execute(data)
  } catch (err) {
    return fail(err, 'No se pudo crear el brigadista.')
  }
  revalidatePath('/brigadistas')
}

export async function updateBrigadista(id: string, data: BrigadistaFormData) {
  await verifySession()
  try {
    await makeBrigadistaUseCases().actualizar.execute(id, data)
  } catch (err) {
    return fail(err, 'No se pudo actualizar el brigadista.')
  }
  revalidatePath('/brigadistas')
}

// El 2º parámetro se conserva por compatibilidad con la UI; el estado real se lee en el caso de uso.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function toggleEstadoBrigadista(id: string, _estadoActual: string) {
  await verifySession()
  try {
    await makeBrigadistaUseCases().toggleEstado.execute(id)
  } catch (err) {
    return fail(err, 'No se pudo cambiar el estado.')
  }
  revalidatePath('/brigadistas')
}

// El 2º parámetro se conserva por compatibilidad con la UI; la disponibilidad real se lee en el caso de uso.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function toggleDisponibilidadBrigadista(id: string, _dispActual: string) {
  await verifySession()
  try {
    await makeBrigadistaUseCases().toggleDisponibilidad.execute(id)
  } catch (err) {
    return fail(err, 'No se pudo cambiar la disponibilidad.')
  }
  revalidatePath('/brigadistas')
}
