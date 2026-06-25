import { verifySession } from "@/app/lib/dal";
import { toFrontendRole } from "@/app/lib/roles";
import { redirect } from "next/navigation";
import { prisma } from "@/app/lib/prisma";
import { DonacionesModule } from "@/app/ui/donaciones/DonacionesModule";
import { getUsuarioGRDId } from "@/app/lib/usuario-grd";
import { cargarTallyParaPagina } from "@/app/lib/comite-donaciones-tally";
import { parseInforme } from "@/core/application/dtos/InformeContenidoDTO";
import type { InformeEvaluacionContenido } from "@/core/application/dtos/InformeContenidoDTO";
import type { Incident, IncidentStatus } from "@/app/lib/incident-types";

const ESTADOS_DONACION: string[] = [
  "EN EVALUACION",
  "OBSERVADO",
  "APROBADO",
  "RECHAZADO",
  "ATENDIDO",
];

export const dynamic = "force-dynamic";

export default async function DonacionesPage() {
  const session = await verifySession();
  const role = toFrontendRole(session.role);
  if (!["admin", "comite", "jefaOGP"].includes(role)) redirect("/dashboard");

  const canEvaluate = session.role === "COMITEDONACIONES" || session.role === "ADMINISTRADOR";
  const soyMiembroDelComite = session.role === "COMITEDONACIONES";
  const miIdUsuarioGRD = await getUsuarioGRDId();

  const incidencias = await prisma.incidencia.findMany({
    where: { estadoActual: { in: ESTADOS_DONACION }, deletedAt: null },
    orderBy: { fechaRegistro: "desc" },
    include: {
      parroquia: { select: { nombre: true } },
      aviso: {
        select: {
          medioAviso: true,
          descripcion: true,
          nombreInformante: true,
          telefonoInformante: true,
          dniInformante: true,
        },
      },
      gruposFamiliares: {
        include: {
          personas: {
            select: {
              idPersonaAfectada: true,
              nombres: true,
              apellidos: true,
              tipoDocumento: true,
              numeroDocumento: true,
              parentesco: true,
              fechaNacimiento: true,
              sexo: true,
              telefono: true,
            },
          },
        },
      },
      informes: {
        where: { tipoInforme: "EVALUACION" },
        orderBy: { fechaElaboracion: "desc" },
        take: 1,
        select: { contenido: true, resumen: true },
      },
      historialEstados: {
        orderBy: { fechaCambio: "desc" },
        take: 5,
        select: {
          estadoAnterior: true,
          estadoNuevo: true,
          motivoCambio: true,
          observaciones: true,
          fechaCambio: true,
        },
      },
    },
  });

  // Load tally for each EN EVALUACION case
  const tallyPorCaso: Record<string, Awaited<ReturnType<typeof cargarTallyParaPagina>>> = {};
  await Promise.all(
    incidencias
      .filter((i) => i.estadoActual === "EN EVALUACION")
      .map(async (i) => {
        tallyPorCaso[i.idIncidencia] = await cargarTallyParaPagina(i.idIncidencia);
      })
  );

  const incidents: Incident[] = incidencias.map((inc) => {
    const informe = inc.informes[0]
      ? parseInforme<InformeEvaluacionContenido>(inc.informes[0].contenido)
      : null;

    // Last OBSERVADO state change carries the committee observation text
    const histObservado = inc.historialEstados.find((h) => h.estadoNuevo === "OBSERVADO");

    const affectedPeople = inc.gruposFamiliares.flatMap((g) =>
      g.personas.map((p) => ({
        id: p.idPersonaAfectada,
        tipoDoc: (p.tipoDocumento ?? "DNI") as "DNI" | "CE" | "Pasaporte" | "Otro",
        dni: p.numeroDocumento ?? "",
        nombre: p.nombres,
        apellidoPaterno: p.apellidos ?? undefined,
        edad: p.fechaNacimiento
          ? String(new Date().getFullYear() - new Date(p.fechaNacimiento).getFullYear())
          : "",
        genero: (p.sexo === "M" ? "Masculino" : p.sexo === "F" ? "Femenino" : undefined) as
          | "Masculino"
          | "Femenino"
          | "Otro"
          | "Prefiere no decir"
          | undefined,
        celular: p.telefono ?? "",
        parentesco: p.parentesco ?? undefined,
        familiaId: g.idGrupoFamiliar,
        familiaNombre: g.idGrupoFamiliar,
      }))
    );

    return {
      id: inc.idIncidencia,
      name: inc.tituloIncidencia ?? inc.tipoEvento ?? inc.codigoCaso ?? "Sin título",
      responsible: "",
      category: inc.tipoEvento ?? "",
      fuenteAlerta: inc.aviso?.medioAviso ? [inc.aviso.medioAviso] : undefined,
      startDate: inc.fechaRegistro.toISOString().split("T")[0],
      endDate: inc.fechaRegistro.toISOString().split("T")[0],
      status: inc.estadoActual as IncidentStatus,
      location: inc.direccionEvento ?? "",
      participants: affectedPeople.length,
      description: inc.aviso?.descripcion ?? inc.descripcionEvento ?? undefined,
      distrito: inc.parroquia?.nombre ?? undefined,
      parroquia: inc.parroquia?.nombre ?? undefined,
      direccion: inc.direccionEvento ?? undefined,
      nivelAfectacion: inc.gravedad
        ? ((inc.gravedad.charAt(0).toUpperCase() +
            inc.gravedad.slice(1).toLowerCase()) as "Leve" | "Moderado" | "Severo")
        : undefined,
      numFamiliasAfectadas: inc.gruposFamiliares.length,
      affectedPeople,
      reportadoPor: inc.aviso?.nombreInformante
        ? {
            nombreCompleto: inc.aviso.nombreInformante,
            dni: inc.aviso.dniInformante ?? "",
            telefono: inc.aviso.telefonoInformante ?? "",
          }
        : undefined,
      informeEvaluacion: informe
        ? {
            fecha: "",
            elaboradoPor: "",
            analisisSituacion: informe.analisisSituacion,
            hallazgosTexto: informe.hallazgosTexto,
            conclusiones: informe.conclusiones,
            nivelUrgencia: informe.nivelUrgencia as
              | "Inmediata"
              | "Alta"
              | "Media"
              | "Baja"
              | undefined,
            tipoIntervencion: informe.tipoIntervencion as
              | "Donación en especie"
              | "Donación económica"
              | "Derivación institucional"
              | "Acompañamiento pastoral"
              | "No aplica"
              | undefined,
            descripcionAyuda: informe.conclusiones,
            recomendacionComite: informe.recomendacionComite,
            criteriosPriorizacion: informe.hallazgosClave,
            observacionesComite: histObservado?.observaciones ?? undefined,
          }
        : undefined,
      history: inc.historialEstados.map((h, idx) => ({
        id: String(idx),
        user: "",
        timestamp: h.fechaCambio.toISOString(),
        action: "cambio_estado" as const,
        prevStatus: (h.estadoAnterior ?? undefined) as IncidentStatus | undefined,
        newStatus: h.estadoNuevo as IncidentStatus,
        notes: h.observaciones ?? h.motivoCambio ?? undefined,
      })),
    };
  });

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--caritas-bg-light)" }}>
      <DonacionesModule
        canEvaluate={canEvaluate}
        currentUser={session.userId as string}
        soyMiembroDelComite={soyMiembroDelComite}
        miIdUsuarioGRD={miIdUsuarioGRD}
        tallyPorCaso={tallyPorCaso}
        incidents={incidents}
      />
    </div>
  );
}
