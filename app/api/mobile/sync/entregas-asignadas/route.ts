import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

type ArticuloEntregaMovil = {
  codigo?: string | null;
  descripcion?: string | null;
  cantidadAsignada?: number | string | null;
  cantidadEntregada?: number | string | null;
  confirmado?: boolean | string | null;
};

type KitEntregaMovil = {
  uuidKitAsignado?: string | null;
  refIdFamilia?: string | null;
  nombreFamilia?: string | null;
  tipoKit?: string | null;
  estadoEntrega?: string | null;
  articulos?: ArticuloEntregaMovil[] | null;
};

type EntregaAsignadaMovilPayload = {
  uuidEntregaMovil?: string | null;
  uuidEntrega?: string | null;

  idIncidenciaRemota?: string | null;
  idIncidencia?: string | null;
  codigoCaso?: string | null;
  uuidIncidencia?: string | null;

  idUsuarioGRD?: string | null;
  idUsuarioResponsableGRD?: string | null;

  fechaEntrega?: string | null;
  descripcionEntrega?: string | null;
  observaciones?: string | null;

  marcarComoAtendido?: boolean | string | null;

  kits?: KitEntregaMovil[] | null;
};

class MobileSyncError extends Error {
  constructor(
    message: string,
    readonly status = 400
  ) {
    super(message);
  }
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

function requireMobileSyncKey(request: Request): NextResponse | null {
  const expected = process.env.MOBILE_SYNC_API_KEY?.trim();

  if (!expected) return null;

  const received = request.headers.get("x-mobile-sync-key")?.trim() ?? "";

  if (received !== expected) {
    return jsonError("No autorizado.", 401);
  }

  return null;
}

function texto(value?: string | null): string {
  return value?.trim() ?? "";
}

function parseFecha(value?: string | null): Date {
  const limpio = texto(value);

  if (!limpio) return new Date();

  const fecha = new Date(limpio);

  if (Number.isNaN(fecha.getTime())) {
    throw new MobileSyncError("fechaEntrega no tiene un formato válido.");
  }

  return fecha;
}

function parseNumero(value?: number | string | null, fallback = 0): number {
  if (value === null || value === undefined || value === "") return fallback;

  const n = Number(value);

  if (!Number.isFinite(n)) return fallback;

  return Math.max(0, Math.trunc(n));
}

function parseBoolean(value?: boolean | string | null): boolean {
  if (value === null || value === undefined || value === "") return false;
  if (typeof value === "boolean") return value;

  const limpio = value.trim().toLowerCase();

  return ["true", "1", "si", "sí", "yes"].includes(limpio);
}

async function resolveIncidencia(body: EntregaAsignadaMovilPayload): Promise<{
  idIncidencia: string;
  codigoCaso: string | null;
}> {
  const idIncidencia = texto(body.idIncidenciaRemota) || texto(body.idIncidencia);

  if (idIncidencia) {
    const incidencia = await prisma.incidencia.findUnique({
      where: { idIncidencia },
      select: {
        idIncidencia: true,
        codigoCaso: true,
      },
    });

    if (incidencia) return incidencia;
  }

  const codigoCaso = texto(body.codigoCaso);

  if (codigoCaso) {
    const incidencia = await prisma.incidencia.findUnique({
      where: { codigoCaso },
      select: {
        idIncidencia: true,
        codigoCaso: true,
      },
    });

    if (incidencia) return incidencia;
  }

  const uuidIncidencia = texto(body.uuidIncidencia);

  if (uuidIncidencia) {
    const incidencia = await prisma.incidencia.findUnique({
      where: { uuidMovil: uuidIncidencia },
      select: {
        idIncidencia: true,
        codigoCaso: true,
      },
    });

    if (incidencia) return incidencia;
  }

  throw new MobileSyncError(
    "No se encontró la incidencia. Envía idIncidenciaRemota, codigoCaso o uuidIncidencia."
  );
}

async function resolveUsuarioGRD(body: EntregaAsignadaMovilPayload): Promise<string> {
  const idUsuarioGRD =
    texto(body.idUsuarioGRD) || texto(body.idUsuarioResponsableGRD);

  if (!idUsuarioGRD) {
    throw new MobileSyncError("idUsuarioGRD es obligatorio.");
  }

  const usuario = await prisma.usuarioGRD.findUnique({
    where: { idUsuarioGRD },
    select: { idUsuarioGRD: true },
  });

  if (!usuario) {
    throw new MobileSyncError("No se encontró el usuario GRD indicado.");
  }

  return usuario.idUsuarioGRD;
}

function normalizarEstadoEntrega(raw: string, articulos: ReturnType<typeof normalizarArticulos>): string {
  const estado = raw.trim().toUpperCase();

  if (estado === "ENTREGADO" || estado === "COMPLETA" || estado === "COMPLETO") {
    return "ENTREGADO";
  }

  if (estado === "PARCIAL") {
    return "PARCIAL";
  }

  const total = articulos.length;
  const confirmados = articulos.filter((a) => a.confirmado).length;

  if (total > 0 && confirmados === total) return "ENTREGADO";
  if (confirmados > 0) return "PARCIAL";

  return "PENDIENTE";
}

function normalizarArticulos(articulosRaw: ArticuloEntregaMovil[] | null | undefined) {
  const articulos = Array.isArray(articulosRaw) ? articulosRaw : [];

  return articulos
    .map((art) => {
      const codigo = texto(art.codigo);
      const descripcion = texto(art.descripcion);

      if (!codigo && !descripcion) return null;

      const cantidadAsignada = parseNumero(art.cantidadAsignada, 1);
      const confirmado = parseBoolean(art.confirmado);
      const cantidadEntregada = confirmado
        ? parseNumero(art.cantidadEntregada, cantidadAsignada)
        : parseNumero(art.cantidadEntregada, 0);

      return {
        codigo,
        descripcion: descripcion || codigo,
        cantidadAsignada: cantidadAsignada > 0 ? cantidadAsignada : 1,
        cantidadEntregada,
        confirmado: confirmado || cantidadEntregada > 0,
      };
    })
    .filter((art): art is NonNullable<typeof art> => art !== null);
}

function normalizarKits(body: EntregaAsignadaMovilPayload) {
  const kits = Array.isArray(body.kits) ? body.kits : [];

  return kits
    .map((kit) => {
      const uuidKitAsignado = texto(kit.uuidKitAsignado);
      const tipoKit = texto(kit.tipoKit);

      if (!uuidKitAsignado || !tipoKit) return null;

      const articulos = normalizarArticulos(kit.articulos);

      const estadoEntrega = normalizarEstadoEntrega(
        texto(kit.estadoEntrega),
        articulos
      );

      return {
        uuidKitAsignado,
        refIdFamilia: texto(kit.refIdFamilia),
        nombreFamilia: texto(kit.nombreFamilia) || "Familia",
        tipoKit,
        estadoEntrega,
        articulos,
      };
    })
    .filter((kit): kit is NonNullable<typeof kit> => kit !== null);
}

function resumenEstadoGeneral(kits: ReturnType<typeof normalizarKits>): string {
  if (kits.length === 0) return "SIN_KITS";

  const entregados = kits.filter((k) => k.estadoEntrega === "ENTREGADO").length;
  const parciales = kits.filter((k) => k.estadoEntrega === "PARCIAL").length;

  if (entregados === kits.length) return "COMPLETA";
  if (entregados > 0 || parciales > 0) return "PARCIAL";

  return "PENDIENTE";
}

export async function POST(request: Request) {
  const unauthorized = requireMobileSyncKey(request);
  if (unauthorized) return unauthorized;

  try {
    const body = (await request.json()) as EntregaAsignadaMovilPayload;

    const incidencia = await resolveIncidencia(body);
    const idUsuarioGRD = await resolveUsuarioGRD(body);

    const uuidEntregaMovil =
      texto(body.uuidEntregaMovil) ||
      texto(body.uuidEntrega) ||
      `entrega-asignada-${incidencia.idIncidencia}`;

    const fechaEntrega = parseFecha(body.fechaEntrega);
    const descripcionEntrega =
      texto(body.descripcionEntrega) ||
      texto(body.observaciones) ||
      "Avance de entrega registrado desde móvil.";

    const kitsEntregados = normalizarKits(body);

    if (kitsEntregados.length === 0) {
      throw new MobileSyncError("Debe enviar al menos un kit asignado.");
    }

    const estadoGeneral = resumenEstadoGeneral(kitsEntregados);

    const contenido = {
      version: 1,
      origen: "MOVIL",
      uuidEntregaMovil,
      idIncidencia: incidencia.idIncidencia,
      codigoCaso: incidencia.codigoCaso,
      idUsuarioGRD,
      fechaEntrega: fechaEntrega.toISOString(),
      fechaSincronizacion: new Date().toISOString(),
      descripcionEntrega,
      estadoGeneral,
      marcarComoAtendido: false,
      notaFlujo:
        "El móvil registra avance de entrega. El especialista marca el caso como ATENDIDO desde web.",
      kitsEntregados,
    };

    const existente = await prisma.informe.findFirst({
      where: {
        idIncidencia: incidencia.idIncidencia,
        tipoInforme: "ENTREGA_MOVIL",
      },
      orderBy: { fechaElaboracion: "desc" },
      select: {
        idInforme: true,
      },
    });

    const resumen = `Avance móvil de entrega: ${estadoGeneral}. Kits reportados: ${kitsEntregados.length}.`;

    const informe = existente
      ? await prisma.informe.update({
          where: { idInforme: existente.idInforme },
          data: {
            idUsuarioGRD,
            tituloInforme: `Avance de entrega móvil - ${incidencia.codigoCaso ?? incidencia.idIncidencia}`,
            resumen,
            contenido: JSON.stringify(contenido),
            estadoInforme: "REGISTRADO",
            fechaElaboracion: new Date(),
          },
          select: {
            idInforme: true,
            tipoInforme: true,
            estadoInforme: true,
          },
        })
      : await prisma.informe.create({
          data: {
            idIncidencia: incidencia.idIncidencia,
            idUsuarioGRD,
            tituloInforme: `Avance de entrega móvil - ${incidencia.codigoCaso ?? incidencia.idIncidencia}`,
            tipoInforme: "ENTREGA_MOVIL",
            resumen,
            contenido: JSON.stringify(contenido),
            estadoInforme: "REGISTRADO",
          },
          select: {
            idInforme: true,
            tipoInforme: true,
            estadoInforme: true,
          },
        });

    return NextResponse.json({
      ok: true,
      idInforme: informe.idInforme,
      tipoInforme: informe.tipoInforme,
      estadoInforme: informe.estadoInforme,
      estadoGeneral,
      kitsReportados: kitsEntregados.length,
      marcarComoAtendido: false,
      message: "Avance de entrega registrado. El cierre del caso queda pendiente de revisión web.",
    });
  } catch (error) {
    if (error instanceof MobileSyncError) {
      return jsonError(error.message, error.status);
    }

    console.error("[mobile/sync/entregas-asignadas][POST]", error);
    return jsonError("No se pudo registrar el avance de entrega asignada.", 500);
  }
}
