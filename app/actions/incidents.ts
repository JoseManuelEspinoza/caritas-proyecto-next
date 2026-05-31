'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/app/lib/prisma'
import { verifySession } from '@/app/lib/dal'
import { getUsuarioGRDId } from '@/app/lib/usuario-grd'
import { makeIncidenciaUseCases } from '@/core/infrastructure/factories/makeIncidenciaUseCases'
import { DomainError } from '@/core/domain/errors/DomainError'
import type {
  CreateIncidenteData,
  InfoCampoData,
  InformeEvaluacionData,
  CorreccionData,
  AtencionData,
  SeguimientoData,
} from '@/core/application/dtos/IncidenciaDTO'

// Se re-exportan los tipos para no romper los imports de la UI de intermedia.
export type { PersonaForm, FamiliaForm, CreateIncidenteData } from '@/core/application/dtos/IncidenciaDTO'

/**
 * Capa de presentación DELGADA del flujo GRD. Conserva las mismas firmas que la
 * UI ya consume; toda la lógica vive en los casos de uso de core/. La sesión y
 * la identidad del usuario (presentación) se resuelven aquí y se pasan al core.
 */
function asMessage(err: unknown): { message: string } {
  if (err instanceof DomainError) return { message: err.message }
  throw err
}

function revalidar(incidenciaId: string): void {
  revalidatePath('/grd')
  revalidatePath(`/grd/${incidenciaId}`)
}

async function nombreUsuario(): Promise<string | undefined> {
  const session = await verifySession()
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { name: true } })
  return user?.name ?? undefined
}

// ─── Registro / edición ────────────────────────────────────────────────────

export async function createIncidente(data: CreateIncidenteData) {
  await verifySession()
  let id: string
  try {
    id = await makeIncidenciaUseCases().registrar.execute(data)
  } catch (err) {
    return asMessage(err)
  }
  redirect(`/grd/${id}`)
}

export async function updateIncidente(incidenciaId: string, data: CreateIncidenteData) {
  await verifySession()
  try {
    await makeIncidenciaUseCases().actualizar.execute(incidenciaId, data)
  } catch (err) {
    return asMessage(err)
  }
  revalidar(incidenciaId)
  redirect(`/grd/${incidenciaId}`)
}

// ─── Flujo de campo y evaluación ────────────────────────────────────────────

export async function assignBrigadista(
  incidenciaId: string,
  brigadistaId: string,
  instrucciones?: string,
) {
  await verifySession()
  try {
    await makeIncidenciaUseCases().asignar.execute(incidenciaId, brigadistaId, instrucciones)
  } catch (err) {
    return asMessage(err)
  }
  revalidar(incidenciaId)
}

/**
 * Asigna varios brigadistas a la vez, compartiendo las mismas instrucciones.
 * Devuelve un mensaje de error si alguna asignación falla.
 */
export async function assignEquipo(
  incidenciaId: string,
  brigadistaIds: string[],
  instrucciones?: string,
) {
  await verifySession()
  try {
    const uc = makeIncidenciaUseCases().asignar
    for (const id of brigadistaIds) {
      await uc.execute(incidenciaId, id, instrucciones)
    }
  } catch (err) {
    return asMessage(err)
  }
  revalidar(incidenciaId)
}

/**
 * Autoasignación del especialista GRD: se registra como responsable de campo de
 * la incidencia (y la transiciona a ASIGNADO si estaba ABIERTA).
 */
export async function autoasignarme(incidenciaId: string) {
  await verifySession()
  const idUsuarioGRD = await getUsuarioGRDId()
  if (!idUsuarioGRD) {
    return { message: 'No se encontró tu perfil GRD para autoasignarte.' }
  }
  try {
    await makeIncidenciaUseCases().autoasignarme.execute(incidenciaId, idUsuarioGRD)
  } catch (err) {
    return asMessage(err)
  }
  revalidar(incidenciaId)
}

export async function saveInfoCampo(incidenciaId: string, data: InfoCampoData) {
  const responsable = (await nombreUsuario()) ?? data.responsable
  try {
    await makeIncidenciaUseCases().registrarCampo.execute(incidenciaId, data, responsable)
  } catch (err) {
    return asMessage(err)
  }
  revalidar(incidenciaId)
}

export async function saveInformeEvaluacion(incidenciaId: string, data: InformeEvaluacionData) {
  const elaboradoPor = (await nombreUsuario()) ?? ''
  try {
    await makeIncidenciaUseCases().generarInforme.execute(incidenciaId, data, elaboradoPor)
  } catch (err) {
    return asMessage(err)
  }
  revalidar(incidenciaId)
}

export async function corregirYReenviar(incidenciaId: string, data: CorreccionData) {
  const elaboradoPor = (await nombreUsuario()) ?? ''
  try {
    await makeIncidenciaUseCases().corregir.execute(incidenciaId, data, elaboradoPor)
  } catch (err) {
    return asMessage(err)
  }
  revalidar(incidenciaId)
}

// ─── Decisiones del Comité ──────────────────────────────────────────────────

export async function aprobarCaso(incidenciaId: string, observaciones?: string) {
  await verifySession()
  try {
    await makeIncidenciaUseCases().decisionComite.execute(incidenciaId, 'APROBAR', observaciones)
  } catch (err) {
    return asMessage(err)
  }
  revalidar(incidenciaId)
}

export async function observarCaso(incidenciaId: string, observaciones: string) {
  await verifySession()
  try {
    await makeIncidenciaUseCases().decisionComite.execute(incidenciaId, 'OBSERVAR', observaciones)
  } catch (err) {
    return asMessage(err)
  }
  revalidar(incidenciaId)
}

export async function rechazarCaso(incidenciaId: string, observaciones: string) {
  await verifySession()
  try {
    await makeIncidenciaUseCases().decisionComite.execute(incidenciaId, 'RECHAZAR', observaciones)
  } catch (err) {
    return asMessage(err)
  }
  revalidar(incidenciaId)
}

// ─── Atención, seguimiento y cierre ─────────────────────────────────────────

export async function registrarAtencion(incidenciaId: string, data: AtencionData) {
  await verifySession()
  try {
    await makeIncidenciaUseCases().registrarAtencion.execute(incidenciaId, data)
  } catch (err) {
    return asMessage(err)
  }
  revalidar(incidenciaId)
}

export async function addSeguimiento(incidenciaId: string, data: SeguimientoData) {
  await verifySession()
  try {
    await makeIncidenciaUseCases().agregarSeguimiento.execute(incidenciaId, data)
  } catch (err) {
    return asMessage(err)
  }
  revalidar(incidenciaId)
}

export async function cerrarCaso(incidenciaId: string) {
  await verifySession()
  try {
    await makeIncidenciaUseCases().cerrar.execute(incidenciaId)
  } catch (err) {
    return asMessage(err)
  }
  revalidar(incidenciaId)
}
