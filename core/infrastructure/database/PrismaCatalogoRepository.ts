import { prisma } from "@/app/lib/prisma";
import { Catalogo, CatalogoDetalle } from "../../domain/entities/catalogo/Catalogo";
import { ICatalogoRepository } from "../../domain/repositories/ICatalogoRepository";
import { CatalogoMapper } from "../mappers/CatalogoMapper";

export class PrismaCatalogoRepository implements ICatalogoRepository {
  async crearCatalogo(catalogo: Catalogo): Promise<void> {
    await prisma.catalogoGRD.create({ data: CatalogoMapper.catalogoToPersistence(catalogo) });
  }

  async findCatalogoById(id: string): Promise<Catalogo | null> {
    const row = await prisma.catalogoGRD.findUnique({ where: { idCatalogoGRD: id } });
    return row ? CatalogoMapper.catalogoToDomain(row) : null;
  }

  async findAllCatalogos(): Promise<Catalogo[]> {
    const rows = await prisma.catalogoGRD.findMany({ orderBy: { nombreCatalogo: "asc" } });
    return rows.map(CatalogoMapper.catalogoToDomain);
  }

  async existsNombreCatalogo(nombre: string): Promise<boolean> {
    const row = await prisma.catalogoGRD.findUnique({
      where: { nombreCatalogo: nombre },
      select: { idCatalogoGRD: true },
    });
    return row !== null;
  }

  async crearDetalle(detalle: CatalogoDetalle): Promise<void> {
    await prisma.catalogoDetalleGRD.create({ data: CatalogoMapper.detalleToPersistence(detalle) });
  }

  async actualizarDetalle(detalle: CatalogoDetalle): Promise<void> {
    const { idCatalogoDetalleGRD, ...data } = CatalogoMapper.detalleToPersistence(detalle);
    await prisma.catalogoDetalleGRD.update({ where: { idCatalogoDetalleGRD }, data });
  }

  async findDetalleById(id: string): Promise<CatalogoDetalle | null> {
    const row = await prisma.catalogoDetalleGRD.findUnique({ where: { idCatalogoDetalleGRD: id } });
    return row ? CatalogoMapper.detalleToDomain(row) : null;
  }

  async findDetallesByCatalogo(idCatalogo: string): Promise<CatalogoDetalle[]> {
    const rows = await prisma.catalogoDetalleGRD.findMany({
      where: { idCatalogoGRD: idCatalogo },
      orderBy: [{ orden: "asc" }, { valor: "asc" }],
    });
    return rows.map(CatalogoMapper.detalleToDomain);
  }

  async existsCodigoEnCatalogo(idCatalogo: string, codigo: string): Promise<boolean> {
    const row = await prisma.catalogoDetalleGRD.findUnique({
      where: { idCatalogoGRD_codigo: { idCatalogoGRD: idCatalogo, codigo } },
      select: { idCatalogoDetalleGRD: true },
    });
    return row !== null;
  }
}
