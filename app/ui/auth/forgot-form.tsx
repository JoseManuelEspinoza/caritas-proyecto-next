'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { forgotPassword } from '@/app/actions/auth'

export function ForgotForm() {
  const [state, action, pending] = useActionState(forgotPassword, undefined)

  if (state?.message) {
    return (
      <div className="space-y-5">
        <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-800">
          {state.message}
        </div>
        <Link
          href="/login"
          className="block text-center text-sm font-medium text-red-700 hover:text-red-900 hover:underline"
        >
          Volver al inicio de sesión
        </Link>
      </div>
    )
  }

  return (
    <form action={action} className="space-y-5">
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

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-red-700 px-4 py-2.5 text-sm font-semibold text-white
                   shadow-sm hover:bg-red-800 disabled:opacity-50 transition-colors"
      >
        {pending ? 'Enviando…' : 'Enviar enlace de recuperación'}
      </button>

      <p className="text-center text-sm text-gray-600">
        <Link href="/login" className="font-medium text-red-700 hover:text-red-900 hover:underline">
          Volver al inicio de sesión
        </Link>
      </p>
    </form>
  )
}
