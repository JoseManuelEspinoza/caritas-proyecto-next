import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

type EntregaMovilPayload = {
  uuidEntrega?: string;

  idEntrega?: string;
  codigoEntrega?: string;

  idIncidencia?: string;
  idIncidenciaRemota?: string;
  idServidor?: string;
  uuidIncidencia?: string;
  uuidIncidenciaMovil?: string;
  uuidReferencia?: string;
  codigoCaso?: string;

  idSolicitud?: string;
  idSolicitudRemota?: string;

  idUsuarioResponsableGRD?: string;
  idUsuarioGRD?: string;

  idGrupoFamiliar?: string;
  idGrupoFamiliarRemoto?: string;
  uuidGrupoFamiliar?: string;
  uuidGrupoFamiliarMovil?: string;

  idPersonaAfectada?: string;
  idPersonaAfectadaRemota?: string;
  uuidPersonaAfectada?: string;
  uuidPersonaAfectadaMovil?: string;

  uuidAfectadoMovil?: string;

  fechaEntrega?: string | null;
  lugarEntrega?: string | null;
  tipoAyuda?: string | null;
  descripcionAyuda?: string | null;
  cantidadEntregada?: number | string | null;
  conformidadRecepcion?: boolean | string | null;
  entregaParcial?: boolean | string | null;
  observaciones?: string | null;
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

function parseFecha(value?: string | null): Date | null {
  const limpio = texto(value);

  if (!limpio) return new Date();

  const fecha = new Date(limpio);

  if (Number.isNaN(fecha.getTime())) {
    throw new MobileSyncError("fechaEntrega no tiene un formato válido.");
  }

  return fecha;
}

function parseCantidad(value?: number | string | null): number | null {
  if (value === null || value === undefined || value === "") return null;

  const cantidad = Number(value);

  if (!Number.isFinite(cantidad) || !Number.isInteger(cantidad)) {
    throw new MobileSyncError("cantidadEntregada debe ser un número entero.");
  }

  if (cantidad <= 0) {
    throw new MobileSyncError("cantidadEntregada debe ser mayor que cero.");
  }

  return cantidad;
}

function parseBooleanOpcional(value?: boolean | string | null): boolean | null {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "boolean") return value;

  const limpio = value.trim().toLowerCase();

  if (["true", "1", "si", "sí", "yes"].includes(limpio)) return true;
  if (["false", "0", "no"].includes(limpio)) return false;

  throw new MobileSyncError("El valor booleano recibido no es válido.");
}

function validarPayload(body: EntregaMovilPayload): string {
  const uuidMovil = texto(body.uuidEntrega);

  if (!uuidMovil) {
    throw new MobileSyncError("uuidEntrega es obligatorio.");
  }

  const tipoAyuda = texto(body.tipoAyuda);
  const descripcionAyuda = texto(body.descripcionAyuda);

  if (!tipoAyuda && !descripcionAyuda) {
    throw new MobileSyncError("Ingresa tipoAyuda o descripcionAyuda.");
  }

  if (tipoAyuda && tipoAyuda.length < 3) {
    throw new MobileSyncError("tipoAyuda debe tener al menos 3 caracteres.");
  }

  if (descripcionAyuda && descripcionAyuda.length < 5) {
    throw new MobileSyncError("descripcionAyuda debe tener al menos 5 caracteres.");
  }

  parseCantidad(body.cantidadEntregada);
  parseFecha(body.fechaEntrega);
  parseBooleanOpcional(body.conformidadRecepcion);
  parseBooleanOpcional(body.entregaParcial);

  return uuidMovil;
}

async function resolveIncidencia(body: EntregaMovilPayload): Promise<{
  idIncidencia: string;
  codigoCaso: string | null;
}> {
  const idIncidencia =
    texto(body.idIncidenciaRemota) ||
    texto(body.idIncidencia) ||
    texto(body.idServidor);

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

  const uuidIncidencia =
    texto(body.uuidIncidencia) ||
    texto(body.uuidIncidenciaMovil) ||
    texto(body.uuidReferencia);

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

  throw new MobileSyncError(
    "No se encontró la incidencia asociada a la entrega. Envía idIncidenciaRemota, uuidIncidencia o codigoCaso."
  );
}

