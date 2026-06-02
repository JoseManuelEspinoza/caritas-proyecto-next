import { describe, it, expect, vi } from 'vitest'
import { CrearBrigadistaUseCase } from '@/core/application/use-cases/brigadistas/GestionarBrigadistas.usecase'

describe('CrearBrigadistaUseCase', () => {

  it('debe crear un brigadista correctamente', async () => {

    const repoMock = {
      findIdByDni: vi.fn().mockResolvedValue(null),
      save: vi.fn()
    }

    const useCase = new CrearBrigadistaUseCase(repoMock as any)

    await useCase.execute({
      idParroquia: '1',
      nombres: 'Juan',
      apellidos: 'Perez',
      dni: '12345678',
      celular: '999999999',
      correo: 'test@test.com',
      disponibilidad: "DISPONIBLE"
    })

    expect(repoMock.save).toHaveBeenCalled()
  })

  it('debe rechazar DNI duplicado', async () => {

    const repoMock = {
      findIdByDni: vi.fn().mockResolvedValue('otro-id'),
      save: vi.fn()
    }
  
    const useCase = new CrearBrigadistaUseCase(repoMock as any)
  
    await expect(
      useCase.execute({
        idParroquia: '1',
        nombres: 'Juan',
        apellidos: 'Perez',
        dni: '12345678',
        celular: '999',
        correo: 'test@test.com',
        disponibilidad: "DISPONIBLE"
      })
    ).rejects.toThrow()
  
  })

})