'use server'

import { revalidatePath } from 'next/cache'
import { makeSimulacroUseCases } from '@/core/infrastructure/factories/makeSimulacroUseCases'
import { DomainError } from '@/core/domain/errors/DomainError'
import type { CrearSimulacroInput } from '@/core/application/dtos/SimulacroDTO'
import type { BrigadistaRef } from '@/core/domain/entities/simulacro/Simulacro'
import type { FormState } from '@/app/lib/definitions'

const REVALIDATE = '/dashboard/simulacros'

function fail(err: unknown, fallback: string): FormState {
  if (err instanceof DomainError) return { message: err.message }
  console.error('[Simulacros] Error inesperado:', err)
  return { message: fallback }
}

export async function crearSimulacro(input: CrearSimulacroInput): Promise<FormState> {
  try {
    const { crear } = makeSimulacroUseCases()
    const s = await crear.execute(input)
    revalidatePath(REVALIDATE)
    return { message: `Simulacro ${s.id} programado.` }
  } catch (err) {
    return fail(err, 'No se pudo programar el simulacro.')
  }
}

export async function asignarSimulacro(
  id: string,
  brigadistas: BrigadistaRef[],
  indicaciones: string,
  documentos: string[],
): Promise<FormState> {
  try {
    const { asignar } = makeSimulacroUseCases()
    await asignar.execute(id, brigadistas, indicaciones, documentos)
    revalidatePath(REVALIDATE)
    return { message: 'Simulacro asignado.' }
  } catch (err) {
    return fail(err, 'No se pudo asignar el simulacro.')
  }
}

export async function revisarSimulacro(
  id: string,
  decision: 'OBSERVAR' | 'VALIDAR',
  comentario?: string,
): Promise<FormState> {
  try {
    const { revisar } = makeSimulacroUseCases()
    await revisar.execute(id, decision, comentario)
    revalidatePath(REVALIDATE)
    return { message: 'Revisión registrada.' }
  } catch (err) {
    return fail(err, 'No se pudo registrar la revisión.')
  }
}
