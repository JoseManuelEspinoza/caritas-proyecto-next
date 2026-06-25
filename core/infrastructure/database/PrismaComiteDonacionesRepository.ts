import { prisma } from "@/app/lib/prisma";
import { IComiteDonacionesRepository } from "../../domain/repositories/IComiteDonacionesRepository";
import { RondaVotacion, CierreRonda } from "../../domain/entities/comite-donaciones/RondaVotacion";
import { DecisionVoto, TallyRonda } from "../../domain/entities/comite-donaciones/VotoComite";
import { BusinessRuleError } from "../../domain/errors/DomainError";
import { recomputarStockKit } from "./kit-stock";

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
    // 50% o más del total de miembros (igual que calcularUmbral).
    const umbral = n > 0 ? Math.ceil(n / 2) : 0;
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

  async descontarInventarioAprobacion(idIncidencia: string, idUsuarioGRD: string): Promise<void> {
    // 1) Leer la asignación de kits del último informe de evaluación.
    const informe = await prisma.informe.findFirst({
      where: { idIncidencia, tipoInforme: "EVALUACION" },
      orderBy: { fechaElaboracion: "desc" },
      select: { contenido: true },
    });
    if (!informe?.contenido) return;

    let asignaciones: unknown[] = [];
    try {
      const c = JSON.parse(informe.contenido) as { asignacionFamilias?: unknown[] };
      asignaciones = Array.isArray(c.asignacionFamilias) ? c.asignacionFamilias : [];
    } catch {
      return;
    }

    // 2) Contar instancias de cada kit DEL SISTEMA (con idKit). Los "Otros" no tienen inventario.
    const kitCount = new Map<string, number>();
    for (const af of asignaciones) {
      const kits = (af as { kits?: unknown[] })?.kits;
      if (!Array.isArray(kits)) continue;
      for (const k of kits) {
        const idKit = (k as { idKit?: unknown })?.idKit;
        if (typeof idKit === "string" && idKit) {
          kitCount.set(idKit, (kitCount.get(idKit) ?? 0) + 1);
        }
      }
    }
    if (kitCount.size === 0) return;

    // 3) Cargar la composición real (con stock) de esos kits.
    const kits = await prisma.kitEmergencia.findMany({
      where: { idKitEmergencia: { in: [...kitCount.keys()] } },
      select: {
        idKitEmergencia: true,
        tipoKit: true,
        articulos: {
          select: { idKitArticulo: true, descripcion: true, cantidad: true, stock: true },
        },
      },
    });

    // 4) Calcular lo requerido por elemento y validar contra el stock.
    const faltantes: string[] = [];
    const decrementos: { idKitArticulo: string; nuevoStock: number }[] = [];
    for (const kit of kits) {
      const instancias = kitCount.get(kit.idKitEmergencia) ?? 0;
      for (const art of kit.articulos) {
        const requerido = art.cantidad * instancias;
        if (requerido > art.stock) {
          faltantes.push(
            `${kit.tipoKit} · ${art.descripcion}: faltan ${requerido - art.stock} (disponible ${art.stock})`
          );
        } else {
          decrementos.push({ idKitArticulo: art.idKitArticulo, nuevoStock: art.stock - requerido });
        }
      }
    }

    if (faltantes.length > 0) {
      throw new BusinessRuleError(
        `No hay stock suficiente para aprobar la entrega:\n${faltantes.join("\n")}`
      );
    }

    // 5) Descontar el stock de cada elemento y registrar la salida por kit.
    await prisma.$transaction(async (tx) => {
      for (const d of decrementos) {
        await tx.kitArticulo.update({
          where: { idKitArticulo: d.idKitArticulo },
          data: { stock: d.nuevoStock },
        });
      }
      for (const [idKit, instancias] of kitCount) {
        await tx.movimientoKit.create({
          data: {
            idKitEmergencia: idKit,
            idUsuarioResponsableGRD: idUsuarioGRD,
            tipoMovimiento: "ENTREGA",
            cantidad: instancias,
            motivoMovimiento: "Aprobación del Comité de Donaciones",
          },
        });
        // Tras descontar elementos, recalcula los kits completos disponibles.
        await recomputarStockKit(tx, idKit);
      }
    });
  }
}
