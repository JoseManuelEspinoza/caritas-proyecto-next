import { verifySession } from "@/app/lib/dal";
import { toFrontendRole } from "@/app/lib/roles";
import { redirect } from "next/navigation";
import { prisma } from "@/app/lib/prisma";
import { cargarCatalogosIncidente } from "@/app/lib/grd/catalogos-form";
import { IncidentForm } from "@/app/ui/grd/incident-form";

export default async function NuevoIncidentePage() {
  const session = await verifySession();
  const role = toFrontendRole(session.role);

  if (role === "brigadista" || role === "comite") {
    redirect("/grd");
  }

  // Solo se pueden asignar parroquias REALES del sistema (para que se guarde
  // idParroquia y el algoritmo de asignación tenga de dónde partir).
  const [parroquias, catalogos] = await Promise.all([
    prisma.parroquia.findMany({
      where: { estado: "ACTIVO" },
      select: { nombre: true, latitud: true, longitud: true },
      orderBy: { nombre: "asc" },
    }),
    cargarCatalogosIncidente(),
  ]);

  return (
    <IncidentForm
      parroquiasSistema={parroquias.map((p) => ({
        nombre: p.nombre,
        lat: p.latitud != null ? Number(p.latitud) : null,
        lng: p.longitud != null ? Number(p.longitud) : null,
      }))}
      catalogos={catalogos}
    />
  );
}
