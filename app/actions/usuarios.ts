'use server'

import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'
import { prisma } from '@/app/lib/prisma'
import { verifySession } from '@/app/lib/dal'
import { toFrontendRole } from '@/app/lib/roles'

/**
 * Gestión de usuarios (administración).
 *
 * Pertenece al dominio de autenticación/credenciales, que por acuerdo se
 * mantiene fuera de core/ (igual que app/actions/auth.ts). Crea la credencial
 * `User` y su perfil funcional `UsuarioGRD` en una transacción.
 */
const ROLES = ['ADMINISTRADOR', 'ESPECIALISTAGRD', 'BRIGADISTA', 'COMITEDONACIONES', 'JEFAOGP'] as const
type RoleValue = (typeof ROLES)[number]

async function assertAdmin() {
  const session = await verifySession()
  if (toFrontendRole(session.role) !== 'admin') throw new Error('No autorizado.')
}

export async function crearUsuario(data: { email: string; name: string; role: string; password: string }) {
  try {
    await assertAdmin()
  } catch {
    return { message: 'No autorizado.' }
  }

  const email = data.email.trim().toLowerCase()
  if (!email) return { message: 'El email es obligatorio.' }
  if (!data.name.trim()) return { message: 'El nombre es obligatorio.' }
  if (!ROLES.includes(data.role as RoleValue)) return { message: 'Rol inválido.' }
  if (data.password.length < 8) return { message: 'La contraseña debe tener al menos 8 caracteres.' }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return { message: 'Ya existe un usuario con ese email.' }

  const hash = await bcrypt.hash(data.password, 12)
  const partes = data.name.trim().split(' ')

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email, name: data.name.trim(), password: hash, role: data.role as RoleValue },
    })
    await tx.usuarioGRD.create({
      data: {
        idCredencial: user.id,
        nombres: partes.slice(0, 2).join(' '),
        apellidos: partes.slice(2).join(' ') || '',
        correoReferencia: email,
      },
    })
  })

  revalidatePath('/usuarios')
}

export async function toggleUsuarioActivo(id: string, estadoActual: string) {
  try {
    await assertAdmin()
  } catch {
    return { message: 'No autorizado.' }
  }
  await prisma.user.update({
    where: { id },
    data: { estado: estadoActual === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO' },
  })
  revalidatePath('/usuarios')
}
