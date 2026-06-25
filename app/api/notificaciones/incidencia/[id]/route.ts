import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/app/lib/dal";
import { prisma } from "@/app/lib/prisma";

export const runtime = "nodejs";

type NotifRow = {
  tipo: string;
  titulo: string;
  createdAt: Date;
  user: { name: string | null; email: string; role: string };
};

type NotifHistorialGroup = {
  tipo: string;
  titulo: string;
  enviadoAt: string;
  destinatarios: { nombre: string; email: string; rol: string }[];
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifySession();
  } catch {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  const { id } = await params;

  const rows: NotifRow[] = await prisma.notificacion.findMany({
    where: { idIncidencia: id },
    orderBy: { createdAt: "asc" },
    select: {
      tipo: true,
      titulo: true,
      createdAt: true,
      user: { select: { name: true, email: true, role: true } },
    },
  });

  // Group by tipo in insertion order; enviadoAt is the first record's timestamp
  const groupMap = new Map<string, NotifHistorialGroup>();
  for (const row of rows) {
    if (!groupMap.has(row.tipo)) {
      groupMap.set(row.tipo, {
        tipo: row.tipo,
        titulo: row.titulo,
        enviadoAt: row.createdAt.toISOString(),
        destinatarios: [],
      });
    }
    groupMap.get(row.tipo)!.destinatarios.push({
      nombre: row.user.name ?? row.user.email,
      email: row.user.email,
      rol: row.user.role,
    });
  }

  return NextResponse.json([...groupMap.values()]);
}
