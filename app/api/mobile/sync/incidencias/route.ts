import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { makeIncidenciaUseCases } from "@/core/infrastructure/factories/makeIncidenciaUseCases";
import { DomainError } from "@/core/domain/errors/DomainError";
import type {
  CreateIncidenteData,
  FamiliaForm,
  PersonaForm,
} from "@/core/application/dtos/IncidenciaDTO";

export const dynamic = "force-dynamic";

type AfectadoMovil = {
  uuidAfectado: string;
  idCatalogoDoc?: number | null;
  documentoIdentidad?: string | null;
  nombres?: string | null;
  apellidoPaterno?: string | null;
  apellidoMaterno?: string | null;
  edad?: number | null;
  genero?: string | null;
  celular?: string | null;
  parentesco?: string | null;
  situacionActual?: string | null;
  familiaId?: string | null;
  familiaNombre?: string | null;
};

type IncidenciaMovilPayload = {
  uuidIncidencia: string;
  uuidUsuario?: string | null;

  idParroquia?: number | null;
  parroquiaNombre?: string | null;

  idCatalogoTipo?: number | null;
  categoria?: string | null;
  categoriaNombre?: string | null;
  tipoEvento?: string | null;

  descripcion?: string | null;
  nombre?: string | null;
  numAfectados?: number | null;
  responsable?: string | null;
  estado?: string | null;
  idIncidenciaRemota?: string | null;
  fechaUltimaModificacion?: number | null;

  causa?: string | null;
  reportadoPorNombre?: string | null;
  reportadoPorCelular?: string | null;
  reportadoPorDni?: string | null;
  reportadoPorRol?: string | null;

  necesidades?: string | null;
  observacionesCampo?: string | null;
  fechaSuceso?: number | null;

  distrito?: string | null;
  direccion?: string | null;
  referencia?: string | null;
  nivelAfectacion?: string | null;
  necesidadesObs?: string | null;

  latitud?: number | null;
  longitud?: number | null;
  lat?: number | null;
  lng?: number | null;

  afectados?: AfectadoMovil[];
};

function requireMobileSyncKey(request: Request): NextResponse | null {
  const expected = process.env.MOBILE_SYNC_API_KEY;

  if (!expected) {
    return NextResponse.json(
      { ok: false, message: "Sincronización móvil no configurada." },
      { status: 503 }
    );
  }

  const provided = request.headers.get("x-mobile-sync-key");

  if (provided !== expected) {
    return NextResponse.json(
      { ok: false, message: "No autorizado para sincronización móvil." },
      { status: 401 }
    );
  }

  return null;
}

function dateOnlyFromMillis(ms?: number | null): string {
  if (!ms) return new Date().toISOString().slice(0, 10);

  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return d.toISOString().slice(0, 10);
}

function timeFromMillis(ms?: number | null): string {
  if (!ms) return "00:00";

  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "00:00";

  return d.toISOString().slice(11, 16);
}

