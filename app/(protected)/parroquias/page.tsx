import { verifySession } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { toFrontendRole } from "@/app/lib/roles";
import { redirect } from "next/navigation";
import { ParroquiasList } from "@/app/ui/parroquias/parroquias-list";

export default async function ParroquiasPage() {
  const session = await verifySession();
  const role = toFrontendRole(session.role);

  if (!["admin", "especialistaGRD"].includes(role)) redirect("/dashboard");

  const parroquias = await prisma.parroquia.findMany({
    orderBy: [{ estado: "asc" }, { nombre: "asc" }],
    select: {
      idParroquia: true,
      nombre: true,
      direccion: true,
      referencia: true,
      latitud: true,
      longitud: true,
      telefono: true,
      correo: true,
      estado: true,
      createdAt: true,
      _count: {
        select: {
          brigadistas: true,
          incidencias: true,
          planesTrabajo: true,
        },
      },
    },
  });

  return (
    <ParroquiasList
      canEdit={role === "admin"}
      parroquias={parroquias.map((p) => ({
        id: p.idParroquia,
        nombre: p.nombre,
        direccion: p.direccion,
        referencia: p.referencia,
        latitud: p.latitud ? p.latitud.toString() : null,
        longitud: p.longitud ? p.longitud.toString() : null,
        telefono: p.telefono,
        correo: p.correo,
        estado: p.estado,
        createdAt: p.createdAt.toISOString(),
        _count: p._count,
      }))}
    />
  );
}
