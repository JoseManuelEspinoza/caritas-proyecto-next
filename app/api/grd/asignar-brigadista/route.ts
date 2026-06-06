import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/app/lib/dal";
import { makeAsignacionUseCases } from "@/core/infrastructure/factories/makeAsignacionUseCases";
import { DomainError } from "@/core/domain/errors/DomainError";
import type {
  EntradaAlgoritmo,
  ConfigAlgoritmo,
} from "@/core/application/dtos/SugerenciaBrigadistasDTO";

/**
 * RF36 — Sugerencia de brigadistas para un incidente.
 *
 * POST /api/grd/asignar-brigadista
 * Body: { idParroquia, latitud?, longitud?, tipoIncidente, config? }
 *
 * SUGIERE hasta `topN` brigadistas (no asigna). La decisión es del especialista GRD.
 */

const TipoIncidenteSchema = z.enum([
  "INCENDIO",
  "INUNDACION",
  "DERRUMBE",
  "TSUNAMI",
  "COLAPSO_INFRAESTRUCTURA",
  "PERDIDA_VIVIENDA",
]);

const ConfigSchema = z
  .object({
    pesoManual: z.number().min(0).max(1),
    pesoAutomatico: z.number().min(0).max(1),
    topN: z.number().int().positive().max(50),
  })
  .optional();

const BodySchema = z.object({
  idParroquia: z.string().min(1, "idParroquia es requerido."),
  latitud: z.number().nullish(),
  longitud: z.number().nullish(),
  tipoIncidente: TipoIncidenteSchema,
  config: ConfigSchema,
});

export async function POST(request: Request) {
  // 1) Autenticación. El RF36 lo opera el especialista GRD.
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "No autenticado." }, { status: 401 });
  }
  // (Opcional) Restringir por rol:
  // if (session.role !== 'ESPECIALISTAGRD') {
  //   return NextResponse.json({ message: 'No autorizado.' }, { status: 403 })
  // }

  // 2) Validación del cuerpo.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "JSON inválido." }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Datos inválidos." },
      { status: 400 }
    );
  }

  // 3) Ejecutar el caso de uso.
  const entrada: EntradaAlgoritmo = {
    idParroquia: parsed.data.idParroquia,
    latitud: parsed.data.latitud ?? null,
    longitud: parsed.data.longitud ?? null,
    tipoIncidente: parsed.data.tipoIncidente,
  };
  const config = parsed.data.config as ConfigAlgoritmo | undefined;

  try {
    const resultado = await makeAsignacionUseCases().sugerir.execute(entrada, config);
    return NextResponse.json(resultado, { status: 200 });
  } catch (err) {
    if (err instanceof DomainError) {
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
    console.error("[RF36] Error inesperado al sugerir brigadistas:", err);
    return NextResponse.json(
      { message: "No se pudo generar la sugerencia de brigadistas." },
      { status: 500 }
    );
  }
}
