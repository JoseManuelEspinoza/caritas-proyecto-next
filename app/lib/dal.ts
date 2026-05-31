import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import type { Role } from '@prisma/client'
import { auth } from '@/auth'
import { prisma } from './prisma'

/**
 * Capa de acceso a datos de sesión.
 *
 * La autenticación la provee Keycloak (vía Auth.js). Aquí traducimos esa
 * identidad a la credencial `User` de la app (creada en el evento de login) para
 * devolver la MISMA forma `{ isAuth, userId, role }` que ya consume todo el GRD
 * (incluido `getUsuarioGRDId`). Así la lógica de negocio no cambia.
 */
async function resolverUsuarioApp(): Promise<{ id: string; role: string } | null> {
  const session = await auth()
  const email = session?.user?.email
  if (!email) return null

  let user = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } })
  if (!user) {
    // Fallback de provisión por si el evento signIn no corrió.
    user = await prisma.user.create({
      data: { email, name: session.user?.name ?? email, role: (session.user?.role ?? 'BRIGADISTA') as Role },
      select: { id: true, role: true },
    })
  }
  return { id: user.id, role: user.role as string }
}

export const verifySession = cache(async () => {
  const u = await resolverUsuarioApp()
  if (!u) redirect('/login')
  return { isAuth: true, userId: u.id, role: u.role }
})

export const getSession = cache(async () => {
  const u = await resolverUsuarioApp()
  return u ? { userId: u.id, role: u.role } : null
})
