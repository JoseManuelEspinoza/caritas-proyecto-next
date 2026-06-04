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
 * OIDC con URLs separadas: el navegador usa localhost; el callback (servidor en
 * Docker) intercambia el code contra el servicio `keycloak` en la red interna.
 */
function keycloakProvider({
  clientId,
  clientSecret,
  issuer,
}: {
  clientId?: string
  clientSecret?: string
  issuer?: string
} = {}) {
  if (!issuer) return Keycloak({ clientId, clientSecret })

  const publicBase = issuer.replace(/\/$/, '')
  const internalBase = (process.env.AUTH_KEYCLOAK_INTERNAL_URL ?? publicBase).replace(/\/$/, '')

  return Keycloak({
    clientId,
    clientSecret,
    issuer: publicBase,
    authorization: `${publicBase}/protocol/openid-connect/auth`,
    token: `${internalBase}/protocol/openid-connect/token`,
    userinfo: `${internalBase}/protocol/openid-connect/userinfo`,
  })
}

export const authConfig: NextAuthConfig = {
  trustHost: true,
  providers: [
    keycloakProvider({
      clientId: process.env.AUTH_KEYCLOAK_ID,
      clientSecret: process.env.AUTH_KEYCLOAK_SECRET,
      issuer: process.env.AUTH_KEYCLOAK_ISSUER,
    }),
  ],
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
