import { Guard } from '../../shared/Guard'
import { BusinessRuleError } from '../../errors/DomainError'

export type EstadoCurso = 'BORRADOR' | 'PUBLICADO' | 'CERRADO'

/** Nota mínima para aprobar (escala 0–20). */
export const NOTA_APROBATORIA = 11

/** Deriva el resultado de una evaluación a partir de la nota. */
export function resultadoPorNota(nota: number): 'APROBADO' | 'DESAPROBADO' {
  return nota >= NOTA_APROBATORIA ? 'APROBADO' : 'DESAPROBADO'
}

export interface CursoProps {
  id: string
  idUsuarioResponsableGRD: string
  idInstitucionAliada?: string | null
  codigoCurso?: string | null
  nombreCurso: string
  descripcion?: string | null
  fechaPublicacion?: string | null
  fechaCierre?: string | null
  duracionEstimadaHoras?: number | null
  modalidadGeneral: string
  estadoCurso: EstadoCurso
}

/**
 * Curso de capacitación asíncrona (modelo DER `CursoCapacitacion`).
 *
 * Flujo de publicación: BORRADOR → PUBLICADO → CERRADO. Solo un curso PUBLICADO
 * admite inscripciones (regla aplicada en el caso de uso vía `estaAbierto`).
 */
export class Curso {
  private constructor(private props: CursoProps) {}

  static crear(input: {
    id: string
    idUsuarioResponsableGRD: string
    nombreCurso: string
    descripcion?: string | null
    idInstitucionAliada?: string | null
    codigoCurso?: string | null
    duracionEstimadaHoras?: number | null
  }): Curso {
    Guard.required(input.idUsuarioResponsableGRD, 'idUsuarioResponsableGRD')
    Guard.minLength(input.nombreCurso, 3, 'nombreCurso')
    return new Curso({
      id: input.id,
      idUsuarioResponsableGRD: input.idUsuarioResponsableGRD,
      idInstitucionAliada: input.idInstitucionAliada ?? null,
      codigoCurso: input.codigoCurso ?? null,
      nombreCurso: input.nombreCurso.trim(),
      descripcion: input.descripcion ?? null,
      fechaPublicacion: null,
      fechaCierre: null,
      duracionEstimadaHoras: input.duracionEstimadaHoras ?? null,
      modalidadGeneral: 'ASINCRONA',
      estadoCurso: 'BORRADOR',
    })
  }

  static desdePersistencia(props: CursoProps): Curso {
    return new Curso(props)
  }

  publicar(): void {
    if (this.props.estadoCurso !== 'BORRADOR') {
      throw new BusinessRuleError('Solo se puede publicar un curso en BORRADOR.')
    }
    this.props.estadoCurso = 'PUBLICADO'
    this.props.fechaPublicacion = new Date().toISOString()
  }

  cerrar(): void {
    if (this.props.estadoCurso !== 'PUBLICADO') {
      throw new BusinessRuleError('Solo se puede cerrar un curso PUBLICADO.')
    }
    this.props.estadoCurso = 'CERRADO'
    this.props.fechaCierre = new Date().toISOString()
  }

  get estaAbierto(): boolean { return this.props.estadoCurso === 'PUBLICADO' }
  get id(): string { return this.props.id }
  get snapshot(): Readonly<CursoProps> { return this.props }
}
