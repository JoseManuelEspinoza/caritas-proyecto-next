import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { logger } from "@/app/lib/logger";

export const dynamic = "force-dynamic";

function requireMobileSyncKey(request: Request): NextResponse | null {
  const expected = process.env.MOBILE_SYNC_API_KEY?.trim();
  if (!expected) {
    return NextResponse.json({ ok: false, message: "Sincronización móvil no configurada." }, { status: 503 });
  }
  const received = request.headers.get("x-mobile-sync-key")?.trim() ?? "";
  if (received !== expected) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
  }
  return null;
}

export async function POST(request: Request) {
  const unauthorized = requireMobileSyncKey(request);
  if (unauthorized) return unauthorized;

  let body: { idAfectadoRemoto?: string; uuidAfectado?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Body JSON inválido." }, { status: 400 });
  }

  const idPersonaAfectada = body.idAfectadoRemoto?.trim();
  const uuidMovil = body.uuidAfectado?.trim();

  if (!idPersonaAfectada && !uuidMovil) {
    return NextResponse.json({ ok: false, message: "Se requiere idAfectadoRemoto o uuidAfectado." }, { status: 400 });
  }

  try {
    const persona = idPersonaAfectada
      ? await prisma.personaAfectada.findUnique({
          where: { idPersonaAfectada },
          select: { idPersonaAfectada: true },
        })
      : await prisma.personaAfectada.findFirst({
          where: { uuidMovil },
          select: { idPersonaAfectada: true },
        });

    if (!persona) {
      return NextResponse.json({ ok: true, message: "Afectado no encontrado (ya eliminado)." });
    }

    await prisma.personaAfectada.update({
      where: { idPersonaAfectada: persona.idPersonaAfectada },
      data: { deletedAt: new Date() },
    });

    // H7 — Trazabilidad: dejar constancia del borrado para auditoría.
    logger.warn(
      { idPersonaAfectada: persona.idPersonaAfectada, uuidMovil, source: "mobile-sync" },
      "[Mobile Sync][Afectados Eliminar] Afectado marcado como eliminado"
    );

    return NextResponse.json({ ok: true, idPersonaAfectada: persona.idPersonaAfectada });
  } catch (err) {
    console.error("[Mobile Sync][Afectados Eliminar]", err);
    return NextResponse.json({ ok: false, message: "No se pudo eliminar el afectado." }, { status: 500 });
  }
}
