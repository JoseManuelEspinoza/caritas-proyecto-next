import type { Metadata } from 'next'
import { ForgotForm } from '@/app/ui/auth/forgot-form'

export const metadata: Metadata = {
  title: 'Recuperar contraseña — Cáritas Lima',
}

export default function RecuperarPage() {
  return (
    <>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Recuperar contraseña</h2>
      <p className="text-sm text-gray-600 mb-6">
        Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
      </p>
      <ForgotForm />
    </>
  )
}
