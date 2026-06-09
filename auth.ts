import NextAuth from "next-auth";
import type { Role } from "@prisma/client";
import { prisma } from "@/app/lib/prisma";
import { authConfig, rolesFromAccessToken, pickAppRole } from "./auth.config";

/**
 * Instancia completa de Auth.js (runtime Node).
 *
 * Además de la config edge-safe, agrega el PUENTE DE IDENTIDAD: al iniciar
 * sesión con Keycloak, aprovisiona/sincroniza el `User` (credencial) y su
 * `UsuarioGRD` en la BD de la app. Así toda la lógica de negocio existente
 * (que depende de User.id → UsuarioGRD.idCredencial) sigue intacta, sin
 * almacenar contraseñas (Keycloak es la fuente de verdad de la autenticación).
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  events: {
    async signIn({ user, account, profile }) {
      const email = user.email ?? (profile?.email as string | undefined);
      if (!email) return;

      const nombre =
        (profile?.name as string | undefined) ??
        [profile?.given_name, profile?.family_name].filter(Boolean).join(" ") ??
        user.name ??
        email;

      const role = pickAppRole(rolesFromAccessToken(account?.access_token));

      // 1) Credencial técnica (User) — espejo de Keycloak, sin contraseña.
      const appUser = await prisma.user.upsert({
        where: { email },
        update: { name: nombre, role: role as Role },
        create: { email, name: nombre, role: role as Role },
      });

      // 2) Perfil funcional GRD (lo que referencian kits, planes, actividades, cursos…).
      const yaTiene = await prisma.usuarioGRD.findUnique({ where: { idCredencial: appUser.id } });
      if (!yaTiene) {
        const partes = nombre.split(" ");
        await prisma.usuarioGRD.create({
          data: {
            idCredencial: appUser.id,
            nombres: partes.slice(0, 2).join(" ") || nombre,
            apellidos: partes.slice(2).join(" ") || "",
            correoReferencia: email,
          },
        });
      }
    },
  },
});
