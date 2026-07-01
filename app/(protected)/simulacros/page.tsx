import { verifySession } from "@/app/lib/dal";
import { toFrontendRole } from "@/app/lib/roles";
import { redirect } from "next/navigation";
import { prisma } from "@/app/lib/prisma";
import { SimulacrosModule } from "@/app/ui/simulacros/simulacros-module";
import { cargarCatalogosSimulacro } from "@/app/lib/grd/catalogos-form";

export default async function SimulacrosPage() {
  const session = await verifySession();
  const role = toFrontendRole(session.role);
  if (!["admin", "especialistaGRD", "brigadista", "jefaOGP"].includes(role))
    redirect("/dashboard");

  const usuarioGRD = await prisma.usuarioGRD.findUnique({
    where: { idCredencial: session.userId },
    select: { idUsuarioGRD: true, nombres: true, apellidos: true },
  });

  const brigadistaPerfil = usuarioGRD
    ? await prisma.brigadistaParroquial.findFirst({
        where: { idUsuarioGRD: usuarioGRD.idUsuarioGRD },
        select: { idBrigadistaParroquial: true },
      })
    : null;

  // TipoReferencia para evidencias de simulacro
  const tipoSimulacro = await prisma.tipoReferencia.findUnique({
    where: { codigoEntidad: "SIMULACRO" },
    select: { idTipoReferencia: true },
  });

  const catalogos = await cargarCatalogosSimulacro();

  const TIPOS_FALLBACK = [
    "Simulacro de Sismo", "Simulacro de Incendio", "Simulacro de Inundación",
    "Charla de Prevención", "Taller", "Campaña",
  ];
  const tiposActividad = catalogos.tiposActividad.length > 0
    ? catalogos.tiposActividad
    : TIPOS_FALLBACK;

  const [actividades, parroquias, brigadistasDisp, evidencias] = await Promise.all([
    prisma.actividadPreventiva.findMany({
      orderBy: { updatedAt: "desc" },
      // Brigadistas solo ven sus simulacros asignados
      where: role === "brigadista" && brigadistaPerfil
        ? {
            simulacroBrigadistas: {
              some: {
                idBrigadistaParroquial: brigadistaPerfil.idBrigadistaParroquial,
                estadoAsignacion: "ASIGNADA",
              },
            },
          }
        : undefined,
      include: {
        simulacroBrigadistas: {
          where: { estadoAsignacion: "ASIGNADA" },
          include: {
            brigadista: {
              select: {
                idBrigadistaParroquial: true,
                nombres: true,
                apellidos: true,
                celular: true,
                idParroquia: true,
              },
            },
          },
        },
        observacionesSimulacro: {
          include: {
            usuario: { select: { idUsuarioGRD: true, nombres: true, apellidos: true } },
          },
          orderBy: { fechaCreacion: "asc" },
        },
        parroquia: { select: { nombre: true } },
      },
    }),

    prisma.parroquia.findMany({
      where: { estado: "ACTIVO" },
      orderBy: { nombre: "asc" },
      select: { idParroquia: true, nombre: true, latitud: true, longitud: true },
    }),

    prisma.brigadistaParroquial.findMany({
      where: {
        estado: "ACTIVO",
        OR: [{ disponibilidad: "DISPONIBLE" }, { disponibilidad: null }],
      },
      orderBy: { nombres: "asc" },
      select: {
        idBrigadistaParroquial: true,
        nombres: true,
        apellidos: true,
        celular: true,
        idParroquia: true,
        idUsuarioGRD: true,
      },
      take: 100,
    }),

    tipoSimulacro
      ? prisma.evidenciaGRD.findMany({
          where: { idTipoReferencia: tipoSimulacro.idTipoReferencia, estado: "ACTIVO" },
          select: {
            idEvidenciaGRD: true,
            idReferencia: true,
            nombreArchivo: true,
            urlArchivo: true,
            formatoArchivo: true,
            tamanoArchivo: true,
            descripcion: true,
            fechaCarga: true,
          },
          orderBy: { fechaCarga: "desc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <SimulacrosModule
      role={role}
      tiposActividad={tiposActividad}
      currentUsuarioGRDId={usuarioGRD?.idUsuarioGRD ?? null}
      currentBrigadistaId={brigadistaPerfil?.idBrigadistaParroquial ?? null}
      currentNombre={usuarioGRD ? `${usuarioGRD.nombres} ${usuarioGRD.apellidos}` : "Usuario"}
      actividades={actividades.map((a) => ({
        id: a.idActividadPreventiva,
        codigoActividad: a.codigoActividad,
        idParroquia: a.idParroquia,
        parroquiaNombre: a.parroquia.nombre,
        idTipoActividadPreventiva: a.idTipoActividadPreventiva,
        nombreActividad: a.nombreActividad,
        estadoActividad: a.estadoActividad,
        fechaProgramada: a.fechaProgramada?.toISOString() ?? null,
        horarioInicio: a.horarioInicio,
        fechaEjecucion: a.fechaEjecucion?.toISOString() ?? null,
        lugarActividad: a.lugarActividad,
        numeroParticipantesEstimado: a.numeroParticipantesEstimado,
        objetivos: a.descripcionActividad,
        recursos: a.recomendaciones,
        hallazgos: a.resultadoGeneral,
        duracionSimulacro: a.duracionSimulacro,
        participantesReales: a.numeroParticipantesReal,
        indicacionesEquipo: a.indicacionesEquipo,
        reporteBrigadista: a.reporteBrigadista,
        observaciones: a.observaciones,
        idUsuarioResponsableGRD: a.idUsuarioResponsableGRD,
        brigadistasAsignados: a.simulacroBrigadistas.map((sb) => ({
          id: sb.brigadista.idBrigadistaParroquial,
          nombre: `${sb.brigadista.nombres} ${sb.brigadista.apellidos ?? ""}`.trim(),
          esResponsable: sb.esResponsable,
          celular: sb.brigadista.celular,
          idParroquia: sb.brigadista.idParroquia,
        })),
        comentariosObservacion: a.observacionesSimulacro.map((o) => ({
          id: o.idObservacion,
          texto: o.texto,
          tipo: o.tipo as "ESPECIALISTA" | "BRIGADISTA",
          fechaCreacion: o.fechaCreacion.toISOString(),
          fechaEdicion: o.fechaEdicion?.toISOString() ?? null,
          autorNombre: `${o.usuario.nombres} ${o.usuario.apellidos}`,
          autorId: o.usuario.idUsuarioGRD,
        })),
        evidencias: evidencias
          .filter((e) => e.idReferencia === a.idActividadPreventiva)
          .map((e) => ({
            id: e.idEvidenciaGRD,
            nombreArchivo: e.nombreArchivo,
            // urlArchivo guarda el key de S3; el enlace estable lo resuelve al abrir.
            urlArchivo: e.urlArchivo.startsWith("http")
              ? e.urlArchivo
              : `/api/archivos?key=${encodeURIComponent(e.urlArchivo)}`,
            formato: e.formatoArchivo,
            tamano: e.tamanoArchivo,
            descripcion: e.descripcion,
            fecha: e.fechaCarga.toISOString(),
          })),
      }))}
      parroquias={parroquias.map((p) => ({
        id: p.idParroquia,
        nombre: p.nombre,
        lat: p.latitud != null ? Number(p.latitud) : null,
        lng: p.longitud != null ? Number(p.longitud) : null,
      }))}
      brigadistas={brigadistasDisp.map((b) => ({
        id: b.idBrigadistaParroquial,
        nombre: `${b.nombres} ${b.apellidos ?? ""}`.trim(),
        celular: b.celular,
        idParroquia: b.idParroquia,
        idUsuarioGRD: b.idUsuarioGRD,
      }))}
    />
  );
}
