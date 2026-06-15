import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";

export const runtime = "nodejs";

/** GET /api/notificaciones — lista las últimas 30 notificaciones del usuario autenticado. */
export async function GET() {
  let session: Awaited<ReturnType<typeof verifySession>>;
  try {
    session = await verifySession();
  } catch {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  const notifs = await prisma.notificacion.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      idNotificacion: true,
      tipo: true,
      titulo: true,
      mensaje: true,
      enlace: true,
      leida: true,
      createdAt: true,
    },
  });

  return NextResponse.json(notifs);
}

/** PATCH /api/notificaciones — marca como leídas las notificaciones indicadas (o todas si no se pasan ids). */
export async function PATCH(req: NextRequest) {
  let session: Awaited<ReturnType<typeof verifySession>>;
  try {
    session = await verifySession();
  } catch {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const ids: string[] | undefined = Array.isArray(body.ids) ? body.ids : undefined;

  await prisma.notificacion.updateMany({
    where: {
      userId: session.userId,
      ...(ids ? { idNotificacion: { in: ids } } : { leida: false }),
    },
    data: { leida: true },
  });

  return NextResponse.json({ ok: true });
}
