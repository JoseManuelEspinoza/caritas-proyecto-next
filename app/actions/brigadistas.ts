'use server'

import { revalidatePath } from 'next/cache'
import { verifySession } from '@/app/lib/dal'
import { makeBrigadistaUseCases } from '@/core/infrastructure/factories/makeBrigadistaUseCases'
import { DomainError } from '@/core/domain/errors/DomainError'
import { logGRDAction } from '@/app/lib/audit'

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
  const session = await verifySession()
  let brigadistaId: string = data.dni
  try {
    const result = await makeBrigadistaUseCases().crear.execute(data)
    brigadistaId = result.id
  } catch (err) {
    return fail(err, 'No se pudo crear el brigadista.')
  }
  await logGRDAction({
    userId: session.userId,
    action: 'CREAR',
    entity: 'Brigadista',
    entityId: brigadistaId,
    entityName: `${data.nombres} ${data.apellidos}`,
    module: 'Brigadistas',
  })
  revalidatePath('/brigadistas')
}

export async function updateBrigadista(id: string, data: BrigadistaFormData) {
  const session = await verifySession()
  try {
    await makeBrigadistaUseCases().actualizar.execute(id, data)
  } catch (err) {
    return fail(err, 'No se pudo actualizar el brigadista.')
  }
  await logGRDAction({
    userId: session.userId,
    action: 'EDITAR',
    entity: 'Brigadista',
    entityId: id,
    entityName: `${data.nombres} ${data.apellidos}`,
    module: 'Brigadistas',
  })
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
