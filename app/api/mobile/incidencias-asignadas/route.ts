import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

function requireMobileSyncKey(request: Request): NextResponse | null {
  const expected = process.env.MOBILE_SYNC_API_KEY?.trim();

  // En desarrollo permite probar sin key si no está configurada.
  // En producción conviene definir MOBILE_SYNC_API_KEY en el servidor.
  if (!expected) return null;

  const received = request.headers.get("x-mobile-sync-key")?.trim() ?? "";

  if (received !== expected) {
    return jsonError("No autorizado.", 401);
  }

  return null;
}

function decimalToNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function parseTake(value: string | null): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) return 50;

  return Math.min(Math.max(Math.trunc(parsed), 1), 200);
}


type MobileKitArticuloAsignado = {
  codigo: string;
  descripcion: string;
  cantidad: number;
};

type MobileKitAsignado = {
  uuidKitAsignado: string;
  refIdFamilia: string;
  nombreFamilia: string;
  tipoKit: string;
  articulos: MobileKitArticuloAsignado[];
};

type MobileArticuloEntregado = {
  codigo: string;
  descripcion: string;
  cantidadAsignada: number;
  cantidadEntregada: number;
  confirmado: boolean;
};

type MobileKitEntregado = {
  uuidKitAsignado: string;
  refIdFamilia: string;
  nombreFamilia: string;
  tipoKit: string;
  estadoEntrega: string;
  articulos: MobileArticuloEntregado[];
};

type MobileEntregaMovil = {
  idInforme: string;
  estadoGeneral: string;
  descripcionEntrega: string;
  fechaEntrega: string | null;
  fechaSincronizacion: string | null;
  idUsuarioGRD: string | null;
  kitsEntregados: MobileKitEntregado[];
};

function parseJsonObject(raw: string | null | undefined): Record<string, unknown> | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asCantidad(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : 1;
}

function normalizarKitsAsignados(
  idIncidencia: string,
  contenidoInforme: string | null | undefined
): MobileKitAsignado[] {
  const sc = parseJsonObject(contenidoInforme);
  const asignacionFamilias = Array.isArray(sc?.asignacionFamilias)
    ? sc.asignacionFamilias
    : [];

  const resultado: MobileKitAsignado[] = [];

  for (const familiaRaw of asignacionFamilias) {
    const familia = asRecord(familiaRaw);
    if (!familia) continue;

    const refIdFamilia = asString(familia.refId);
    const nombreFamilia = asString(familia.nombre, "Familia");
    const kits = Array.isArray(familia.kits) ? familia.kits : [];

    kits.forEach((kitRaw, kitIndex) => {
      const kit = asRecord(kitRaw);
      if (!kit) return;

      const tipoKit = asString(kit.tipoKit);
      const articulosRaw = Array.isArray(kit.articulos) ? kit.articulos : [];

      const articulos = articulosRaw
        .map((artRaw): MobileKitArticuloAsignado | null => {
          const art = asRecord(artRaw);
          if (!art) return null;

          const descripcion = asString(art.descripcion);
          if (!descripcion) return null;

          return {
            codigo: asString(art.codigo),
            descripcion,
            cantidad: asCantidad(art.cantidad),
          };
        })
        .filter((art): art is MobileKitArticuloAsignado => art !== null);

      if (!tipoKit || articulos.length === 0) return;

      resultado.push({
        uuidKitAsignado: `${idIncidencia}::${refIdFamilia || "sin-familia"}::${kitIndex}`,
        refIdFamilia,
        nombreFamilia,
        tipoKit,
        articulos,
      });
    });
  }

  return resultado;
}

