'use server'

import { revalidatePath } from 'next/cache'
import { makeKitUseCases } from '@/core/infrastructure/factories/makeKitUseCases'
import { DomainError } from '@/core/domain/errors/DomainError'
import type { CrearKitInput } from '@/core/application/dtos/KitDTO'
import type { TipoMovimientoKit } from '@/core/domain/entities/kit/Kit'
import type { FormState } from '@/app/lib/definitions'

const REVALIDATE = '/dashboard/kits'

function fail(err: unknown, fallback: string): FormState {
  if (err instanceof DomainError) return { message: err.message }
  console.error('[Kits] Error inesperado:', err)
  return { message: fallback }
}

export async function crearKit(input: CrearKitInput): Promise<FormState> {
  try {
    const { crear } = makeKitUseCases()
    const k = await crear.execute(input)
    revalidatePath(REVALIDATE)
    return { message: `Kit ${k.id} creado.` }
  } catch (err) {
    return fail(err, 'No se pudo crear el kit.')
  }
}

export async function registrarMovimientoKit(
  kitId: string,
  mov: {
    fecha: string
    tipo: TipoMovimientoKit
    cantidad: number
    responsable: string
    destinatario?: string
    parroquia?: string
    incidenciaId?: string
    notas?: string
  },
): Promise<FormState> {
  try {
    const { registrarMovimiento } = makeKitUseCases()
    const k = await registrarMovimiento.execute(kitId, mov)
    revalidatePath(REVALIDATE)
    return { message: `Movimiento registrado. Stock actual: ${k.stock}.` }
  } catch (err) {
    return fail(err, 'No se pudo registrar el movimiento.')
  }
}
