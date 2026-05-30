import { Curso } from '../entities/curso/Curso'

export interface ParticipanteData {
  tipoDocumento?: string | null
  numeroDocumento?: string | null
  nombres: string
  apellidos?: string | null
  celular?: string | null
  correo?: string | null
  idParroquia?: string | null
  rolPastoralComunitario?: string | null
}

export interface ICursoRepository {
  nextCodigo(): Promise<string>
  crearCurso(curso: Curso): Promise<void>
  actualizarCurso(curso: Curso): Promise<void>
  findCursoById(id: string): Promise<Curso | null>
  findAllCursos(): Promise<Curso[]>

  /** Crea el participante o devuelve el existente (por documento). Devuelve idParticipante. */
  upsertParticipante(data: ParticipanteData): Promise<string>
  existsInscripcion(idCurso: string, idParticipante: string): Promise<boolean>
  crearInscripcion(idCurso: string, idParticipante: string): Promise<string>
  existsInscripcionId(idInscripcion: string): Promise<boolean>

  crearEvaluacion(idInscripcion: string, data: { tipoEvaluacion?: string; numeroIntento: number; nota: number; resultado: string }): Promise<void>
  tieneEvaluacionAprobada(idInscripcion: string): Promise<boolean>
  upsertCertificacion(idInscripcion: string, data: { estadoCertificacion: string; constanciaUrl?: string }): Promise<void>
}
