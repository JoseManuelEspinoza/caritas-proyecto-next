import { verifySession } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { toFrontendRole } from "@/app/lib/roles";
import { redirect } from "next/navigation";
import { BrigadistasList } from "@/app/ui/brigadistas/brigadistas-list";

export default async function BrigadistasPage() {
  const session = await verifySession();
  const role = toFrontendRole(session.role);

  if (!["admin", "especialistaGRD"].includes(role)) redirect("/dashboard");

  const [brigadistas, parroquias] = await Promise.all([
    prisma.brigadistaParroquial.findMany({
      orderBy: [{ estado: "asc" }, { nombres: "asc" }],
      select: {
        idBrigadistaParroquial: true,
        nombres: true,
        apellidos: true,
        dni: true,
        celular: true,
        correo: true,
        disponibilidad: true,
        estado: true,
        fechaRegistro: true,
        parroquia: {
          select: { idParroquia: true, nombre: true },
        },
      },
    }),
    prisma.parroquia.findMany({
      where: { estado: "ACTIVO" },
      orderBy: { nombre: "asc" },
      select: { idParroquia: true, nombre: true },
    }),
  ]);

  const stats = {
    total: brigadistas.length,
    activos: brigadistas.filter((b) => b.estado === "ACTIVO").length,
    disponibles: brigadistas.filter(
      (b) => b.disponibilidad === "DISPONIBLE" && b.estado === "ACTIVO"
    ).length,
    enCampo: brigadistas.filter((b) => b.disponibilidad === "EN CAMPO").length,
  };

  return (
    <BrigadistasList
      canEdit={role === "admin"}
      brigadistas={brigadistas.map((b) => ({
        id: b.idBrigadistaParroquial,
        nombres: b.nombres,
        apellidos: b.apellidos,
        dni: b.dni,
        celular: b.celular,
        correo: b.correo,
        disponibilidad: b.disponibilidad,
        estado: b.estado,
        fechaRegistro: b.fechaRegistro.toISOString(),
        parroquia: b.parroquia ? { id: b.parroquia.idParroquia, nombre: b.parroquia.nombre } : null,
      }))}
      parroquias={parroquias.map((p) => ({ id: p.idParroquia, nombre: p.nombre }))}
      stats={stats}
    />
  );
}
