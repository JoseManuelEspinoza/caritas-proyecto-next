import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "./prisma";

/**
 * Capa de acceso a datos de sesión.
 *
 * La autenticación la provee Keycloak (vía Auth.js). Aquí traducimos esa
 * identidad a la credencial `User` de la app (creada en el evento de login) para
 * devolver la MISMA forma `{ isAuth, userId, role }` que ya consume todo el GRD
 * (incluido `getUsuarioGRDId`). Así la lógica de negocio no cambia.
 */
// User.id y role se leen de BD (fuente de verdad) y se cachean por TTL corto para
// evitar consultas extra en cada navegación. Usar el rol de BD (no del JWT) garantiza
// que siempre refleja el último login, incluso con tokens viejos sin 'role' en el JWT.
const USER_ID_TTL_MS = 10 * 60 * 1000; // 10 minutos
const userIdCache = new Map<string, { id: string; role: string; exp: number }>();

async function getAppUser(email: string, name: string, jwtRole: string): Promise<{ id: string; role: string }> {
  const cached = userIdCache.get(email);
  if (cached && cached.exp > Date.now()) return { id: cached.id, role: cached.role };

  let user = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } });
  if (!user) {
    // Fallback de provisión por si el evento signIn no corrió.
    user = await prisma.user.create({
      data: { email, name, role: jwtRole as Role },
      select: { id: true, role: true },
    });
  }
  userIdCache.set(email, { id: user.id, role: user.role, exp: Date.now() + USER_ID_TTL_MS });
  return { id: user.id, role: user.role };
}

type AppSession = { isAuth: true; userId: string; role: string; name: string; email: string };

const resolver = cache(async (): Promise<AppSession | null> => {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return null;
  const name = session.user?.name ?? email;
  // El rol del JWT puede ser undefined en tokens viejos → se usa como hint para
  // crear el usuario si no existe, pero el rol definitivo siempre viene de BD.
  const jwtRole = session.user?.role ?? "BRIGADISTA";
  const { id: userId, role } = await getAppUser(email, name, jwtRole);
  return { isAuth: true, userId, role, name, email };
});

export const verifySession = cache(async (): Promise<AppSession> => {
  const s = await resolver();
  if (!s) redirect("/login");
  return s;
});

export const getSession = cache(async () => {
  const s = await resolver();
  return s ? { userId: s.userId, role: s.role } : null;
});
