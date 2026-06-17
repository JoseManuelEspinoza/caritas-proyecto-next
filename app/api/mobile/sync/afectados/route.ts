import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

type AfectadoMovilPayload = {
  uuidAfectado?: string;
  uuidPersonaAfectada?: string;

  idIncidencia?: string;
  idIncidenciaRemota?: string;
  idServidor?: string;
  uuidIncidencia?: string;
  uuidIncidenciaMovil?: string;
  uuidReferencia?: string;
  codigoCaso?: string;

  codigoGrupo?: string;
  nombreReferencia?: string;
  direccion?: string;
  condicionVivienda?: string;
  condicionFinal?: string;
  observacionesGrupo?: string;

  tipoDocumento?: string;
  tipoIdentificacion?: string;
  numeroDocumento?: string;
  documentoIdentidad?: string;
  dni?: string;

  nombres?: string;
  apellidos?: string;
  fechaNacimiento?: string | null;
  sexo?: string | null;
  parentesco?: string | null;
  condicionSalud?: string | null;
  condicionEspecial?: string | null;
  esVulnerable?: boolean | string | null;
  telefono?: string | null;
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

function getUuidAfectado(body: AfectadoMovilPayload): string {
  return texto(body.uuidAfectado) || texto(body.uuidPersonaAfectada);
}

function parseFechaOpcional(value?: string | null): Date | null {
  const limpio = texto(value);

  if (!limpio) return null;

  const fecha = new Date(limpio);

  if (Number.isNaN(fecha.getTime())) {
    throw new MobileSyncError("fechaNacimiento no tiene un formato válido.");
  }

  return fecha;
}

function parseBooleanOpcional(value?: boolean | string | null): boolean {
  if (value === null || value === undefined || value === "") return false;

  if (typeof value === "boolean") return value;

  const limpio = value.trim().toLowerCase();

  if (["true", "1", "si", "sí", "yes"].includes(limpio)) return true;
  if (["false", "0", "no"].includes(limpio)) return false;

  throw new MobileSyncError("esVulnerable debe ser verdadero o falso.");
}

function getTipoDocumento(body: AfectadoMovilPayload): string | null {
  return texto(body.tipoDocumento) || texto(body.tipoIdentificacion) || null;
}

function getNumeroDocumento(body: AfectadoMovilPayload): string | null {
  return (
    texto(body.numeroDocumento) ||
    texto(body.documentoIdentidad) ||
    texto(body.dni) ||
    null
  );
}

function validarPayload(body: AfectadoMovilPayload): string {
  const uuidMovil = getUuidAfectado(body);

  if (!uuidMovil) {
    throw new MobileSyncError("uuidAfectado es obligatorio.");
  }

  const nombres = texto(body.nombres);

  if (!nombres) {
    throw new MobileSyncError("nombres es obligatorio.");
  }

  if (nombres.length < 2) {
    throw new MobileSyncError("nombres debe tener al menos 2 caracteres.");
  }

  const numeroDocumento = getNumeroDocumento(body);

  if (numeroDocumento && numeroDocumento.length < 6) {
    throw new MobileSyncError("numeroDocumento debe tener al menos 6 caracteres.");
  }

  parseFechaOpcional(body.fechaNacimiento);
  parseBooleanOpcional(body.esVulnerable);

  return uuidMovil;
}

async function resolveIncidencia(body: AfectadoMovilPayload): Promise<{
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
    "No se encontró la incidencia asociada al afectado. Envía idIncidenciaRemota, uuidIncidencia o codigoCaso."
  );
}

function buildCodigoGrupo(
  body: AfectadoMovilPayload,
  incidencia: { idIncidencia: string; codigoCaso: string | null }
): string {
  return (
    texto(body.codigoGrupo) ||
    `MOVIL-${incidencia.codigoCaso ?? incidencia.idIncidencia.slice(0, 8)}`
  );
}

async function resolveGrupoFamiliar(
  body: AfectadoMovilPayload,
  incidencia: { idIncidencia: string; codigoCaso: string | null }
): Promise<string> {
  const codigoGrupo = buildCodigoGrupo(body, incidencia);

  const existente = await prisma.grupoFamiliarAfectado.findFirst({
    where: {
      idIncidencia: incidencia.idIncidencia,
      codigoGrupo,
    },
    select: {
      idGrupoFamiliar: true,
    },
  });

  if (existente) return existente.idGrupoFamiliar;

  const nombreReferencia =
    texto(body.nombreReferencia) ||
    texto(body.nombres) ||
    "Grupo familiar móvil";

  const grupo = await prisma.grupoFamiliarAfectado.create({
    data: {
      idIncidencia: incidencia.idIncidencia,
      codigoGrupo,
      nombreReferencia,
      direccion: texto(body.direccion) || null,
      condicionVivienda: texto(body.condicionVivienda) || null,
      condicionFinal: texto(body.condicionFinal) || null,
      observaciones: texto(body.observacionesGrupo) || null,
    },
    select: {
      idGrupoFamiliar: true,
    },
  });

  return grupo.idGrupoFamiliar;
}