function splitNecesidades(value?: string | null): string[] {
  if (!value?.trim()) return [];

  return value
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function buildFamilias(afectados: AfectadoMovil[]): FamiliaForm[] {
  const familias = new Map<string, FamiliaForm>();

  for (const afectado of afectados) {
    const rawId = afectado.familiaId?.trim();
    const rawNombre = afectado.familiaNombre?.trim();

    if (!rawId && !rawNombre) continue;

    const id = rawId || rawNombre || `familia-${familias.size + 1}`;

    if (!familias.has(id)) {
      familias.set(id, {
        id,
        nombre: rawNombre || `Familia ${familias.size + 1}`,
        observaciones: undefined,
      });
    }
  }

  return Array.from(familias.values());
}

function mapPersona(afectado: AfectadoMovil): PersonaForm {
  return {
    id: afectado.uuidAfectado,
    tipoDoc: afectado.idCatalogoDoc != null ? String(afectado.idCatalogoDoc) : "DNI",
    dni: afectado.documentoIdentidad ?? "",
    nombre: afectado.nombres ?? "Sin nombre",
    apellidoPaterno: afectado.apellidoPaterno ?? "",
    apellidoMaterno: afectado.apellidoMaterno ?? "",
    edad: afectado.edad != null ? String(afectado.edad) : "",
    genero: afectado.genero ?? "",
    celular: afectado.celular ?? "",
    parentesco: afectado.parentesco ?? "",
    situacionActual: afectado.situacionActual ?? "",
    familiaId: afectado.familiaId ?? undefined,
  };
}

function buildCreateIncidenteData(body: IncidenciaMovilPayload): CreateIncidenteData {
  const afectados = body.afectados ?? [];

  const categoria =
    body.categoria?.trim() ||
    body.categoriaNombre?.trim() ||
    body.tipoEvento?.trim() ||
    body.nombre?.trim() ||
    "INCIDENCIA";

  const descripcion =
    body.descripcion?.trim() ||
    body.observacionesCampo?.trim() ||
    "Incidencia registrada desde aplicación móvil.";

  const direccion = body.direccion?.trim() || "Dirección no especificada";
  const distrito = body.distrito?.trim() || "Distrito no especificado";
  const parroquia = body.parroquiaNombre?.trim() || "";

  const lat = body.lat ?? body.latitud ?? null;
  const lng = body.lng ?? body.longitud ?? null;

  return {
    reportaDni: body.reportadoPorDni?.trim() || "00000000",
    reportaNombre:
      body.reportadoPorNombre?.trim() ||
      body.responsable?.trim() ||
      "Brigadista móvil",
    reportaTel: body.reportadoPorCelular?.trim() || "000000000",
    reportaRol: body.reportadoPorRol?.trim() || "BRIGADISTA",
    fechaReporte: dateOnlyFromMillis(body.fechaUltimaModificacion),

    fechaSuceso: dateOnlyFromMillis(body.fechaSuceso ?? body.fechaUltimaModificacion),
    horaSuceso: timeFromMillis(body.fechaSuceso ?? body.fechaUltimaModificacion),

    categoria,
    pais: "Perú",
    region: "Lima",
    distrito,
    parroquia,
    direccion,
    referencia: body.referencia?.trim() || "",

    descripcion,
    causa: body.causa?.trim() || "",

    familias: buildFamilias(afectados),
    personas: afectados.map(mapPersona),

    necesidades: splitNecesidades(body.necesidades),
    necesidadOtra: "",
    necesidadesObs: body.necesidadesObs?.trim() || "",

    nivelAfectacion: body.nivelAfectacion?.trim() || "",

    lat,
    lng,

    evidencias: [],
    numAfectadosReportado:
      body.numAfectados ?? (afectados.length > 0 ? afectados.length : null),

    origenRegistro: "MOVIL",
  };
}

export async function GET(request: Request) {
  const unauthorized = requireMobileSyncKey(request);
  if (unauthorized) return unauthorized;
  return NextResponse.json({
    ok: true,
    endpoint: "/api/mobile/sync/incidencias",
    method: "POST",
    message: "Endpoint de sincronización móvil de incidencias activo.",
  });
}

export async function POST(request: Request) {
  const unauthorized = requireMobileSyncKey(request);
  if (unauthorized) return unauthorized;

  let body: IncidenciaMovilPayload;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Body JSON inválido." },
      { status: 400 }
    );
  }

  const uuidMovil = body.uuidIncidencia?.trim();

  if (!uuidMovil) {
    return NextResponse.json(
      { ok: false, message: "uuidIncidencia es obligatorio." },
      { status: 400 }
    );
  }

  try {
    let existente = await prisma.incidencia.findUnique({
      where: { uuidMovil },
      select: {
        idIncidencia: true,
        codigoCaso: true,
        uuidMovil: true,
        syncEstado: true,
        fechaSincronizacion: true,
      },
    });

    // Para incidencias creadas desde la web (sin uuidMovil), buscar por idIncidencia
    if (!existente && body.idIncidenciaRemota) {
      existente = await prisma.incidencia.findUnique({
        where: { idIncidencia: body.idIncidenciaRemota },
        select: {
          idIncidencia: true,
          codigoCaso: true,
          uuidMovil: true,
          syncEstado: true,
          fechaSincronizacion: true,
        },
      });
    }

    if (existente) {
      // Si el móvil envía un estado actualizado, actualizarlo en el servidor
      const nuevoEstado = body.estado?.trim();
      const ESTADOS_VALIDOS_MOVIL = ["DATA RECOPILADA", "EN CAMPO", "ABIERTO"];
      if (nuevoEstado && ESTADOS_VALIDOS_MOVIL.includes(nuevoEstado)) {
        await prisma.incidencia.update({
          where: { idIncidencia: existente.idIncidencia },
          data: { estadoActual: nuevoEstado },
        });
      }

      return NextResponse.json({
        ok: true,
        duplicated: true,
        uuidIncidencia: uuidMovil,
        idIncidenciaRemota: existente.idIncidencia,
        idServidor: existente.idIncidencia,
        codigoCaso: existente.codigoCaso,
        syncEstado: existente.syncEstado ?? "SINCRONIZADO",
        fechaSincronizacion: existente.fechaSincronizacion,
      });
    }

    const data = buildCreateIncidenteData(body);

    const idIncidencia = await makeIncidenciaUseCases().registrar.execute(data, null);

    const fechaSincronizacion = new Date();

    const sincronizada = await prisma.incidencia.update({
      where: { idIncidencia },
      data: {
        uuidMovil,
        syncEstado: "SINCRONIZADO",
        fechaSincronizacion,
      },
      select: {
        idIncidencia: true,
        idAviso: true,
        codigoCaso: true,
        uuidMovil: true,
        syncEstado: true,
        fechaSincronizacion: true,
      },
    });

    if (sincronizada.idAviso) {
      await prisma.avisoEmergencia.update({
        where: { idAviso: sincronizada.idAviso },
        data: {
          uuidMovil: `${uuidMovil}:aviso`,
          syncEstado: "SINCRONIZADO",
          fechaSincronizacion,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      duplicated: false,
      uuidIncidencia: uuidMovil,
      idIncidenciaRemota: sincronizada.idIncidencia,
      idServidor: sincronizada.idIncidencia,
      codigoCaso: sincronizada.codigoCaso,
      syncEstado: sincronizada.syncEstado,
      fechaSincronizacion: sincronizada.fechaSincronizacion,
    });
  } catch (err) {
    if (err instanceof DomainError) {
      return NextResponse.json(
        { ok: false, message: err.message },
        { status: 400 }
      );
    }

    console.error("[Mobile Sync][Incidencias]", err);

    return NextResponse.json(
      {
        ok: false,
        message: "No se pudo sincronizar la incidencia móvil.",
      },
      { status: 500 }
    );
  }
}