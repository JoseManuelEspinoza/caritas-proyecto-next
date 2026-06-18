import { verifySession } from "@/app/lib/dal";
import { toFrontendRole } from "@/app/lib/roles";
import { redirect } from "next/navigation";
import { prisma } from "@/app/lib/prisma";
import { UsuariosModule } from "@/app/ui/usuarios/usuarios-module";

export default async function UsuariosPage() {
  const session = await verifySession();
  if (toFrontendRole(session.role) !== "admin") redirect("/dashboard");

  const usuarios = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, name: true, role: true, estado: true },
  });

  // URL de la consola admin de Keycloak, derivada del issuer (sirve en dev y prod).
  const issuer = process.env.AUTH_KEYCLOAK_ISSUER ?? "";
  let keycloakAdminUrl = "";
  try {
    if (issuer) keycloakAdminUrl = `${new URL(issuer).origin}/admin`;
  } catch {
    /* issuer inválido → sin botón directo */
  }

  return <UsuariosModule usuarios={usuarios} keycloakAdminUrl={keycloakAdminUrl} />;
}