async function resolveSolicitudId(body: EntregaMovilPayload): Promise<string | null> {
  const idSolicitud = texto(body.idSolicitudRemota) || texto(body.idSolicitud);

  if (!idSolicitud) return null;

  const solicitud = await prisma.solicitudAyudaHumanitaria.findUnique({
    where: { idSolicitud },
    select: { idSolicitud: true },
  });

  if (!solicitud) {
    throw new MobileSyncError("No se encontró la solicitud de ayuda indicada.");
  }

  return solicitud.idSolicitud;
}

async function resolveUsuarioResponsableId(
  body: EntregaMovilPayload
): Promise<string | null> {
  const idUsuarioResponsableGRD =
    texto(body.idUsuarioResponsableGRD) || texto(body.idUsuarioGRD);

  if (!idUsuarioResponsableGRD) return null;

  const usuario = await prisma.usuarioGRD.findUnique({
    where: { idUsuarioGRD: idUsuarioResponsableGRD },
    select: { idUsuarioGRD: true },
  });

  if (!usuario) {
    throw new MobileSyncError("No se encontró el usuario responsable GRD indicado.");
  }

  return usuario.idUsuarioGRD;
}

function getUuidAfectadoMovil(body: EntregaMovilPayload): string | null {
  return (
    texto(body.uuidAfectadoMovil) ||
    texto(body.uuidPersonaAfectadaMovil) ||
    texto(body.uuidPersonaAfectada) ||
    texto(body.uuidGrupoFamiliarMovil) ||
    texto(body.uuidGrupoFamiliar) ||
    null
  );
}

async function resolveGrupoFamiliarId(
  body: EntregaMovilPayload,
  idIncidencia: string
): Promise<string | null> {
  const idGrupoFamiliar =
    texto(body.idGrupoFamiliarRemoto) || texto(body.idGrupoFamiliar);

  if (idGrupoFamiliar) {
    const grupo = await prisma.grupoFamiliarAfectado.findUnique({
      where: { idGrupoFamiliar },
      select: {
        idGrupoFamiliar: true,
        idIncidencia: true,
      },
    });

    if (!grupo) {
      throw new MobileSyncError("No se encontró el grupo familiar indicado.");
    }

    if (grupo.idIncidencia !== idIncidencia) {
      throw new MobileSyncError(
        "El grupo familiar no pertenece a la incidencia indicada."
      );
    }

    return grupo.idGrupoFamiliar;
  }

  const uuidGrupoFamiliar =
    texto(body.uuidGrupoFamiliarMovil) || texto(body.uuidGrupoFamiliar);

  if (uuidGrupoFamiliar) {
    const grupo = await prisma.grupoFamiliarAfectado.findFirst({
      where: {
        uuidMovil: uuidGrupoFamiliar,
        idIncidencia,
      },
      select: {
        idGrupoFamiliar: true,
      },
    });

    if (!grupo) {
      throw new MobileSyncError(
        "No se encontró el grupo familiar móvil indicado para esta incidencia."
      );
    }

    return grupo.idGrupoFamiliar;
  }

  return null;
}

function validarPersonaAfectada(
  persona: {
    idPersonaAfectada: string;
    idGrupoFamiliar: string;
    grupoFamiliar: {
      idIncidencia: string;
    };
  },
  idIncidencia: string,
  idGrupoFamiliar: string | null
) {
  if (persona.grupoFamiliar.idIncidencia !== idIncidencia) {
    throw new MobileSyncError(
      "La persona afectada no pertenece a la incidencia indicada."
    );
  }

  if (idGrupoFamiliar && persona.idGrupoFamiliar !== idGrupoFamiliar) {
    throw new MobileSyncError(
      "La persona afectada no pertenece al grupo familiar indicado."
    );
  }
}

