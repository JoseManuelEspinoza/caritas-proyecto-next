import { describe, it, expect } from 'vitest'
import { Guard } from '@/core/domain/shared/Guard'
import { ValidationError } from '@/core/domain/errors/DomainError'

describe('Guard.required', () => {
  it('no lanza error cuando el valor tiene contenido', () => {
    expect(() => Guard.required('María', 'nombres')).not.toThrow()
  })

  it('lanza ValidationError cuando el valor es cadena vacía', () => {
    expect(() => Guard.required('', 'nombres')).toThrow(ValidationError)
  })

  it('lanza ValidationError cuando el valor es solo espacios', () => {
    expect(() => Guard.required('   ', 'nombres')).toThrow(ValidationError)
  })

  it('lanza ValidationError cuando el valor es null', () => {
    expect(() => Guard.required(null, 'nombres')).toThrow(ValidationError)
  })

  it('lanza ValidationError cuando el valor es undefined', () => {
    expect(() => Guard.required(undefined, 'nombres')).toThrow(ValidationError)
  })

  it('incluye el nombre del campo en el mensaje de error', () => {
    expect(() => Guard.required('', 'idParroquia')).toThrow('"idParroquia"')
  })
})

describe('Guard.minLength', () => {
  it('no lanza error cuando la cadena supera el mínimo', () => {
    expect(() => Guard.minLength('abc', 3, 'campo')).not.toThrow()
  })

  it('lanza ValidationError cuando la cadena es más corta que el mínimo', () => {
    expect(() => Guard.minLength('ab', 3, 'campo')).toThrow(ValidationError)
  })

  it('lanza ValidationError cuando el valor (con trim) queda bajo el mínimo', () => {
    expect(() => Guard.minLength('  a  ', 3, 'campo')).toThrow(ValidationError)
  })
})

describe('Guard.positive', () => {
  it('no lanza error con un número positivo', () => {
    expect(() => Guard.positive(1, 'monto')).not.toThrow()
  })

  it('lanza ValidationError con cero', () => {
    expect(() => Guard.positive(0, 'monto')).toThrow(ValidationError)
  })

  it('lanza ValidationError con número negativo', () => {
    expect(() => Guard.positive(-5, 'monto')).toThrow(ValidationError)
  })

  it('lanza ValidationError con NaN', () => {
    expect(() => Guard.positive(NaN, 'monto')).toThrow(ValidationError)
  })
})

describe('Guard.nonNegative', () => {
  it('no lanza error con cero', () => {
    expect(() => Guard.nonNegative(0, 'cantidad')).not.toThrow()
  })

  it('no lanza error con número positivo', () => {
    expect(() => Guard.nonNegative(10, 'cantidad')).not.toThrow()
  })

  it('lanza ValidationError con número negativo', () => {
    expect(() => Guard.nonNegative(-1, 'cantidad')).toThrow(ValidationError)
  })
})

describe('Guard.oneOf', () => {
  const allowed = ['ACTIVO', 'INACTIVO'] as const

  it('no lanza error cuando el valor está en la lista', () => {
    expect(() => Guard.oneOf('ACTIVO', allowed, 'estado')).not.toThrow()
  })

  it('lanza ValidationError cuando el valor no está en la lista', () => {
    expect(() => Guard.oneOf('PENDIENTE', allowed, 'estado')).toThrow(ValidationError)
  })

  it('incluye el valor inválido en el mensaje de error', () => {
    expect(() => Guard.oneOf('PENDIENTE', allowed, 'estado')).toThrow('PENDIENTE')
  })
})
