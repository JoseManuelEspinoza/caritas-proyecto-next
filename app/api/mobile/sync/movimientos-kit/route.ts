import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

type TipoMovimientoNormalizado = "INGRESO" | "ENTREGA" | "REPOSICION";

type MovimientoKitMovilPayload = {
  uuidMovimiento?: string;
  uuidMovimientoKit?: string;

  idKitEmergencia?: string;
  idKitEmergenciaRemoto?: string;
  idKit?: string;
  codigoAlmacen?: string;

  idUsuarioResponsableGRD?: string;
  idUsuarioGRD?: string;

  idParroquiaDestino?: string;
  idParroquiaDestinoRemota?: string;

  idActividadPreventiva?: string;
  idActividadPreventivaRemota?: string;

  tipoMovimiento?: string;
  tipo?: string;
  cantidad?: number | string | null;
  motivoMovimiento?: string | null;
  observaciones?: string | null;
  fechaMovimiento?: string | null;
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

  if (!expected) {
    return NextResponse.json(
      { ok: false, message: "Sincronización móvil no configurada." },
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

function getUuidMovimiento(body: MovimientoKitMovilPayload): string {
  return texto(body.uuidMovimiento) || texto(body.uuidMovimientoKit);
}

function parseFecha(value?: string | null): Date {
  const limpio = texto(value);

  if (!limpio) return new Date();

  const fecha = new Date(limpio);

  if (Number.isNaN(fecha.getTime())) {
    throw new MobileSyncError("fechaMovimiento no tiene un formato válido.");
  }

  return fecha;
}

function parseCantidad(value?: number | string | null): number {
  if (value === null || value === undefined || value === "") {
    throw new MobileSyncError("cantidad es obligatoria.");
  }

  const cantidad = Number(value);

  if (!Number.isFinite(cantidad)) {
    throw new MobileSyncError("cantidad debe ser un número válido.");
  }

  if (!Number.isInteger(cantidad)) {
    throw new MobileSyncError("cantidad debe ser un número entero.");
  }

  if (cantidad <= 0) {
    throw new MobileSyncError("cantidad debe ser mayor que cero.");
  }

  return cantidad;
}

function normalizarTipoMovimiento(body: MovimientoKitMovilPayload): TipoMovimientoNormalizado {
  const raw = (texto(body.tipoMovimiento) || texto(body.tipo)).toUpperCase();

  if (raw === "INGRESO" || raw === "ENTRADA") return "INGRESO";
  if (raw === "ENTREGA" || raw === "SALIDA") return "ENTREGA";
  if (raw === "REPOSICION" || raw === "REPOSICIÓN") return "REPOSICION";

  throw new MobileSyncError(
    "tipoMovimiento debe ser INGRESO, ENTREGA o REPOSICION."
  );
}

function validarPayload(body: MovimientoKitMovilPayload): {
  uuidMovil: string;
  tipoMovimiento: TipoMovimientoNormalizado;
  cantidad: number;
} {
  const uuidMovil = getUuidMovimiento(body);

  if (!uuidMovil) {
    throw new MobileSyncError("uuidMovimiento es obligatorio.");
  }

  const tipoMovimiento = normalizarTipoMovimiento(body);
  const cantidad = parseCantidad(body.cantidad);

  if (tipoMovimiento === "ENTREGA") {
    const idParroquiaDestino =
      texto(body.idParroquiaDestinoRemota) || texto(body.idParroquiaDestino);

    if (!idParroquiaDestino) {
      throw new MobileSyncError("idParroquiaDestino es obligatorio para movimientos de ENTREGA.");
    }
  }

  parseFecha(body.fechaMovimiento);

  return {
    uuidMovil,
    tipoMovimiento,
    cantidad,
  };
}

async function resolveKit(body: MovimientoKitMovilPayload) {
  const idKitEmergencia =
    texto(body.idKitEmergenciaRemoto) ||
    texto(body.idKitEmergencia) ||
    texto(body.idKit);

  if (idKitEmergencia) {
    const kit = await prisma.kitEmergencia.findUnique({
      where: { idKitEmergencia },
      select: {
        idKitEmergencia: true,
        tipoKit: true,
        stockActual: true,
        estadoKit: true,
      },
    });

    if (kit) return kit;
  }

  const codigoAlmacen = texto(body.codigoAlmacen);

  if (codigoAlmacen) {
    const kit = await prisma.kitEmergencia.findFirst({
      where: {
        codigoAlmacen: {
          equals: codigoAlmacen,
          mode: "insensitive",
        },
      },
      select: {
        idKitEmergencia: true,
        tipoKit: true,
        stockActual: true,
        estadoKit: true,
      },
    });

    if (kit) return kit;
  }

  throw new MobileSyncError(
    "No se encontró el kit de emergencia. Envía idKitEmergenciaRemoto o idKitEmergencia."
  );
}

async function resolveUsuarioResponsableId(
  body: MovimientoKitMovilPayload
): Promise<string> {
  const idUsuarioResponsableGRD =
    texto(body.idUsuarioResponsableGRD) || texto(body.idUsuarioGRD);

  if (!idUsuarioResponsableGRD) {
    throw new MobileSyncError("idUsuarioResponsableGRD es obligatorio.");
  }

  const usuario = await prisma.usuarioGRD.findUnique({
    where: { idUsuarioGRD: idUsuarioResponsableGRD },
    select: { idUsuarioGRD: true },
  });

  if (!usuario) {
    throw new MobileSyncError("No se encontró el usuario responsable GRD indicado.");
  }

  return usuario.idUsuarioGRD;
}

async function resolveParroquiaDestinoId(
  body: MovimientoKitMovilPayload,
  tipoMovimiento: TipoMovimientoNormalizado
): Promise<string | null> {
  const idParroquiaDestino =
    texto(body.idParroquiaDestinoRemota) || texto(body.idParroquiaDestino);

  if (!idParroquiaDestino) {
    return tipoMovimiento === "ENTREGA" ? null : null;
  }

  const parroquia = await prisma.parroquia.findUnique({
    where: { idParroquia: idParroquiaDestino },
    select: { idParroquia: true, estado: true },
  });

  if (!parroquia) {
    throw new MobileSyncError("No se encontró la parroquia destino indicada.");
  }

  if (parroquia.estado !== "ACTIVO") {
    throw new MobileSyncError("La parroquia destino no está activa.");
  }

  return parroquia.idParroquia;
}

async function resolveActividadPreventivaId(
  body: MovimientoKitMovilPayload
): Promise<string | null> {
  const idActividadPreventiva =
    texto(body.idActividadPreventivaRemota) || texto(body.idActividadPreventiva);

  if (!idActividadPreventiva) return null;

  const actividad = await prisma.actividadPreventiva.findUnique({
    where: { idActividadPreventiva },
    select: { idActividadPreventiva: true },
  });

  if (!actividad) {
    throw new MobileSyncError("No se encontró la actividad preventiva indicada.");
  }

  return actividad.idActividadPreventiva;
}

export async function GET(request: Request) {
  const unauthorized = requireMobileSyncKey(request);
  if (unauthorized) return unauthorized;
  return NextResponse.json({
    ok: true,
    endpoint: "/api/mobile/sync/movimientos-kit",
    method: "POST",
    message: "Endpoint de sincronización móvil de movimientos de kits activo.",
  });
}

export async function POST(request: Request) {
  const unauthorized = requireMobileSyncKey(request);
  if (unauthorized) return unauthorized;

  let body: MovimientoKitMovilPayload;

  try {
    body = await request.json();
  } catch {
    return jsonError("Body JSON inválido.");
  }

  let datos: {
    uuidMovil: string;
    tipoMovimiento: TipoMovimientoNormalizado;
    cantidad: number;
  };

  try {
    datos = validarPayload(body);
  } catch (err) {
    if (err instanceof MobileSyncError) {
      return jsonError(err.message, err.status);
    }

    return jsonError("Payload de movimiento de kit inválido.");
  }

  try {
    const existente = await prisma.movimientoKit.findUnique({
      where: { uuidMovil: datos.uuidMovil },
      select: {
        idMovimientoKit: true,
        idKitEmergencia: true,
        idUsuarioResponsableGRD: true,
        idParroquiaDestino: true,
        tipoMovimiento: true,
        cantidad: true,
        motivoMovimiento: true,
        observaciones: true,
        fechaMovimiento: true,
        syncEstado: true,
        fechaSincronizacion: true,
        kitEmergencia: {
          select: {
            tipoKit: true,
            stockActual: true,
          },
        },
      },
    });

    if (existente) {
      return NextResponse.json({
        ok: true,
        duplicated: true,
        uuidMovimiento: datos.uuidMovil,
        idMovimientoKitRemoto: existente.idMovimientoKit,
        idServidor: existente.idMovimientoKit,
        idKitEmergenciaRemoto: existente.idKitEmergencia,
        tipoKit: existente.kitEmergencia.tipoKit,
        stockActual: existente.kitEmergencia.stockActual,
        idUsuarioResponsableGRD: existente.idUsuarioResponsableGRD,
        idParroquiaDestino: existente.idParroquiaDestino,
        tipoMovimiento: existente.tipoMovimiento,
        cantidad: existente.cantidad,
        motivoMovimiento: existente.motivoMovimiento,
        observaciones: existente.observaciones,
        fechaMovimiento: existente.fechaMovimiento,
        syncEstado: existente.syncEstado ?? "SINCRONIZADO",
        fechaSincronizacion: existente.fechaSincronizacion,
      });
    }

    const kit = await resolveKit(body);

    if (kit.estadoKit !== "ACTIVO") {
      return jsonError("El kit de emergencia no está activo.");
    }

    const idUsuarioResponsableGRD = await resolveUsuarioResponsableId(body);
    const idParroquiaDestino = await resolveParroquiaDestinoId(
      body,
      datos.tipoMovimiento
    );

    if (datos.tipoMovimiento === "ENTREGA" && !idParroquiaDestino) {
      return jsonError("idParroquiaDestino es obligatorio para movimientos de ENTREGA.");
    }

    const idActividadPreventiva = await resolveActividadPreventivaId(body);

    const delta = datos.tipoMovimiento === "ENTREGA" ? -datos.cantidad : datos.cantidad;
    const stockAnterior = kit.stockActual;
    const stockNuevo = stockAnterior + delta;

    if (stockNuevo < 0) {
      return jsonError(
        `Stock insuficiente: hay ${stockAnterior} y se intentan entregar ${datos.cantidad}.`
      );
    }

    const fechaSincronizacion = new Date();

    const resultado = await prisma.$transaction(async (tx) => {
      const kitActualizado = await tx.kitEmergencia.update({
        where: { idKitEmergencia: kit.idKitEmergencia },
        data: {
          stockActual: stockNuevo,
        },
        select: {
          idKitEmergencia: true,
          tipoKit: true,
          stockActual: true,
        },
      });

      const movimiento = await tx.movimientoKit.create({
        data: {
          idKitEmergencia: kit.idKitEmergencia,
          idUsuarioResponsableGRD,
          idParroquiaDestino,
          idActividadPreventiva,
          tipoMovimiento: datos.tipoMovimiento,
          cantidad: datos.cantidad,
          motivoMovimiento: texto(body.motivoMovimiento) || null,
          observaciones: texto(body.observaciones) || null,
          fechaMovimiento: parseFecha(body.fechaMovimiento),
          uuidMovil: datos.uuidMovil,
          syncEstado: "SINCRONIZADO",
          fechaSincronizacion,
        },
        select: {
          idMovimientoKit: true,
          idKitEmergencia: true,
          idUsuarioResponsableGRD: true,
          idParroquiaDestino: true,
          tipoMovimiento: true,
          cantidad: true,
          motivoMovimiento: true,
          observaciones: true,
          fechaMovimiento: true,
          syncEstado: true,
          fechaSincronizacion: true,
        },
      });

      return {
        kit: kitActualizado,
        movimiento,
      };
    });

    return NextResponse.json({
      ok: true,
      duplicated: false,
      uuidMovimiento: datos.uuidMovil,
      idMovimientoKitRemoto: resultado.movimiento.idMovimientoKit,
      idServidor: resultado.movimiento.idMovimientoKit,
      idKitEmergenciaRemoto: resultado.movimiento.idKitEmergencia,
      tipoKit: resultado.kit.tipoKit,
      stockAnterior,
      stockActual: resultado.kit.stockActual,
      idUsuarioResponsableGRD: resultado.movimiento.idUsuarioResponsableGRD,
      idParroquiaDestino: resultado.movimiento.idParroquiaDestino,
      tipoMovimiento: resultado.movimiento.tipoMovimiento,
      cantidad: resultado.movimiento.cantidad,
      motivoMovimiento: resultado.movimiento.motivoMovimiento,
      observaciones: resultado.movimiento.observaciones,
      fechaMovimiento: resultado.movimiento.fechaMovimiento,
      syncEstado: resultado.movimiento.syncEstado,
      fechaSincronizacion: resultado.movimiento.fechaSincronizacion,
    });
  } catch (err) {
    if (err instanceof MobileSyncError) {
      return jsonError(err.message, err.status);
    }

    console.error("[Mobile Sync][MovimientosKit]", err);

    return jsonError("No se pudo sincronizar el movimiento de kit móvil.", 500);
  }
}