async function resolvePersonaAfectada(
  body: EntregaMovilPayload,
  idIncidencia: string,
  idGrupoFamiliar: string | null
): Promise<{
  idPersonaAfectada: string;
  idGrupoFamiliar: string;
} | null> {
  const idPersonaAfectada =
    texto(body.idPersonaAfectadaRemota) || texto(body.idPersonaAfectada);

  if (idPersonaAfectada) {
    const persona = await prisma.personaAfectada.findUnique({
      where: { idPersonaAfectada },
      select: {
        idPersonaAfectada: true,
        idGrupoFamiliar: true,
        grupoFamiliar: {
          select: {
            idIncidencia: true,
          },
        },
      },
    });

    if (!persona) {
      throw new MobileSyncError("No se encontró la persona afectada indicada.");
    }

    validarPersonaAfectada(persona, idIncidencia, idGrupoFamiliar);

    return {
      idPersonaAfectada: persona.idPersonaAfectada,
      idGrupoFamiliar: persona.idGrupoFamiliar,
    };
  }

  const uuidPersonaAfectada =
    texto(body.uuidPersonaAfectadaMovil) || texto(body.uuidPersonaAfectada);

  if (uuidPersonaAfectada) {
    const persona = await prisma.personaAfectada.findFirst({
      where: {
        uuidMovil: uuidPersonaAfectada,
        ...(idGrupoFamiliar ? { idGrupoFamiliar } : {}),
      },
      select: {
        idPersonaAfectada: true,
        idGrupoFamiliar: true,
        grupoFamiliar: {
          select: {
            idIncidencia: true,
          },
        },
      },
    });

    if (!persona) {
      throw new MobileSyncError(
        "No se encontró la persona afectada móvil indicada."
      );
    }

    validarPersonaAfectada(persona, idIncidencia, idGrupoFamiliar);

    return {
      idPersonaAfectada: persona.idPersonaAfectada,
      idGrupoFamiliar: persona.idGrupoFamiliar,
    };
  }

  return null;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/mobile/sync/entregas",
    method: "POST",
    message: "Endpoint de sincronización móvil de entregas activo.",
  });
}

