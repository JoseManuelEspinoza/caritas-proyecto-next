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

  // Group by tipo+minute so repeat events (e.g. observe→resubmit) appear as separate entries
  const groupMap = new Map<string, NotifHistorialGroup>();
  for (const row of rows) {
    const bucket = `${row.tipo}__${row.createdAt.toISOString().slice(0, 16)}`;
    if (!groupMap.has(bucket)) {
      groupMap.set(bucket, {
        tipo: row.tipo,
        titulo: row.titulo,
        enviadoAt: row.createdAt.toISOString(),
        destinatarios: [],
      });
    }
    groupMap.get(bucket)!.destinatarios.push({
      nombre: row.user.name ?? row.user.email,
      email: row.user.email,
      rol: row.user.role,
    });
  }

  return NextResponse.json([...groupMap.values()]);
}
