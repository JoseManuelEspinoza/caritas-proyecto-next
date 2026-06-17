import "server-only";
import { prisma } from "@/app/lib/prisma";
import { makeComiteDonacionesUseCases } from "@/core/infrastructure/factories/makeComiteDonacionesUseCases";

export type TallyVotoConNombre = {
  idUsuarioGRD: string;
  nombre: string;
  decision: "A_FAVOR" | "EN_CONTRA";
  fecha: string;
};

export type TallyRondaConNombres = {
  n: number;
  umbral: number;
  aFavor: number;
  enContra: number;
  pendientes: number;
  votos: TallyVotoConNombre[];
  pendientesNombres: string[];
};

export async function cargarTallyParaPagina(
  idIncidencia: string
): Promise<TallyRondaConNombres | null> {
  const tally = await makeComiteDonacionesUseCases().tally(idIncidencia);
  if (!tally) return null;

  const miembros = await prisma.usuarioGRD.findMany({
    where: { credencial: { role: "COMITEDONACIONES", estado: "ACTIVO" } },
    select: { idUsuarioGRD: true, nombres: true, apellidos: true },
  });
  const nombrePorId = new Map(
    miembros.map((m) => [m.idUsuarioGRD, `${m.nombres} ${m.apellidos ?? ""}`.trim()])
  );

  const votos = tally.votos.map((v) => ({
    idUsuarioGRD: v.idUsuarioGRD,
    nombre: nombrePorId.get(v.idUsuarioGRD) ?? "Miembro retirado",
    decision: v.decision,
    fecha: v.fecha.toISOString(),
  }));
  const idsQueVotaron = new Set(tally.votos.map((v) => v.idUsuarioGRD));
  const pendientesNombres = miembros
    .filter((m) => !idsQueVotaron.has(m.idUsuarioGRD))
    .map((m) => `${m.nombres} ${m.apellidos ?? ""}`.trim());

  return {
    n: tally.n,
    umbral: tally.umbral,
    aFavor: tally.aFavor,
    enContra: tally.enContra,
    pendientes: tally.pendientes,
    votos,
    pendientesNombres,
  };
}