export async function POST(request: Request) {
  const unauthorized = requireMobileSyncKey(request);
  if (unauthorized) return unauthorized;

  let body: EntregaMovilPayload;

  try {
    body = await request.json();
  } catch {
    return jsonError("Body JSON inválido.");
  }

  let uuidMovil: string;

  try {
    uuidMovil = validarPayload(body);
  } catch (err) {
    if (err instanceof MobileSyncError) {
      return jsonError(err.message, err.status);
    }

    return jsonError("Payload de entrega inválido.");
  }

  try {
    const existente = await prisma.entregaAyudaHumanitaria.findUnique({
      where: { uuidMovil },
      select: {
        idEntrega: true,
        idIncidencia: true,
        codigoEntrega: true,
        fechaEntrega: true,
        lugarEntrega: true,
        tipoAyuda: true,
        descripcionAyuda: true,
        cantidadEntregada: true,
        conformidadRecepcion: true,
        entregaParcial: true,
        observaciones: true,
        idGrupoFamiliar: true,
        idPersonaAfectada: true,
        uuidAfectadoMovil: true,
        syncEstado: true,
        fechaSincronizacion: true,
        },
    });

    if (existente) {
      return NextResponse.json({
        ok: true,
        duplicated: true,
        uuidEntrega: uuidMovil,
        idEntregaRemota: existente.idEntrega,
        idServidor: existente.idEntrega,
        idIncidenciaRemota: existente.idIncidencia,
        codigoEntrega: existente.codigoEntrega,
        fechaEntrega: existente.fechaEntrega,
        lugarEntrega: existente.lugarEntrega,
        conformidadRecepcion: existente.conformidadRecepcion,
        entregaParcial: existente.entregaParcial,
        observaciones: existente.observaciones,
        tipoAyuda: existente.tipoAyuda,
        descripcionAyuda: existente.descripcionAyuda,
        cantidadEntregada: existente.cantidadEntregada,
        syncEstado: existente.syncEstado ?? "SINCRONIZADO",
        fechaSincronizacion: existente.fechaSincronizacion,
        idGrupoFamiliar: existente.idGrupoFamiliar,
        idPersonaAfectada: existente.idPersonaAfectada,
        uuidAfectadoMovil: existente.uuidAfectadoMovil,        
      });
    }

    const incidencia = await resolveIncidencia(body);
    const idSolicitud = await resolveSolicitudId(body);
    const idUsuarioResponsableGRD = await resolveUsuarioResponsableId(body);

    const idGrupoFamiliarInicial = await resolveGrupoFamiliarId(
      body,
      incidencia.idIncidencia
    );

    const personaAfectada = await resolvePersonaAfectada(
      body,
      incidencia.idIncidencia,
      idGrupoFamiliarInicial
    );

    const idGrupoFamiliar =
      idGrupoFamiliarInicial ?? personaAfectada?.idGrupoFamiliar ?? null;

    const idPersonaAfectada = personaAfectada?.idPersonaAfectada ?? null;
    const uuidAfectadoMovil = getUuidAfectadoMovil(body);

    const fechaSincronizacion = new Date();

    const entrega = await prisma.entregaAyudaHumanitaria.create({
      data: {
        idSolicitud,
        idIncidencia: incidencia.idIncidencia,
        idUsuarioResponsableGRD,
        codigoEntrega: texto(body.codigoEntrega) || null,
        fechaEntrega: parseFecha(body.fechaEntrega),
        lugarEntrega: texto(body.lugarEntrega) || null,
        tipoAyuda: texto(body.tipoAyuda) || null,
        descripcionAyuda: texto(body.descripcionAyuda) || null,
        cantidadEntregada: parseCantidad(body.cantidadEntregada),
        conformidadRecepcion: parseBooleanOpcional(body.conformidadRecepcion),
        entregaParcial: parseBooleanOpcional(body.entregaParcial) ?? false,
        observaciones: texto(body.observaciones) || null,
        idGrupoFamiliar,
        idPersonaAfectada,
        uuidAfectadoMovil,
        uuidMovil,
        syncEstado: "SINCRONIZADO",
        fechaSincronizacion,
      },
      select: {
        idEntrega: true,
        idIncidencia: true,
        codigoEntrega: true,
        fechaEntrega: true,
        tipoAyuda: true,
        descripcionAyuda: true,
        cantidadEntregada: true,
        conformidadRecepcion: true,
        entregaParcial: true,
        idGrupoFamiliar: true,
        idPersonaAfectada: true,
        uuidAfectadoMovil: true,
        syncEstado: true,
        fechaSincronizacion: true,
      },
    });

    return NextResponse.json({
      ok: true,
      duplicated: false,
      uuidEntrega: uuidMovil,
      idEntregaRemota: entrega.idEntrega,
      idServidor: entrega.idEntrega,
      idIncidenciaRemota: entrega.idIncidencia,
      codigoCaso: incidencia.codigoCaso,
      codigoEntrega: entrega.codigoEntrega,
      fechaEntrega: entrega.fechaEntrega,
      tipoAyuda: entrega.tipoAyuda,
      descripcionAyuda: entrega.descripcionAyuda,
      cantidadEntregada: entrega.cantidadEntregada,
      conformidadRecepcion: entrega.conformidadRecepcion,
      entregaParcial: entrega.entregaParcial,
      idGrupoFamiliar: entrega.idGrupoFamiliar,
      idPersonaAfectada: entrega.idPersonaAfectada,
      uuidAfectadoMovil: entrega.uuidAfectadoMovil,
      syncEstado: entrega.syncEstado,
      fechaSincronizacion: entrega.fechaSincronizacion,
    });
  } catch (err) {
    if (err instanceof MobileSyncError) {
      return jsonError(err.message, err.status);
    }

    console.error("[Mobile Sync][Entregas]", err);

    return jsonError("No se pudo sincronizar la entrega móvil.", 500);
  }
}