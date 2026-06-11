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
      let usuarioGRD = await prisma.usuarioGRD.findUnique({ where: { idCredencial: appUser.id } });
      if (!usuarioGRD) {
        const partes = nombre.split(" ");
        usuarioGRD = await prisma.usuarioGRD.create({
          data: {
            idCredencial: appUser.id,
            nombres: partes.slice(0, 2).join(" ") || nombre,
            apellidos: partes.slice(2).join(" ") || "",
            correoReferencia: email,
          },
        });
      }

      // 3) Brigadistas: asegurar que tengan registro operativo en BrigadistaParroquial.
      //    Sin él no aparecen en listas de asignación ni se filtra su vista correctamente.
      if (role === "BRIGADISTA") {
        // Primero buscar por idUsuarioGRD (ya vinculado en logins anteriores)
        const vinculado = await prisma.brigadistaParroquial.findFirst({
          where: { idUsuarioGRD: usuarioGRD.idUsuarioGRD },
          select: { idBrigadistaParroquial: true },
        });

        if (!vinculado) {
          // Buscar registro creado manualmente (sin idUsuarioGRD) que coincida por correo.
          // Búsqueda case-insensitive para tolerar diferencias de mayúsculas entre el admin y Keycloak.
          const porCorreo = await prisma.brigadistaParroquial.findFirst({
            where: { correo: { equals: email, mode: "insensitive" }, idUsuarioGRD: null },
            select: { idBrigadistaParroquial: true },
          });

          if (porCorreo) {
            // Vincular el registro existente con la cuenta Keycloak recién creada
            await prisma.brigadistaParroquial.update({
              where: { idBrigadistaParroquial: porCorreo.idBrigadistaParroquial },
              data: { idUsuarioGRD: usuarioGRD.idUsuarioGRD },
            });
          } else {
            // Usuario nuevo sin registro previo → crear con la primera parroquia disponible
            const primeraParroquia = await prisma.parroquia.findFirst({
              select: { idParroquia: true },
            });
            if (primeraParroquia) {
              const partes = nombre.split(" ");
              await prisma.brigadistaParroquial.create({
                data: {
                  idParroquia: primeraParroquia.idParroquia,
                  idUsuarioGRD: usuarioGRD.idUsuarioGRD,
                  nombres: partes.slice(0, 2).join(" ") || nombre,
                  apellidos: partes.slice(2).join(" ") || "",
                  correo: email,
                  disponibilidad: "DISPONIBLE",
                  estado: "ACTIVO",
                },
              });
            }
          }
        } else {
          // Ya vinculado: si hay un registro huérfano (sin idUsuarioGRD) con el mismo correo,
          // eliminarlo para evitar entradas duplicadas en las listas.
          await prisma.brigadistaParroquial.deleteMany({
            where: {
              correo: { equals: email, mode: "insensitive" },
              idUsuarioGRD: null,
              idBrigadistaParroquial: { not: vinculado.idBrigadistaParroquial },
            },
          });
        }
      }
    },
  },
});