export async function GET(request: Request) {
  const unauthorized = requireMobileSyncKey(request);
  if (unauthorized) return unauthorized;
  return NextResponse.json({
    ok: true,
    endpoint: "/api/mobile/sync/afectados",
    method: "POST",
    message: "Endpoint de sincronización móvil de afectados activo.",
  });
}

export async function POST(request: Request) {
  const unauthorized = requireMobileSyncKey(request);
  if (unauthorized) return unauthorized;

  let body: AfectadoMovilPayload;

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

    return jsonError("Payload de afectado inválido.");
  }

  try {
    const existente = await prisma.personaAfectada.findUnique({
      where: { uuidMovil },
      select: {
        idPersonaAfectada: true,
        idGrupoFamiliar: true,
        uuidMovil: true,
        tipoDocumento: true,
        numeroDocumento: true,
        nombres: true,
        apellidos: true,
        esVulnerable: true,
        syncEstado: true,
        fechaSincronizacion: true,
        grupoFamiliar: {
          select: {
            idIncidencia: true,
            codigoGrupo: true,
            incidencia: {
              select: {
                codigoCaso: true,
              },
            },
          },
        },
      },
    });

    if (existente) {
      return NextResponse.json({
        ok: true,
        duplicated: true,
        uuidAfectado: uuidMovil,
        idPersonaAfectadaRemota: existente.idPersonaAfectada,
        idServidor: existente.idPersonaAfectada,
        idGrupoFamiliarRemoto: existente.idGrupoFamiliar,
        idIncidenciaRemota: existente.grupoFamiliar.idIncidencia,
        codigoCaso: existente.grupoFamiliar.incidencia.codigoCaso,
        codigoGrupo: existente.grupoFamiliar.codigoGrupo,
        tipoDocumento: existente.tipoDocumento,
        numeroDocumento: existente.numeroDocumento,
        nombres: existente.nombres,
        apellidos: existente.apellidos,
        esVulnerable: existente.esVulnerable,
        syncEstado: existente.syncEstado ?? "SINCRONIZADO",
        fechaSincronizacion: existente.fechaSincronizacion,
      });
    }

    const incidencia = await resolveIncidencia(body);
    const idGrupoFamiliar = await resolveGrupoFamiliar(body, incidencia);
    const fechaSincronizacion = new Date();

    const persona = await prisma.personaAfectada.create({
      data: {
        idGrupoFamiliar,
        tipoDocumento: getTipoDocumento(body),
        numeroDocumento: getNumeroDocumento(body),
        nombres: texto(body.nombres),
        apellidos: texto(body.apellidos) || null,
        fechaNacimiento: parseFechaOpcional(body.fechaNacimiento),
        sexo: texto(body.sexo) || null,
        parentesco: texto(body.parentesco) || null,
        condicionSalud: texto(body.condicionSalud) || null,
        condicionEspecial: texto(body.condicionEspecial) || null,
        esVulnerable: parseBooleanOpcional(body.esVulnerable),
        telefono: texto(body.telefono) || null,
        observaciones: texto(body.observaciones) || null,
        uuidMovil,
        syncEstado: "SINCRONIZADO",
        fechaSincronizacion,
      },
      select: {
        idPersonaAfectada: true,
        idGrupoFamiliar: true,
        tipoDocumento: true,
        numeroDocumento: true,
        nombres: true,
        apellidos: true,
        esVulnerable: true,
        syncEstado: true,
        fechaSincronizacion: true,
      },
    });

    return NextResponse.json({
      ok: true,
      duplicated: false,
      uuidAfectado: uuidMovil,
      idPersonaAfectadaRemota: persona.idPersonaAfectada,
      idServidor: persona.idPersonaAfectada,
      idGrupoFamiliarRemoto: persona.idGrupoFamiliar,
      idIncidenciaRemota: incidencia.idIncidencia,
      codigoCaso: incidencia.codigoCaso,
      tipoDocumento: persona.tipoDocumento,
      numeroDocumento: persona.numeroDocumento,
      nombres: persona.nombres,
      apellidos: persona.apellidos,
      esVulnerable: persona.esVulnerable,
      syncEstado: persona.syncEstado,
      fechaSincronizacion: persona.fechaSincronizacion,
    });
  } catch (err) {
    if (err instanceof MobileSyncError) {
      return jsonError(err.message, err.status);
    }

    console.error("[Mobile Sync][Afectados]", err);

    return jsonError("No se pudo sincronizar el afectado móvil.", 500);
  }
}