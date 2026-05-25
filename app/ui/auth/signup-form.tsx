'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signup } from '@/app/actions/auth'

export function SignupForm() {
  const [state, action, pending] = useActionState(signup, undefined)

  return (
    <form action={action} className="space-y-5">
      {state?.message && (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.message}
        </p>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Nombre completo
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm
                     focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
        />
        {state?.errors?.name && (
          <p className="mt-1 text-xs text-red-600">{state.errors.name[0]}</p>
        )}
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Correo electrónico
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm
                     focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
        />
        {state?.errors?.email && (
          <p className="mt-1 text-xs text-red-600">{state.errors.email[0]}</p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm
                     focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
        />
        {state?.errors?.password && (
          <div className="mt-1 space-y-0.5">
            {state.errors.password.map((e) => (
              <p key={e} className="text-xs text-red-600">• {e}</p>
            ))}
          </div>
        )}
        <p className="mt-1 text-xs text-gray-500">
          Mínimo 8 caracteres, incluir letras, números y un símbolo.
        </p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-red-700 px-4 py-2.5 text-sm font-semibold text-white
                   shadow-sm hover:bg-red-800 disabled:opacity-50 transition-colors"
      >
        {pending ? 'Creando cuenta…' : 'Crear cuenta'}
      </button>

      <p className="text-center text-sm text-gray-600">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="font-medium text-red-700 hover:text-red-900 hover:underline">
          Inicia sesión
        </Link>
      </p>
    </form>
  )
}
