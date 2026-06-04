import { describe, it, expect } from 'vitest'
import { PlanTrabajo } from '@/core/domain/entities/plan/PlanTrabajo'
import { ValidationError, BusinessRuleError } from '@/core/domain/errors/DomainError'

const BASE = {
  id: 'plan-1',
  idParroquia: 'parroquia-1',
  idUsuarioResponsableGRD: 'usuario-1',
  nombrePlan: 'Plan GRD 2026',
}

function crearBorrador(): PlanTrabajo {
  return PlanTrabajo.crear(BASE)
}

function crearEnRevision(): PlanTrabajo {
  const p = crearBorrador()
  p.enviarRevision()
  return p
}

function crearObservado(): PlanTrabajo {
  const p = crearEnRevision()
  p.observar('Falta el diagnóstico de riesgo.')
  return p
}

describe('PlanTrabajo.crear', () => {
  it('[positivo] crea el plan con estado BORRADOR', () => {
    const p = crearBorrador()
    expect(p.snapshot.estadoAprobacion).toBe('BORRADOR')
  })

  it('[positivo] trimea nombrePlan', () => {
    const p = PlanTrabajo.crear({ ...BASE, nombrePlan: '  Plan GRD  ' })
    expect(p.snapshot.nombrePlan).toBe('Plan GRD')
  })

  it('[negativo] lanza ValidationError cuando idParroquia está vacío', () => {
    expect(() => PlanTrabajo.crear({ ...BASE, idParroquia: '' })).toThrow(ValidationError)
  })

  it('[negativo] lanza ValidationError cuando nombrePlan tiene menos de 3 caracteres', () => {
    expect(() => PlanTrabajo.crear({ ...BASE, nombrePlan: 'AB' })).toThrow(ValidationError)
  })

  it('[negativo] lanza ValidationError cuando idUsuarioResponsableGRD está vacío', () => {
    expect(() => PlanTrabajo.crear({ ...BASE, idUsuarioResponsableGRD: '' })).toThrow(ValidationError)
  })
})

describe('PlanTrabajo.actualizar', () => {
  it('[positivo] permite editar en BORRADOR', () => {
    const p = crearBorrador()
    p.actualizar({ nombrePlan: 'Plan Actualizado' })
    expect(p.snapshot.nombrePlan).toBe('Plan Actualizado')
  })

  it('[positivo] permite editar en OBSERVADO', () => {
    const p = crearObservado()
    p.actualizar({ nombrePlan: 'Plan Corregido' })
    expect(p.snapshot.nombrePlan).toBe('Plan Corregido')
  })

  it('[negativo] lanza BusinessRuleError al editar en EN_REVISION', () => {
    const p = crearEnRevision()
    expect(() => p.actualizar({ nombrePlan: 'Nuevo nombre' })).toThrow(BusinessRuleError)
  })

  it('[negativo] lanza BusinessRuleError al editar en APROBADO', () => {
    const p = crearEnRevision()
    p.aprobar()
    expect(() => p.actualizar({ nombrePlan: 'Nuevo nombre' })).toThrow(BusinessRuleError)
  })
})

describe('PlanTrabajo — flujo de aprobación', () => {
  it('[positivo] BORRADOR → EN_REVISION', () => {
    const p = crearBorrador()
    p.enviarRevision()
    expect(p.snapshot.estadoAprobacion).toBe('EN_REVISION')
  })

  it('[positivo] EN_REVISION → APROBADO', () => {
    const p = crearEnRevision()
    p.aprobar()
    expect(p.snapshot.estadoAprobacion).toBe('APROBADO')
  })

  it('[positivo] EN_REVISION → OBSERVADO con observaciones', () => {
    const p = crearEnRevision()
    p.observar('Falta el diagnóstico.')
    expect(p.snapshot.estadoAprobacion).toBe('OBSERVADO')
    expect(p.snapshot.observaciones).toBe('Falta el diagnóstico.')
  })

  it('[positivo] OBSERVADO → EN_REVISION (reenvío)', () => {
    const p = crearObservado()
    p.enviarRevision()
    expect(p.snapshot.estadoAprobacion).toBe('EN_REVISION')
  })

  it('[negativo] lanza BusinessRuleError con transición no permitida (BORRADOR → APROBADO)', () => {
    expect(() => crearBorrador().aprobar()).toThrow(BusinessRuleError)
  })

  it('[negativo] lanza ValidationError al observar sin observaciones', () => {
    const p = crearEnRevision()
    expect(() => p.observar('')).toThrow(ValidationError)
  })

  it('[negativo] APROBADO no admite más transiciones', () => {
    const p = crearEnRevision()
    p.aprobar()
    expect(() => p.enviarRevision()).toThrow(BusinessRuleError)
  })
})
