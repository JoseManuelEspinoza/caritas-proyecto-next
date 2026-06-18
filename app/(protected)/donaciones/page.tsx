import { verifySession } from "@/app/lib/dal";
import { toFrontendRole } from "@/app/lib/roles";
import { redirect } from "next/navigation";
import { prisma } from "@/app/lib/prisma";
import { DonacionesModule, type Caso, type ReporteComite } from "@/app/ui/donaciones/donaciones-module";
import { cargarTallyParaPagina, type TallyRondaConNombres } from "@/app/lib/comite-donaciones-tally";
import { getUsuarioGRDId } from "@/app/lib/usuario-grd";

const ESTADOS = [
  "EN EVALUACION",
  "OBSERVADO",
  "APROBADO",
  "ATENDIDO",
  "SEGUIMIENTO ABIERTO",
  "RECHAZADO",
  "CERRADO",
];

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}
function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.map(String).map((s) => s.trim()).filter(Boolean) : [];
}

export default async function DonacionesPage() {
  const session = await verifySession();
  const role = toFrontendRole(session.role);
  if (!["admin", "comite"].includes(role)) redirect("/dashboard");

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
      fechaRegistro: true,
      parroquia: { select: { nombre: true } },
      aviso: { select: { nombreInformante: true } },
      gruposFamiliares: {
        select: {
          idGrupoFamiliar: true,
          nombreReferencia: true,
          personas: { select: { nombres: true, apellidos: true } },
        },
      },
      solicitudesAyuda: {
        orderBy: { fechaSolicitud: "desc" },
        take: 1,
        select: { idSolicitud: true, tipoAyudaSolicitada: true, descripcionNecesidad: true },
      },
      informes: {
        orderBy: { fechaElaboracion: "desc" },
        select: { tipoInforme: true, contenido: true, fechaElaboracion: true },
      },
    },
  });

  const casos: Caso[] = rows.map((r) => {
    const evalInforme = r.informes.find((i) => i.tipoInforme === "EVALUACION");
    const campoInforme = r.informes.find((i) => i.tipoInforme === "CAMPO");

    let sc: Record<string, unknown> | null = null;
    if (evalInforme?.contenido) {
      try {
        sc = JSON.parse(evalInforme.contenido) as Record<string, unknown>;
      } catch {
        sc = null;
      }
    }

    // Notas del brigadista por grupo familiar (del informe de campo)
    const notasFamilias: { id: string; nota: string }[] = (() => {
      try {
        const p = campoInforme?.contenido ? JSON.parse(campoInforme.contenido) : null;
        return Array.isArray(p?.notasFamilias) ? p.notasFamilias : [];
      } catch {
        return [];
      }
    })();
    const notaDe = (refId: string) =>
      notasFamilias.find((n) => n.id === refId)?.nota?.trim() || null;

    const integrantesDe = (refId: string): string[] => {
      const g = r.gruposFamiliares.find((gf) => gf.idGrupoFamiliar === refId);
      if (!g) return [];
      return g.personas.map((p) => `${p.nombres} ${p.apellidos ?? ""}`.trim());
    };

    let reporte: ReporteComite | null = null;
    if (sc) {
      const familias = Array.isArray(sc.asignacionFamilias)
        ? (sc.asignacionFamilias as unknown[]).map((af) => {
            const a = af as Record<string, unknown>;
            const refId = asString(a.refId);
            const kits = Array.isArray(a.kits)
              ? (a.kits as unknown[]).map((k) => {
                  const kit = k as Record<string, unknown>;
                  return {
                    tipoKit: asString(kit.tipoKit),
                    articulos: Array.isArray(kit.articulos)
                      ? (kit.articulos as unknown[]).map((art) => {
                          const ar = art as Record<string, unknown>;
                          return {
                            codigo: asString(ar.codigo),
                            descripcion: asString(ar.descripcion),
                            cantidad: typeof ar.cantidad === "number" ? ar.cantidad : 1,
                          };
                        })
                      : [],
                  };
                })
              : [];
            return {
              refId,
              nombre: asString(a.nombre, "Familia"),
              integrantes: integrantesDe(refId),
              nota: notaDe(refId),
              kits: kits.filter((k) => k.articulos.length > 0),
            };
          })
        : [];

      reporte = {
        fechaInforme: evalInforme?.fechaElaboracion?.toISOString() ?? null,
        dirigidoA: asString(sc.dirigidoA, "Comité de donaciones"),
        motivo: asString(sc.motivo),
        objetivoGeneral: asString(sc.objetivoGeneral),
        objetivosEspecificos: asStringArray(sc.objetivosEspecificos),
        analisisSituacion: asString(sc.analisisSituacion),
        hallazgosTexto: asString(sc.hallazgosTexto),
        hallazgosClave: asStringArray(sc.hallazgosClave),
        conclusiones: asString(sc.conclusiones),
        nivelUrgencia: asString(sc.nivelUrgencia),
        tipoIntervencion: asString(sc.tipoIntervencion),
        familias,
      };
    }

    const totalPersonas = r.gruposFamiliares.reduce((n, g) => n + g.personas.length, 0);

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
      fechaSuceso: r.fechaRegistro.toISOString(),
      reportadoPor: r.aviso?.nombreInformante ?? null,
      familias: r.gruposFamiliares.length,
      personas: totalPersonas,
      idSolicitud: r.solicitudesAyuda[0]?.idSolicitud ?? null,
      solicitudTipo: r.solicitudesAyuda[0]?.tipoAyudaSolicitada ?? null,
      solicitudNecesidad: r.solicitudesAyuda[0]?.descripcionNecesidad ?? null,
      reporte,
    };
  });

  const canEvaluate = ["comite", "admin"].includes(role);
  const soyMiembroDelComite = session.role === "COMITEDONACIONES";
  const miIdUsuarioGRD = await getUsuarioGRDId();

  const casosEnEvaluacion = casos.filter((c) => c.estado === "EN EVALUACION");
  const tallyEntries = await Promise.all(
    casosEnEvaluacion.map(async (c) => [c.id, await cargarTallyParaPagina(c.id)] as [string, TallyRondaConNombres | null])
  );
  const tallyPorCaso: Record<string, TallyRondaConNombres | null> = Object.fromEntries(tallyEntries);

  return (
    <DonacionesModule
      casos={casos}
      canEvaluate={canEvaluate}
      soyMiembroDelComite={soyMiembroDelComite}
      miIdUsuarioGRD={miIdUsuarioGRD}
      tallyPorCaso={tallyPorCaso}
    />
  );
}
