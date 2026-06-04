import { describe, it, expect } from 'vitest'
import { Incidencia } from '@/core/domain/entities/incidencia/Incidencia'
import { BusinessRuleError } from '@/core/domain/errors/DomainError'

function crearAbierta(): Incidencia {
  return Incidencia.crear({ id: 'inc-1', codigoCaso: 'GRD-2026-0001' })
}

describe('Incidencia.crear', () => {
  it('[positivo] se crea con estado ABIERTO', () => {
    const inc = crearAbierta()
    expect(inc.estadoActual).toBe('ABIERTO')
  })

  it('[positivo] desdePersistencia restaura el estado recibido', () => {
    const inc = Incidencia.desdePersistencia({ id: 'inc-2', estadoActual: 'ASIGNADO' })
    expect(inc.estadoActual).toBe('ASIGNADO')
  })
})

describe('Incidencia.asegurarEditable', () => {
  it('[positivo] no lanza error cuando está ABIERTO', () => {
    expect(() => crearAbierta().asegurarEditable()).not.toThrow()
  })

  it('[negativo] lanza BusinessRuleError cuando no está ABIERTO', () => {
    const inc = Incidencia.desdePersistencia({ id: 'inc-3', estadoActual: 'ASIGNADO' })
    expect(() => inc.asegurarEditable()).toThrow(BusinessRuleError)
  })
})

describe('Incidencia — flujo completo de transiciones', () => {
  it('[positivo] recorre el camino feliz hasta CERRADO por APROBADO', () => {
    const inc = crearAbierta()
    inc.asignar()
    expect(inc.estadoActual).toBe('ASIGNADO')
    inc.registrarCampo()
    expect(inc.estadoActual).toBe('DATA RECOPILADA')
    inc.enviarEvaluacion()
    expect(inc.estadoActual).toBe('EN EVALUACION')
    inc.aprobar()
    expect(inc.estadoActual).toBe('APROBADO')
    inc.atender()
    expect(inc.estadoActual).toBe('ATENDIDO')
    inc.iniciarSeguimiento()
    expect(inc.estadoActual).toBe('SEGUIMIENTO ABIERTO')
    inc.cerrar()
    expect(inc.estadoActual).toBe('CERRADO')
  })

  it('[positivo] recorre el camino RECHAZADO → CERRADO', () => {
    const inc = Incidencia.desdePersistencia({ id: 'inc-4', estadoActual: 'EN EVALUACION' })
    inc.rechazar()
    expect(inc.estadoActual).toBe('RECHAZADO')
    inc.cerrar()
    expect(inc.estadoActual).toBe('CERRADO')
  })

  it('[positivo] OBSERVADO puede reenviar a EN EVALUACION', () => {
    const inc = Incidencia.desdePersistencia({ id: 'inc-5', estadoActual: 'OBSERVADO' })
    inc.enviarEvaluacion()
    expect(inc.estadoActual).toBe('EN EVALUACION')
  })

  it('[positivo] registra el estado anterior tras cada transición', () => {
    const inc = crearAbierta()
    inc.asignar()
    expect(inc.estadoAnterior).toBe('ABIERTO')
  })

  it('[negativo] lanza BusinessRuleError en transición no permitida', () => {
    const inc = crearAbierta()
    expect(() => inc.cerrar()).toThrow(BusinessRuleError)
  })

  it('[negativo] CERRADO no admite más transiciones', () => {
    const inc = Incidencia.desdePersistencia({ id: 'inc-6', estadoActual: 'CERRADO' })
    expect(() => inc.asignar()).toThrow(BusinessRuleError)
  })
})
