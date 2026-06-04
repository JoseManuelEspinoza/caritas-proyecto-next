import { prisma } from "@/app/lib/prisma";
import { BrigadistaParroquial } from "../../domain/entities/brigadista/BrigadistaParroquial";
import { IBrigadistaRepository } from "../../domain/repositories/IBrigadistaRepository";
import { BrigadistaMapper } from "../mappers/BrigadistaMapper";

/** Repositorio Prisma del padrón de brigadistas parroquiales. */
export class PrismaBrigadistaRepository implements IBrigadistaRepository {
  async save(brigadista: BrigadistaParroquial): Promise<void> {
    await prisma.brigadistaParroquial.create({ data: BrigadistaMapper.toPersistence(brigadista) });
  }

  async update(brigadista: BrigadistaParroquial): Promise<void> {
    const { idBrigadistaParroquial, ...data } = BrigadistaMapper.toPersistence(brigadista);
    await prisma.brigadistaParroquial.update({ where: { idBrigadistaParroquial }, data });
  }

  async findById(id: string): Promise<BrigadistaParroquial | null> {
    const row = await prisma.brigadistaParroquial.findUnique({
      where: { idBrigadistaParroquial: id },
    });
    return row ? BrigadistaMapper.toDomain(row) : null;
  }

  async findAll(): Promise<BrigadistaParroquial[]> {
    const rows = await prisma.brigadistaParroquial.findMany({ orderBy: { fechaRegistro: "desc" } });
    return rows.map(BrigadistaMapper.toDomain);
  }

  async findIdByDni(dni: string): Promise<string | null> {
    const row = await prisma.brigadistaParroquial.findFirst({
      where: { dni },
      select: { idBrigadistaParroquial: true },
    });
    return row?.idBrigadistaParroquial ?? null;
  }
}
