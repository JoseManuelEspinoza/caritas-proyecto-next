import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

type ArticuloEntregadoPayload = {
  uuidArticuloAsignado?: string | null;
  codigo?: string | null;
  descripcion?: string | null;
  cantidadAsignada?: number | string | null;
  cantidadEntregada?: number | string | null;
  confirmado?: boolean | string | null;
};

type KitEntregadoPayload = {
  uuidKitAsignado?: string | null;
  uuidGrupoFamiliar?: string | null;
  idGrupoFamiliar?: string | null;
  refIdFamilia?: string | null;
  uuidAfectadoMovil?: string | null;
  idPersonaAfectadaRemota?: string | null;
  tipoKit?: string | null;
  estadoEntrega?: string | null;
  articulos?: ArticuloEntregadoPayload[] | null;
};

type FinalizarEntregaPayload = {
  uuidIncidencia?: string | null;
  uuidReferencia?: string | null;
  uuidMovil?: string | null;
  idIncidenciaRemota?: string | null;
  idIncidencia?: string | null;
  idReferenciaRemota?: string | null;
  codigoCaso?: string | null;
  fechaFinalizacion?: string | null;
  kitsEntregados?: KitEntregadoPayload[] | null;
};

class MobileSyncError extends Error {
  constructor(
    message: string,
    readonly status = 400,
    readonly extra?: Record<string, unknown>
  ) {
    super(message);
  }
}

function jsonError(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, message, ...extra }, { status });
}

function requireMobileSyncKey(request: Request): NextResponse | null {
  const expected = process.env.MOBILE_SYNC_API_KEY?.trim();

  if (!expected) {
    return NextResponse.json(
      { ok: false, message: "Sincronizacion movil no configurada." },
      { status: 503 }
    );
  }

  const received = request.headers.get("x-mobile-sync-key")?.trim() ?? "";

  if (received !== expected) {
    return jsonError("No autorizado.", 401);
  }

  return null;
}

function texto(value?: string | null): string {
  return value?.trim() ?? "";
}

function parseBoolean(value?: boolean | string | null): boolean {
  if (value === true) return true;
  if (typeof value !== "string") return false;

  return ["true", "1", "si", "yes"].includes(value.trim().toLowerCase());
}

function parseCantidad(value?: number | string | null): number {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
}

function parseFechaFinalizacion(value?: string | null): Date {
  const limpio = texto(value);
  if (!limpio) return new Date();

  const fecha = new Date(limpio);
  if (Number.isNaN(fecha.getTime())) {
    throw new MobileSyncError("fechaFinalizacion no tiene un formato valido.");
  }

  return fecha;
}

