import type { Metadata } from 'next'
import { LoginForm } from '@/app/ui/auth/login-form'

export const metadata: Metadata = {
  title: 'Iniciar sesión — Cáritas Lima',
}

export default function LoginPage() {
  return (
    <>
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Iniciar sesión</h2>
      <LoginForm />
    </>
  )
}
