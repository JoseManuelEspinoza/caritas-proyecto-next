import type { NextAuthConfig } from 'next-auth'
import Keycloak from 'next-auth/providers/keycloak'

/** Roles conocidos de la app, en orden de prioridad (el "principal" se elige así). */
const KNOWN_ROLES = ['ADMINISTRADOR', 'ESPECIALISTAGRD', 'COMITEDONACIONES', 'JEFAOGP', 'BRIGADISTA']

/** Decodifica el payload de un JWT (base64url) sin verificar firma. Edge-safe. */
function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const part = token.split('.')[1]
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '=')))
  } catch {
    return {}
  }
}

/** Roles del realm de Keycloak desde el access_token. */
export function rolesFromAccessToken(accessToken?: string): string[] {
  if (!accessToken) return []
  const payload = decodeJwtPayload(accessToken) as { realm_access?: { roles?: string[] } }
  return payload.realm_access?.roles ?? []
}

/** Elige el rol principal de la app entre los roles del realm. */
export function pickAppRole(roles: string[]): string {
  return KNOWN_ROLES.find((r) => roles.includes(r)) ?? 'BRIGADISTA'
}

/**
 * Configuración EDGE-SAFE de Auth.js (sin Prisma ni dependencias de Node).
 * La usa el proxy (middleware) para leer la sesión y los roles del token.
 */
export const authConfig: NextAuthConfig = {
  trustHost: true,
  providers: [Keycloak], // lee AUTH_KEYCLOAK_ID / _SECRET / _ISSUER del entorno
  pages: { signIn: '/login' },
  callbacks: {
    async jwt({ token, account }) {
      // En el login, Keycloak entrega el access_token con los roles del realm.
      if (account?.access_token) {
        const roles = rolesFromAccessToken(account.access_token)
        token.roles = roles
        token.role = pickAppRole(roles)
      }
      if (account?.id_token) token.idToken = account.id_token
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.roles = (token.roles as string[] | undefined) ?? []
        session.user.role = (token.role as string | undefined) ?? 'BRIGADISTA'
      }
      session.idToken = token.idToken as string | undefined
      return session
    },
  },
}
