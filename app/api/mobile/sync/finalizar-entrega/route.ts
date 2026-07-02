import { randomUUID } from "crypto";
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

type KitNormalizado = {
  uuidKitAsignado: string;
  refsFamilia: string[];
  idPersonaAfectadaRemota: string | null;
  uuidAfectadoMovil: string | null;
  tipoKit: string;
  estadoEntrega: string;
  articulos: ArticuloEntregadoPayload[];
  cantidadEntregada: number;
  esCompleto: boolean;
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

function normalizarKitsEntregados(body: FinalizarEntregaPayload): KitNormalizado[] {
  const kits = Array.isArray(body.kitsEntregados) ? body.kitsEntregados : [];

  return kits
    .map((kit, index) => {
      const articulos = Array.isArray(kit.articulos) ? kit.articulos : [];
      const estadoEntrega = texto(kit.estadoEntrega).toUpperCase();
      const articulosCompletos =
        articulos.length > 0 &&
        articulos.every((art) => parseBoolean(art.confirmado) && parseCantidad(art.cantidadEntregada) > 0);
      const esCompleto = estadoEntrega === "ENTREGADO" || (estadoEntrega === "PARCIAL" && articulosCompletos);

      const refsFamilia = [
        texto(kit.idGrupoFamiliar),
        texto(kit.refIdFamilia),
        texto(kit.uuidGrupoFamiliar),
      ].filter(Boolean);

      return {
        uuidKitAsignado: texto(kit.uuidKitAsignado) || `kit-${index + 1}`,
        refsFamilia: [...new Set(refsFamilia)],
        idPersonaAfectadaRemota: texto(kit.idPersonaAfectadaRemota),
        uuidAfectadoMovil: texto(kit.uuidAfectadoMovil),
        tipoKit: texto(kit.tipoKit) || "KIT_EMERGENCIA",
        estadoEntrega,
        articulos,
        cantidadEntregada: articulos.reduce((sum, art) => sum + parseCantidad(art.cantidadEntregada), 0),
        esCompleto,
      };
    })
    .filter((kit) => kit.uuidKitAsignado.length > 0);
}

function validarKitsEntregados(kits: KitNormalizado[]): void {
  if (kits.length === 0) {
    throw new MobileSyncError("kitsEntregados no puede estar vacio.", 409);
  }

  const incompletos = kits
    .filter((kit) => !kit.esCompleto)
    .map((kit) => kit.uuidKitAsignado || kit.tipoKit)
    .filter(Boolean);

  if (incompletos.length > 0) {
    throw new MobileSyncError("Hay kits sin entrega completa.", 409, {
      kitsIncompletos: incompletos,
    });
  }
}

function kitAplicaARef(kit: KitNormalizado, ref: string): boolean {
  return kit.refsFamilia.includes(ref);
}

function observacionesEntregaReconcilida(
  ref: string,
  kits: KitNormalizado[],
  fechaFinalizacion: Date
) {
  return JSON.stringify({
    version: 1,
    tipo: "ENTREGA_KITS_FAMILIA_RECONCILIADA_MOVIL",
    estadoEntrega: "ENTREGADO",
    origen: "finalizar-entrega",
    refIdFamilia: ref,
    fechaFinalizacion: fechaFinalizacion.toISOString(),
    kits: kits.map((kit) => ({
      uuidKitAsignado: kit.uuidKitAsignado,
      tipoKit: kit.tipoKit,
      estadoEntrega: kit.estadoEntrega,
      articulos: kit.articulos,
      cantidadEntregada: kit.cantidadEntregada,
    })),
  });
}

function kitCompletoParaRef(kits: KitNormalizado[], ref: string): KitNormalizado[] {
  return kits.filter((kit) => kitAplicaARef(kit, ref) && kit.esCompleto);
}

async function resolverPersonaOpcional(
  tx: Pick<typeof prisma, "personaAfectada">,
  kit: KitEntregadoPayload,
  ref: string
): Promise<string | null> {
  const idPersonaAfectada = texto(kit.idPersonaAfectadaRemota);
  if (!idPersonaAfectada) return null;

  const persona = await tx.personaAfectada.findUnique({
    where: { idPersonaAfectada },
    select: {
      idPersonaAfectada: true,
      idGrupoFamiliar: true,
    },
  });

  if (!persona || persona.idGrupoFamiliar !== ref) return null;
  return persona.idPersonaAfectada;
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

async function reconciliarEntregasFaltantes(
  tx: Pick<
    typeof prisma,
    "entregaAyudaHumanitaria" | "personaAfectada"
  >,
  incidenciaId: string,
  refsAprobadas: string[],
  kitsNormalizados: KitNormalizado[],
  fechaFinalizacion: Date
): Promise<string[]> {
  const entregasExistentes = await tx.entregaAyudaHumanitaria.findMany({
    where: {
      idIncidencia: incidenciaId,
      idGrupoFamiliar: { in: refsAprobadas },
      deletedAt: null,
    },
    select: { idGrupoFamiliar: true },
  });

  const entregadas = new Set(entregasExistentes.map((e) => e.idGrupoFamiliar).filter(Boolean));
  const faltantes = refsAprobadas.filter((ref) => !entregadas.has(ref));

  for (const ref of faltantes) {
    const kitsParaRef = kitCompletoParaRef(kitsNormalizados, ref);
    if (kitsParaRef.length === 0) {
      continue;
    }

    const kitPrincipal = kitsParaRef[0];
    const cantidadEntregada = kitsParaRef.reduce((sum, kit) => sum + Math.max(kit.cantidadEntregada, 1), 0);
    const idPersonaAfectada = await resolverPersonaOpcional(
      tx,
      {
        idPersonaAfectadaRemota: kitPrincipal.idPersonaAfectadaRemota ?? undefined,
      },
      ref
    );

    const existeParaRef = await tx.entregaAyudaHumanitaria.findFirst({
      where: {
        idIncidencia: incidenciaId,
        idGrupoFamiliar: ref,
        deletedAt: null,
      },
      select: { idEntrega: true },
    });

    if (existeParaRef) {
      entregadas.add(ref);
      continue;
    }

    await tx.entregaAyudaHumanitaria.create({
      data: {
        idIncidencia: incidenciaId,
        idGrupoFamiliar: ref,
        idPersonaAfectada: idPersonaAfectada ?? null,
        tipoAyuda: kitPrincipal.tipoKit || "KIT_EMERGENCIA",
        descripcionAyuda: "Entrega registrada desde finalizacion movil.",
        cantidadEntregada,
        fechaEntrega: fechaFinalizacion,
        observaciones: observacionesEntregaReconcilida(ref, kitsParaRef, fechaFinalizacion),
        syncEstado: "SINCRONIZADO",
        fechaSincronizacion: fechaFinalizacion,
        uuidMovil: `finalizar-entrega-${incidenciaId}-${ref}-${randomUUID()}`,
        conformidadRecepcion: true,
        entregaParcial: false,
      },
    });

    entregadas.add(ref);
  }

  const verificadas = await tx.entregaAyudaHumanitaria.findMany({
    where: {
      idIncidencia: incidenciaId,
      idGrupoFamiliar: { in: refsAprobadas },
      deletedAt: null,
    },
    select: { idGrupoFamiliar: true },
  });

  const entregadasFinal = new Set(verificadas.map((e) => e.idGrupoFamiliar).filter(Boolean));
  return refsAprobadas.filter((ref) => !entregadasFinal.has(ref));
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

    const kitsNormalizados = normalizarKitsEntregados(body);
    validarKitsEntregados(kitsNormalizados);

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

    const fechaFinalizacion = parseFechaFinalizacion(body.fechaFinalizacion);

    await prisma.$transaction(async (tx) => {
      const entregasFaltantes = await reconciliarEntregasFaltantes(
        tx,
        incidencia.idIncidencia,
        refsAprobadas,
        kitsNormalizados,
        fechaFinalizacion
      );

      if (entregasFaltantes.length > 0) {
        throw new MobileSyncError("Aun hay familias/kits sin entrega confirmada.", 409, {
          estadoIncidencia: "APROBADO",
          incidenciaAtendida: false,
          entregasFaltantes,
        });
      }

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
