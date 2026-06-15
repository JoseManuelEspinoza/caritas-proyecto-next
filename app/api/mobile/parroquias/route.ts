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

function decimalToNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(request: Request) {
  const unauthorized = requireMobileSyncKey(request);
  if (unauthorized) return unauthorized;

  try {
    const { searchParams } = new URL(request.url);

    const incluirInactivas = searchParams.get("incluirInactivas") === "true";
    const q = searchParams.get("q")?.trim();

    const parroquias = await prisma.parroquia.findMany({
      where: {
        ...(incluirInactivas ? {} : { estado: "ACTIVO" }),
        ...(q
          ? {
              OR: [
                { nombre: { contains: q, mode: "insensitive" } },
                { direccion: { contains: q, mode: "insensitive" } },
                { referencia: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: {
        nombre: "asc",
      },
      select: {
        idParroquia: true,
        idLugarCatalogo: true,
        nombre: true,
        direccion: true,
        referencia: true,
        latitud: true,
        longitud: true,
        telefono: true,
        correo: true,
        estado: true,
        lugarCatalogo: {
          select: {
            idLugar: true,
            idTipoLugar: true,
            idLugarPadre: true,
            nombreLugar: true,
            direccion: true,
            referencia: true,
            latitud: true,
            longitud: true,
            telefono: true,
            correo: true,
            estado: true,
          },
        },
      },
    });

    const data = parroquias.map((parroquia) => ({
      idParroquia: parroquia.idParroquia,
      idLugarCatalogo: parroquia.idLugarCatalogo,
      nombre: parroquia.nombre,
      direccion: parroquia.direccion,
      referencia: parroquia.referencia,
      latitud: decimalToNumber(parroquia.latitud),
      longitud: decimalToNumber(parroquia.longitud),
      telefono: parroquia.telefono,
      correo: parroquia.correo,
      estado: parroquia.estado,
      lugarCatalogo: parroquia.lugarCatalogo
        ? {
            idLugar: parroquia.lugarCatalogo.idLugar,
            idTipoLugar: parroquia.lugarCatalogo.idTipoLugar,
            idLugarPadre: parroquia.lugarCatalogo.idLugarPadre,
            nombreLugar: parroquia.lugarCatalogo.nombreLugar,
            direccion: parroquia.lugarCatalogo.direccion,
            referencia: parroquia.lugarCatalogo.referencia,
            latitud: decimalToNumber(parroquia.lugarCatalogo.latitud),
            longitud: decimalToNumber(parroquia.lugarCatalogo.longitud),
            telefono: parroquia.lugarCatalogo.telefono,
            correo: parroquia.lugarCatalogo.correo,
            estado: parroquia.lugarCatalogo.estado,
          }
        : null,
    }));

    return NextResponse.json({
      ok: true,
      serverTime: new Date().toISOString(),
      total: data.length,
      parroquias: data,
    });
  } catch (error) {
    console.error("[mobile/parroquias][GET]", error);

    return jsonError("No se pudieron obtener las parroquias.", 500);
  }
}
