import { describe, it, expect, vi } from 'vitest'
import { RegistrarAtencionUseCase, AgregarSeguimientoUseCase, CerrarCasoUseCase } from '@/core/application/use-cases/incidencias/AtencionYCierre.usecase'
import { IIncidenciaRepository } from '@/core/domain/repositories/IIncidenciaRepository'
import { Incidencia } from '@/core/domain/entities/incidencia/Incidencia'
import { NotFoundError, BusinessRuleError } from '@/core/domain/errors/DomainError'
import { AtencionData, SeguimientoData } from '@/core/application/dtos/IncidenciaDTO'

function makeRepo(overrides: Partial<IIncidenciaRepository> = {}): IIncidenciaRepository {
  return {
    nextCodigo: vi.fn().mockResolvedValue('GRD-2026-0001'),
    crear: vi.fn().mockResolvedValue('inc-uuid'),
    findById: vi.fn().mockResolvedValue(null),
    actualizarDatos: vi.fn().mockResolvedValue(undefined),
    guardarTransicion: vi.fn().mockResolvedValue(undefined),
    registrarAsignacion: vi.fn().mockResolvedValue(undefined),
    asignarResponsable: vi.fn().mockResolvedValue(undefined),
    guardarInforme: vi.fn().mockResolvedValue(undefined),
    upsertSolicitudEnEvaluacion: vi.fn().mockResolvedValue(undefined),
    resolverSolicitud: vi.fn().mockResolvedValue(undefined),
    registrarEntrega: vi.fn().mockResolvedValue(undefined),
    agregarSeguimiento: vi.fn().mockResolvedValue(undefined),
    liberarBrigadistas: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

const ATENCION_DATA: AtencionData = {
  tipoAyuda: 'ALIMENTOS',
  descripcionAyuda: 'Canastas básicas',
  lugarEntrega: 'Parroquia central',
}

const SEGUIMIENTO_DATA: SeguimientoData = {
  situacion: 'EN_PROCESO',
  descripcion: 'Familia recibió ayuda inicial',
}

// ---------------------------------------------------------------------------
// RegistrarAtencionUseCase
// ---------------------------------------------------------------------------
describe('RegistrarAtencionUseCase', () => {
  it('[positivo] transiciona APROBADO → ATENDIDO y registra la entrega', async () => {
    const inc = Incidencia.desdePersistencia({ id: 'inc-1', estadoActual: 'APROBADO' })
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(inc) })

    await new RegistrarAtencionUseCase(repo).execute('inc-1', ATENCION_DATA)

    expect(inc.estadoActual).toBe('ATENDIDO')
    expect(repo.registrarEntrega).toHaveBeenCalledOnce()
    expect(repo.guardarTransicion).toHaveBeenCalledOnce()
  })

  it('[negativo] lanza BusinessRuleError si el incidente no está APROBADO', async () => {
    const inc = Incidencia.crear({ id: 'inc-2' })
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(inc) })

    await expect(
      new RegistrarAtencionUseCase(repo).execute('inc-2', ATENCION_DATA)
    ).rejects.toThrow(BusinessRuleError)
  })

  it('[negativo] lanza NotFoundError cuando el incidente no existe', async () => {
    const repo = makeRepo()
    await expect(
      new RegistrarAtencionUseCase(repo).execute('no-existe', ATENCION_DATA)
    ).rejects.toThrow(NotFoundError)
  })
})

// ---------------------------------------------------------------------------
// AgregarSeguimientoUseCase
// ---------------------------------------------------------------------------
describe('AgregarSeguimientoUseCase', () => {
  it('[positivo] transiciona ATENDIDO → SEGUIMIENTO ABIERTO al agregar el primer seguimiento', async () => {
    const inc = Incidencia.desdePersistencia({ id: 'inc-3', estadoActual: 'ATENDIDO' })
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(inc) })

    await new AgregarSeguimientoUseCase(repo).execute('inc-3', SEGUIMIENTO_DATA)

    expect(inc.estadoActual).toBe('SEGUIMIENTO ABIERTO')
    expect(repo.agregarSeguimiento).toHaveBeenCalledOnce()
    expect(repo.guardarTransicion).toHaveBeenCalledOnce()
  })

  it('[positivo] no transiciona si ya está en SEGUIMIENTO ABIERTO', async () => {
    const inc = Incidencia.desdePersistencia({ id: 'inc-4', estadoActual: 'SEGUIMIENTO ABIERTO' })
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(inc) })

    await new AgregarSeguimientoUseCase(repo).execute('inc-4', SEGUIMIENTO_DATA)

    expect(repo.agregarSeguimiento).toHaveBeenCalledOnce()
    expect(repo.guardarTransicion).not.toHaveBeenCalled()
    expect(inc.estadoActual).toBe('SEGUIMIENTO ABIERTO')
  })

  it('[negativo] lanza NotFoundError cuando el incidente no existe', async () => {
    const repo = makeRepo()
    await expect(
      new AgregarSeguimientoUseCase(repo).execute('no-existe', SEGUIMIENTO_DATA)
    ).rejects.toThrow(NotFoundError)
  })
})

// ---------------------------------------------------------------------------
// CerrarCasoUseCase
// ---------------------------------------------------------------------------
describe('CerrarCasoUseCase', () => {
  it('[positivo] transiciona SEGUIMIENTO ABIERTO → CERRADO y libera brigadistas', async () => {
    const inc = Incidencia.desdePersistencia({ id: 'inc-5', estadoActual: 'SEGUIMIENTO ABIERTO' })
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(inc) })

    await new CerrarCasoUseCase(repo).execute('inc-5')

    expect(inc.estadoActual).toBe('CERRADO')
    expect(repo.liberarBrigadistas).toHaveBeenCalledOnce()
    expect(repo.guardarTransicion).toHaveBeenCalledOnce()
  })

  it('[positivo] cierra desde RECHAZADO también', async () => {
    const inc = Incidencia.desdePersistencia({ id: 'inc-6', estadoActual: 'RECHAZADO' })
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(inc) })

    await new CerrarCasoUseCase(repo).execute('inc-6')

    expect(inc.estadoActual).toBe('CERRADO')
  })

  it('[negativo] lanza BusinessRuleError si el incidente no está en estado cerrable', async () => {
    const inc = Incidencia.crear({ id: 'inc-7' })
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(inc) })

    await expect(
      new CerrarCasoUseCase(repo).execute('inc-7')
    ).rejects.toThrow(BusinessRuleError)
  })

  it('[negativo] lanza NotFoundError cuando el incidente no existe', async () => {
    const repo = makeRepo()
    await expect(
      new CerrarCasoUseCase(repo).execute('no-existe')
    ).rejects.toThrow(NotFoundError)
  })
})
