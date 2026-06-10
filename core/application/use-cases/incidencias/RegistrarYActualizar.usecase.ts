import { IIncidenciaRepository } from "../../../domain/repositories/IIncidenciaRepository";
import { NotFoundError, ValidationError } from "../../../domain/errors/DomainError";
import { CreateIncidenteData } from "../../dtos/IncidenciaDTO";

/** Validaciones de los campos obligatorios del formulario de incidente. */
function soloDigitos(value: string): string {
  return value.replace(/\D/g, "");
}

function validarFechaNoFutura(fecha: string): void {
  const parsed = new Date(fecha);

  if (Number.isNaN(parsed.getTime())) {
    throw new ValidationError("La fecha del suceso no es válida.");
  }

  const hoy = new Date();
  hoy.setHours(23, 59, 59, 999);

  if (parsed > hoy) {
    throw new ValidationError("La fecha del suceso no puede ser futura.");
  }
}

function validarCoordenadas(data: CreateIncidenteData): void {
  if (data.lat != null && (data.lat < -90 || data.lat > 90)) {
    throw new ValidationError("La latitud registrada está fuera del rango válido.");
  }

  if (data.lng != null && (data.lng < -180 || data.lng > 180)) {
    throw new ValidationError("La longitud registrada está fuera del rango válido.");
  }
}

/** Validaciones de campos obligatorios y formato del formulario de incidente. */
function validarCreacion(data: CreateIncidenteData): void {
  const dni = soloDigitos(data.reportaDni ?? "");
  const tel = soloDigitos(data.reportaTel ?? "");

  if (!dni) throw new ValidationError("Ingresa el DNI de quien reportó.");
  if (dni.length !== 8) {
    throw new ValidationError("El DNI de quien reporta debe tener exactamente 8 dígitos.");
  }

  if (!data.reportaNombre?.trim()) {
    throw new ValidationError("Ingresa el nombre de quien reportó.");
  }

  if (data.reportaNombre.trim().length < 5) {
    throw new ValidationError("El nombre de quien reporta debe tener al menos 5 caracteres.");
  }

  if (!tel) throw new ValidationError("Ingresa el celular de quien reportó.");

  // if (!/^9\d{8}$/.test(tel)) {
  //   throw new ValidationError("El celular debe tener 9 dígitos y empezar con 9.");
  // }

  if (!data.reportaRol?.trim()) {
    throw new ValidationError("Selecciona el rol de quien reportó.");
  }

  if (!data.fechaSuceso) {
    throw new ValidationError("Ingresa la fecha del suceso.");
  }

  validarFechaNoFutura(data.fechaSuceso);
  validarEvento(data);
  validarCoordenadas(data);
}

/** Validaciones propias del evento/incidencia. */
function validarEvento(data: CreateIncidenteData): void {
  if (!data.categoria?.trim()) {
    throw new ValidationError("Selecciona la categoría del evento.");
  }

  if (!data.distrito?.trim()) {
    throw new ValidationError("Selecciona el distrito.");
  }

  if (!data.direccion?.trim()) {
    throw new ValidationError("Ingresa la dirección del evento.");
  }

  if (data.direccion.trim().length < 5) {
    throw new ValidationError("La dirección debe tener al menos 5 caracteres.");
  }

  if (!data.descripcion?.trim()) {
    throw new ValidationError("Ingresa una descripción breve del evento.");
  }

  if (data.descripcion.trim().length < 10) {
    throw new ValidationError("La descripción del evento debe tener al menos 10 caracteres.");
  }

  if (!data.nivelAfectacion?.trim()) {
    throw new ValidationError("Selecciona el nivel de afectación.");
  }

  if (data.necesidades.includes("Otros") && !data.necesidadOtra.trim()) {
    throw new ValidationError("Especifica la necesidad adicional en el campo 'Otros'.");
  }
}

/** ABIERTO: registra un incidente nuevo. Devuelve el id para redirigir. */
export class RegistrarIncidenciaUseCase {
  constructor(private readonly repo: IIncidenciaRepository) {}
  async execute(data: CreateIncidenteData, idUsuarioCargaGRD?: string | null): Promise<string> {
    validarCreacion(data);
    const codigo = await this.repo.nextCodigo();
    const idIncidencia = await this.repo.crear(codigo, data);
    // Persistir evidencias ya subidas a S3 (si las hay y conocemos quién las cargó).
    if (data.evidencias?.length && idUsuarioCargaGRD) {
      await this.repo.guardarEvidencias(idIncidencia, idUsuarioCargaGRD, data.evidencias);
    }
    return idIncidencia;
  }
}

/** Actualiza los datos de un incidente (solo permitido en estado ABIERTO). */
export class ActualizarIncidenciaUseCase {
  constructor(private readonly repo: IIncidenciaRepository) {}

  async execute(id: string, data: CreateIncidenteData): Promise<void> {
    validarCreacion(data);

    const incidencia = await this.repo.findById(id);
    if (!incidencia) throw new NotFoundError("Incidencia no encontrada.");

    incidencia.asegurarEditable();
    await this.repo.actualizarDatos(id, data);
  }
}
