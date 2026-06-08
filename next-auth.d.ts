import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    /** id_token de Keycloak, para el logout federado (RP-initiated logout). */
    idToken?: string;
    user: {
      /** Rol principal de la app (ADMINISTRADOR / ESPECIALISTAGRD / ...) */
      role?: string;
      /** Todos los roles del realm de Keycloak */
      roles?: string[];
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    roles?: string[];
    idToken?: string;
  }
}
