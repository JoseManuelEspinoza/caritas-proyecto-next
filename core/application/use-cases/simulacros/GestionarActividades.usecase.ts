import { randomUUID } from "crypto";
import { ActividadPreventiva } from "../../../domain/entities/actividad/ActividadPreventiva";
import { IActividadRepository } from "../../../domain/repositories/IActividadRepository";
import { NotFoundError } from "../../../domain/errors/DomainError";

export interface ActividadOutput {
  id: string;
  codigoActividad: string | null;
  idParroquia: string;
  idTipoActividadPreventiva: string;
  nombreActividad: string;
  estadoActividad: string;
  fechaProgramada: string | null;
  fechaEjecucion: string | null;
  resultadoGeneral: string | null;
}

function toOutput(a: ActividadPreventiva): ActividadOutput {
  const s = a.snapshot;
  return {
    id: s.id,
    codigoActividad: s.codigoActividad ?? null,
    idParroquia: s.idParroquia,
    idTipoActividadPreventiva: s.idTipoActividadPreventiva,
    nombreActividad: s.nombreActividad,
    estadoActividad: s.estadoActividad,
    fechaProgramada: s.fechaProgramada ?? null,
    fechaEjecucion: s.fechaEjecucion ?? null,
    resultadoGeneral: s.resultadoGeneral ?? null,
  };
}

async function cargar(repo: IActividadRepository, id: string): Promise<ActividadPreventiva> {
  const a = await repo.findById(id);
  if (!a) throw new NotFoundError("Actividad no encontrada.");
  return a;
}

/** Programa un simulacro / actividad preventiva. */
export class ProgramarActividadUseCase {
  constructor(private readonly repo: IActividadRepository) {}
  async execute(input: {
    idParroquia: string;
    idUsuarioRegistroGRD: string;
    idTipoActividadPreventiva: string;
    nombreActividad: string;
    idPlanTrabajoGRD?: string;
    fechaProgramada?: string;
    lugarActividad?: string;
    publicoObjetivo?: string;
    numeroParticipantesEstimado?: number;
    descripcionActividad?: string;
  }): Promise<ActividadOutput> {
    const codigoActividad = await this.repo.nextCodigo();
    const actividad = ActividadPreventiva.crear({ id: randomUUID(), codigoActividad, ...input });
    await this.repo.save(actividad);
    return toOutput(actividad);
  }
}

export class ListarActividadesUseCase {
  constructor(private readonly repo: IActividadRepository) {}
  async execute(): Promise<ActividadOutput[]> {
    return (await this.repo.findAll()).map(toOutput);
  }
}

/** Asigna el brigadista responsable de la actividad. */
export class AsignarResponsableUseCase {
  constructor(private readonly repo: IActividadRepository) {}
  async execute(id: string, idBrigadista: string): Promise<ActividadOutput> {
    const actividad = await cargar(this.repo, id);
    actividad.asignarResponsable(idBrigadista);
    await this.repo.update(actividad);
    return toOutput(actividad);
  }
}

/** PROGRAMADA → EJECUTADA: registra la ejecución y resultados. */
export class EjecutarActividadUseCase {
  constructor(private readonly repo: IActividadRepository) {}
  async execute(
    id: string,
    datos: { resultadoGeneral: string; numeroParticipantesReal?: number; recomendaciones?: string }
  ): Promise<ActividadOutput> {
    const actividad = await cargar(this.repo, id);
    actividad.ejecutar(datos);
    await this.repo.update(actividad);
    return toOutput(actividad);
  }
}

/** PROGRAMADA → CANCELADA. */
export class CancelarActividadUseCase {
  constructor(private readonly repo: IActividadRepository) {}
  async execute(id: string, motivo: string): Promise<ActividadOutput> {
    const actividad = await cargar(this.repo, id);
    actividad.cancelar(motivo);
    await this.repo.update(actividad);
    return toOutput(actividad);
  }
}
