import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";
import { toFrontendRole, type FrontendRole } from "@/app/lib/roles";

// Instancia edge-safe (sin Prisma) solo para leer la sesión/roles del token.
const { auth } = NextAuth(authConfig);

/** Control de acceso por rol: prefijo de ruta → roles permitidos. */
const ROUTE_ROLES: { prefix: string; roles: FrontendRole[] }[] = [
  { prefix: "/usuarios", roles: ["admin"] },
  { prefix: "/brigadistas", roles: ["admin"] },
  { prefix: "/planes", roles: ["admin"] },
  { prefix: "/kits", roles: ["admin", "comite"] },
  { prefix: "/catalogos", roles: ["admin"] },
  { prefix: "/auditoria", roles: ["admin"] },
  { prefix: "/donaciones", roles: ["admin", "comite", "jefaOGP", "especialistaGRD"] },
  { prefix: "/reportes", roles: ["admin", "comite", "jefaOGP"] },
  { prefix: "/capacitaciones", roles: ["admin", "especialistaGRD", "brigadista"] },
  { prefix: "/simulacros", roles: ["admin", "especialistaGRD", "brigadista"] },
  // /grd y /dashboard: cualquier usuario autenticado
];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = Boolean(req.auth?.user);

  // Página de login: si ya inició sesión, al dashboard; si no, dejar pasar.
  if (pathname === "/login") {
    return isLoggedIn
      ? NextResponse.redirect(new URL("/dashboard", req.nextUrl))
      : NextResponse.next();
  }

  // No autenticado → login
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  // Autorización por rol (defensa en profundidad; las páginas también validan)
  const rule = ROUTE_ROLES.find((r) => pathname.startsWith(r.prefix));
  if (rule) {
    const role = toFrontendRole(req.auth?.user?.role ?? "");
    if (!rule.roles.includes(role)) {
      return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|manifest).*)"],
};
