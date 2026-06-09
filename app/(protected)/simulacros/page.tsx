import { verifySession } from "@/app/lib/dal";
import { toFrontendRole } from "@/app/lib/roles";
import { redirect } from "next/navigation";
import { prisma } from "@/app/lib/prisma";
import { makeActividadUseCases } from "@/core/infrastructure/factories/makeActividadUseCases";
import { SimulacrosModule } from "@/app/ui/simulacros/simulacros-module";

export default async function SimulacrosPage() {
  const session = await verifySession();
  const role = toFrontendRole(session.role);
  if (!["admin", "especialistaGRD", "brigadista"].includes(role)) redirect("/dashboard");

  const [actividades, parroquias] = await Promise.all([
    makeActividadUseCases().listar.execute(),
    prisma.parroquia.findMany({
      where: { estado: "ACTIVO" },
      orderBy: { nombre: "asc" },
      select: { idParroquia: true, nombre: true },
    }),
  ]);

  const parroquiaNombre = new Map(parroquias.map((p) => [p.idParroquia, p.nombre]));

  return (
    <SimulacrosModule
      actividades={actividades.map((a) => ({
        ...a,
        parroquiaNombre: parroquiaNombre.get(a.idParroquia) ?? "—",
      }))}
      parroquias={parroquias.map((p) => ({ id: p.idParroquia, nombre: p.nombre }))}
    />
  );
}
