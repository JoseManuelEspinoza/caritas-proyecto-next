import { describe, it, expect, vi } from 'vitest'
import {
  CrearKitUseCase,
  ListarKitsUseCase,
  ListarMovimientosKitUseCase,
  RegistrarMovimientoKitUseCase,
} from '@/core/application/use-cases/kits/GestionarKits.usecase'
import { IKitRepository } from '@/core/domain/repositories/IKitRepository'
import { KitEmergencia } from '@/core/domain/entities/kit/KitEmergencia'
import { NotFoundError, ValidationError, BusinessRuleError } from '@/core/domain/errors/DomainError'

function makeRepo(overrides: Partial<IKitRepository> = {}): IKitRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn().mockResolvedValue(null),
    findAll: vi.fn().mockResolvedValue([]),
    registrarMovimiento: vi.fn().mockResolvedValue(undefined),
    findMovimientos: vi.fn().mockResolvedValue([]),
    ...overrides,
  }
}

function kitConStock(stock: number, id = 'kit-1'): KitEmergencia {
  return KitEmergencia.crear({ id, tipoKit: 'Mochila básica', stockInicial: stock })
}

// ---------------------------------------------------------------------------
// CrearKitUseCase
// ---------------------------------------------------------------------------
describe('CrearKitUseCase', () => {
  it('[positivo] crea el kit y lo guarda', async () => {
    const repo = makeRepo()
    const result = await new CrearKitUseCase(repo).execute({ tipoKit: 'Botiquín', stockInicial: 5 })

    expect(repo.save).toHaveBeenCalledOnce()
    expect(result.tipoKit).toBe('Botiquín')
    expect(result.stockActual).toBe(5)
    expect(result.estadoKit).toBe('ACTIVO')
  })

  it('[positivo] stock por defecto es 0', async () => {
    const repo = makeRepo()
    const result = await new CrearKitUseCase(repo).execute({ tipoKit: 'Linterna' })
    expect(result.stockActual).toBe(0)
  })

  it('[negativo] lanza ValidationError cuando tipoKit está vacío', async () => {
    const repo = makeRepo()
    await expect(
      new CrearKitUseCase(repo).execute({ tipoKit: '' })
    ).rejects.toThrow(ValidationError)
  })
})

// ---------------------------------------------------------------------------
// ListarKitsUseCase
// ---------------------------------------------------------------------------
describe('ListarKitsUseCase', () => {
  it('[positivo] retorna la lista de kits', async () => {
    const kits = [kitConStock(5, 'k1'), kitConStock(3, 'k2')]
    const repo = makeRepo({ findAll: vi.fn().mockResolvedValue(kits) })
    const result = await new ListarKitsUseCase(repo).execute()
    expect(result).toHaveLength(2)
  })

  it('[positivo] retorna array vacío cuando no hay kits', async () => {
    const repo = makeRepo()
    const result = await new ListarKitsUseCase(repo).execute()
    expect(result).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// ListarMovimientosKitUseCase
// ---------------------------------------------------------------------------
describe('ListarMovimientosKitUseCase', () => {
  it('[positivo] delega al repositorio y retorna los movimientos', async () => {
    const movimientos = [{ id: 'mov-1', tipo: 'INGRESO', cantidad: 5, fecha: '2026-01-01', responsable: null, motivoMovimiento: null, observaciones: null }]
    const repo = makeRepo({ findMovimientos: vi.fn().mockResolvedValue(movimientos) })
    const result = await new ListarMovimientosKitUseCase(repo).execute('kit-1')
    expect(result).toHaveLength(1)
    expect(repo.findMovimientos).toHaveBeenCalledWith('kit-1')
  })
})

// ---------------------------------------------------------------------------
// RegistrarMovimientoKitUseCase
// ---------------------------------------------------------------------------
describe('RegistrarMovimientoKitUseCase', () => {
  it('[positivo] registra INGRESO y actualiza el stock', async () => {
    const kit = kitConStock(10)
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(kit) })

    const result = await new RegistrarMovimientoKitUseCase(repo).execute('kit-1', {
      tipo: 'INGRESO', cantidad: 5, idUsuarioResponsableGRD: 'usuario-1',
    })

    expect(result.stockActual).toBe(15)
    expect(repo.registrarMovimiento).toHaveBeenCalledOnce()
  })

  it('[positivo] registra ENTREGA y descuenta del stock', async () => {
    const kit = kitConStock(10)
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(kit) })

    const result = await new RegistrarMovimientoKitUseCase(repo).execute('kit-1', {
      tipo: 'ENTREGA', cantidad: 3, idUsuarioResponsableGRD: 'usuario-1',
    })

    expect(result.stockActual).toBe(7)
  })

  it('[negativo] lanza NotFoundError cuando el kit no existe', async () => {
    const repo = makeRepo()
    await expect(
      new RegistrarMovimientoKitUseCase(repo).execute('no-existe', {
        tipo: 'INGRESO', cantidad: 5, idUsuarioResponsableGRD: 'usuario-1',
      })
    ).rejects.toThrow(NotFoundError)
  })

  it('[negativo] lanza BusinessRuleError al entregar más del stock disponible', async () => {
    const kit = kitConStock(2)
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(kit) })

    await expect(
      new RegistrarMovimientoKitUseCase(repo).execute('kit-1', {
        tipo: 'ENTREGA', cantidad: 5, idUsuarioResponsableGRD: 'usuario-1',
      })
    ).rejects.toThrow(BusinessRuleError)
  })

  it('[negativo] lanza ValidationError con cantidad 0', async () => {
    const kit = kitConStock(10)
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(kit) })

    await expect(
      new RegistrarMovimientoKitUseCase(repo).execute('kit-1', {
        tipo: 'INGRESO', cantidad: 0, idUsuarioResponsableGRD: 'usuario-1',
      })
    ).rejects.toThrow(ValidationError)
  })
})
