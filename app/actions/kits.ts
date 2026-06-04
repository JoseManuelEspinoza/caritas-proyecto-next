'use server'

import { revalidatePath } from 'next/cache'
import { verifySession } from '@/app/lib/dal'
import { getUsuarioGRDId } from '@/app/lib/usuario-grd'
import { makeKitUseCases } from '@/core/infrastructure/factories/makeKitUseCases'
import { DomainError } from '@/core/domain/errors/DomainError'
import { logGRDAction } from '@/app/lib/audit'
import type { TipoMovimiento } from '@/core/domain/entities/kit/KitEmergencia'

const REVALIDATE = '/kits'

function fail(err: unknown, fallback: string) {
  if (err instanceof DomainError) return { message: err.message }
  console.error('[Kits] Error inesperado:', err)
  return { message: fallback }
}

export async function listarMovimientosKit(idKit: string) {
  await verifySession()
  return makeKitUseCases().listarMovimientos.execute(idKit)
}

export async function crearKit(input: { tipoKit: string; descripcion?: string; stockInicial?: number; codigoAlmacen?: string; ubicacionAlmacen?: string }) {
  const session = await verifySession()
  try {
    await makeKitUseCases().crear.execute(input)
  } catch (err) {
    return fail(err, 'No se pudo crear el kit.')
  }
  await logGRDAction({ userId: session.userId, action: 'CREAR', entity: 'Kit', entityId: input.tipoKit, entityName: input.tipoKit, module: 'Kits' })
  revalidatePath(REVALIDATE)
}

export async function registrarMovimientoKit(
  idKit: string,
  mov: { tipo: TipoMovimiento; cantidad: number; idParroquiaDestino?: string; motivoMovimiento?: string; observaciones?: string },
) {
  const session = await verifySession()
  const idUsuarioResponsableGRD = await getUsuarioGRDId()
  if (!idUsuarioResponsableGRD) return { message: 'Tu usuario no tiene perfil GRD asociado.' }
  try {
    const kit = await makeKitUseCases().registrarMovimiento.execute(idKit, { ...mov, idUsuarioResponsableGRD })
    await logGRDAction({ userId: session.userId, action: 'EDITAR', entity: 'Kit', entityId: idKit, entityName: idKit, module: 'Kits', field: 'Movimiento', newValue: `${mov.tipo} x${mov.cantidad}`, notes: mov.motivoMovimiento ?? mov.observaciones })
    revalidatePath(REVALIDATE)
    return { message: `Movimiento registrado. Stock actual: ${kit.stockActual}.` }
  } catch (err) {
    return fail(err, 'No se pudo registrar el movimiento.')
  }
}
