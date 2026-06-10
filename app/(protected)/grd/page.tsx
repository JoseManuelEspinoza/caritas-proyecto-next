import { verifySession } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";
import { toFrontendRole } from "@/app/lib/roles";
import { GrdList, type IncidenteItem } from "@/app/ui/grd/grd-list";

export default async function GrdPage() {
  const session = await verifySession();
  const role = toFrontendRole(session.role);

  // Brigadistas: filtrar solo sus incidentes asignados
  const whereClause: Record<string, any> = { deletedAt: null };

  if (role === "brigadista") {
    const usuarioGRD = await prisma.usuarioGRD.findUnique({
      where: { idCredencial: session.userId },
      select: { idUsuarioGRD: true },
    });

    const brigadista = usuarioGRD
      ? await prisma.brigadistaParroquial.findFirst({
          where: { idUsuarioGRD: usuarioGRD.idUsuarioGRD },
          select: { idBrigadistaParroquial: true },
        })
      : null;

    if (brigadista) {
      whereClause.asignaciones = {
        some: { idBrigadistaParroquial: brigadista.idBrigadistaParroquial },
      };
    } else {
      // Sin registro operativo → lista vacía por seguridad (no debe ver nada)
      return <GrdList items={[]} role={role} />;
    }
  }

  const incidencias = await prisma.incidencia.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    select: {
      idIncidencia: true,
      codigoCaso: true,
      tituloIncidencia: true,
      tipoEvento: true,
      estadoActual: true,
      direccionEvento: true,
      fechaRegistro: true,
      parroquia: { select: { nombre: true } },
      // Contamos personas via include de grupos
      gruposFamiliares: {
        select: {
          idGrupoFamiliar: true,
          personas: { select: { idPersonaAfectada: true } },
        },
      },
      asignaciones: {
        where: { estadoAsignacion: "ASIGNADA" },
        select: {
          brigadista: { select: { nombres: true, apellidos: true } },
        },
      },
    },
  });

  const items: IncidenteItem[] = incidencias.map((i) => ({
    idIncidencia: i.idIncidencia,
    codigoCaso: i.codigoCaso,
    tituloIncidencia: i.tituloIncidencia,
    tipoEvento: i.tipoEvento,
    estadoActual: i.estadoActual,
    direccionEvento: i.direccionEvento,
    fechaRegistro: i.fechaRegistro.toISOString(),
    parroquia: i.parroquia?.nombre ?? null,
    totalFamilias: i.gruposFamiliares.length,
    totalPersonas: i.gruposFamiliares.reduce((s, g) => s + g.personas.length, 0),
    brigadistas: i.asignaciones.map((a) =>
      `${a.brigadista.nombres} ${a.brigadista.apellidos ?? ""}`.trim()
    ),
  }));

  return <GrdList items={items} role={role} />;
}
