import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { isS3Configured, presignGet } from "@/app/lib/s3";

export const dynamic = "force-dynamic";

const FALLBACK_USUARIO_GRD = "d6deaf92-a3a3-46e6-a3ce-efed1a75c21d";

const ESTADOS_ASIGNACION_ACTIVOS = ["ASIGNADA", "EN_CAMPO"];
const ESTADOS_INCIDENCIA_ACTIVOS = ["ABIERTO", "ASIGNADO", "EN EVALUACION", "DATA RECOPILADA", "EN CAMPO"];

function decimalToNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const idUsuarioGRD =
      searchParams.get("idUsuarioGRD")?.trim() || FALLBACK_USUARIO_GRD;

    // 1. Buscar brigadista
    const brigadista = await prisma.brigadistaParroquial.findFirst({
      where: { idUsuarioGRD, estado: "ACTIVO" },
      select: { idBrigadistaParroquial: true, nombres: true, apellidos: true },
    });

    // 2. Incidencias por asignación activa
    const porAsignacion = brigadista
      ? await prisma.incidencia.findMany({
          where: {
            deletedAt: null,
            estadoActual: { in: ESTADOS_INCIDENCIA_ACTIVOS },
            asignaciones: {
              some: {
                idBrigadistaParroquial: brigadista.idBrigadistaParroquial,
                estadoAsignacion: { in: ESTADOS_ASIGNACION_ACTIVOS },
                deletedAt: null,
              },
            },
          },
          select: incidenciaSelect,
        })
      : [];

    // 3. Incidencias como responsable directo (sin duplicar)
    const idsYaIncluidos = new Set(porAsignacion.map((i) => i.idIncidencia));

    const porResponsable = await prisma.incidencia.findMany({
      where: {
        idUsuarioResponsableGRD: idUsuarioGRD,
        deletedAt: null,
        estadoActual: { in: ESTADOS_INCIDENCIA_ACTIVOS },
        ...(idsYaIncluidos.size > 0
          ? { idIncidencia: { notIn: [...idsYaIncluidos] } }
          : {}),
      },
      select: incidenciaSelect,
    });

    const todas = [...porAsignacion, ...porResponsable];

    // Cargar evidencias de todas las incidencias
    const idsIncidencias = todas.map((i) => i.idIncidencia);
    const evidenciasDB = idsIncidencias.length
      ? await prisma.evidenciaGRD.findMany({
          where: { idReferencia: { in: idsIncidencias }, estado: "ACTIVO", deletedAt: null },
          select: {
            idEvidenciaGRD: true,
            idReferencia: true,
            uuidMovil: true,
            nombreArchivo: true,
            urlArchivo: true,
            formatoArchivo: true,
            descripcion: true,
            tamanoArchivo: true,
          },
          orderBy: { fechaCarga: "asc" },
        })
      : [];

    const s3Ok = isS3Configured();
    const evidenciasConUrl = await Promise.all(
      evidenciasDB.map(async (ev) => {
        let urlFirmada = ev.urlArchivo;
        if (ev.urlArchivo && s3Ok && !/^https?:\/\//i.test(ev.urlArchivo)) {
          try { urlFirmada = await presignGet(ev.urlArchivo); } catch { /* ignora */ }
        }
        return { ...ev, urlFirmada };
      })
    );

    const evidenciasPorIncidencia = new Map<string, typeof evidenciasConUrl>();
    for (const ev of evidenciasConUrl) {
      const lista = evidenciasPorIncidencia.get(ev.idReferencia) ?? [];
      lista.push(ev);
      evidenciasPorIncidencia.set(ev.idReferencia, lista);
    }

    const incidencias = todas.map((inc) => ({
      incidencia: {
        ...inc,
        latitud: decimalToNumber(inc.latitud),
        longitud: decimalToNumber(inc.longitud),
        evidencias: evidenciasPorIncidencia.get(inc.idIncidencia) ?? [],
        parroquia: inc.parroquia
          ? {
              ...inc.parroquia,
              latitud: decimalToNumber(inc.parroquia.latitud),
              longitud: decimalToNumber(inc.parroquia.longitud),
            }
          : null,
      },
    }));

    return NextResponse.json({
      ok: true,
      serverTime: new Date().toISOString(),
      total: incidencias.length,
      incidencias,
    });
  } catch (error) {
    console.error("[mobile/mis-incidencias][GET]", error);
    return NextResponse.json({ ok: false, message: "Error al obtener incidencias." }, { status: 500 });
  }
}

const incidenciaSelect = {
  idIncidencia: true,
  codigoCaso: true,
  tipoEvento: true,
  tituloIncidencia: true,
  descripcionEvento: true,
  estadoActual: true,
  fechaRegistro: true,
  fechaSuceso: true,
  horaSuceso: true,
  distritoEvento: true,
  direccionEvento: true,
  referenciaEvento: true,
  latitud: true,
  longitud: true,
  gravedad: true,
  numAfectadosReportado: true,
  relatoActual: true,
  causaEvento: true,
  necesidades: true,
  necesidadesObs: true,
  observacionesGenerales: true,
  reportadoPorNombre: true,
  reportadoPorDni: true,
  reportadoPorCelular: true,
  reportadoPorRol: true,
  parroquiaNombreSnapshot: true,
  contextoCaso: true,
  uuidMovil: true,
  parroquia: {
    select: {
      idParroquia: true,
      nombre: true,
      latitud: true,
      longitud: true,
    },
  },
  gruposFamiliares: {
    where: { deletedAt: null },
    select: {
      idGrupoFamiliar: true,
      codigoGrupo: true,
      nombreReferencia: true,
      direccion: true,
      uuidMovil: true,
      personas: {
        where: { deletedAt: null },
        select: {
          idPersonaAfectada: true,
          nombres: true,
          apellidos: true,
          tipoDocumento: true,
          numeroDocumento: true,
          fechaNacimiento: true,
          sexo: true,
          parentesco: true,
          condicionSalud: true,
          esVulnerable: true,
          telefono: true,
          uuidMovil: true,
        },
      },
    },
  },
} as const;
