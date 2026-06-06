import { randomUUID } from "crypto";
import { Catalogo, CatalogoDetalle } from "../../../domain/entities/catalogo/Catalogo";
import { ICatalogoRepository } from "../../../domain/repositories/ICatalogoRepository";
import { NotFoundError, ValidationError } from "../../../domain/errors/DomainError";

export interface CatalogoOutput {
  id: string;
  nombreCatalogo: string;
  descripcion: string | null;
  estado: string;
}
export interface DetalleOutput {
  id: string;
  idCatalogoGRD: string;
  codigo: string;
  valor: string;
  descripcion: string | null;
  orden: number | null;
  estado: string;
}

const catOut = (c: Catalogo): CatalogoOutput => {
  const s = c.snapshot;
  return {
    id: s.id,
    nombreCatalogo: s.nombreCatalogo,
    descripcion: s.descripcion ?? null,
    estado: s.estado,
  };
};
const detOut = (d: CatalogoDetalle): DetalleOutput => {
  const s = d.snapshot;
  return {
    id: s.id,
    idCatalogoGRD: s.idCatalogoGRD,
    codigo: s.codigo,
    valor: s.valor,
    descripcion: s.descripcion ?? null,
    orden: s.orden ?? null,
    estado: s.estado,
  };
};

/** Crea un catálogo maestro (nombre único). */
export class CrearCatalogoUseCase {
  constructor(private readonly repo: ICatalogoRepository) {}
  async execute(nombreCatalogo: string, descripcion?: string): Promise<CatalogoOutput> {
    if (await this.repo.existsNombreCatalogo(nombreCatalogo.trim())) {
      throw new ValidationError("Ya existe un catálogo con ese nombre.");
    }
    const catalogo = Catalogo.crear({ id: randomUUID(), nombreCatalogo, descripcion });
    await this.repo.crearCatalogo(catalogo);
    return catOut(catalogo);
  }
}

export class ListarCatalogosUseCase {
  constructor(private readonly repo: ICatalogoRepository) {}
  async execute(): Promise<CatalogoOutput[]> {
    return (await this.repo.findAllCatalogos()).map(catOut);
  }
}

export class ListarDetallesUseCase {
  constructor(private readonly repo: ICatalogoRepository) {}
  async execute(idCatalogo: string): Promise<DetalleOutput[]> {
    return (await this.repo.findDetallesByCatalogo(idCatalogo)).map(detOut);
  }
}

/** Agrega un ítem a un catálogo (código único dentro del catálogo). */
export class AgregarDetalleUseCase {
  constructor(private readonly repo: ICatalogoRepository) {}
  async execute(input: {
    idCatalogoGRD: string;
    codigo: string;
    valor: string;
    descripcion?: string;
    orden?: number;
  }): Promise<DetalleOutput> {
    const catalogo = await this.repo.findCatalogoById(input.idCatalogoGRD);
    if (!catalogo) throw new NotFoundError("Catálogo no encontrado.");
    if (await this.repo.existsCodigoEnCatalogo(input.idCatalogoGRD, input.codigo.trim())) {
      throw new ValidationError("Ya existe un ítem con ese código en el catálogo.");
    }
    const detalle = CatalogoDetalle.crear({ id: randomUUID(), ...input });
    await this.repo.crearDetalle(detalle);
    return detOut(detalle);
  }
}

/** Edita el valor/descripción de un ítem. */
export class EditarDetalleUseCase {
  constructor(private readonly repo: ICatalogoRepository) {}
  async execute(id: string, valor: string, descripcion?: string): Promise<DetalleOutput> {
    const detalle = await this.repo.findDetalleById(id);
    if (!detalle) throw new NotFoundError("Ítem de catálogo no encontrado.");
    detalle.editar(valor, descripcion);
    await this.repo.actualizarDetalle(detalle);
    return detOut(detalle);
  }
}

/** Activa/desactiva un ítem (borrado lógico). */
export class ToggleDetalleUseCase {
  constructor(private readonly repo: ICatalogoRepository) {}
  async execute(id: string): Promise<DetalleOutput> {
    const detalle = await this.repo.findDetalleById(id);
    if (!detalle) throw new NotFoundError("Ítem de catálogo no encontrado.");
    detalle.toggle();
    await this.repo.actualizarDetalle(detalle);
    return detOut(detalle);
  }
}
