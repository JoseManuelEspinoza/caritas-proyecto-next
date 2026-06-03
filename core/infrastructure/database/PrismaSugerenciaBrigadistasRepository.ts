import { prisma } from '@/app/lib/prisma'
import { logger } from '@/app/lib/logger'
import type { ISugerenciaBrigadistasRepository } from '../../domain/repositories/ISugerenciaBrigadistasRepository'
import type { EstadoCertificacion } from '../../domain/services/confianza'
import type {
  ParroquiaRef,
  BrigadistaCandidatoRaw,
} from '../../application/dtos/SugerenciaBrigadistasDTO'

/** Convierte un Decimal de Prisma (lat/lng) a number, preservando null. */
function toNum(value: unknown): number | null {
  return value == null ? null : Number(value)
}

// Filtro común: brigadista DISPONIBLE y ACTIVO.
// Regla de negocio: disponible=false (≠ 'DISPONIBLE') o estado=INACTIVO ⇒ nunca aparece.
const DISPONIBLE_ACTIVO = { disponibilidad: 'DISPONIBLE', estado: 'ACTIVO' } as const

// Forma de fila que devuelve Prisma con los includes que usamos.
type FilaBrigadista = {
  idBrigadistaParroquial: string
  nombres: string
  apellidos: string | null
  celular: string | null
  correo: string | null
  idParroquia: string
  disponibilidad: string | null
  certificacionCurso: { estadoCertificacion: string } | null
  parroquia: { nombre: string; latitud: unknown; longitud: unknown }
}

/**
 * Implementación Prisma del contrato del algoritmo RF36.
 *
 * Es la única capa que conoce Prisma. Traduce los modelos reales
 * (BrigadistaParroquial, Parroquia, CertificacionCurso, AsignacionBrigadistaIncidencia)
 * a las formas crudas que consume el caso de uso.
 *
 * NOTA: el schema actual no tiene `Parroquia.idZonaPastoral` (no existe el modelo
 * ZonaPastoral), por eso `idZonaPastoral` se devuelve como null. Cuando exista,
 * basta con seleccionarlo aquí y el indicador `mismaZonaPastoral` empezará a poblarse.
 */
export class PrismaSugerenciaBrigadistasRepository
  implements ISugerenciaBrigadistasRepository
{
  async getParroquia(idParroquia: string): Promise<ParroquiaRef | null> {
    const p = await prisma.parroquia.findUnique({
      where: { idParroquia },
      select: { idParroquia: true, latitud: true, longitud: true },
    })
    if (!p) return null
    return {
      idParroquia: p.idParroquia,
      latitud: toNum(p.latitud),
      longitud: toNum(p.longitud),
      idZonaPastoral: null, // ⚠️ ver NOTA de la clase
    }
  }

  async getBrigadistasDisponiblesPorParroquia(
    idParroquia: string,
  ): Promise<BrigadistaCandidatoRaw[]> {
    const filas = await prisma.brigadistaParroquial.findMany({
      where: { idParroquia, ...DISPONIBLE_ACTIVO },
      select: this.selectBrigadista,
    })
    return filas.map((f) => this.toRaw(f as FilaBrigadista))
  }

  async getTodosBrigadistasDisponibles(
    excluirParroquia: string,
  ): Promise<BrigadistaCandidatoRaw[]> {
    const filas = await prisma.brigadistaParroquial.findMany({
      where: { idParroquia: { not: excluirParroquia }, ...DISPONIBLE_ACTIVO },
      select: this.selectBrigadista,
    })
    return filas.map((f) => this.toRaw(f as FilaBrigadista))
  }

  async getIncidenciasAtendidas(idBrigadistaParroquial: string): Promise<number> {
    // Cuenta las asignaciones del brigadista. Si más adelante se quiere contar solo
    // las efectivamente atendidas, añadir `estadoAsignacion: 'CERRADA'` al where.
    return prisma.asignacionBrigadistaIncidencia.count({
      where: { idBrigadistaParroquial },
    })
  }

  async registrarIntentoFallido(idParroquia: string, tipoIncidente: string): Promise<void> {
    // Trazabilidad de la Fase 3 (sin candidatos). Hoy solo se loguea; a futuro se
    // puede persistir en HistorialAuditoriaGRD para auditoría formal.
    logger.warn(
      { idParroquia, tipoIncidente },
      'RF36: sin brigadistas disponibles, se requiere intervención manual del especialista',
    )
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private readonly selectBrigadista = {
    idBrigadistaParroquial: true,
    nombres: true,
    apellidos: true,
    celular: true,
    correo: true,
    idParroquia: true,
    disponibilidad: true,
    certificacionCurso: { select: { estadoCertificacion: true } },
    parroquia: { select: { nombre: true, latitud: true, longitud: true } },
  } as const

  private toRaw(f: FilaBrigadista): BrigadistaCandidatoRaw {
    return {
      idBrigadistaParroquial: f.idBrigadistaParroquial,
      nombres: f.nombres,
      apellidos: f.apellidos ?? '',
      celular: f.celular ?? null,
      correo: f.correo ?? null,
      idParroquia: f.idParroquia,
      disponibilidad: f.disponibilidad ?? '',
      certificacionCurso: f.certificacionCurso
        ? { estadoCertificacion: f.certificacionCurso.estadoCertificacion as EstadoCertificacion }
        : null,
      parroquia: {
        nombre: f.parroquia.nombre,
        latitud: toNum(f.parroquia.latitud),
        longitud: toNum(f.parroquia.longitud),
        idZonaPastoral: null, // ⚠️ ver NOTA de la clase
      },
    }
  }
}
