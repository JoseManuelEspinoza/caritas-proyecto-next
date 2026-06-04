import { describe, it, expect, vi } from 'vitest'
import { RegistrarIncidenciaUseCase, ActualizarIncidenciaUseCase } from '@/core/application/use-cases/incidencias/RegistrarYActualizar.usecase'
import { IIncidenciaRepository } from '@/core/domain/repositories/IIncidenciaRepository'
import { Incidencia } from '@/core/domain/entities/incidencia/Incidencia'
import { ValidationError, NotFoundError, BusinessRuleError } from '@/core/domain/errors/DomainError'
import { CreateIncidenteData } from '@/core/application/dtos/IncidenciaDTO'

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

const INPUT_VALIDO: CreateIncidenteData = {
  reportaDni: '12345678',
  reportaNombre: 'Juan Pérez',
  reportaTel: '999111222',
  reportaRol: 'VECINO',
  fechaReporte: '2026-06-01',
  fechaSuceso: '2026-06-01',
  horaSuceso: '10:00',
  categoria: 'SISMO',
  pais: 'Perú',
  region: 'Lima',
  distrito: 'Miraflores',
  parroquia: 'parroquia-1',
  direccion: 'Av. Principal 123',
  referencia: 'Frente al parque',
  descripcion: 'Descripción del evento',
  causa: 'Natural',
  familias: [],
  personas: [],
  necesidades: [],
  necesidadOtra: '',
  necesidadesObs: '',
  nivelAfectacion: 'MODERADO',
}

// ---------------------------------------------------------------------------
// RegistrarIncidenciaUseCase
// ---------------------------------------------------------------------------
describe('RegistrarIncidenciaUseCase', () => {
  it('[positivo] llama a nextCodigo y crear, devuelve el id', async () => {
    const repo = makeRepo()
    const result = await new RegistrarIncidenciaUseCase(repo).execute(INPUT_VALIDO)

    expect(repo.nextCodigo).toHaveBeenCalledOnce()
    expect(repo.crear).toHaveBeenCalledOnce()
    expect(result).toBe('inc-uuid')
  })

  it('[negativo] lanza ValidationError cuando reportaNombre está vacío', async () => {
    const repo = makeRepo()
    await expect(
      new RegistrarIncidenciaUseCase(repo).execute({ ...INPUT_VALIDO, reportaNombre: '' })
    ).rejects.toThrow(ValidationError)
  })

  it('[negativo] lanza ValidationError cuando reportaDni está vacío', async () => {
    const repo = makeRepo()
    await expect(
      new RegistrarIncidenciaUseCase(repo).execute({ ...INPUT_VALIDO, reportaDni: '' })
    ).rejects.toThrow(ValidationError)
  })

  it('[negativo] lanza ValidationError cuando reportaTel está vacío', async () => {
    const repo = makeRepo()
    await expect(
      new RegistrarIncidenciaUseCase(repo).execute({ ...INPUT_VALIDO, reportaTel: '' })
    ).rejects.toThrow(ValidationError)
  })

  it('[negativo] lanza ValidationError cuando reportaRol no está definido', async () => {
    const repo = makeRepo()
    await expect(
      new RegistrarIncidenciaUseCase(repo).execute({ ...INPUT_VALIDO, reportaRol: '' })
    ).rejects.toThrow(ValidationError)
  })

  it('[negativo] lanza ValidationError cuando categoria está vacía', async () => {
    const repo = makeRepo()
    await expect(
      new RegistrarIncidenciaUseCase(repo).execute({ ...INPUT_VALIDO, categoria: '' })
    ).rejects.toThrow(ValidationError)
  })

  it('[negativo] lanza ValidationError cuando fechaSuceso está vacía', async () => {
    const repo = makeRepo()
    await expect(
      new RegistrarIncidenciaUseCase(repo).execute({ ...INPUT_VALIDO, fechaSuceso: '' })
    ).rejects.toThrow(ValidationError)
  })
})

// ---------------------------------------------------------------------------
// ActualizarIncidenciaUseCase
// ---------------------------------------------------------------------------
describe('ActualizarIncidenciaUseCase', () => {
  it('[positivo] actualiza cuando el incidente está ABIERTO', async () => {
    const incidencia = Incidencia.crear({ id: 'inc-1' })
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(incidencia) })

    await expect(
      new ActualizarIncidenciaUseCase(repo).execute('inc-1', INPUT_VALIDO)
    ).resolves.not.toThrow()
    expect(repo.actualizarDatos).toHaveBeenCalledOnce()
  })

  it('[negativo] lanza NotFoundError cuando el incidente no existe', async () => {
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(null) })
    await expect(
      new ActualizarIncidenciaUseCase(repo).execute('no-existe', INPUT_VALIDO)
    ).rejects.toThrow(NotFoundError)
  })

  it('[negativo] lanza BusinessRuleError cuando el incidente no está ABIERTO', async () => {
    const incidencia = Incidencia.desdePersistencia({ id: 'inc-2', estadoActual: 'ASIGNADO' })
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(incidencia) })

    await expect(
      new ActualizarIncidenciaUseCase(repo).execute('inc-2', INPUT_VALIDO)
    ).rejects.toThrow(BusinessRuleError)
  })

  it('[negativo] lanza ValidationError cuando categoria está vacía en actualización', async () => {
    const incidencia = Incidencia.crear({ id: 'inc-3' })
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(incidencia) })

    await expect(
      new ActualizarIncidenciaUseCase(repo).execute('inc-3', { ...INPUT_VALIDO, categoria: '' })
    ).rejects.toThrow(ValidationError)
  })
})