function parseInformeJson(raw: string | null | undefined): Record<string, unknown> | null {
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

function refsFamiliasAprobadas(contenido: string | null | undefined): string[] {
  const parsed = parseInformeJson(contenido);
  const asignaciones = Array.isArray(parsed?.asignacionFamilias)
    ? parsed.asignacionFamilias
    : [];

  return [
    ...new Set(
      asignaciones
        .map((item) => {
          const row = item as Record<string, unknown>;
          return typeof row.refId === "string" ? row.refId.trim() : "";
        })
        .filter(Boolean)
    ),
  ];
}

function validarKitsEntregados(body: FinalizarEntregaPayload): void {
  if (!("kitsEntregados" in body)) return;

  const kits = Array.isArray(body.kitsEntregados) ? body.kitsEntregados : [];
  if (kits.length === 0) {
    throw new MobileSyncError("kitsEntregados no puede estar vacio.", 409);
  }

  const incompletos = kits
    .map((kit, index) => {
      const estado = texto(kit.estadoEntrega).toUpperCase();
      const articulos = Array.isArray(kit.articulos) ? kit.articulos : [];
      const articulosCompletos =
        articulos.length > 0 &&
        articulos.every((art) => parseBoolean(art.confirmado) && parseCantidad(art.cantidadEntregada) > 0);

      const valido = estado === "ENTREGADO" || (estado === "PARCIAL" && articulosCompletos);
      if (valido) return null;

      return texto(kit.uuidKitAsignado) || texto(kit.tipoKit) || `kit-${index + 1}`;
    })
    .filter((kit): kit is string => kit !== null);

  if (incompletos.length > 0) {
    throw new MobileSyncError("Hay kits sin entrega completa.", 409, {
      kitsIncompletos: incompletos,
    });
  }
}

async function resolveIncidencia(body: FinalizarEntregaPayload) {
  const idIncidencia =
    texto(body.idIncidenciaRemota) ||
    texto(body.idIncidencia) ||
    texto(body.idReferenciaRemota);

  if (idIncidencia) {
    const incidencia = await prisma.incidencia.findUnique({
      where: { idIncidencia },
      select: {
        idIncidencia: true,
        codigoCaso: true,
        uuidMovil: true,
        estadoActual: true,
      },
    });

    if (incidencia) return incidencia;
  }

  const uuidMovil =
    texto(body.uuidIncidencia) ||
    texto(body.uuidReferencia) ||
    texto(body.uuidMovil);

  if (uuidMovil) {
    const incidencia = await prisma.incidencia.findUnique({
      where: { uuidMovil },
      select: {
        idIncidencia: true,
        codigoCaso: true,
        uuidMovil: true,
        estadoActual: true,
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
        uuidMovil: true,
        estadoActual: true,
      },
    });

    if (incidencia) return incidencia;
  }

  throw new MobileSyncError("No se pudo resolver la incidencia indicada.", 404);
}

export async function POST(request: Request) {
  const unauthorized = requireMobileSyncKey(request);
  if (unauthorized) return unauthorized;

  try {
    const body = (await request.json()) as FinalizarEntregaPayload;
    const incidencia = await resolveIncidencia(body);

    if (incidencia.estadoActual === "ATENDIDO") {
      return NextResponse.json({
        ok: true,
        estadoIncidencia: "ATENDIDO",
        incidenciaAtendida: true,
        message: "La incidencia ya estaba atendida.",
      });
    }

    if (incidencia.estadoActual !== "APROBADO") {
      throw new MobileSyncError(
        `No se puede finalizar entrega desde el estado ${incidencia.estadoActual}.`,
        409,
        {
          estadoIncidencia: incidencia.estadoActual,
          incidenciaAtendida: false,
        }
      );
    }

    validarKitsEntregados(body);

    const informe = await prisma.informe.findFirst({
      where: {
        idIncidencia: incidencia.idIncidencia,
        tipoInforme: "EVALUACION",
      },
      orderBy: { fechaElaboracion: "desc" },
      select: { contenido: true },
    });

    const refsAprobadas = refsFamiliasAprobadas(informe?.contenido);
    if (refsAprobadas.length === 0) {
      throw new MobileSyncError(
        "El informe aprobado no registra familias/kits para entregar.",
        409,
        {
          estadoIncidencia: incidencia.estadoActual,
          incidenciaAtendida: false,
        }
      );
    }

    const entregas = await prisma.entregaAyudaHumanitaria.findMany({
      where: {
        idIncidencia: incidencia.idIncidencia,
        idGrupoFamiliar: { in: refsAprobadas },
        deletedAt: null,
      },
      select: { idGrupoFamiliar: true },
    });

    const entregadas = new Set(entregas.map((e) => e.idGrupoFamiliar).filter(Boolean));
    const entregasFaltantes = refsAprobadas.filter((ref) => !entregadas.has(ref));

    if (entregasFaltantes.length > 0) {
      return jsonError("Aun hay familias/kits sin entrega confirmada.", 409, {
        estadoIncidencia: "APROBADO",
        incidenciaAtendida: false,
        entregasFaltantes,
      });
    }

    const fechaFinalizacion = parseFechaFinalizacion(body.fechaFinalizacion);

    await prisma.$transaction(async (tx) => {
      await tx.incidencia.update({
        where: { idIncidencia: incidencia.idIncidencia },
        data: {
          estadoActual: "ATENDIDO",
          syncEstado: "SINCRONIZADO",
          fechaSincronizacion: fechaFinalizacion,
        },
      });

      await tx.historialEstadoIncidencia.create({
        data: {
          idIncidencia: incidencia.idIncidencia,
          estadoAnterior: incidencia.estadoActual,
          estadoNuevo: "ATENDIDO",
          motivoCambio: "FINALIZAR_ENTREGA_MOVIL",
          observaciones: "Entrega finalizada desde la aplicacion movil.",
          syncEstado: "SINCRONIZADO",
          fechaSincronizacion: fechaFinalizacion,
        },
      });
    });

    return NextResponse.json({
      ok: true,
      estadoIncidencia: "ATENDIDO",
      incidenciaAtendida: true,
      message: "Entrega finalizada.",
    });
  } catch (error) {
    if (error instanceof MobileSyncError) {
      return jsonError(error.message, error.status, error.extra);
    }

    console.error("[mobile/sync/finalizar-entrega][POST]", error);
    return jsonError("No se pudo finalizar la entrega.", 500);
  }
}
