import { verifySession } from "@/app/lib/dal";
import { toFrontendRole } from "@/app/lib/roles";
import { redirect } from "next/navigation";
import { prisma } from "@/app/lib/prisma";
import { DonacionesModule, type Caso } from "@/app/ui/donaciones/donaciones-module";

const ESTADOS = [
  "EN EVALUACION",
  "OBSERVADO",
  "APROBADO",
  "ATENDIDO",
  "SEGUIMIENTO ABIERTO",
  "RECHAZADO",
  "CERRADO",
];

export default async function DonacionesPage() {
  const session = await verifySession();
  const role = toFrontendRole(session.role);
  if (!["admin", "comite", "jefaOGP"].includes(role)) redirect("/dashboard");

  const rows = await prisma.incidencia.findMany({
    where: { estadoActual: { in: ESTADOS } },
    orderBy: { updatedAt: "desc" },
    select: {
      idIncidencia: true,
      codigoCaso: true,
      tituloIncidencia: true,
      estadoActual: true,
      tipoEvento: true,
      gravedad: true,
      direccionEvento: true,
      descripcionEvento: true,
      parroquia: { select: { nombre: true } },
      solicitudesAyuda: {
        orderBy: { fechaSolicitud: "desc" },
        take: 1,
        select: { tipoAyudaSolicitada: true, descripcionNecesidad: true },
      },
      informes: {
        where: { tipoInforme: "EVALUACION" },
        orderBy: { fechaElaboracion: "desc" },
        take: 1,
        select: { contenido: true },
      },
    },
  });

  const casos: Caso[] = rows.map((r) => {
    let informe: Caso["informe"] = null;
    const contenido = r.informes[0]?.contenido;
    if (contenido) {
      try {
        informe = JSON.parse(contenido);
      } catch {
        informe = null;
      }
    }
    return {
      id: r.idIncidencia,
      codigo: r.codigoCaso,
      titulo: r.tituloIncidencia,
      estado: r.estadoActual,
      categoria: r.tipoEvento,
      gravedad: r.gravedad,
      parroquia: r.parroquia?.nombre ?? null,
      direccion: r.direccionEvento,
      descripcion: r.descripcionEvento,
      solicitudTipo: r.solicitudesAyuda[0]?.tipoAyudaSolicitada ?? null,
      solicitudNecesidad: r.solicitudesAyuda[0]?.descripcionNecesidad ?? null,
      informe,
    };
  });

  const canEvaluate = ["comite", "admin", "jefaOGP"].includes(role);

  return <DonacionesModule casos={casos} canEvaluate={canEvaluate} />;
}
