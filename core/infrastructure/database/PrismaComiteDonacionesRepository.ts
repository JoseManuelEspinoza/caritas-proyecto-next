import { prisma } from "@/app/lib/prisma";
import { IComiteDonacionesRepository } from "../../domain/repositories/IComiteDonacionesRepository";
import { RondaVotacion, CierreRonda } from "../../domain/entities/comite-donaciones/RondaVotacion";
import { DecisionVoto, TallyRonda } from "../../domain/entities/comite-donaciones/VotoComite";

const ROL_COMITE = "COMITEDONACIONES";

export class PrismaComiteDonacionesRepository implements IComiteDonacionesRepository {
  async findRondaAbierta(idIncidencia: string): Promise<RondaVotacion | null> {
    const r = await prisma.rondaVotacionComite.findFirst({
      where: { idIncidencia, estado: "ABIERTA" },
      select: { idRonda: true, idIncidencia: true, numeroRonda: true, estado: true },
    });
    return r ? { ...r } : null;
  }

  async abrirRonda(idIncidencia: string): Promise<RondaVotacion> {
    return prisma.$transaction(async (tx) => {
      const max = await tx.rondaVotacionComite.aggregate({
        where: { idIncidencia },
        _max: { numeroRonda: true },
      });
      const numeroRonda = (max._max.numeroRonda ?? 0) + 1;
      const creada = await tx.rondaVotacionComite.create({
        data: { idIncidencia, numeroRonda, estado: "ABIERTA" },
        select: { idRonda: true, idIncidencia: true, numeroRonda: true, estado: true },
      });
      return creada;
    });
  }

  async upsertVoto(idRonda: string, idUsuarioGRD: string, decision: DecisionVoto): Promise<void> {
    await prisma.votoComiteDonaciones.upsert({
      where: { idRonda_idUsuarioGRD: { idRonda, idUsuarioGRD } },
      create: { idRonda, idUsuarioGRD, decision },
      update: { decision },
    });
  }

  async contarMiembrosActivos(): Promise<number> {
    return prisma.user.count({ where: { role: ROL_COMITE, estado: "ACTIVO" } });
  }

  async esMiembroActivo(idUsuarioGRD: string): Promise<boolean> {
    const perfil = await prisma.usuarioGRD.findUnique({
      where: { idUsuarioGRD },
      select: { credencial: { select: { role: true, estado: true } } },
    });
    return perfil?.credencial?.role === ROL_COMITE && perfil.credencial.estado === "ACTIVO";
  }

  async contarVotos(idRonda: string): Promise<{ aFavor: number; enContra: number }> {
    const agg = await prisma.votoComiteDonaciones.groupBy({
      by: ["decision"],
      where: { idRonda },
      _count: { _all: true },
    });
    let aFavor = 0;
    let enContra = 0;
    for (const row of agg) {
      if (row.decision === "A_FAVOR") aFavor = row._count._all;
      else if (row.decision === "EN_CONTRA") enContra = row._count._all;
    }
    return { aFavor, enContra };
  }

  async cerrarRonda(idRonda: string, cierre: CierreRonda): Promise<void> {
    await prisma.rondaVotacionComite.update({
      where: { idRonda, estado: "ABIERTA" },
      data: {
        estado: cierre.estado,
        nSnapshot: cierre.nSnapshot,
        umbralSnapshot: cierre.umbralSnapshot,
        idUsuarioCierre: cierre.idUsuarioCierre ?? null,
        observaciones: cierre.observaciones ?? null,
        cerradaAt: new Date(),
      },
    });
  }

  async tally(idIncidencia: string): Promise<TallyRonda | null> {
    const ronda = await prisma.rondaVotacionComite.findFirst({
      where: { idIncidencia, estado: "ABIERTA" },
      select: { idRonda: true },
    });
    if (!ronda) return null;

    const [n, votos] = await Promise.all([
      this.contarMiembrosActivos(),
      prisma.votoComiteDonaciones.findMany({
        where: { idRonda: ronda.idRonda },
        select: { idUsuarioGRD: true, decision: true, updatedAt: true },
      }),
    ]);

    const aFavor = votos.filter((v) => v.decision === "A_FAVOR").length;
    const enContra = votos.filter((v) => v.decision === "EN_CONTRA").length;
    const umbral = n > 0 ? Math.min(4, Math.floor(n / 2) + 1) : 0;
    const pendientes = Math.max(0, n - aFavor - enContra);

    return {
      n,
      umbral,
      aFavor,
      enContra,
      pendientes,
      votos: votos.map((v) => ({
        idUsuarioGRD: v.idUsuarioGRD,
        decision: v.decision as DecisionVoto,
        fecha: v.updatedAt,
      })),
    };
  }
}
