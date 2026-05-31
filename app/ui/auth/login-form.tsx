'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Lock, Mail, Eye, EyeOff } from 'lucide-react'
import { login } from '@/app/actions/auth'

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined)
  const [showPassword, setShowPassword] = useState(false)

  return (
    <form action={action} className="space-y-5">

      {/* Error general */}
      {state?.message && (
        <div
          className="flex items-center gap-2 p-3 bg-red-50 border border-red-200"
          style={{ borderRadius: '8px' }}
        >
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span className="text-sm text-red-700">{state.message}</span>
        </div>
      )}

      {/* Correo electrónico */}
      <div>
        <label
          htmlFor="email"
          className="block mb-2"
          style={{ color: 'var(--caritas-text)' }}
        >
          Correo electrónico
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="Ingrese su correo"
            className="w-full pl-11 pr-4 py-3 border transition-colors focus:outline-none focus:ring-2 focus:ring-[#009850]/20 focus:border-[#009850]"
            style={{
              background: 'var(--caritas-bg-light)',
              border: '1px solid var(--caritas-border)',
              borderRadius: '4px',
            }}
          />
        </div>
        {state?.errors?.email && (
          <p className="mt-1 text-xs text-red-600">{state.errors.email[0]}</p>
        )}
      </div>

      {/* Contraseña */}
      <div>
        <label
          htmlFor="password"
          className="block mb-2"
          style={{ color: 'var(--caritas-text)' }}
        >
          Contraseña
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            placeholder="Ingrese su contraseña"
            className="w-full pl-11 pr-12 py-3 border transition-colors focus:outline-none focus:ring-2 focus:ring-[#009850]/20 focus:border-[#009850]"
            style={{
              background: 'var(--caritas-bg-light)',
              border: '1px solid var(--caritas-border)',
              borderRadius: '4px',
            }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        {state?.errors?.password && (
          <p className="mt-1 text-xs text-red-600">{state.errors.password[0]}</p>
        )}
      </div>

      {/* ¿Olvidaste tu contraseña? */}
      <div className="flex justify-end">
        <Link
          href="/recuperar"
          className="text-sm hover:underline transition-colors"
          style={{ color: 'var(--caritas-green)' }}
        >
          ¿Olvidaste tu contraseña?
        </Link>
      </div>

      {/* Botón */}
      <button
        type="submit"
        disabled={pending}
        className="w-full py-3 text-white font-medium transition-all hover:opacity-90 disabled:bg-gray-400 disabled:cursor-not-allowed"
        style={{
          background: pending ? undefined : 'var(--caritas-green)',
          borderRadius: '8px',
        }}
      >
        {pending ? 'Iniciando sesión…' : 'Iniciar Sesión'}
      </button>

    </form>
  )
}
