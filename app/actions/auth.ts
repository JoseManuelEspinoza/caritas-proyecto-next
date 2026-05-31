'use server'

import { signIn, signOut } from '@/auth'

/**
 * Autenticación delegada a Keycloak (OIDC) vía Auth.js.
 * Ya no se manejan contraseñas en la app: login/registro/recuperación los
 * gestiona Keycloak. Solo exponemos iniciar/cerrar sesión.
 */
export async function loginConKeycloak() {
  await signIn('keycloak', { redirectTo: '/dashboard' })
}

export async function logout() {
  await signOut({ redirectTo: '/login' })
}
