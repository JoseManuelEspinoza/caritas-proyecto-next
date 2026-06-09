import { randomUUID } from "crypto";
import { ActividadPreventiva } from "../../../domain/entities/actividad/ActividadPreventiva";
import { IActividadRepository } from "../../../domain/repositories/IActividadRepository";
import { NotFoundError, ValidationError } from "../../../domain/errors/DomainError";

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
function hoyLocalISO(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function validarEnteroNoNegativo(value: number | null | undefined, campo: string): void {
  if (value == null) return;

  if (!Number.isFinite(value)) {
    throw new ValidationError(`${campo} debe ser un número válido.`);
  }

  if (!Number.isInteger(value)) {
    throw new ValidationError(`${campo} debe ser un número entero.`);
  }

  if (value < 0) {
    throw new ValidationError(`${campo} no puede ser negativo.`);
  }
}

function validarProgramacion(input: {
  idParroquia: string;
  idUsuarioRegistroGRD: string;
  idTipoActividadPreventiva: string;
  nombreActividad: string;
  fechaProgramada?: string;
  lugarActividad?: string;
  numeroParticipantesEstimado?: number;
  descripcionActividad?: string;
}): void {
  if (!input.idParroquia?.trim()) {
    throw new ValidationError("Selecciona la parroquia.");
  }

  if (!input.idUsuarioRegistroGRD?.trim()) {
    throw new ValidationError("No se encontró el usuario que registra la actividad.");
  }

  if (!input.idTipoActividadPreventiva?.trim()) {
    throw new ValidationError("Selecciona el tipo de actividad.");
  }

  const nombre = input.nombreActividad?.trim() ?? "";
  if (!nombre) {
    throw new ValidationError("Ingresa el nombre de la actividad.");
  }

  if (nombre.length < 3) {
    throw new ValidationError("El nombre de la actividad debe tener al menos 3 caracteres.");
  }

  if (!input.fechaProgramada) {
    throw new ValidationError("Selecciona la fecha programada.");
  }

  if (input.fechaProgramada.slice(0, 10) < hoyLocalISO()) {
    throw new ValidationError("La fecha programada no puede ser anterior a hoy.");
  }

  const lugar = input.lugarActividad?.trim() ?? "";
  if (!lugar) {
    throw new ValidationError("Ingresa el lugar de la actividad.");
  }

  if (lugar.length < 3) {
    throw new ValidationError("El lugar debe tener al menos 3 caracteres.");
  }

  validarEnteroNoNegativo(input.numeroParticipantesEstimado, "numeroParticipantesEstimado");

  const descripcion = input.descripcionActividad?.trim() ?? "";
  if (descripcion && descripcion.length < 5) {
    throw new ValidationError("La descripción debe tener al menos 5 caracteres si se ingresa.");
  }
}

function validarEjecucion(datos: {
  resultadoGeneral: string;
  numeroParticipantesReal?: number;
  recomendaciones?: string;
}): void {
  const resultado = datos.resultadoGeneral?.trim() ?? "";

  if (!resultado) {
    throw new ValidationError("Indica el resultado general.");
  }

  if (resultado.length < 5) {
    throw new ValidationError("El resultado general debe tener al menos 5 caracteres.");
  }

  validarEnteroNoNegativo(datos.numeroParticipantesReal, "numeroParticipantesReal");

  const recomendaciones = datos.recomendaciones?.trim() ?? "";
  if (recomendaciones && recomendaciones.length < 5) {
    throw new ValidationError("Las recomendaciones deben tener al menos 5 caracteres si se ingresan.");
  }
}

function validarCancelacion(motivo: string): void {
  if (!motivo?.trim()) {
    throw new ValidationError("Indica el motivo de cancelación.");
  }

  if (motivo.trim().length < 5) {
    throw new ValidationError("El motivo de cancelación debe tener al menos 5 caracteres.");
  }
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
    validarProgramacion(input);


    const codigoActividad = await this.repo.nextCodigo();
    const actividad = ActividadPreventiva.crear({
      id: randomUUID(),
      codigoActividad,
      ...input,
      nombreActividad: input.nombreActividad.trim(),
      lugarActividad: input.lugarActividad?.trim(),
      descripcionActividad: input.descripcionActividad?.trim(),
    });
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
    validarEjecucion(datos);

    const actividad = await cargar(this.repo, id);
    actividad.ejecutar({
      resultadoGeneral: datos.resultadoGeneral.trim(),
      numeroParticipantesReal: datos.numeroParticipantesReal,
      recomendaciones: datos.recomendaciones?.trim(),
    });
    await this.repo.update(actividad);
    return toOutput(actividad);
  }
}

/** PROGRAMADA → CANCELADA. */
export class CancelarActividadUseCase {
  constructor(private readonly repo: IActividadRepository) {}
  async execute(id: string, motivo: string): Promise<ActividadOutput> {
    validarCancelacion(motivo);
    
    const actividad = await cargar(this.repo, id);
    actividad.cancelar(motivo.trim());

    await this.repo.update(actividad);
    return toOutput(actividad);
  }
}
