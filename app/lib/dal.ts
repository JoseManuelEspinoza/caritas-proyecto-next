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
// El User.id es estable por email → se cachea en memoria para no consultar la
// BD en cada navegación (gran parte de la lentitud al cambiar de pestaña).
const userIdCache = new Map<string, string>()

async function getAppUserId(email: string, name: string, role: string): Promise<string> {
  const cached = userIdCache.get(email)
  if (cached) return cached

  let user = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (!user) {
    // Fallback de provisión por si el evento signIn no corrió.
    user = await prisma.user.create({ data: { email, name, role: role as Role }, select: { id: true } })
  }
  userIdCache.set(email, user.id)
  return user.id
}

type AppSession = { isAuth: true; userId: string; role: string; name: string; email: string }

const resolver = cache(async (): Promise<AppSession | null> => {
  const session = await auth()
  const email = session?.user?.email
  if (!email) return null
  // rol/nombre salen del token (sin BD); solo el id consulta (cacheado).
  const name = session.user?.name ?? email
  const role = session.user?.role ?? 'BRIGADISTA'
  const userId = await getAppUserId(email, name, role)
  return { isAuth: true, userId, role, name, email }
})

export const verifySession = cache(async (): Promise<AppSession> => {
  const s = await resolver()
  if (!s) redirect('/login')
  return s
})

export const getSession = cache(async () => {
  const s = await resolver()
  return s ? { userId: s.userId, role: s.role } : null
})
