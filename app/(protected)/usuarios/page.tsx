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

  return <UsuariosModule usuarios={usuarios} />;
}