function normalizarEntregaMovil(
  idInforme: string,
  contenidoInforme: string | null | undefined
): MobileEntregaMovil | null {
  const sc = parseJsonObject(contenidoInforme);
  if (!sc) return null;

  const kitsRaw = Array.isArray(sc.kitsEntregados) ? sc.kitsEntregados : [];

  const kitsEntregados = kitsRaw
    .map((kitRaw): MobileKitEntregado | null => {
      const kit = asRecord(kitRaw);
      if (!kit) return null;

      const uuidKitAsignado = asString(kit.uuidKitAsignado);
      const tipoKit = asString(kit.tipoKit);
      if (!uuidKitAsignado || !tipoKit) return null;

      const articulosRaw = Array.isArray(kit.articulos) ? kit.articulos : [];

      const articulos = articulosRaw
        .map((artRaw): MobileArticuloEntregado | null => {
          const art = asRecord(artRaw);
          if (!art) return null;

          const codigo = asString(art.codigo);
          const descripcion = asString(art.descripcion, codigo);
          if (!codigo && !descripcion) return null;

          const cantidadAsignada = asCantidad(art.cantidadAsignada);
          const cantidadEntregada = Number(art.cantidadEntregada);
          const confirmado =
            art.confirmado === true ||
            String(art.confirmado ?? "").toLowerCase() === "true" ||
            (Number.isFinite(cantidadEntregada) && cantidadEntregada > 0);

          return {
            codigo,
            descripcion,
            cantidadAsignada,
            cantidadEntregada: Number.isFinite(cantidadEntregada)
              ? Math.max(0, Math.trunc(cantidadEntregada))
              : 0,
            confirmado,
          };
        })
        .filter((art): art is MobileArticuloEntregado => art !== null);

      return {
        uuidKitAsignado,
        refIdFamilia: asString(kit.refIdFamilia),
        nombreFamilia: asString(kit.nombreFamilia, "Familia"),
        tipoKit,
        estadoEntrega: asString(kit.estadoEntrega, "PENDIENTE"),
        articulos,
      };
    })
    .filter((kit): kit is MobileKitEntregado => kit !== null);

  return {
    idInforme,
    estadoGeneral: asString(sc.estadoGeneral, "PENDIENTE"),
    descripcionEntrega: asString(sc.descripcionEntrega),
    fechaEntrega: asString(sc.fechaEntrega) || null,
    fechaSincronizacion: asString(sc.fechaSincronizacion) || null,
    idUsuarioGRD: asString(sc.idUsuarioGRD) || null,
    kitsEntregados,
  };
}

