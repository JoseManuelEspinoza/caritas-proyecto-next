import { describe, it, expect } from 'vitest'
import { ActividadPreventiva } from '@/core/domain/entities/actividad/ActividadPreventiva'
import { ValidationError, BusinessRuleError } from '@/core/domain/errors/DomainError'

const BASE = {
  id: 'act-1',
  idParroquia: 'parroquia-1',
  idUsuarioRegistroGRD: 'usuario-1',
  idTipoActividadPreventiva: 'tipo-1',
  nombreActividad: 'Simulacro de evacuación',
}

function crearProgramada(): ActividadPreventiva {
  return ActividadPreventiva.crear(BASE)
}

describe('ActividadPreventiva.crear', () => {
  it('[positivo] crea la actividad con estado PROGRAMADA', () => {
    const a = crearProgramada()
    expect(a.snapshot.estadoActividad).toBe('PROGRAMADA')
  })

  it('[positivo] trimea nombreActividad', () => {
    const a = ActividadPreventiva.crear({ ...BASE, nombreActividad: '  Simulacro  ' })
    expect(a.snapshot.nombreActividad).toBe('Simulacro')
  })

  it('[negativo] lanza ValidationError cuando idParroquia está vacío', () => {
    expect(() => ActividadPreventiva.crear({ ...BASE, idParroquia: '' })).toThrow(ValidationError)
  })

  it('[negativo] lanza ValidationError cuando nombreActividad tiene menos de 3 caracteres', () => {
    expect(() => ActividadPreventiva.crear({ ...BASE, nombreActividad: 'AB' })).toThrow(ValidationError)
  })

  it('[negativo] lanza ValidationError cuando idTipoActividadPreventiva está vacío', () => {
    expect(() => ActividadPreventiva.crear({ ...BASE, idTipoActividadPreventiva: '' })).toThrow(ValidationError)
  })
})

describe('ActividadPreventiva.asignarResponsable', () => {
  it('[positivo] asigna responsable cuando está PROGRAMADA', () => {
    const a = crearProgramada()
    a.asignarResponsable('brigadista-1')
    expect(a.snapshot.idBrigadistaResponsable).toBe('brigadista-1')
  })

  it('[negativo] lanza BusinessRuleError al asignar responsable en actividad EJECUTADA', () => {
    const a = crearProgramada()
    a.ejecutar({ resultadoGeneral: 'Exitoso' })
    expect(() => a.asignarResponsable('brigadista-1')).toThrow(BusinessRuleError)
  })
})

describe('ActividadPreventiva.ejecutar', () => {
  it('[positivo] cambia el estado a EJECUTADA', () => {
    const a = crearProgramada()
    a.ejecutar({ resultadoGeneral: 'Exitoso', numeroParticipantesReal: 30 })
    expect(a.snapshot.estadoActividad).toBe('EJECUTADA')
    expect(a.snapshot.resultadoGeneral).toBe('Exitoso')
    expect(a.snapshot.numeroParticipantesReal).toBe(30)
  })

  it('[positivo] registra la fecha de ejecución', () => {
    const a = crearProgramada()
    a.ejecutar({ resultadoGeneral: 'Completado' })
    expect(a.snapshot.fechaEjecucion).not.toBeNull()
  })

  it('[negativo] lanza BusinessRuleError al ejecutar una actividad ya EJECUTADA', () => {
    const a = crearProgramada()
    a.ejecutar({ resultadoGeneral: 'Primera ejecución' })
    expect(() => a.ejecutar({ resultadoGeneral: 'Segunda ejecución' })).toThrow(BusinessRuleError)
  })

  it('[negativo] lanza BusinessRuleError al ejecutar una actividad CANCELADA', () => {
    const a = crearProgramada()
    a.cancelar('Sin presupuesto')
    expect(() => a.ejecutar({ resultadoGeneral: 'Tardío' })).toThrow(BusinessRuleError)
  })
})

describe('ActividadPreventiva.cancelar', () => {
  it('[positivo] cambia el estado a CANCELADA y guarda el motivo', () => {
    const a = crearProgramada()
    a.cancelar('Mal clima')
    expect(a.snapshot.estadoActividad).toBe('CANCELADA')
    expect(a.snapshot.observaciones).toBe('Mal clima')
  })

  it('[negativo] lanza BusinessRuleError al cancelar una actividad EJECUTADA', () => {
    const a = crearProgramada()
    a.ejecutar({ resultadoGeneral: 'OK' })
    expect(() => a.cancelar('Ya fue ejecutada')).toThrow(BusinessRuleError)
  })
})
