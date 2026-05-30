'use server'

import { revalidatePath } from 'next/cache'
import { makeCatalogUseCases } from '@/core/infrastructure/factories/makeCatalogUseCases'
import { DomainError } from '@/core/domain/errors/DomainError'
import type { CatalogTipo } from '@/core/domain/entities/catalog/CatalogItem'
import type { FormState } from '@/app/lib/definitions'

const REVALIDATE = '/dashboard/catalogos'

function fail(err: unknown, fallback: string): FormState {
  if (err instanceof DomainError) return { message: err.message }
  console.error('[Catálogos] Error inesperado:', err)
  return { message: fallback }
}

export async function agregarItemCatalogo(tipo: CatalogTipo, value: string): Promise<FormState> {
  try {
    const { agregar } = makeCatalogUseCases()
    await agregar.execute(tipo, value)
    revalidatePath(REVALIDATE)
    return { message: 'Ítem agregado al catálogo.' }
  } catch (err) {
    return fail(err, 'No se pudo agregar el ítem.')
  }
}

export async function renombrarItemCatalogo(id: string, value: string): Promise<FormState> {
  try {
    const { renombrar } = makeCatalogUseCases()
    await renombrar.execute(id, value)
    revalidatePath(REVALIDATE)
    return { message: 'Ítem actualizado.' }
  } catch (err) {
    return fail(err, 'No se pudo actualizar el ítem.')
  }
}

export async function toggleItemCatalogo(id: string): Promise<FormState> {
  try {
    const { toggle } = makeCatalogUseCases()
    await toggle.execute(id)
    revalidatePath(REVALIDATE)
    return { message: 'Estado del ítem actualizado.' }
  } catch (err) {
    return fail(err, 'No se pudo actualizar el estado.')
  }
}