export async function GET(request: Request) {
  const unauthorized = requireMobileSyncKey(request);
  if (unauthorized) return unauthorized;

  try {
    const { searchParams } = new URL(request.url);

    const FALLBACK_USUARIO_GRD = "d6deaf92-a3a3-46e6-a3ce-efed1a75c21d";

    const idUsuarioGRD =
      searchParams.get("idUsuarioGRD")?.trim() ||
      process.env.MOBILE_SYNC_USUARIO_GRD_ID?.trim() ||
      FALLBACK_USUARIO_GRD;
    const idBrigadistaParroquial = searchParams.get("idBrigadistaParroquial")?.trim();
    const estadoAsignacion = searchParams.get("estadoAsignacion")?.trim();
    const incluirCerradas = searchParams.get("incluirCerradas") === "true";
    const take = parseTake(searchParams.get("limit"));

    const brigadista = idBrigadistaParroquial
      ? await prisma.brigadistaParroquial.findUnique({
          where: { idBrigadistaParroquial },
          select: {
            idBrigadistaParroquial: true,
            idUsuarioGRD: true,
            idParroquia: true,
            nombres: true,
            apellidos: true,
            celular: true,
            correo: true,
            disponibilidad: true,
            estado: true,
          },
        })
      : await prisma.brigadistaParroquial.findFirst({
          where: { idUsuarioGRD, estado: "ACTIVO" },
          select: {
            idBrigadistaParroquial: true,
            idUsuarioGRD: true,
            idParroquia: true,
            nombres: true,
            apellidos: true,
            celular: true,
            correo: true,
            disponibilidad: true,
            estado: true,
          },
        });

    const estadoFiltro = incluirCerradas
      ? {}
      : { estadoActual: { notIn: ["CERRADA", "CANCELADA", "ANULADA"] } };

    const incidenciaSelect = {
      idIncidencia: true,
      codigoCaso: true,
      tipoEvento: true,
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
      tituloIncidencia: true,
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
      syncEstado: true,
      fechaSincronizacion: true,
      idUsuarioResponsableGRD: true,
      parroquia: {
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
        },
      },
      gruposFamiliares: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" as const },
        select: {
          idGrupoFamiliar: true,
          codigoGrupo: true,
          nombreReferencia: true,
          direccion: true,
          condicionVivienda: true,
          condicionFinal: true,
          observaciones: true,
          uuidMovil: true,
          syncEstado: true,
          fechaSincronizacion: true,
          personas: {
            where: { deletedAt: null },
            orderBy: { createdAt: "asc" as const },
            select: {
              idPersonaAfectada: true,
              tipoDocumento: true,
              numeroDocumento: true,
              nombres: true,
              apellidos: true,
              fechaNacimiento: true,
              sexo: true,
              parentesco: true,
              condicionSalud: true,
              condicionEspecial: true,
              esVulnerable: true,
              telefono: true,
              observaciones: true,
              uuidMovil: true,
              syncEstado: true,
              fechaSincronizacion: true,
            },
          },
        },
      },
    } as const;

    // ── 1. Por asignación de equipo (brigadista_parroquial) ──────────────────
    const asignaciones = brigadista
      ? await prisma.asignacionBrigadistaIncidencia.findMany({
          where: {
            idBrigadistaParroquial: brigadista.idBrigadistaParroquial,
            deletedAt: null,
            ...(estadoAsignacion
              ? { estadoAsignacion }
              : incluirCerradas
                ? {}
                : { estadoAsignacion: { notIn: ["CANCELADA", "ANULADA", "CERRADA"] } }),
            incidencia: {
              deletedAt: null,
              ...estadoFiltro,
            },
          },
          orderBy: { fechaAsignacion: "desc" },
          take,
          select: {
            idAsignacionBrigadista: true,
            idIncidencia: true,
            idBrigadistaParroquial: true,
            fechaAsignacion: true,
            fechaInicioCampo: true,
            fechaLlegadaCampo: true,
            fechaCierreCampo: true,
            estadoAsignacion: true,
            rolEnEquipo: true,
            esResponsableEquipo: true,
            origenAsignacion: true,
            progresoEvidencias: true,
            observaciones: true,
            uuidMovil: true,
            syncEstado: true,
            fechaSincronizacion: true,
            incidencia: { select: incidenciaSelect },
          },
        })
      : [];

    // ── 2. Por responsable directo (idUsuarioResponsableGRD) ─────────────────
    const idsYaIncluidos = new Set(asignaciones.map((a) => a.idIncidencia));

    const incidenciasResponsable = await prisma.incidencia.findMany({
      where: {
        idUsuarioResponsableGRD: idUsuarioGRD,
        deletedAt: null,
        ...estadoFiltro,
        // Excluir las que ya vienen por asignación para no duplicar
        ...(idsYaIncluidos.size > 0
          ? { idIncidencia: { notIn: [...idsYaIncluidos] } }
          : {}),
      },
      orderBy: { fechaRegistro: "desc" },
      take,
      select: incidenciaSelect,
    });

    // ── 3. Combinar y mapear ──────────────────────────────────────────────────
    const allIds = [
      ...asignaciones.map((a) => a.incidencia.idIncidencia),
      ...incidenciasResponsable.map((i) => i.idIncidencia),
    ].filter(Boolean);

    const tiposRef = await prisma.tipoReferencia.findMany({
      where: {
        estado: "ACTIVO",
        OR: ["INCIDENCIA", "INCIDENCIA_GRD"].map((codigo) => ({
          codigoEntidad: { equals: codigo, mode: "insensitive" as const },
        })),
      },
      select: { idTipoReferencia: true },
    });

    const idsTipoReferencia = tiposRef.map((t) => t.idTipoReferencia);

    const observaciones = allIds.length && idsTipoReferencia.length
      ? await prisma.observacionGRD.findMany({
          where: {
            idReferencia: { in: allIds },
            idTipoReferencia: { in: idsTipoReferencia },
            estado: "ACTIVO",
          },
          orderBy: { fechaRegistro: "desc" },
          select: {
            idObservacionGRD: true,
            idTipoReferencia: true,
            idReferencia: true,
            uuidMovil: true,
            textoObservacion: true,
            estado: true,
            syncEstado: true,
            fechaRegistro: true,
            fechaSincronizacion: true,
          },
        })
      : [];

    const obsPorIncidencia = new Map<string, (typeof observaciones)[number][]>();
    for (const obs of observaciones) {
      const lista = obsPorIncidencia.get(obs.idReferencia) ?? [];
      lista.push(obs);
      obsPorIncidencia.set(obs.idReferencia, lista);
    }

    const informesEvaluacion = allIds.length
      ? await prisma.informe.findMany({
          where: {
            idIncidencia: { in: allIds },
            tipoInforme: "EVALUACION",
          },
          orderBy: { fechaElaboracion: "desc" },
          select: {
            idInforme: true,
            idIncidencia: true,
            contenido: true,
            fechaElaboracion: true,
          },
        })
      : [];

    const kitsPorIncidencia = new Map<string, MobileKitAsignado[]>();
    for (const informe of informesEvaluacion) {
      if (kitsPorIncidencia.has(informe.idIncidencia)) continue;

      kitsPorIncidencia.set(
        informe.idIncidencia,
        normalizarKitsAsignados(informe.idIncidencia, informe.contenido)
      );
    }

    const informesEntregaMovil = allIds.length
      ? await prisma.informe.findMany({
          where: {
            idIncidencia: { in: allIds },
            tipoInforme: "ENTREGA_MOVIL",
          },
          orderBy: { fechaElaboracion: "desc" },
          select: {
            idInforme: true,
            idIncidencia: true,
            contenido: true,
            fechaElaboracion: true,
          },
        })
      : [];

    const entregaMovilPorIncidencia = new Map<string, MobileEntregaMovil>();
    for (const informe of informesEntregaMovil) {
      if (entregaMovilPorIncidencia.has(informe.idIncidencia)) continue;

      const entregaMovil = normalizarEntregaMovil(informe.idInforme, informe.contenido);
      if (entregaMovil) {
        entregaMovilPorIncidencia.set(informe.idIncidencia, entregaMovil);
      }
    }

    const mapIncidencia = (inc: typeof incidenciasResponsable[number]) => ({
      asignacion: null,
      kitsAsignados: kitsPorIncidencia.get(inc.idIncidencia) ?? [],
      entregaMovil: entregaMovilPorIncidencia.get(inc.idIncidencia) ?? null,
      incidencia: {
        ...inc,
        latitud: decimalToNumber(inc.latitud),
        longitud: decimalToNumber(inc.longitud),
        observaciones: obsPorIncidencia.get(inc.idIncidencia) ?? [],
        parroquia: inc.parroquia
          ? {
              ...inc.parroquia,
              latitud: decimalToNumber(inc.parroquia.latitud),
              longitud: decimalToNumber(inc.parroquia.longitud),
            }
          : null,
      },
    });

    const incidencias = [
      ...asignaciones.map((asignacion) => ({
        asignacion: {
          idAsignacionBrigadista: asignacion.idAsignacionBrigadista,
          idBrigadistaParroquial: asignacion.idBrigadistaParroquial,
          fechaAsignacion: asignacion.fechaAsignacion,
          fechaInicioCampo: asignacion.fechaInicioCampo,
          fechaLlegadaCampo: asignacion.fechaLlegadaCampo,
          fechaCierreCampo: asignacion.fechaCierreCampo,
          estadoAsignacion: asignacion.estadoAsignacion,
          rolEnEquipo: asignacion.rolEnEquipo,
          esResponsableEquipo: asignacion.esResponsableEquipo,
          origenAsignacion: asignacion.origenAsignacion,
          progresoEvidencias: asignacion.progresoEvidencias,
          observaciones: asignacion.observaciones,
          uuidMovil: asignacion.uuidMovil,
          syncEstado: asignacion.syncEstado,
          fechaSincronizacion: asignacion.fechaSincronizacion,
        },
        kitsAsignados: kitsPorIncidencia.get(asignacion.incidencia.idIncidencia) ?? [],
        entregaMovil: entregaMovilPorIncidencia.get(asignacion.incidencia.idIncidencia) ?? null,
        incidencia: {
          ...asignacion.incidencia,
          latitud: decimalToNumber(asignacion.incidencia.latitud),
          longitud: decimalToNumber(asignacion.incidencia.longitud),
          observaciones: obsPorIncidencia.get(asignacion.incidencia.idIncidencia) ?? [],
          parroquia: asignacion.incidencia.parroquia
            ? {
                ...asignacion.incidencia.parroquia,
                latitud: decimalToNumber(asignacion.incidencia.parroquia.latitud),
                longitud: decimalToNumber(asignacion.incidencia.parroquia.longitud),
              }
            : null,
        },
      })),
      ...incidenciasResponsable.map(mapIncidencia),
    ];

    return NextResponse.json({
      ok: true,
      serverTime: new Date().toISOString(),
      total: incidencias.length,
      brigadista,
      incidencias,
    });
  } catch (error) {
    console.error("[mobile/incidencias-asignadas][GET]", error);

    return jsonError("No se pudieron obtener las incidencias asignadas.", 500);
  }
}
