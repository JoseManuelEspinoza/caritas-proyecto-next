'use server'

import { revalidatePath } from 'next/cache'
import { verifySession } from '@/app/lib/dal'
import { makeCatalogoUseCases } from '@/core/infrastructure/factories/makeCatalogoUseCases'
import { DomainError } from '@/core/domain/errors/DomainError'

const REVALIDATE = '/catalogos'

function fail(err: unknown, fallback: string) {
  if (err instanceof DomainError) return { message: err.message }
  console.error('[Catálogos] Error inesperado:', err)
  return { message: fallback }
}

export async function crearCatalogo(nombreCatalogo: string, descripcion?: string) {
  await verifySession()
  try {
    await makeCatalogoUseCases().crearCatalogo.execute(nombreCatalogo, descripcion)
  } catch (err) {
    return fail(err, 'No se pudo crear el catálogo.')
  }
  revalidatePath(REVALIDATE)
}

export async function agregarItemCatalogo(input: { idCatalogoGRD: string; codigo: string; valor: string; descripcion?: string; orden?: number }) {
  await verifySession()
  try {
    await makeCatalogoUseCases().agregarDetalle.execute(input)
  } catch (err) {
    return fail(err, 'No se pudo agregar el ítem.')
  }
  revalidatePath(REVALIDATE)
}

export async function editarItemCatalogo(id: string, valor: string, descripcion?: string) {
  await verifySession()
  try {
    await makeCatalogoUseCases().editarDetalle.execute(id, valor, descripcion)
  } catch (err) {
    return fail(err, 'No se pudo editar el ítem.')
  }
  revalidatePath(REVALIDATE)
}

export async function toggleItemCatalogo(id: string) {
  await verifySession()
  try {
    await makeCatalogoUseCases().toggleDetalle.execute(id)
  } catch (err) {
    return fail(err, 'No se pudo cambiar el estado del ítem.')
  }
  revalidatePath(REVALIDATE)
}
