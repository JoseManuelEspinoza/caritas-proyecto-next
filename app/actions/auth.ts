'use server'

import { redirect } from 'next/navigation'
import { auth, signIn, signOut } from '@/auth'

/**
 * Autenticación delegada a Keycloak (OIDC) vía Auth.js.
 * Ya no se manejan contraseñas en la app: login/registro/recuperación los
 * gestiona Keycloak. Solo exponemos iniciar/cerrar sesión.
 */
export async function loginConKeycloak() {
  await signIn('keycloak', { redirectTo: '/dashboard' })
}

/**
 * Logout FEDERADO: además de borrar la sesión de la app, cierra la sesión SSO
 * en Keycloak (RP-initiated logout). Si no, Keycloak re-loguearía al mismo
 * usuario automáticamente al volver a "Iniciar sesión".
 */
export async function logout() {
  const session = await auth()
  const idToken = session?.idToken

  // 1) Limpia la sesión local de Auth.js (sin redirigir todavía).
  await signOut({ redirect: false })

  // 2) Redirige al endpoint de logout de Keycloak para cerrar el SSO.
  const issuer = process.env.AUTH_KEYCLOAK_ISSUER
  const appUrl = process.env.AUTH_URL ?? 'http://localhost:3000'
  if (issuer) {
    const params = new URLSearchParams({ post_logout_redirect_uri: `${appUrl}/login` })
    if (idToken) params.set('id_token_hint', idToken)
    else params.set('client_id', process.env.AUTH_KEYCLOAK_ID ?? 'caritas-app')
    redirect(`${issuer}/protocol/openid-connect/logout?${params.toString()}`)
  }
  redirect('/login')
}
