'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/app/lib/prisma'
import { verifySession } from '@/app/lib/dal'

export type BrigadistaFormData = {
  nombres: string
  apellidos: string
  dni: string
  celular: string
  correo: string
  idParroquia: string
  disponibilidad: string
}

// ─── Crear brigadista ─────────────────────────────────────────────────────────

export async function createBrigadista(data: BrigadistaFormData) {
  await verifySession()

  if (!data.nombres.trim())    return { message: 'El nombre es obligatorio.' }
  if (!data.idParroquia)       return { message: 'Selecciona una parroquia.' }

  // Verificar DNI único si se ingresó
  if (data.dni.trim()) {
    const existing = await prisma.brigadistaParroquial.findFirst({
      where: { dni: data.dni.trim() },
    })
    if (existing) return { message: 'Ya existe un brigadista con ese DNI.' }
  }

  await prisma.brigadistaParroquial.create({
    data: {
      idParroquia:    data.idParroquia,
      nombres:        data.nombres.trim(),
      apellidos:      data.apellidos.trim() || null,
      dni:            data.dni.trim() || null,
      celular:        data.celular.trim() || null,
      correo:         data.correo.trim() || null,
      disponibilidad: data.disponibilidad || 'DISPONIBLE',
      estado:         'ACTIVO',
    },
  })

  revalidatePath('/brigadistas')
}

// ─── Actualizar brigadista ────────────────────────────────────────────────────

export async function updateBrigadista(id: string, data: BrigadistaFormData) {
  await verifySession()

  if (!data.nombres.trim()) return { message: 'El nombre es obligatorio.' }
  if (!data.idParroquia)    return { message: 'Selecciona una parroquia.' }

  // Verificar DNI único (excluyendo el propio)
  if (data.dni.trim()) {
    const existing = await prisma.brigadistaParroquial.findFirst({
      where: { dni: data.dni.trim(), idBrigadistaParroquial: { not: id } },
    })
    if (existing) return { message: 'Ya existe otro brigadista con ese DNI.' }
  }

  await prisma.brigadistaParroquial.update({
    where: { idBrigadistaParroquial: id },
    data: {
      idParroquia:    data.idParroquia,
      nombres:        data.nombres.trim(),
      apellidos:      data.apellidos.trim() || null,
      dni:            data.dni.trim() || null,
      celular:        data.celular.trim() || null,
      correo:         data.correo.trim() || null,
      disponibilidad: data.disponibilidad || 'DISPONIBLE',
    },
  })

  revalidatePath('/brigadistas')
}

// ─── Cambiar estado (ACTIVO / INACTIVO) ──────────────────────────────────────

export async function toggleEstadoBrigadista(id: string, estadoActual: string) {
  await verifySession()
  const nuevoEstado = estadoActual === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO'
  await prisma.brigadistaParroquial.update({
    where: { idBrigadistaParroquial: id },
    data:  { estado: nuevoEstado },
  })
  revalidatePath('/brigadistas')
}

// ─── Cambiar disponibilidad ───────────────────────────────────────────────────

export async function toggleDisponibilidadBrigadista(id: string, dispActual: string) {
  await verifySession()
  const nuevaDisp = dispActual === 'DISPONIBLE' ? 'NO DISPONIBLE' : 'DISPONIBLE'
  await prisma.brigadistaParroquial.update({
    where: { idBrigadistaParroquial: id },
    data:  { disponibilidad: nuevaDisp },
  })
  revalidatePath('/brigadistas')
}
