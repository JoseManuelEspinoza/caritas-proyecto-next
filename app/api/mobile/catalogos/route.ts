import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export const dynamic = "force-dynamic";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

function requireMobileSyncKey(request: Request): NextResponse | null {
  const expected = process.env.MOBILE_SYNC_API_KEY?.trim();

  // En desarrollo permite probar sin key si no está configurada.
  // En producción conviene definir MOBILE_SYNC_API_KEY en el servidor.
  if (!expected) return null;

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
    const { searchParams } = new URL(request.url);
    const nombreCatalogo = searchParams.get("nombreCatalogo")?.trim();

    const catalogos = await prisma.catalogoGRD.findMany({
      where: {
        estado: "ACTIVO",
        ...(nombreCatalogo
          ? {
              nombreCatalogo: {
                equals: nombreCatalogo,
                mode: "insensitive",
              },
            }
          : {}),
      },
      orderBy: {
        nombreCatalogo: "asc",
      },
      select: {
        idCatalogoGRD: true,
        nombreCatalogo: true,
        descripcion: true,
        estado: true,
        detalles: {
          where: {
            estado: "ACTIVO",
          },
          orderBy: [
            { orden: "asc" },
            { valor: "asc" },
          ],
          select: {
            idCatalogoDetalleGRD: true,
            codigo: true,
            valor: true,
            descripcion: true,
            orden: true,
            estado: true,
          },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      serverTime: new Date().toISOString(),
      total: catalogos.length,
      catalogos,
    });
  } catch (error) {
    console.error("[mobile/catalogos][GET]", error);

    return jsonError("No se pudieron obtener los catálogos GRD.", 500);
  }
}
