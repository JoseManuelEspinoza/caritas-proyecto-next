'use client'

import { useActionState } from 'react'
import type { FormState } from '@/app/lib/definitions'

type Props = {
  action: (state: FormState, formData: FormData) => Promise<FormState>
}

export function ResetForm({ action }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined)

  return (
    <form action={formAction} className="space-y-5">
      {state?.message && (
        <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.message}
        </p>
      )}

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
          Nueva contraseña
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

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
          Confirmar contraseña
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm
                     focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600"
        />
        {state?.errors?.confirmPassword && (
          <p className="mt-1 text-xs text-red-600">{state.errors.confirmPassword[0]}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-red-700 px-4 py-2.5 text-sm font-semibold text-white
                   shadow-sm hover:bg-red-800 disabled:opacity-50 transition-colors"
      >
        {pending ? 'Guardando…' : 'Guardar nueva contraseña'}
      </button>
    </form>
  )
}
