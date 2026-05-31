import { Incidencia } from '../entities/incidencia/Incidencia'
import { CreateIncidenteData } from '../../application/dtos/IncidenciaDTO'

/**
 * Contrato de persistencia del flujo de Incidencias.
 *
 * Las operaciones agrupan unidades de persistencia coherentes (a menudo
 * transaccionales sobre varias tablas del DER). Los casos de uso validan la
 * transición con el agregado `Incidencia` y luego invocan estas operaciones.
 */
export interface IIncidenciaRepository {
  /** Genera el siguiente código GRD-YYYY-NNNN. */
  nextCodigo(): Promise<string>

  /** Crea Aviso + Incidencia + grupos + personas + historial inicial. Devuelve idIncidencia. */
  crear(codigo: string, data: CreateIncidenteData): Promise<string>

  /** Recupera el agregado (estado) para validar transiciones. */
  findById(id: string): Promise<Incidencia | null>

  /** Reemplaza los datos del incidente (incidencia + aviso + grupos/personas). */
  actualizarDatos(id: string, data: CreateIncidenteData): Promise<void>

  /** Persiste el nuevo estado del agregado + entrada en el historial. */
  guardarTransicion(incidencia: Incidencia, motivo?: string, observaciones?: string): Promise<void>

  /** Crea la asignación de un brigadista (si no existe) y lo marca EN CAMPO. */
  registrarAsignacion(idIncidencia: string, idBrigadista: string, instrucciones?: string): Promise<void>

  /** Autoasignación: define al UsuarioGRD como responsable de campo de la incidencia. */
  asignarResponsable(idIncidencia: string, idUsuarioGRD: string): Promise<void>

  /** Inserta un informe (CAMPO / EVALUACION) con contenido JSON. */
  guardarInforme(idIncidencia: string, informe: {
    titulo: string
    tipo: string
    resumen: string
    contenido: string
    estado: string
  }): Promise<void>

  /** Crea o reabre la solicitud de ayuda humanitaria en evaluación. */
  upsertSolicitudEnEvaluacion(idIncidencia: string, data: { motivo: string; descripcion: string; tipoAyuda: string }): Promise<void>

  /** Aplica la decisión del Comité sobre la solicitud en evaluación. */
  resolverSolicitud(idIncidencia: string, decision: 'APROBADA' | 'EN_EVALUACION' | 'RECHAZADA', observaciones?: string): Promise<void>

  /** Registra la entrega de ayuda humanitaria. */
  registrarEntrega(idIncidencia: string, data: { tipoAyuda: string; descripcionAyuda: string; lugarEntrega: string; observaciones?: string }): Promise<void>

  /** Registra una visita de seguimiento. */
  agregarSeguimiento(idIncidencia: string, data: { situacion: string; descripcion: string; necesidadesPendientes?: string; recomendaciones?: string }): Promise<void>

  /** Libera a los brigadistas asignados y cierra sus asignaciones. */
  liberarBrigadistas(idIncidencia: string): Promise<void>
}
