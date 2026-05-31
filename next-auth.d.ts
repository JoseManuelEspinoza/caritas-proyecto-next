import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      /** Rol principal de la app (ADMINISTRADOR / ESPECIALISTAGRD / ...) */
      role?: string
      /** Todos los roles del realm de Keycloak */
      roles?: string[]
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: string
    roles?: string[]
  }
}
