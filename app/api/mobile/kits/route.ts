import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

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

export async function GET(request: Request) {
  const unauthorized = requireMobileSyncKey(request);
  if (unauthorized) return unauthorized;

  try {
    const kits = await prisma.kitEmergencia.findMany({
      where: {
        estadoKit: "ACTIVO",
      },
      orderBy: [
        { tipoKit: "asc" },
        { fechaRegistro: "desc" },
      ],
      select: {
        idKitEmergencia: true,
        idParroquiaBeneficiaria: true,
        codigoAlmacen: true,
        tipoKit: true,
        descripcion: true,
        stockActual: true,
        estadoKit: true,
        fechaRegistro: true,
        ubicacionAlmacen: true,
        observaciones: true,
        articulos: {
          orderBy: [
            { orden: "asc" },
            { descripcion: "asc" },
          ],
          select: {
            idKitArticulo: true,
            codigo: true,
            descripcion: true,
            cantidad: true,
            orden: true,
          },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      serverTime: new Date().toISOString(),
      total: kits.length,
      kits,
    });
  } catch (error) {
    console.error("[mobile/kits][GET]", error);

    return jsonError("No se pudieron obtener los kits de emergencia.", 500);
  }
}
